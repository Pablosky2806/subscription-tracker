package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.persistence.MoneyMovementEntity;
import com.pablosky.subscriptiontracker.persistence.MoneyMovementRepository;
import com.pablosky.subscriptiontracker.persistence.SubscriptionRepository;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
@RequestMapping("/api/movements")
public class MoneyMovementController {

    private final MoneyMovementRepository movementRepository;
    private final SubscriptionRepository subscriptionRepository;

    public MoneyMovementController(
            MoneyMovementRepository movementRepository,
            SubscriptionRepository subscriptionRepository
    ) {
        this.movementRepository = movementRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    @GetMapping
    public List<MoneyMovementResponse> listMovements() {
        return movementRepository.findAllByOrderByMovementDateDesc().stream()
                .map(MoneyMovementEntity::toDomain)
                .map(MoneyMovementResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<MoneyMovementResponse> createMovement(
            @Valid @RequestBody MoneyMovementWriteRequest request
    ) {
        validateSubscription(request.subscriptionId());
        var created = movementRepository.save(
                new MoneyMovementEntity(request.toDomain(UUID.randomUUID()))
        ).toDomain();

        return ResponseEntity
                .created(URI.create("/api/movements/" + created.id()))
                .body(MoneyMovementResponse.from(created));
    }

    @PostMapping("/import")
    @Transactional
    public MoneyMovementImportResponse importMovements(
            @Valid @RequestBody MoneyMovementImportRequest request
    ) {
        validateSubscriptions(request.movements());
        var entities = request.movements().stream()
                .map(movement -> new MoneyMovementEntity(movement.toDomain(UUID.randomUUID())))
                .toList();
        movementRepository.saveAll(entities);
        return new MoneyMovementImportResponse(entities.size());
    }

    @PutMapping("/{id}")
    public MoneyMovementResponse updateMovement(
            @PathVariable UUID id,
            @Valid @RequestBody MoneyMovementWriteRequest request
    ) {
        validateSubscription(request.subscriptionId());
        if (!movementRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movement not found");
        }
        var updated = movementRepository.save(
                new MoneyMovementEntity(request.toDomain(id))
        ).toDomain();
        return MoneyMovementResponse.from(updated);
    }

    private void validateSubscription(UUID subscriptionId) {
        if (subscriptionId != null && !subscriptionRepository.existsById(subscriptionId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subscription does not exist");
        }
    }

    private void validateSubscriptions(List<MoneyMovementWriteRequest> requests) {
        Set<UUID> requestedIds = new HashSet<>();
        requests.stream()
                .map(MoneyMovementWriteRequest::subscriptionId)
                .filter(id -> id != null)
                .forEach(requestedIds::add);
        if (requestedIds.isEmpty()) return;

        Set<UUID> existingIds = new HashSet<>();
        subscriptionRepository.findAllById(requestedIds).forEach(entity -> existingIds.add(entity.toDomain().id()));
        if (existingIds.size() != requestedIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more subscriptions do not exist");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMovement(@PathVariable UUID id) {
        if (!movementRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movement not found");
        }
        movementRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
