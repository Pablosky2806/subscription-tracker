CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    billing_period VARCHAR(16) NOT NULL CHECK (billing_period IN ('MONTHLY', 'YEARLY')),
    category VARCHAR(80) NOT NULL,
    next_charge_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);
