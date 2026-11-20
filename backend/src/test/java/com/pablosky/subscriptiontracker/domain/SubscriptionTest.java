package com.pablosky.subscriptiontracker.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class SubscriptionTest {

    @Test
    void rejectsBlankName() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new Subscription(
                        UUID.randomUUID(),
                        " ",
                        new BigDecimal("9.99"),
                        "EUR",
                        BillingPeriod.MONTHLY,
                        "Entertainment",
                        LocalDate.of(2026, 12, 20),
                        true
                ))
                .withMessage("name must not be blank");
    }

    @Test
    void rejectsZeroAmount() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new Subscription(
                        UUID.randomUUID(),
                        "Music service",
                        BigDecimal.ZERO,
                        "EUR",
                        BillingPeriod.MONTHLY,
                        "Entertainment",
                        LocalDate.of(2026, 12, 20),
                        true
                ))
                .withMessage("amount must be greater than zero");
    }

    @Test
    void rejectsCurrencyThatIsNotAnUppercaseThreeLetterCode() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new Subscription(
                        UUID.randomUUID(),
                        "Music service",
                        new BigDecimal("9.99"),
                        "eur",
                        BillingPeriod.MONTHLY,
                        "Entertainment",
                        LocalDate.of(2026, 12, 20),
                        true
                ))
                .withMessage("currency must be a three-letter uppercase code");
    }
}
