package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.domain.MoneyMovement;
import com.pablosky.subscriptiontracker.domain.MovementType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MoneyMovementResponse(
        UUID id,
        String description,
        BigDecimal amount,
        String currency,
        MovementType type,
        String category,
        LocalDate movementDate,
        UUID subscriptionId
) {

    public static MoneyMovementResponse from(MoneyMovement movement) {
        return new MoneyMovementResponse(
                movement.id(),
                movement.description(),
                movement.amount(),
                movement.currency(),
                movement.type(),
                movement.category(),
                movement.movementDate(),
                movement.subscriptionId()
        );
    }
}
