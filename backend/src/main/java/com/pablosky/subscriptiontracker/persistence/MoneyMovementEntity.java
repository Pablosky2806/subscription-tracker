package com.pablosky.subscriptiontracker.persistence;

import com.pablosky.subscriptiontracker.domain.MoneyMovement;
import com.pablosky.subscriptiontracker.domain.MovementType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "money_movements")
public class MoneyMovementEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MovementType type;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(name = "movement_date", nullable = false)
    private LocalDate movementDate;

    protected MoneyMovementEntity() {
        // JPA requires a no-argument constructor.
    }

    public MoneyMovementEntity(MoneyMovement movement) {
        this.id = movement.id();
        this.description = movement.description();
        this.amount = movement.amount();
        this.currency = movement.currency();
        this.type = movement.type();
        this.category = movement.category();
        this.movementDate = movement.movementDate();
    }

    public MoneyMovement toDomain() {
        return new MoneyMovement(id, description, amount, currency, type, category, movementDate);
    }
}
