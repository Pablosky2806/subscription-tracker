CREATE TABLE money_movements (
    id UUID PRIMARY KEY,
    description VARCHAR(120) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    category VARCHAR(80) NOT NULL,
    movement_date DATE NOT NULL
);

CREATE INDEX idx_money_movements_date ON money_movements (movement_date DESC);
