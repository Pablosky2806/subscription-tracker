package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.domain.MoneyMovement;
import com.pablosky.subscriptiontracker.domain.MovementType;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MoneyMovementWriteRequest(
        @NotBlank @Size(max = 120) String description,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @NotNull MovementType type,
        @NotBlank @Size(max = 80) String category,
        @NotNull LocalDate movementDate,
        UUID subscriptionId
) {

    public MoneyMovement toDomain(UUID id) {
        return new MoneyMovement(
                id,
                description.trim(),
                amount,
                currency,
                type,
                category.trim(),
                movementDate,
                subscriptionId
        );
    }
}
