-- V6__booking_engine.sql
-- Module: BOOKING ENGINE (Exclusion Constraint, Co-players, Hold TTL, Waitlist, Idempotency)

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Alter bookings table to align with core booking engine requirements
DO $$
BEGIN
    -- Rename columns if they exist under old names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'start_time') THEN
        ALTER TABLE bookings RENAME COLUMN start_time TO start_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'end_time') THEN
        ALTER TABLE bookings RENAME COLUMN end_time TO end_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'total_amount') THEN
        ALTER TABLE bookings RENAME COLUMN total_amount TO price;
    END IF;
END $$;

-- Allow user_id to be nullable for walk-in / guest reservations
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;

-- Add new columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name VARCHAR(150);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(30);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'ONLINE';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS plan_snapshot VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Backfill plan_snapshot if tier_applied exists
UPDATE bookings SET plan_snapshot = tier_applied WHERE plan_snapshot IS NULL AND tier_applied IS NOT NULL;

-- 2. Drop legacy constraint and install strict half-open interval GiST exclusion constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_court_bookings;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_court_bookings EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (status IN ('HELD', 'CONFIRMED'));

-- Unique index for idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS uk_bookings_idempotency_key ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Performance indexes for booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_court_status_time ON bookings(court_id, status, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_member_start ON bookings(member_id, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_hold_expires ON bookings(hold_expires_at) WHERE status = 'HELD';
CREATE INDEX IF NOT EXISTS idx_bookings_status_end ON bookings(status, end_at);

-- 3. Booking Participants / Co-players table
CREATE TABLE IF NOT EXISTS booking_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    guest_name VARCHAR(150),
    guest_phone VARCHAR(30),
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_participants_booking ON booking_participants(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_participants_member ON booking_participants(member_id);

-- 4. Booking Waitlist table (FIFO queue on booked slots)
CREATE TABLE IF NOT EXISTS booking_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'WAITING', -- WAITING, OFFERED, CLAIMED, EXPIRED, CANCELLED
    hold_expires_at TIMESTAMPTZ,
    held_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_waitlist_window CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_court_slot ON booking_waitlist(court_id, start_at, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_member ON booking_waitlist(member_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status_expires ON booking_waitlist(status, hold_expires_at);
