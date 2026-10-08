-- V5__courts_pricing_and_availability.sql
-- Module: COURTS + PRICING + AVAILABILITY ENGINE

-- 1. Sports table
CREATE TABLE IF NOT EXISTS sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    default_session_minutes INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sports_name ON sports(name);
CREATE INDEX IF NOT EXISTS idx_sports_active ON sports(is_active);

-- Seed standard sports
INSERT INTO sports (id, name, default_session_minutes, is_active) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Badminton', 60, true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tennis', 60, true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Squash', 60, true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Pickleball', 60, true)
ON CONFLICT (name) DO NOTHING;

-- 2. Alter courts table to add sport_id, surface, indoor, status
ALTER TABLE courts ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES sports(id) ON DELETE RESTRICT;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS surface VARCHAR(50) NOT NULL DEFAULT 'SYNTHETIC';
ALTER TABLE courts ADD COLUMN IF NOT EXISTS indoor BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_courts_sport_id ON courts(sport_id);
CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(status);

-- Backfill existing courts sport_id from sport_type if present
UPDATE courts SET sport_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE (sport_type = 'BADMINTON' OR sport_id IS NULL);
UPDATE courts SET sport_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE sport_type = 'TENNIS';
UPDATE courts SET sport_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE sport_type = 'SQUASH';

-- Seed default facility courts if table is empty
INSERT INTO courts (id, name, sport_type, sport_id, surface, indoor, status, hourly_rate_member, hourly_rate_guest, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Badminton Court 1', 'BADMINTON', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SYNTHETIC', true, 'ACTIVE', 15.00, 20.00, true),
    ('c2222222-2222-2222-2222-222222222222', 'Badminton Court 2', 'BADMINTON', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SYNTHETIC', true, 'ACTIVE', 15.00, 20.00, true),
    ('c3333333-3333-3333-3333-333333333333', 'Badminton Court 3', 'BADMINTON', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'WOODEN', true, 'ACTIVE', 18.00, 24.00, true),
    ('c4444444-4444-4444-4444-444444444444', 'Tennis Court 1 (Hard)', 'TENNIS', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ACRYLIC_HARD', false, 'ACTIVE', 25.00, 35.00, true),
    ('c5555555-5555-5555-5555-555555555555', 'Tennis Court 2 (Clay)', 'TENNIS', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CLAY', false, 'ACTIVE', 30.00, 40.00, true),
    ('c6666666-6666-6666-6666-666666666666', 'Squash Court 1', 'SQUASH', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'GLASS_BACK', true, 'ACTIVE', 20.00, 28.00, true),
    ('c7777777-7777-7777-7777-777777777777', 'Squash Court 2', 'SQUASH', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'WOODEN', true, 'ACTIVE', 20.00, 28.00, true),
    ('c8888888-8888-8888-8888-888888888888', 'Pickleball Court 1', 'BADMINTON', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'SYNTHETIC', true, 'ACTIVE', 12.00, 18.00, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Opening hours table (per weekday per court or club-wide NULL court_id)
CREATE TABLE IF NOT EXISTS opening_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20),
    specific_date DATE,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_opening_hours_court ON opening_hours(court_id);
CREATE INDEX IF NOT EXISTS idx_opening_hours_day ON opening_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_opening_hours_date ON opening_hours(specific_date);

-- Seed standard club-wide opening hours (06:00 to 23:00)
INSERT INTO opening_hours (id, court_id, day_of_week, open_time, close_time, is_closed, reason) VALUES
    ('01111111-1111-1111-1111-111111111111', NULL, 'MONDAY', '06:00:00', '23:00:00', false, 'Regular Club Hours'),
    ('02222222-2222-2222-2222-222222222222', NULL, 'TUESDAY', '06:00:00', '23:00:00', false, 'Regular Club Hours'),
    ('03333333-3333-3333-3333-333333333333', NULL, 'WEDNESDAY', '06:00:00', '23:00:00', false, 'Regular Club Hours'),
    ('04444444-4444-4444-4444-444444444444', NULL, 'THURSDAY', '06:00:00', '23:00:00', false, 'Regular Club Hours'),
    ('05555555-5555-5555-5555-555555555555', NULL, 'FRIDAY', '06:00:00', '23:00:00', false, 'Regular Club Hours'),
    ('06666666-6666-6666-6666-666666666666', NULL, 'SATURDAY', '06:00:00', '23:00:00', false, 'Regular Club Hours'),
    ('07777777-7777-7777-7777-777777777777', NULL, 'SUNDAY', '06:00:00', '23:00:00', false, 'Regular Club Hours')
ON CONFLICT (id) DO NOTHING;

-- 4. Court blackouts table
CREATE TABLE IF NOT EXISTS court_blackouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_blackout_times CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_court_blackouts_court_dates ON court_blackouts(court_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_court_blackouts_active ON court_blackouts(is_deleted);

-- 5. Pricing rules table
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    day_type VARCHAR(20) NOT NULL,
    time_band VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_sport ON pricing_rules(sport_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_plan ON pricing_rules(plan_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_day_time ON pricing_rules(day_type, time_band);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_validity ON pricing_rules(valid_from, valid_to);

-- Seed comprehensive baseline pricing rules
-- (Peak: 17:00 to 23:00 weekdays, all day weekends; Offpeak: 06:00 to 17:00 weekdays)
INSERT INTO pricing_rules (id, sport_id, plan_id, day_type, time_band, start_time, end_time, price, priority, is_active) VALUES
    -- Default Walk-in / Guest baseline rules (plan_id is NULL)
    ('00000001-0000-0000-0000-000000000001', NULL, NULL, 'WEEKDAY', 'OFFPEAK', '06:00:00', '17:00:00', 20.00, 10, true),
    ('00000001-0000-0000-0000-000000000002', NULL, NULL, 'WEEKDAY', 'PEAK', '17:00:00', '23:00:00', 30.00, 10, true),
    ('00000001-0000-0000-0000-000000000003', NULL, NULL, 'WEEKEND', 'ALL', '06:00:00', '23:00:00', 30.00, 10, true),

    -- Silver Tier Member rules (plan_id = '22222222-2222-2222-2222-222222222222')
    ('00000002-0000-0000-0000-000000000001', NULL, '22222222-2222-2222-2222-222222222222', 'WEEKDAY', 'OFFPEAK', '06:00:00', '17:00:00', 15.00, 20, true),
    ('00000002-0000-0000-0000-000000000002', NULL, '22222222-2222-2222-2222-222222222222', 'WEEKDAY', 'PEAK', '17:00:00', '23:00:00', 22.50, 20, true),
    ('00000002-0000-0000-0000-000000000003', NULL, '22222222-2222-2222-2222-222222222222', 'WEEKEND', 'ALL', '06:00:00', '23:00:00', 22.50, 20, true),

    -- Gold Tier VIP Member rules (plan_id = '11111111-1111-1111-1111-111111111111') -> Configured Complimentary/Free (0.00)
    ('00000003-0000-0000-0000-000000000001', NULL, '11111111-1111-1111-1111-111111111111', 'ALL', 'ALL', '06:00:00', '23:00:00', 0.00, 30, true),

    -- Junior Cadet Member rules (plan_id = '33333333-3333-3333-3333-333333333333')
    ('00000004-0000-0000-0000-000000000001', NULL, '33333333-3333-3333-3333-333333333333', 'WEEKDAY', 'OFFPEAK', '06:00:00', '17:00:00', 10.00, 20, true),
    ('00000004-0000-0000-0000-000000000002', NULL, '33333333-3333-3333-3333-333333333333', 'WEEKDAY', 'PEAK', '17:00:00', '20:00:00', 15.00, 20, true),
    ('00000004-0000-0000-0000-000000000003', NULL, '33333333-3333-3333-3333-333333333333', 'WEEKEND', 'ALL', '06:00:00', '20:00:00', 15.00, 20, true)
ON CONFLICT (id) DO NOTHING;

-- 6. Slot Holds table (for in-progress hold/checkout locks with 5-minute TTL)
CREATE TABLE IF NOT EXISTS slot_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hold_token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_hold_times CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_slot_holds_court_dates ON slot_holds(court_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_slot_holds_expires ON slot_holds(expires_at);
