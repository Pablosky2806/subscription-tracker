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
        boolean active,
        Integer intervalDays
) {

    public Subscription(
            UUID id,
            String name,
            BigDecimal amount,
            String currency,
            BillingPeriod billingPeriod,
            String category,
            LocalDate nextChargeDate,
            boolean active
    ) {
        this(id, name, amount, currency, billingPeriod, category, nextChargeDate, active, null);
    }

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
        if (billingPeriod == BillingPeriod.EVERY_N_DAYS) {
            if (intervalDays == null || intervalDays < 1 || intervalDays > 3650) {
                throw new IllegalArgumentException("intervalDays must be between 1 and 3650 for recurring-day subscriptions");
            }
        } else if (intervalDays != null) {
            throw new IllegalArgumentException("intervalDays is only valid for recurring-day subscriptions");
        }
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("category must not be blank");
        }
        Objects.requireNonNull(nextChargeDate, "nextChargeDate is required");
    }
}
