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
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UpcomingChargeServiceTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @InjectMocks
    private UpcomingChargeService upcomingChargeService;

    @Test
    void searchesFromTodayThroughTheRequestedDaysAndReportsDaysUntilCharge() {
        var today = LocalDate.now();
        var chargeDate = today.plusDays(5);
        var subscription = new Subscription(
                UUID.randomUUID(),
                "Music service",
                new BigDecimal("9.99"),
                "EUR",
                BillingPeriod.MONTHLY,
                "Entertainment",
                chargeDate,
                true
        );
        given(subscriptionRepository.findByActiveTrueAndNextChargeDateBetweenOrderByNextChargeDateAsc(
                any(LocalDate.class), any(LocalDate.class)
        )).willReturn(List.of(new SubscriptionEntity(subscription)));

        var charges = upcomingChargeService.getUpcomingCharges(7);

        var startDate = ArgumentCaptor.forClass(LocalDate.class);
        var endDate = ArgumentCaptor.forClass(LocalDate.class);
        verify(subscriptionRepository)
                .findByActiveTrueAndNextChargeDateBetweenOrderByNextChargeDateAsc(
                        startDate.capture(), endDate.capture()
                );
        assertThat(startDate.getValue()).isEqualTo(today);
        assertThat(endDate.getValue()).isEqualTo(today.plusDays(7));
        assertThat(charges).hasSize(1);
        assertThat(charges.getFirst().daysUntilCharge()).isEqualTo(5);
        assertThat(charges.getFirst().nextChargeDate()).isEqualTo(chargeDate);
    }
}
