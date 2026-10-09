-- V11__bar_pos_tabs_kitchen.sql
-- Module: BAR + CAFETERIA (POS, Tabs, Kitchen Display System, Shifts, Daily Close)

-- 1. Sequences for human-readable Tab and Ticket numbers
CREATE SEQUENCE IF NOT EXISTS tab_no_seq START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS kitchen_ticket_no_seq START WITH 101 INCREMENT BY 1;

-- 2. Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON menu_categories(is_active, display_order);

-- 3. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    tax_category VARCHAR(50) NOT NULL DEFAULT 'GST_5',
    prep_station VARCHAR(20) NOT NULL DEFAULT 'BAR', -- KITCHEN, BAR
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    modifiers TEXT DEFAULT '[]',
    is_alcoholic BOOLEAN NOT NULL DEFAULT FALSE,
    ingredient_stock_link VARCHAR(100),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_menu_item_price CHECK (price >= 0),
    CONSTRAINT chk_menu_item_prep_station CHECK (prep_station IN ('KITCHEN', 'BAR'))
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available, is_deleted);
CREATE INDEX IF NOT EXISTS idx_menu_items_prep_station ON menu_items(prep_station);

-- 4. Bar Tables
CREATE TABLE IF NOT EXISTS bar_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(50) NOT NULL UNIQUE,
    seats INT NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'FREE', -- FREE, OCCUPIED, RESERVED
    pos_x INT NOT NULL DEFAULT 0,
    pos_y INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bar_table_status CHECK (status IN ('FREE', 'OCCUPIED', 'RESERVED'))
);

CREATE INDEX IF NOT EXISTS idx_bar_tables_status ON bar_tables(status);

-- 5. Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL,
    station VARCHAR(50) NOT NULL, -- BAR, KITCHEN, POS
    start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_cash NUMERIC(12, 2),
    cash_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_variance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED
    cash_drawer_session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_shift_status CHECK (status IN ('OPEN', 'CLOSED'))
);

CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_user_id, status);
CREATE INDEX IF NOT EXISTS idx_shifts_station ON shifts(station, status);

-- 6. Tabs
CREATE TABLE IF NOT EXISTS tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tab_number VARCHAR(50) NOT NULL UNIQUE,
    table_id UUID REFERENCES bar_tables(id) ON DELETE SET NULL,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    guest_name VARCHAR(150),
    guest_is_under_18 BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, SETTLED, VOID
    opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tip_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_carried_forward BOOLEAN NOT NULL DEFAULT FALSE,
    carry_forward_reason TEXT,
    carry_forward_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    settled_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tab_status CHECK (status IN ('OPEN', 'SETTLED', 'VOID'))
);

CREATE INDEX IF NOT EXISTS idx_tabs_status ON tabs(status);
CREATE INDEX IF NOT EXISTS idx_tabs_table ON tabs(table_id);
CREATE INDEX IF NOT EXISTS idx_tabs_member ON tabs(member_id);
CREATE INDEX IF NOT EXISTS idx_tabs_shift ON tabs(shift_id);
CREATE INDEX IF NOT EXISTS idx_tabs_carried_forward ON tabs(is_carried_forward);

-- 7. Tab Items
CREATE TABLE IF NOT EXISTS tab_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tab_id UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(150) NOT NULL,
    station VARCHAR(20) NOT NULL DEFAULT 'BAR', -- KITCHEN, BAR
    unit_price NUMERIC(10, 2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    discount_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    modifiers TEXT DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'NEW', -- NEW, PREPARING, READY, SERVED, VOID
    voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tab_item_qty CHECK (qty > 0),
    CONSTRAINT chk_tab_item_status CHECK (status IN ('NEW', 'PREPARING', 'READY', 'SERVED', 'VOID'))
);

CREATE INDEX IF NOT EXISTS idx_tab_items_tab ON tab_items(tab_id);
CREATE INDEX IF NOT EXISTS idx_tab_items_status ON tab_items(status);
CREATE INDEX IF NOT EXISTS idx_tab_items_station ON tab_items(station);

-- 8. Kitchen Tickets (generated per prep station)
CREATE TABLE IF NOT EXISTS kitchen_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    tab_id UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
    table_id UUID REFERENCES bar_tables(id) ON DELETE SET NULL,
    table_label VARCHAR(50),
    station VARCHAR(20) NOT NULL, -- KITCHEN, BAR
    status VARCHAR(20) NOT NULL DEFAULT 'NEW', -- NEW, PREPARING, READY, COMPLETED, CANCELLED
    order_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_kitchen_ticket_station CHECK (station IN ('KITCHEN', 'BAR')),
    CONSTRAINT chk_kitchen_ticket_status CHECK (status IN ('NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_station_status ON kitchen_tickets(station, status);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_tab ON kitchen_tickets(tab_id);

-- 9. Kitchen Ticket Items
CREATE TABLE IF NOT EXISTS kitchen_ticket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
    tab_item_id UUID NOT NULL REFERENCES tab_items(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    qty INT NOT NULL,
    modifiers TEXT DEFAULT '[]',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW', -- NEW, PREPARING, READY, SERVED, VOID
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kt_items_ticket ON kitchen_ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kt_items_status ON kitchen_ticket_items(status);

-- 10. Tab Splits
CREATE TABLE IF NOT EXISTS tab_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tab_id UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
    split_number INT NOT NULL,
    split_type VARCHAR(20) NOT NULL, -- EQUAL, BY_ITEM, CUSTOM
    amount NUMERIC(12, 2) NOT NULL,
    tip_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID
    item_ids TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tab_splits_tab ON tab_splits(tab_id);

-- 11. Seed Menu Categories
INSERT INTO menu_categories (id, name, code, display_order, is_active)
VALUES
    ('c1000001-0000-0000-0000-000000000001', 'Artisan Coffee & Tea', 'HOT_BREWS', 1, true),
    ('c1000002-0000-0000-0000-000000000002', 'Smoothies & Hydration', 'BEVERAGES', 2, true),
    ('c1000003-0000-0000-0000-000000000003', 'Cocktails & Craft Spirits', 'ALCOHOL_BAR', 3, true),
    ('c1000004-0000-0000-0000-000000000004', 'Quick Bites & Appetizers', 'APPETIZERS', 4, true),
    ('c1000005-0000-0000-0000-000000000005', 'Main Meals & Kitchen Specials', 'MAINS', 5, true),
    ('c1000006-0000-0000-0000-000000000006', 'Healthy Bowls & Salads', 'BOWLS', 6, true)
ON CONFLICT (code) DO NOTHING;

-- 12. Seed Menu Items
INSERT INTO menu_items (id, category_id, name, description, price, tax_category, prep_station, is_available, modifiers, is_alcoholic)
VALUES
    -- Coffee & Tea (Bar)
    ('m1000001-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001', 'Champions Espresso Roast', 'Double-shot artisanal single origin roast', 140.00, 'GST_5', 'BAR', true, '[{"group":"Milk","options":["Whole Milk","Oat Milk","Almond Milk"]},{"group":"Sugar","options":["No Sugar","Normal","Extra Sugar"]}]', false),
    ('m1000002-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000001', 'Oat Milk Cappuccino', 'Velvety microfoam over organic espresso', 190.00, 'GST_5', 'BAR', true, '[{"group":"Temperature","options":["Hot","Iced"]},{"group":"Flavour","options":["Vanilla","Caramel","None"]}]', false),
    ('m1000003-0000-0000-0000-000000000003', 'c1000001-0000-0000-0000-000000000001', 'Matcha Green Tea Latte', 'Ceremonial grade Uji matcha with steamed milk', 220.00, 'GST_5', 'BAR', true, '[]', false),

    -- Smoothies & Hydration (Bar)
    ('m1000004-0000-0000-0000-000000000004', 'c1000002-0000-0000-0000-000000000002', 'Electrolyte Citrus Booster', 'Fresh orange, lemon, sea salt, electrolyte blend', 160.00, 'GST_5', 'BAR', true, '[{"group":"Ice","options":["Regular Ice","Light Ice","No Ice"]}]', false),
    ('m1000005-0000-0000-0000-000000000005', 'c1000002-0000-0000-0000-000000000002', 'High Protein Berry Blast', 'Whey isolate, blueberries, Greek yogurt, chia', 280.00, 'GST_5', 'BAR', true, '[{"group":"Protein Choice","options":["Whey Vanilla","Whey Chocolate","Plant Protein"]}]', false),

    -- Alcohol (Bar) - Safeguarded for 18+
    ('m1000006-0000-0000-0000-000000000006', 'c1000003-0000-0000-0000-000000000003', 'Classic Mojito', 'White rum, fresh mint leaves, lime juice, sparkling soda', 380.00, 'GST_18', 'BAR', true, '[{"group":"Ice","options":["Standard Ice","Extra Ice"]}]', true),
    ('m1000007-0000-0000-0000-000000000007', 'c1000003-0000-0000-0000-000000000003', 'Club Craft IPA Draught (500ml)', 'Freshly tapped hoppy Indian Pale Ale', 340.00, 'GST_18', 'BAR', true, '[]', true),
    ('m1000008-0000-0000-0000-000000000008', 'c1000003-0000-0000-0000-000000000003', 'Single Malt Scotch (60ml)', '12-Year aged Highland single malt whiskey', 650.00, 'GST_18', 'BAR', true, '[{"group":"Serve","options":["Neat","On The Rocks","With Water"]}]', true),

    -- Kitchen Appetizers
    ('m1000009-0000-0000-0000-000000000009', 'c1000004-0000-0000-0000-000000000004', 'Truffle Parmesan Fries', 'Hand-cut fries, truffle essence, aged parmesan, herb dip', 240.00, 'GST_5', 'KITCHEN', true, '[{"group":"Dip","options":["Herb Aioli","Spicy Sriracha","Truffle Mayo"]}]', false),
    ('m1000010-0000-0000-0000-000000000010', 'c1000004-0000-0000-0000-000000000004', 'Crispy Falafel & Hummus Platter', 'House spiced falafels, roasted garlic hummus, warm pita', 290.00, 'GST_5', 'KITCHEN', true, '[]', false),

    -- Kitchen Mains
    ('m1000011-0000-0000-0000-000000000011', 'c1000005-0000-0000-0000-000000000005', 'Artisan Sourdough Club Sandwich', 'Smoked chicken breast, avocado, butter lettuce, sourdough', 350.00, 'GST_5', 'KITCHEN', true, '[{"group":"Side","options":["Fries","House Salad","Sweet Potato Wedges"]}]', false),
    ('m1000012-0000-0000-0000-000000000012', 'c1000005-0000-0000-0000-000000000005', 'Wood-Fired Margherita Pizza', 'San Marzano tomato sauce, fresh buffalo mozzarella, basil', 420.00, 'GST_5', 'KITCHEN', true, '[{"group":"Crust","options":["Thin Crust","Standard Neapolitan"]}]', false),

    -- Bowls (Kitchen)
    ('m1000013-0000-0000-0000-000000000013', 'c1000006-0000-0000-0000-000000000006', 'Grilled Norwegian Salmon Bowl', 'Wild quinoa, edamame, avocado, ginger miso vinaigrette', 490.00, 'GST_5', 'KITCHEN', true, '[{"group":"Dressing","options":["Ginger Miso","Tahini Lemon","Balsamic"]}]', false)
ON CONFLICT (id) DO NOTHING;

-- 13. Seed Bar Tables
INSERT INTO bar_tables (id, label, seats, status, pos_x, pos_y, is_active)
VALUES
    ('t1000001-0000-0000-0000-000000000001', 'T-01', 2, 'FREE', 1, 1, true),
    ('t1000002-0000-0000-0000-000000000002', 'T-02', 4, 'FREE', 2, 1, true),
    ('t1000003-0000-0000-0000-000000000003', 'T-03', 4, 'FREE', 3, 1, true),
    ('t1000004-0000-0000-0000-000000000004', 'T-04', 6, 'FREE', 4, 1, true),
    ('t1000005-0000-0000-0000-000000000005', 'T-05', 4, 'FREE', 1, 2, true),
    ('t1000006-0000-0000-0000-000000000006', 'T-06', 4, 'FREE', 2, 2, true),
    ('t1000007-0000-0000-0000-000000000007', 'T-07', 8, 'FREE', 3, 2, true),
    ('t1000008-0000-0000-0000-000000000008', 'T-08', 2, 'FREE', 4, 2, true),
    ('t1000009-0000-0000-0000-000000000009', 'Bar 1', 1, 'FREE', 1, 3, true),
    ('t1000010-0000-0000-0000-000000000010', 'Bar 2', 1, 'FREE', 2, 3, true),
    ('t1000011-0000-0000-0000-000000000011', 'Bar 3', 1, 'FREE', 3, 3, true),
    ('t1000012-0000-0000-0000-000000000012', 'Lounge 1', 6, 'FREE', 4, 3, true)
ON CONFLICT (label) DO NOTHING;
