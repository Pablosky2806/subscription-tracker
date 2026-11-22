package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.persistence.SubscriptionRepository;
import com.pablosky.subscriptiontracker.persistence.SubscriptionEntity;
import com.pablosky.subscriptiontracker.persistence.MoneyMovementEntity;
import com.pablosky.subscriptiontracker.persistence.MoneyMovementRepository;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepository;
    private final MoneyMovementRepository movementRepository;

    public SubscriptionController(
            SubscriptionRepository subscriptionRepository,
            MoneyMovementRepository movementRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.movementRepository = movementRepository;
    }

    @GetMapping
    public List<SubscriptionResponse> listSubscriptions() {
        return subscriptionRepository.findAll(Sort.by(Sort.Direction.ASC, "nextChargeDate"))
                .stream()
                .map(entity -> SubscriptionResponse.from(entity.toDomain()))
                .toList();
    }

    @GetMapping("/{id}")
    public SubscriptionResponse getSubscription(@PathVariable UUID id) {
        return SubscriptionResponse.from(findEntity(id).toDomain());
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> createSubscription(
            @Valid @RequestBody SubscriptionWriteRequest request
    ) {
        var created = subscriptionRepository.save(
                new SubscriptionEntity(request.toDomain(UUID.randomUUID(), true))
        ).toDomain();

        return ResponseEntity
                .created(URI.create("/api/subscriptions/" + created.id()))
                .body(SubscriptionResponse.from(created));
    }

    @PostMapping("/import")
    @Transactional
    public SubscriptionBackupImportResponse importBackup(
            @Valid @RequestBody SubscriptionBackupImportRequest request
    ) {
        if (!"subscription-tracker-backup".equals(request.format())
                || (request.version() != 1 && request.version() != 2)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported backup format or version");
        }

        var idsInBackup = new HashSet<UUID>();
        for (var item : request.subscriptions()) {
            if (!idsInBackup.add(item.id())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Backup contains duplicate subscription IDs");
            }
        }

        Set<UUID> existingIds = new HashSet<>();
        subscriptionRepository.findAllById(idsInBackup).forEach(entity -> existingIds.add(entity.toDomain().id()));

        var newSubscriptions = request.subscriptions().stream()
                .filter(item -> !existingIds.contains(item.id()))
                .map(item -> new SubscriptionEntity(item.toDomain()))
                .toList();
        subscriptionRepository.saveAll(newSubscriptions);

        var backupMovements = request.movements() == null ? List.<MoneyMovementBackupItemRequest>of() : request.movements();
        var movementIdsInBackup = new HashSet<UUID>();
        for (var item : backupMovements) {
            if (!movementIdsInBackup.add(item.id())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Backup contains duplicate movement IDs");
            }
        }

        Set<UUID> existingMovementIds = new HashSet<>();
        movementRepository.findAllById(movementIdsInBackup)
                .forEach(entity -> existingMovementIds.add(entity.toDomain().id()));
        var newMovements = backupMovements.stream()
                .filter(item -> !existingMovementIds.contains(item.id()))
                .map(item -> new MoneyMovementEntity(item.toDomain()))
                .toList();
        movementRepository.saveAll(newMovements);

        return new SubscriptionBackupImportResponse(
                newSubscriptions.size(),
                request.subscriptions().size() - newSubscriptions.size(),
                newMovements.size(),
                backupMovements.size() - newMovements.size()
        );
    }

    @PutMapping("/{id}")
    public SubscriptionResponse updateSubscription(
            @PathVariable UUID id,
            @Valid @RequestBody SubscriptionWriteRequest request
    ) {
        var entity = findEntity(id);
        entity.updateFrom(request.toDomain(id, entity.toDomain().active()));
        return SubscriptionResponse.from(subscriptionRepository.save(entity).toDomain());
    }

    @PatchMapping("/{id}/archive")
    public SubscriptionResponse archiveSubscription(@PathVariable UUID id) {
        var entity = findEntity(id);
        entity.archive();
        return SubscriptionResponse.from(subscriptionRepository.save(entity).toDomain());
    }

    @PatchMapping("/{id}/restore")
    public SubscriptionResponse restoreSubscription(@PathVariable UUID id) {
        var entity = findEntity(id);
        entity.restore();
        return SubscriptionResponse.from(subscriptionRepository.save(entity).toDomain());
    }

    private SubscriptionEntity findEntity(UUID id) {
        return subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
    }
}
