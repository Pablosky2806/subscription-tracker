package com.pablosky.subscriptiontracker.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

public record Subscription(
        UUID id,
        String name,
        BigDecimal amount,
        String currency,
        BillingPeriod billingPeriod,
        String category,
        LocalDate nextChargeDate,
        boolean active
) {

    public Subscription {
        Objects.requireNonNull(id, "id is required");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero");
        }
        if (currency == null || !currency.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("currency must be a three-letter uppercase code");
        }
        Objects.requireNonNull(billingPeriod, "billingPeriod is required");
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("category must not be blank");
        }
        Objects.requireNonNull(nextChargeDate, "nextChargeDate is required");
    }
}
