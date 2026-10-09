-- V12__leads_quotes_public.sql
-- Module: PUBLIC WEBSITE + LEAD CRM + QUOTES

-- 1. Sequences for human-readable numbers
CREATE SEQUENCE IF NOT EXISTS quote_no_seq START WITH 1001 INCREMENT BY 1;

-- 2. Corporate Clients (Corporate CRM leads and managed accounts)
CREATE TABLE IF NOT EXISTS corporate_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(50),
    corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
    package_interest VARCHAR(100),
    headcount INT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_corp_clients_name ON corporate_clients(company_name);
CREATE INDEX IF NOT EXISTS idx_corp_clients_email ON corporate_clients(email);

-- 3. Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    source VARCHAR(50) NOT NULL,
    interest VARCHAR(100),
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    follow_up_at TIMESTAMPTZ,
    lost_reason TEXT,
    consent BOOLEAN NOT NULL DEFAULT TRUE,
    converted_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lead_source CHECK (source IN ('WEB_FORM', 'TRIAL', 'PHONE', 'WALK_IN', 'CORPORATE')),
    CONSTRAINT chk_lead_status CHECK (status IN ('NEW', 'CONTACTED', 'QUOTE_SENT', 'TRIAL_BOOKED', 'WON', 'LOST')),
    CONSTRAINT chk_lead_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- 4. Lead Activities (Timeline: notes, calls, emails, status changes, converted)
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    performer_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lead_activity_type CHECK (type IN ('NOTE', 'CALL', 'EMAIL', 'STATUS_CHANGE', 'SYSTEM', 'ENQUIRY_UPDATE', 'QUOTE_CREATED', 'CONVERTED'))
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created ON lead_activities(created_at);

-- 5. Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    lines TEXT NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valid_until TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SENT',
    pdf_url VARCHAR(500),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quote_status CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'REJECTED')),
    CONSTRAINT chk_quote_subtotal_pos CHECK (subtotal >= 0),
    CONSTRAINT chk_quote_tax_pos CHECK (tax >= 0),
    CONSTRAINT chk_quote_total_pos CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quotes_lead ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);

-- 6. Initial Seed Data: Sample Leads across CRM Pipeline stages
INSERT INTO leads (id, name, email, phone, source, interest, message, status, follow_up_at, consent, created_at)
VALUES 
    ('e1111111-1111-1111-1111-111111111101', 'Arjun Sharma', 'arjun.sharma@example.com', '+919876543210', 'WEB_FORM', 'Badminton', 'Interested in evening badminton court slots and coaching options.', 'NEW', CURRENT_TIMESTAMP + INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('e1111111-1111-1111-1111-111111111102', 'Priya Patel', 'priya.patel@example.com', '+919876543211', 'PHONE', 'Tennis', 'Called inquiring about annual Gold membership for family.', 'CONTACTED', CURRENT_TIMESTAMP + INTERVAL '2 days', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('e1111111-1111-1111-1111-111111111103', 'Vikram Seth', 'vikram.seth@example.com', '+919876543212', 'CORPORATE', 'Corporate Membership', 'Seeking bulk corporate membership quote for 25 employees at Infosys.', 'QUOTE_SENT', CURRENT_TIMESTAMP - INTERVAL '1 day', true, CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('e1111111-1111-1111-1111-111111111104', 'Sneha Roy', 'sneha.roy@example.com', '+919876543213', 'TRIAL', 'Squash', 'Booked Saturday 10:00 AM trial session for squash court.', 'TRIAL_BOOKED', CURRENT_TIMESTAMP + INTERVAL '3 days', true, CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('e1111111-1111-1111-1111-111111111105', 'Rohan Verma', 'rohan.verma@example.com', '+919876543214', 'WALK_IN', 'Gym & Recovery', 'Enrolled as Gold Member after club tour.', 'WON', NULL, true, CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('e1111111-1111-1111-1111-111111111106', 'Devraj Singh', 'devraj.singh@example.com', '+919876543215', 'WEB_FORM', 'Pickleball', 'Looking for weekend tournament leagues only.', 'LOST', NULL, true, CURRENT_TIMESTAMP - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- Seed Lead Activities
INSERT INTO lead_activities (id, lead_id, type, details, performer_name, created_at)
VALUES
    ('a1111111-1111-1111-1111-111111111101', 'e1111111-1111-1111-1111-111111111101', 'SYSTEM', 'Enquiry received via website contact form.', 'System Bot', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('a1111111-1111-1111-1111-111111111102', 'e1111111-1111-1111-1111-111111111102', 'CALL', 'Spoke on phone for 10 mins. Explained Gold family benefits. Follow-up scheduled.', 'Front Desk', CURRENT_TIMESTAMP - INTERVAL '18 hours'),
    ('a1111111-1111-1111-1111-111111111103', 'e1111111-1111-1111-1111-111111111103', 'QUOTE_CREATED', 'Generated and sent corporate quotation QT-2026-1001 for 25 Tier-1 passes.', 'Sales Manager', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('a1111111-1111-1111-1111-111111111104', 'e1111111-1111-1111-1111-111111111104', 'SYSTEM', 'Trial court reservation confirmed for Court 2 on Saturday 10:00 AM.', 'System Bot', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('a1111111-1111-1111-1111-111111111105', 'e1111111-1111-1111-1111-111111111105', 'CONVERTED', 'Converted to Gold Member CC-1001. Welcome pack and club tour completed.', 'Club Manager', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('a1111111-1111-1111-1111-111111111106', 'e1111111-1111-1111-1111-111111111106', 'STATUS_CHANGE', 'Status marked LOST. Reason: Relocated to another city.', 'Front Desk', CURRENT_TIMESTAMP - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Quote
INSERT INTO quotes (id, lead_id, quote_number, lines, subtotal, tax, total, valid_until, status, pdf_url, notes, created_at)
VALUES
    ('q1111111-1111-1111-1111-111111111101', 'e1111111-1111-1111-1111-111111111103', 'QT-2026-1001', 
    '[{"description":"Corporate Annual Gold Membership (25 Pax)","quantity":25,"unitPrice":1200.00,"amount":30000.00},{"description":"Dedicated Squash Court Priority Booking Block","quantity":1,"unitPrice":5000.00,"amount":5000.00}]',
    35000.00, 6300.00, 41300.00, CURRENT_TIMESTAMP + INTERVAL '14 days', 'SENT', '/api/v1/crm/quotes/q1111111-1111-1111-1111-111111111101/pdf', 'Custom corporate package with 18% GST included.', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Seed Corporate Client
INSERT INTO corporate_clients (id, company_name, contact_person, email, phone, package_interest, headcount, notes, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111101', 'Infosys Tech Park', 'Vikram Seth', 'vikram.seth@example.com', '+919876543212', 'Corporate Gold Tier', 25, 'Requires monthly consolidated billing.', true)
ON CONFLICT (id) DO NOTHING;
