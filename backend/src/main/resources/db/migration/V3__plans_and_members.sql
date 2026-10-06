-- V3__plans_and_members.sql
-- Plans, Members, Guardians, and Bulk Import

-- Sequence for readable member numbers e.g. CC-000123
CREATE SEQUENCE IF NOT EXISTS member_no_seq START WITH 1 INCREMENT BY 1;

-- Membership Plans table
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    duration_months INT NOT NULL DEFAULT 12,
    court_discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    shop_discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    bar_discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    free_courts BOOLEAN NOT NULL DEFAULT FALSE,
    max_bookings_per_day INT NOT NULL DEFAULT 2,
    advance_booking_days INT NOT NULL DEFAULT 7,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plans_code ON plans(code);
CREATE INDEX idx_plans_active ON plans(active);

-- Plan Benefits for display
CREATE TABLE plan_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    benefit_text VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_plan_benefits_plan ON plan_benefits(plan_id);

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_no VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL UNIQUE,
    dob DATE NOT NULL,
    gender VARCHAR(20),
    address TEXT,
    photo_url VARCHAR(500),
    emergency_contact VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    guest_passes_remaining INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- Trigram and lookup indexes for sub-millisecond search
CREATE INDEX idx_members_name_trgm ON members USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_members_email_trgm ON members USING gin (email gin_trgm_ops);
CREATE INDEX idx_members_phone_trgm ON members USING gin (phone gin_trgm_ops);
CREATE INDEX idx_members_member_no_trgm ON members USING gin (member_no gin_trgm_ops);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_plan ON members(plan_id);
CREATE INDEX idx_members_user ON members(user_id);
CREATE INDEX idx_members_deleted ON members(is_deleted);

-- Guardians table for Junior members
CREATE TABLE guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    consent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guardians_member ON guardians(member_id);

-- Bulk Import Jobs table
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_report_json TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created ON import_jobs(created_at);

-- Seed Plans: GOLD, SILVER, JUNIOR
INSERT INTO plans (id, code, name, price, duration_months, court_discount_pct, shop_discount_pct, bar_discount_pct, free_courts, max_bookings_per_day, advance_booking_days, active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'GOLD', 'Gold Tier VIP', 2999.00, 12, 25.00, 20.00, 15.00, false, 2, 14, true),
    ('22222222-2222-2222-2222-222222222222', 'SILVER', 'Silver Tier Standard', 1499.00, 12, 10.00, 10.00, 5.00, false, 2, 7, true),
    ('33333333-3333-3333-3333-333333333333', 'JUNIOR', 'Junior Cadet (Under 18)', 999.00, 12, 30.00, 15.00, 0.00, false, 2, 7, true)
ON CONFLICT (code) DO NOTHING;

-- Seed Plan Benefits
INSERT INTO plan_benefits (plan_id, benefit_text, display_order) VALUES
    ('11111111-1111-1111-1111-111111111111', '14-Day Advance Court Booking Window', 1),
    ('11111111-1111-1111-1111-111111111111', '25% Discount on All Court Reservations', 2),
    ('11111111-1111-1111-1111-111111111111', '20% Pro Shop Equipment & Apparel Discount', 3),
    ('11111111-1111-1111-1111-111111111111', '15% Discount on Lounge & Café Orders', 4),
    ('11111111-1111-1111-1111-111111111111', '2 Complimentary Guest Passes Every Month', 5),
    ('22222222-2222-2222-2222-222222222222', '7-Day Advance Court Booking Window', 1),
    ('22222222-2222-2222-2222-222222222222', '10% Court Booking Discount', 2),
    ('22222222-2222-2222-2222-222222222222', '10% Pro Shop Merchandising Discount', 3),
    ('22222222-2222-2222-2222-222222222222', 'Standard Lounge & Café Access', 4),
    ('33333333-3333-3333-3333-333333333333', 'Exclusive to Athletes Under 18 Years', 1),
    ('33333333-3333-3333-3333-333333333333', '30% Discount on Junior Coaching & Courts', 2),
    ('33333333-3333-3333-3333-333333333333', '15% Off Youth Equipment & Racquets', 3),
    ('33333333-3333-3333-3333-333333333333', 'Mandatory Parental / Guardian Linking', 4),
    ('33333333-3333-3333-3333-333333333333', 'Sessions Conclude Before 20:00 Daily', 5)
ON CONFLICT DO NOTHING;
