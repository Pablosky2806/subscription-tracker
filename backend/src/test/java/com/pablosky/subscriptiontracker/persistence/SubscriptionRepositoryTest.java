package com.pablosky.subscriptiontracker.persistence;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;
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
}
