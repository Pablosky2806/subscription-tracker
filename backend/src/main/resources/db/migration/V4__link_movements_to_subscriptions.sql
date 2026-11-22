ALTER TABLE money_movements
    ADD COLUMN subscription_id UUID;

ALTER TABLE money_movements
    ADD CONSTRAINT fk_money_movements_subscription
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE SET NULL;

CREATE INDEX idx_money_movements_subscription_id ON money_movements (subscription_id);
