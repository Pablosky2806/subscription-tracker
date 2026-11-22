package com.pablosky.subscriptiontracker.persistence;

import com.pablosky.subscriptiontracker.domain.BillingPeriod;
import com.pablosky.subscriptiontracker.domain.Subscription;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class SubscriptionApplicationIntegrationTest {

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

    @Autowired
    private MockMvc mockMvc;

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
    void createsAndReadsSubscriptionThroughApi() throws Exception {
        var created = mockMvc.perform(post("/api/subscriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Music service", "10.99", "EUR", "Entertainment")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Music service"))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn();
        var location = created.getResponse().getHeader("Location");
        assertThat(location).isNotNull();
        var id = location.substring(location.lastIndexOf('/') + 1);

        mockMvc.perform(get("/api/subscriptions/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Music service"))
                .andExpect(jsonPath("$.amount").value(10.99));
    }

    @Test
    void updatesArchivesAndRestoresSubscriptionThroughApi() throws Exception {
        var created = mockMvc.perform(post("/api/subscriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Music service", "10.99", "EUR", "Entertainment")))
                .andExpect(status().isCreated())
                .andReturn();
        var location = created.getResponse().getHeader("Location");
        assertThat(location).isNotNull();
        var subscriptionUrl = location;

        mockMvc.perform(put(subscriptionUrl)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request("Music Plus", "12.99", "EUR", "Entertainment")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Music Plus"))
                .andExpect(jsonPath("$.amount").value(12.99));

        mockMvc.perform(patch(subscriptionUrl + "/archive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currencies").isEmpty());

        mockMvc.perform(patch(subscriptionUrl + "/restore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void rejectsInvalidSubscriptionWithBadRequest() throws Exception {
        var invalidRequest = """
                {
                  "name": " ",
                  "amount": 9.99,
                  "currency": "EUR",
                  "billingPeriod": "MONTHLY",
                  "category": "Entertainment",
                  "nextChargeDate": "2026-12-20"
                }
                """;

        mockMvc.perform(post("/api/subscriptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest());
        assertThat(repository.count()).isZero();
    }

    @Test
    void importsActiveAndArchivedSubscriptionsFromBackup() throws Exception {
        var activeId = UUID.randomUUID();
        var archivedId = UUID.randomUUID();
        var backup = backup(
                backupItem(activeId, "Music service", "Entertainment", true),
                backupItem(archivedId, "Old video service", "Entertainment", false)
        );

        mockMvc.perform(post("/api/subscriptions/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(backup))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(2))
                .andExpect(jsonPath("$.skippedExisting").value(0));

        assertThat(repository.findAll())
                .extracting(entity -> entity.toDomain().active())
                .containsExactlyInAnyOrder(true, false);
        assertThat(repository.findById(archivedId))
                .isPresent()
                .get()
                .extracting(entity -> entity.toDomain().name())
                .isEqualTo("Old video service");
    }

    @Test
    void importingBackupAgainSkipsExistingIdsWithoutOverwritingOrDuplicating() throws Exception {
        var existingId = UUID.randomUUID();
        var newId = UUID.randomUUID();
        repository.saveAndFlush(new SubscriptionEntity(new Subscription(
                existingId,
                "My current name",
                new BigDecimal("15.00"),
                "EUR",
                BillingPeriod.MONTHLY,
                "Software",
                LocalDate.now().plusDays(5),
                false
        )));
        var backup = backup(
                backupItem(existingId, "Older backup name", "Entertainment", true),
                backupItem(newId, "New service", "Entertainment", true)
        );

        mockMvc.perform(post("/api/subscriptions/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(backup))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(1))
                .andExpect(jsonPath("$.skippedExisting").value(1));

        mockMvc.perform(post("/api/subscriptions/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(backup))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(0))
                .andExpect(jsonPath("$.skippedExisting").value(2));

        assertThat(repository.count()).isEqualTo(2);
        assertThat(repository.findById(existingId))
                .isPresent()
                .get()
                .extracting(entity -> entity.toDomain().name())
                .isEqualTo("My current name");
        assertThat(repository.findById(existingId))
                .isPresent()
                .get()
                .extracting(entity -> entity.toDomain().active())
                .isEqualTo(false);
    }

    @Test
    void rejectsInvalidBackupWithoutSavingAnySubscriptions() throws Exception {
        var backup = backup(
                backupItem(UUID.randomUUID(), "Valid service", "Entertainment", true),
                backupItem(UUID.randomUUID(), "Invalid service", " ", true)
        );

        mockMvc.perform(post("/api/subscriptions/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(backup))
                .andExpect(status().isBadRequest());

        assertThat(repository.count()).isZero();
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

    private static String request(String name, String amount, String currency, String category) {
        return """
                {
                  "name": "%s",
                  "amount": %s,
                  "currency": "%s",
                  "billingPeriod": "MONTHLY",
                  "category": "%s",
                  "nextChargeDate": "%s"
                }
                """.formatted(name, amount, currency, category, LocalDate.now().plusDays(10));
    }

    private static String backup(String... subscriptions) {
        return """
                {
                  "format": "subscription-tracker-backup",
                  "version": 1,
                  "subscriptions": [%s]
                }
                """.formatted(String.join(",", subscriptions));
    }

    private static String backupItem(UUID id, String name, String category, boolean active) {
        return """
                {
                  "id": "%s",
                  "name": "%s",
                  "amount": 9.99,
                  "currency": "EUR",
                  "billingPeriod": "MONTHLY",
                  "category": "%s",
                  "nextChargeDate": "%s",
                  "active": %s
                }
                """.formatted(id, name, category, LocalDate.now().plusDays(10), active);
    }
}
