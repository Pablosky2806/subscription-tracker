package com.pablosky.subscriptiontracker.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<SubscriptionEntity, UUID> {
    List<SubscriptionEntity> findByActiveTrue();

    List<SubscriptionEntity> findByActiveTrueAndNextChargeDateBetweenOrderByNextChargeDateAsc(
            LocalDate startDate,
            LocalDate endDate
    );
}
