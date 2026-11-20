package com.pablosky.subscriptiontracker.service;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;
import com.pablosky.subscriptiontracker.persistence.SubscriptionEntity;
import com.pablosky.subscriptiontracker.persistence.SubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class SubscriptionSummaryServiceTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @InjectMocks
    private SubscriptionSummaryService summaryService;

    @Test
    void normalizesMonthlyAndYearlySubscriptionsAndGroupsTheirCategory() {
        var monthly = subscription("Music service", "9.99", BillingPeriod.MONTHLY);
        var yearly = subscription("Video service", "120.00", BillingPeriod.YEARLY);
        given(subscriptionRepository.findByActiveTrue()).willReturn(List.of(
                new SubscriptionEntity(monthly),
                new SubscriptionEntity(yearly)
        ));

        var summary = summaryService.getSummary();

        assertThat(summary.currencies()).hasSize(1);
        var eur = summary.currencies().getFirst();
        assertThat(eur.currency()).isEqualTo("EUR");
        assertThat(eur.monthlyTotal()).isEqualByComparingTo("19.99");
        assertThat(eur.annualTotal()).isEqualByComparingTo("239.88");
        assertThat(eur.categories()).hasSize(1);
        assertThat(eur.categories().getFirst().category()).isEqualTo("Entertainment");
        assertThat(eur.categories().getFirst().monthlyTotal()).isEqualByComparingTo("19.99");
        assertThat(eur.categories().getFirst().annualTotal()).isEqualByComparingTo("239.88");
    }

    @Test
    void keepsDifferentCurrenciesInSeparateTotals() {
        var euroSubscription = subscription("Music service", "9.99", BillingPeriod.MONTHLY);
        var dollarSubscription = new Subscription(
                UUID.randomUUID(),
                "Cloud storage",
                new BigDecimal("5.00"),
                "USD",
                BillingPeriod.MONTHLY,
                "Work",
                LocalDate.of(2026, 12, 20),
                true
        );
        given(subscriptionRepository.findByActiveTrue()).willReturn(List.of(
                new SubscriptionEntity(dollarSubscription),
                new SubscriptionEntity(euroSubscription)
        ));

        var currencies = summaryService.getSummary().currencies();

        assertThat(currencies).hasSize(2);
        assertThat(currencies).extracting(currency -> currency.currency()).containsExactly("EUR", "USD");
        assertThat(currencies.get(0).monthlyTotal()).isEqualByComparingTo("9.99");
        assertThat(currencies.get(1).monthlyTotal()).isEqualByComparingTo("5.00");
    }

    private static Subscription subscription(String name, String amount, BillingPeriod billingPeriod) {
        return new Subscription(
                UUID.randomUUID(),
                name,
                new BigDecimal(amount),
                "EUR",
                billingPeriod,
                "Entertainment",
                LocalDate.of(2026, 12, 20),
                true
        );
    }
}
