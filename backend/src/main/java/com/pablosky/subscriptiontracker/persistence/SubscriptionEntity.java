package com.pablosky.subscriptiontracker.persistence;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;
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
@Table(name = "subscriptions")
public class SubscriptionEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_period", nullable = false, length = 16)
    private BillingPeriod billingPeriod;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(name = "next_charge_date", nullable = false)
    private LocalDate nextChargeDate;

    @Column(nullable = false)
    private boolean active;

    protected SubscriptionEntity() {
        // JPA requires a no-argument constructor.
    }

    public SubscriptionEntity(Subscription subscription) {
        this.id = subscription.id();
        this.name = subscription.name();
        this.amount = subscription.amount();
        this.currency = subscription.currency();
        this.billingPeriod = subscription.billingPeriod();
        this.category = subscription.category();
        this.nextChargeDate = subscription.nextChargeDate();
        this.active = subscription.active();
    }

    public Subscription toDomain() {
        return new Subscription(id, name, amount, currency, billingPeriod, category, nextChargeDate, active);
    }

    public void updateFrom(Subscription subscription) {
        this.name = subscription.name();
        this.amount = subscription.amount();
        this.currency = subscription.currency();
        this.billingPeriod = subscription.billingPeriod();
        this.category = subscription.category();
        this.nextChargeDate = subscription.nextChargeDate();
    }

    public void archive() {
        this.active = false;
    }

    public void restore() {
        this.active = true;
    }
}
