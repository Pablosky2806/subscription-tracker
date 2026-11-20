package com.pablosky.subscriptiontracker.service;

import com.pablosky.subscriptiontracker.api.UpcomingChargeResponse;
import com.pablosky.subscriptiontracker.persistence.SubscriptionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class UpcomingChargeService {

    private final SubscriptionRepository subscriptionRepository;

    public UpcomingChargeService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    public List<UpcomingChargeResponse> getUpcomingCharges(int days) {
        LocalDate today = LocalDate.now();
        LocalDate lastIncludedDate = today.plusDays(days);

        return subscriptionRepository
                .findByActiveTrueAndNextChargeDateBetweenOrderByNextChargeDateAsc(today, lastIncludedDate)
                .stream()
                .map(entity -> entity.toDomain())
                .map(subscription -> UpcomingChargeResponse.from(
                        subscription,
                        ChronoUnit.DAYS.between(today, subscription.nextChargeDate())
                ))
                .toList();
    }
}
