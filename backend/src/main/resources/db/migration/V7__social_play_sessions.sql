-- V7__social_play_sessions.sql
-- Module: SOCIAL PLAY SESSIONS (Friday Mixer, Recurrence, Atomic Capacity, Waitlist, Court Block)

CREATE TABLE IF NOT EXISTS social_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE RESTRICT,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    parent_series_id UUID REFERENCES social_sessions(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    capacity INT NOT NULL,
    min_participants INT NOT NULL DEFAULT 4,
    fee_member NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    fee_guest NUMERIC(10,2) NOT NULL DEFAULT 15.00,
    recurrence_rule VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    allow_juniors BOOLEAN NOT NULL DEFAULT true,
    counts_toward_daily_quota BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_social_session_time CHECK (end_at > start_at),
    CONSTRAINT chk_social_session_capacity CHECK (capacity > 0),
    CONSTRAINT chk_social_session_min_participants CHECK (min_participants >= 0)
);

CREATE TABLE IF NOT EXISTS social_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES social_sessions(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    guest_name VARCHAR(150),
    guest_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'JOINED',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    fee_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attendance_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraints preventing duplicate active joins per session
CREATE UNIQUE INDEX IF NOT EXISTS uk_social_participants_member 
    ON social_participants(session_id, member_id) 
    WHERE member_id IS NOT NULL AND status != 'CANCELLED';

CREATE UNIQUE INDEX IF NOT EXISTS uk_social_participants_guest 
    ON social_participants(session_id, guest_phone) 
    WHERE guest_phone IS NOT NULL AND status != 'CANCELLED';

-- Performance indexes for querying sessions and participants
CREATE INDEX IF NOT EXISTS idx_social_sessions_court_time ON social_sessions(court_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_social_sessions_status_start ON social_sessions(status, start_at);
CREATE INDEX IF NOT EXISTS idx_social_sessions_series ON social_sessions(parent_series_id);
CREATE INDEX IF NOT EXISTS idx_social_participants_session_status ON social_participants(session_id, status, joined_at);
CREATE INDEX IF NOT EXISTS idx_social_participants_member ON social_participants(member_id, status);
