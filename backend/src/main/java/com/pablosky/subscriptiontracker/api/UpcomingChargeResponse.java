package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record UpcomingChargeResponse(
        UUID id,
        String name,
        BigDecimal amount,
        String currency,
        BillingPeriod billingPeriod,
        Integer intervalDays,
        String category,
        LocalDate nextChargeDate,
        long daysUntilCharge
) {

    public static UpcomingChargeResponse from(Subscription subscription, long daysUntilCharge) {
        return new UpcomingChargeResponse(
                subscription.id(),
                subscription.name(),
                subscription.amount(),
                subscription.currency(),
                subscription.billingPeriod(),
                subscription.intervalDays(),
                subscription.category(),
                subscription.nextChargeDate(),
                daysUntilCharge
        );
    }
}
