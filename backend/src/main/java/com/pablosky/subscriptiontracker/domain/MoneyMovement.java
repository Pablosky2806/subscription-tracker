package com.pablosky.subscriptiontracker.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

public record MoneyMovement(
        UUID id,
        String description,
        BigDecimal amount,
        String currency,
        MovementType type,
        String category,
        LocalDate movementDate,
        UUID subscriptionId
) {

    public MoneyMovement(
            UUID id,
            String description,
            BigDecimal amount,
            String currency,
            MovementType type,
            String category,
            LocalDate movementDate
    ) {
        this(id, description, amount, currency, type, category, movementDate, null);
    }

    public MoneyMovement {
        Objects.requireNonNull(id, "id is required");
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("description must not be blank");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero");
        }
        if (currency == null || !currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("currency must be a three-letter uppercase code");
        }
        Objects.requireNonNull(type, "type is required");
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("category must not be blank");
        }
        Objects.requireNonNull(movementDate, "movementDate is required");
    }
}
