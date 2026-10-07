-- V4__membership_lifecycle_and_notifications.sql
-- Membership Lifecycle, Expiry, DB Job Locks, Audit Events, Notifications, and Front Desk Check-in

-- 1. Evolve existing memberships table for full lifecycle tracking
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(100);
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS renewed_from UUID REFERENCES memberships(id) ON DELETE SET NULL;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS freeze_days INT NOT NULL DEFAULT 0;

-- Drop NOT NULL on legacy V1 columns to allow flexible creation
ALTER TABLE memberships ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE memberships ALTER COLUMN tier DROP NOT NULL;

-- Populate member_id and plan_id from existing members if matching user_id exists
UPDATE memberships m
SET member_id = mem.id,
    plan_id = mem.plan_id
FROM members mem
WHERE m.user_id = mem.user_id AND m.member_id IS NULL;

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_plan_id ON memberships(plan_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships(end_date);
CREATE INDEX IF NOT EXISTS idx_memberships_dates ON memberships(start_date, end_date);

-- Enforce DB-level constraint: exactly one ACTIVE membership per member
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_one_active_membership 
    ON memberships(member_id) 
    WHERE (status = 'ACTIVE' AND is_deleted = false AND member_id IS NOT NULL);

-- 2. Membership Events (Audit Trail for lifecycle transitions)
CREATE TABLE IF NOT EXISTS membership_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    effective_date DATE NOT NULL,
    actor VARCHAR(100) NOT NULL,
    reason TEXT,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_membership_events_membership ON membership_events(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_events_member ON membership_events(member_id);
CREATE INDEX IF NOT EXISTS idx_membership_events_type ON membership_events(event_type);
CREATE INDEX IF NOT EXISTS idx_membership_events_created ON membership_events(created_at);

-- 3. Membership Reminders (Deduplication record: member + membership + type)
CREATE TABLE IF NOT EXISTS membership_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    channel VARCHAR(30) NOT NULL DEFAULT 'ALL',
    status VARCHAR(30) NOT NULL DEFAULT 'SENT',
    CONSTRAINT uq_member_membership_reminder_type UNIQUE (member_id, membership_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_reminders_member ON membership_reminders(member_id);
CREATE INDEX IF NOT EXISTS idx_reminders_membership ON membership_reminders(membership_id);

-- 4. DB-Locked Scheduled Jobs Table (Multi-instance safe and idempotent)
CREATE TABLE IF NOT EXISTS job_executions (
    job_name VARCHAR(100) PRIMARY KEY,
    locked_by VARCHAR(100) NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL,
    locked_until TIMESTAMPTZ NOT NULL,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_run_duration_ms BIGINT
);

-- 5. Notifications Module
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'DELIVERED',
    retry_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    expiry_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    booking_updates BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_promos BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_notification_prefs UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    template_code VARCHAR(100) PRIMARY KEY,
    subject_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    channels VARCHAR(100) NOT NULL DEFAULT 'IN_APP,EMAIL,SMS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notification_templates (template_code, subject_template, body_template, channels) VALUES
('EXPIRY_30_DAYS', 'Champions Club Membership Expiry Reminder (30 Days Left)', 'Hello {{name}}, your {{planName}} membership will expire in 30 days on {{endDate}}. Renew early to retain your member booking perks!', 'IN_APP,EMAIL,SMS'),
('EXPIRY_7_DAYS', 'Important: 7 Days Remaining on Champions Club Membership', 'Hello {{name}}, only 7 days remain on your {{planName}} membership (expires {{endDate}}). Click here or visit the front desk to renew today.', 'IN_APP,EMAIL,SMS'),
('EXPIRY_1_DAY', 'Urgent: Your Champions Club Membership Expires Tomorrow!', 'Hello {{name}}, your {{planName}} membership expires tomorrow ({{endDate}}). Renew now to avoid losing your 25% discount and advance booking window!', 'IN_APP,EMAIL,SMS'),
('EXPIRY_TODAY', 'Action Required: Your Membership Expires Today!', 'Hello {{name}}, your {{planName}} membership expires today ({{endDate}}). Renew now to maintain uninterrupted court booking privileges.', 'IN_APP,EMAIL,SMS'),
('MEMBERSHIP_EXPIRED', 'Your Champions Club Membership Has Expired', 'Hello {{name}}, your {{planName}} membership expired on {{endDate}}. Renew now to restore member-rate court bookings and privileges.', 'IN_APP,EMAIL,SMS'),
('MEMBERSHIP_RENEWED', 'Membership Successfully Renewed!', 'Hello {{name}}, your {{planName}} membership has been renewed until {{endDate}}. Thank you for being a valued Champions Club member!', 'IN_APP,EMAIL,SMS'),
('CHECK_IN_SUCCESS', 'Checked In at Champions Club', 'Welcome to Champions Club, {{name}}! You have successfully checked in at {{location}}.', 'IN_APP')
ON CONFLICT (template_code) DO NOTHING;

-- 6. Member Check-ins (Front Desk QR scanning & 5-minute duplicate prevention)
CREATE TABLE IF NOT EXISTS member_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    status_banner VARCHAR(50) NOT NULL,
    days_left INT,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_in_by VARCHAR(100) NOT NULL,
    location VARCHAR(100) DEFAULT 'FRONT_DESK_MAIN',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_member_check_ins_member_time ON member_check_ins(member_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_check_ins_time ON member_check_ins(checked_in_at DESC);

-- 7. Add suspended_at to members table for freeze days tracking
ALTER TABLE members ADD COLUMN IF NOT EXISTS suspended_at DATE;
