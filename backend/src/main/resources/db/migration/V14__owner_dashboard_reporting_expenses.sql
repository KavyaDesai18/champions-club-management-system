-- V14__owner_dashboard_reporting_expenses.sql
-- Module: OWNER DASHBOARD + REPORTING + EXPENSES MODULE

-- 1. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_code ON expense_categories(code);

-- Seed Standard Operating Expense Categories
INSERT INTO expense_categories (id, code, name, description, is_active)
VALUES
    ('e0000001-0000-0000-0000-000000000001', 'RENT', 'Facility & Court Lease / Rent', 'Monthly facility rental and land lease', true),
    ('e0000002-0000-0000-0000-000000000002', 'UTILITIES', 'Electricity, Water & Internet', 'Power, floodlights, AC and utilities', true),
    ('e0000003-0000-0000-0000-000000000003', 'REPAIRS', 'Court Maintenance & Repairs', 'Synthetic court resurfacing, net repairs', true),
    ('e0000004-0000-0000-0000-000000000004', 'EQUIPMENT', 'Sports & Gym Equipment', 'Shuttle machines, racquets, gym weights', true),
    ('e0000005-0000-0000-0000-000000000005', 'MARKETING', 'Advertising & Marketing', 'Digital ads, sponsorships, event banners', true),
    ('e0000006-0000-0000-0000-000000000006', 'INSURANCE', 'Liability & Property Insurance', 'Member sports liability and building cover', true),
    ('e0000007-0000-0000-0000-000000000007', 'OFFICE_SUPPLIES', 'Office & Cleaning Supplies', 'Sanitizers, housekeeping, printer paper', true),
    ('e0000008-0000-0000-0000-000000000008', 'OTHER', 'General Operational Expenses', 'Miscellaneous recurring club expenses', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Operating Expenses Table (Feeds "What We Owe" Payables and Cash Outflow)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL, -- Net amount before tax
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Input GST tax credit
    total_amount NUMERIC(12, 2) NOT NULL, -- Total payable (amount + tax_amount)
    vendor VARCHAR(150),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    payment_method VARCHAR(50), -- CASH, CARD, UPI, BANK_TRANSFER
    paid_at TIMESTAMPTZ,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_frequency VARCHAR(50) NOT NULL DEFAULT 'NONE', -- NONE, MONTHLY, QUARTERLY, ANNUAL
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_expense_amounts CHECK (amount >= 0 AND tax_amount >= 0 AND total_amount >= 0),
    CONSTRAINT chk_expense_status CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    CONSTRAINT chk_expense_frequency CHECK (recurring_frequency IN ('NONE', 'MONTHLY', 'QUARTERLY', 'ANNUAL'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_due ON expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON expenses(status, expense_date);

-- 3. Report Shares Table (Shareable read-only report links with expiry & revocation)
CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token VARCHAR(128) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL DEFAULT 'FINANCIAL_SUMMARY', -- FINANCIAL_SUMMARY, REVENUE, TAX_GST, RECEIVABLES, PAYROLL, OPERATIONS
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    preset VARCHAR(50),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_expires ON report_shares(expires_at, is_revoked);

-- 4. High-Performance Reporting Composite Indexes for Aggregates Across Huge Ranges
CREATE INDEX IF NOT EXISTS idx_payments_report_agg ON payments(created_at, status, method, source_type);
CREATE INDEX IF NOT EXISTS idx_invoices_report_agg ON invoices(created_at, status, balance_due);
CREATE INDEX IF NOT EXISTS idx_bookings_report_agg ON bookings(start_at, status, court_id);
CREATE INDEX IF NOT EXISTS idx_refunds_report_agg ON refunds(created_at, status);
