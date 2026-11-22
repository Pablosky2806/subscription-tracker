package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.persistence.MoneyMovementEntity;
import com.pablosky.subscriptiontracker.persistence.MoneyMovementRepository;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/movements")
public class MoneyMovementController {

    private final MoneyMovementRepository movementRepository;

    public MoneyMovementController(MoneyMovementRepository movementRepository) {
        this.movementRepository = movementRepository;
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
        if (!movementRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Movement not found");
        }
        var updated = movementRepository.save(
                new MoneyMovementEntity(request.toDomain(id))
        ).toDomain();
        return MoneyMovementResponse.from(updated);
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
