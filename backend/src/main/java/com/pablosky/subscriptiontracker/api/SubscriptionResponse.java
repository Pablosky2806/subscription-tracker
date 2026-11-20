package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SubscriptionResponse(
        UUID id,
        String name,
        BigDecimal amount,
        String currency,
        BillingPeriod billingPeriod,
        String category,
        LocalDate nextChargeDate,
        boolean active
) {

    public static SubscriptionResponse from(Subscription subscription) {
        return new SubscriptionResponse(
                subscription.id(),
                subscription.name(),
                subscription.amount(),
                subscription.currency(),
                subscription.billingPeriod(),
                subscription.category(),
                subscription.nextChargeDate(),
                subscription.active()
        );
    }
}
