package com.pablosky.subscriptiontracker.persistence;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class SubscriptionRepositoryTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:18.7-alpine3.24")
            .withDatabaseName("subscription_tracker_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private SubscriptionRepository repository;

    @BeforeEach
    void clearSubscriptions() {
        repository.deleteAll();
    }

    @Test
    void savesAndReadsSubscriptionFromPostgres() {
        var subscription = new Subscription(
                UUID.randomUUID(),
                "Music service",
                new BigDecimal("10.99"),
                "EUR",
                BillingPeriod.MONTHLY,
                "Entertainment",
                LocalDate.of(2026, 12, 20),
                true
        );

        var saved = repository.saveAndFlush(new SubscriptionEntity(subscription));

        assertThat(repository.findById(subscription.id()))
                .isPresent()
                .get()
                .extracting(SubscriptionEntity::toDomain)
                .isEqualTo(subscription);
        assertThat(saved.toDomain()).isEqualTo(subscription);
    }

    @Test
    void findsOnlyActiveSubscriptions() {
        repository.saveAllAndFlush(List.of(
                new SubscriptionEntity(subscription("Active service", LocalDate.now().plusDays(2), true)),
                new SubscriptionEntity(subscription("Archived service", LocalDate.now().plusDays(3), false))
        ));

        assertThat(repository.findByActiveTrue())
                .extracting(entity -> entity.toDomain().name())
                .containsExactly("Active service");
    }

    @Test
    void findsUpcomingActiveSubscriptionsInDateOrderWithinRange() {
        var today = LocalDate.now();
        repository.saveAllAndFlush(List.of(
                new SubscriptionEntity(subscription("Later service", today.plusDays(10), true)),
                new SubscriptionEntity(subscription("Soon service", today.plusDays(2), true)),
                new SubscriptionEntity(subscription("Archived service", today.plusDays(1), false)),
                new SubscriptionEntity(subscription("Outside range service", today.plusDays(31), true))
        ));

        var upcoming = repository.findByActiveTrueAndNextChargeDateBetweenOrderByNextChargeDateAsc(
                today,
                today.plusDays(30)
        );

        assertThat(upcoming)
                .extracting(entity -> entity.toDomain().name())
                .containsExactly("Soon service", "Later service");
    }

    private static Subscription subscription(String name, LocalDate nextChargeDate, boolean active) {
        return new Subscription(
                UUID.randomUUID(),
                name,
                new BigDecimal("10.99"),
                "EUR",
                BillingPeriod.MONTHLY,
                "Entertainment",
                nextChargeDate,
                active
        );
    }
}
