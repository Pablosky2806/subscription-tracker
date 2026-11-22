ALTER TABLE subscriptions
    ADD COLUMN billing_interval_days INTEGER;

ALTER TABLE subscriptions
    DROP CONSTRAINT subscriptions_billing_period_check;

ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_billing_period_check CHECK (
        (billing_period = 'EVERY_N_DAYS' AND billing_interval_days BETWEEN 1 AND 3650)
        OR (billing_period IN ('MONTHLY', 'YEARLY') AND billing_interval_days IS NULL)
    );
