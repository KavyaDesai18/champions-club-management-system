-- V10__payments_invoices_ledger.sql
-- Module: PAYMENTS + INVOICES + LEDGER + CORPORATE ACCOUNTS

-- 1. Corporate Accounts (Business Clients)
CREATE TABLE IF NOT EXISTS corporate_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    gstin VARCHAR(20) NOT NULL UNIQUE,
    billing_address TEXT NOT NULL,
    contact_person VARCHAR(150),
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
    used_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_terms VARCHAR(50) NOT NULL DEFAULT 'NET_30',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_credit_limit_positive CHECK (credit_limit >= 0),
    CONSTRAINT chk_used_credit_positive CHECK (used_credit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_corp_accounts_company ON corporate_accounts(company_name);
CREATE INDEX IF NOT EXISTS idx_corp_accounts_gstin ON corporate_accounts(gstin);

-- Link members to corporate accounts
ALTER TABLE members ADD COLUMN IF NOT EXISTS corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS corporate_employee_id VARCHAR(50);
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_charge_to_company BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_members_corp_account ON members(corporate_account_id);

-- 2. Tax Rates
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    rate_percent NUMERIC(5, 2) NOT NULL,
    cgst_percent NUMERIC(5, 2) NOT NULL,
    sgst_percent NUMERIC(5, 2) NOT NULL,
    igst_percent NUMERIC(5, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tax_rates (id, code, name, rate_percent, cgst_percent, sgst_percent, igst_percent, is_active)
VALUES 
    ('a0000001-0000-0000-0000-000000000001', 'GST_18', 'Standard GST 18% (Courts, Fitness, Pro-Services)', 18.00, 9.00, 9.00, 18.00, true),
    ('a0000002-0000-0000-0000-000000000002', 'GST_12', 'Sporting Goods 12% (Apparel, Footwear)', 12.00, 6.00, 6.00, 12.00, true),
    ('a0000003-0000-0000-0000-000000000003', 'GST_5', 'Basic Sports Nutrition 5%', 5.00, 2.50, 2.50, 5.00, true),
    ('a0000004-0000-0000-0000-000000000004', 'GST_0', 'Exempt Services 0%', 0.00, 0.00, 0.00, 0.00, true)
ON CONFLICT (code) DO NOTHING;

-- 3. Cash Drawer Sessions
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_balance NUMERIC(12, 2),
    calculated_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discrepancy NUMERIC(12, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drawer_sessions_staff ON cash_drawer_sessions(staff_user_id, status);

-- 4. Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
    payer_name VARCHAR(150),
    payer_email VARCHAR(150),
    payer_phone VARCHAR(50),
    source_type VARCHAR(50) NOT NULL, -- BOOKING, ORDER, MEMBERSHIP, TAB, SOCIAL, INVOICE
    source_id VARCHAR(100) NOT NULL,
    method VARCHAR(50) NOT NULL, -- CASH, CARD, UPI, WALLET, CREDIT, BILL_TO_ACCOUNT
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCEEDED, FAILED, REFUNDED, PARTIAL_REFUND
    provider_ref VARCHAR(150),
    idempotency_key VARCHAR(128) UNIQUE,
    split_group_id UUID,
    cash_drawer_session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,
    failure_reason VARCHAR(255),
    metadata TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payment_amount_non_negative CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_source ON payments(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_split_group ON payments(split_group_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_corp ON payments(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

-- 5. Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    reason VARCHAR(255),
    refund_ref VARCHAR(150) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCEEDED', -- SUCCEEDED, FAILED
    provider_refund_id VARCHAR(150),
    cash_drawer_session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_refund_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created ON refunds(created_at);

-- Cash Drawer Entries (linked to payments & refunds)
CREATE TABLE IF NOT EXISTS cash_drawer_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES cash_drawer_sessions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
    entry_type VARCHAR(50) NOT NULL, -- OPENING_FLOAT, PAYMENT, REFUND, CASH_IN, CASH_OUT
    amount NUMERIC(12, 2) NOT NULL,
    running_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drawer_entries_session ON cash_drawer_entries(session_id);

-- 6. Ledger Entries (Double-Entry Bookkeeping)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
    account VARCHAR(50) NOT NULL, -- COURT_REVENUE, SHOP_REVENUE, BAR_REVENUE, MEMBERSHIP_REVENUE, TAX_PAYABLE, CASH, CARD, UPI, WALLET, ACCOUNTS_RECEIVABLE, REFUNDS
    entry_type VARCHAR(10) NOT NULL, -- DEBIT, CREDIT
    amount NUMERIC(12, 2) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100),
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ledger_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT chk_ledger_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger_entries(created_at);

-- 7. Race-safe Gapless Sequential Number Sequences (Invoices & Credit Notes)
CREATE TABLE IF NOT EXISTS invoice_sequences (
    financial_year VARCHAR(20) NOT NULL,
    sequence_type VARCHAR(20) NOT NULL, -- INVOICE, CREDIT_NOTE
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (financial_year, sequence_type)
);

-- 8. Invoices & Invoice Lines
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    financial_year VARCHAR(20) NOT NULL,
    sequence_number BIGINT NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_email VARCHAR(150),
    recipient_phone VARCHAR(50),
    recipient_address TEXT,
    recipient_gstin VARCHAR(20),
    source_type VARCHAR(50) NOT NULL, -- BOOKING, ORDER, MEMBERSHIP, SOCIAL, CONSOLIDATED_CORPORATE
    source_id VARCHAR(100),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PAID', -- DRAFT, SENT, PAID, OVERDUE, VOID
    due_date DATE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_invoice_total_non_negative CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_corp ON invoices(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_source ON invoices(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issue ON invoices(issue_date);

CREATE TABLE IF NOT EXISTS invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employee_name VARCHAR(150),
    employee_id VARCHAR(50),
    service_date TIMESTAMPTZ,
    CONSTRAINT chk_line_qty_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- 9. Credit Notes (Never edit issued invoices!)
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_number VARCHAR(50) NOT NULL UNIQUE,
    financial_year VARCHAR(20) NOT NULL,
    sequence_number BIGINT NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
    reason VARCHAR(255) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ISSUED', -- ISSUED, ALLOCATED
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cn_total_positive CHECK (total_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);

-- 10. Invoice Payment Allocations (Partial / Over-payments)
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount_allocated NUMERIC(12, 2) NOT NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_allocation_positive CHECK (amount_allocated > 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment ON invoice_payments(payment_id);
