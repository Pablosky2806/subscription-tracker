package com.pablosky.subscriptiontracker.service;

import com.pablosky.subscriptiontracker.api.SummaryResponse;
import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;
import com.pablosky.subscriptiontracker.persistence.SubscriptionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
public class SubscriptionSummaryService {

    private static final BigDecimal TWELVE = BigDecimal.valueOf(12);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionSummaryService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    public SummaryResponse getSummary() {
        Map<String, CurrencyAccumulator> totalsByCurrency = new TreeMap<>();

        subscriptionRepository.findByActiveTrue().stream()
                .map(entity -> entity.toDomain())
                .forEach(subscription -> totalsByCurrency
                        .computeIfAbsent(subscription.currency(), ignored -> new CurrencyAccumulator())
                        .add(subscription));

        List<SummaryResponse.CurrencyTotals> currencies = totalsByCurrency.entrySet().stream()
                .map(entry -> entry.getValue().toResponse(entry.getKey()))
                .toList();

        return new SummaryResponse(currencies);
    }

    private static BigDecimal monthlyEquivalent(Subscription subscription) {
        if (subscription.billingPeriod() == BillingPeriod.MONTHLY) {
            return subscription.amount();
        }
        return subscription.amount().divide(TWELVE, 10, RoundingMode.HALF_UP);
    }

    private static BigDecimal annualEquivalent(Subscription subscription) {
        if (subscription.billingPeriod() == BillingPeriod.YEARLY) {
            return subscription.amount();
        }
        return subscription.amount().multiply(TWELVE);
    }

    private static BigDecimal forDisplay(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private static class CurrencyAccumulator {
        private BigDecimal monthlyTotal = ZERO;
        private BigDecimal annualTotal = ZERO;
        private final Map<String, CategoryAccumulator> categories = new TreeMap<>();

        private void add(Subscription subscription) {
            BigDecimal monthly = monthlyEquivalent(subscription);
            BigDecimal annual = annualEquivalent(subscription);

            monthlyTotal = monthlyTotal.add(monthly);
            annualTotal = annualTotal.add(annual);
            categories.computeIfAbsent(subscription.category(), ignored -> new CategoryAccumulator())
                    .add(monthly, annual);
        }

        private SummaryResponse.CurrencyTotals toResponse(String currency) {
            List<SummaryResponse.CategoryTotals> categoryTotals = categories.entrySet().stream()
                    .map(entry -> entry.getValue().toResponse(entry.getKey()))
                    .toList();

            return new SummaryResponse.CurrencyTotals(
                    currency,
                    forDisplay(monthlyTotal),
                    forDisplay(annualTotal),
                    categoryTotals
            );
        }
    }

    private static class CategoryAccumulator {
        private BigDecimal monthlyTotal = ZERO;
        private BigDecimal annualTotal = ZERO;

        private void add(BigDecimal monthly, BigDecimal annual) {
            monthlyTotal = monthlyTotal.add(monthly);
            annualTotal = annualTotal.add(annual);
        }

        private SummaryResponse.CategoryTotals toResponse(String category) {
            return new SummaryResponse.CategoryTotals(
                    category,
                    forDisplay(monthlyTotal),
                    forDisplay(annualTotal)
            );
        }
    }
}
