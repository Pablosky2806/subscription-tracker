package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SubscriptionBackupItemRequest(
        @NotNull UUID id,
        @NotBlank @Size(max = 120) String name,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @NotNull BillingPeriod billingPeriod,
        @NotBlank @Size(max = 80) String category,
        @NotNull LocalDate nextChargeDate,
        @NotNull Boolean active
) {

    public Subscription toDomain() {
        return new Subscription(
                id,
                name.trim(),
                amount,
                currency,
                billingPeriod,
                category.trim(),
                nextChargeDate,
                active
        );
    }
}
