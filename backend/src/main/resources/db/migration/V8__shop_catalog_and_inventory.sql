-- V8__shop_catalog_and_inventory.sql
-- Module: SHOP CATALOG + INVENTORY

-- 1. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Categories
INSERT INTO product_categories (id, code, name, description, display_order)
VALUES 
    ('44444444-4444-4444-4444-111111111111', 'RACKETS', 'Rackets', 'Professional tennis, badminton, and squash rackets', 1),
    ('44444444-4444-4444-4444-222222222222', 'BALLS', 'Balls', 'Competition and training balls, shuttlecocks, and tubes', 2),
    ('44444444-4444-4444-4444-333333333333', 'SHOES', 'Shoes', 'Court footwear with non-marking performance soles', 3),
    ('44444444-4444-4444-4444-444444444444', 'ACCESSORIES', 'Accessories', 'Grips, dampeners, bags, wristbands, and lead tape', 4),
    ('44444444-4444-4444-4444-555555555555', 'APPAREL', 'Apparel', 'Performance jerseys, shorts, tracksuits, and caps', 5)
ON CONFLICT (code) DO NOTHING;

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
    brand VARCHAR(100) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    tax_category VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    images TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_product_base_price CHECK (base_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- 3. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    size VARCHAR(50),
    color VARCHAR(50),
    price_override NUMERIC(10, 2),
    barcode VARCHAR(100) UNIQUE,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reorder_level INT NOT NULL DEFAULT 5,
    reorder_qty INT NOT NULL DEFAULT 20,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_variant_reorder_level CHECK (reorder_level >= 0),
    CONSTRAINT chk_variant_reorder_qty CHECK (reorder_qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_deleted ON product_variants(is_deleted);

-- 4. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    variant_id UUID PRIMARY KEY REFERENCES product_variants(id) ON DELETE RESTRICT,
    on_hand INT NOT NULL DEFAULT 0,
    reserved INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_inventory_on_hand CHECK (on_hand >= 0),
    CONSTRAINT chk_inventory_reserved CHECK (reserved >= 0),
    CONSTRAINT chk_inventory_available CHECK (on_hand >= reserved)
);

CREATE INDEX IF NOT EXISTS idx_inventory_on_hand ON inventory(on_hand);
CREATE INDEX IF NOT EXISTS idx_inventory_reserved ON inventory(reserved);

-- 5. Stock Movements Table (Append-Only Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL, -- PURCHASE, SALE, RETURN, ADJUSTMENT, RESERVE, RELEASE
    qty INT NOT NULL,
    reference VARCHAR(150),
    reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- 6. Low Stock Alerts Table
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    current_available INT NOT NULL,
    reorder_level INT NOT NULL,
    reorder_qty INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED, DISMISSED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_active_low_stock_alert 
    ON low_stock_alerts(variant_id) 
    WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_status ON low_stock_alerts(status);

-- 7. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    contact_name VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    payment_terms VARCHAR(50) NOT NULL DEFAULT 'NET_30',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

-- 9. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    ordered_qty INT NOT NULL,
    received_qty INT NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_po_ordered_qty CHECK (ordered_qty > 0),
    CONSTRAINT chk_po_received_qty CHECK (received_qty >= 0 AND received_qty <= ordered_qty)
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_variant ON purchase_order_items(variant_id);

-- 10. Supplier Bills Table (feeds "what we owe" in P14)
CREATE TABLE IF NOT EXISTS supplier_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_bill_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_supplier_bills_supplier ON supplier_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_po ON supplier_bills(po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_status ON supplier_bills(status);

-- 11. Services (Non-Stock Items) Table
CREATE TABLE IF NOT EXISTS club_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- RESTRINGING, RENTAL, HIRE
    base_price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Services
INSERT INTO club_services (id, code, name, service_type, base_price, description)
VALUES 
    ('55555555-5555-5555-5555-111111111111', 'RESTRINGING', 'Pro Racket Re-Stringing', 'RESTRINGING', 25.00, 'Custom restringing service with tournament electronic tensioning'),
    ('55555555-5555-5555-5555-222222222222', 'RACKET_RENTAL', 'Demo / Match Racket Rental', 'RENTAL', 10.00, 'Premium Yonex / Wilson racket 2-hour court session rental'),
    ('55555555-5555-5555-5555-333333333333', 'SHOE_RENTAL', 'Court Footwear Rental', 'RENTAL', 6.00, 'Clean non-marking court shoe rental with sanitization'),
    ('55555555-5555-5555-5555-444444444444', 'BALL_MACHINE', 'Spinshot Ball-Machine Hire', 'HIRE', 20.00, 'Automated programmable ball machine hire per hour')
ON CONFLICT (code) DO NOTHING;

-- 12. Service Job Tickets Table
CREATE TABLE IF NOT EXISTS service_job_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    service_id UUID NOT NULL REFERENCES club_services(id) ON DELETE RESTRICT,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    guest_name VARCHAR(150),
    guest_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, IN_PROGRESS, READY, COMPLETED, CANCELLED
    string_type VARCHAR(100),
    tension_lbs NUMERIC(4, 1),
    turnaround_type VARCHAR(50) DEFAULT 'STANDARD_3_DAYS',
    loan_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    loan_returned BOOLEAN NOT NULL DEFAULT FALSE,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_tickets_status ON service_job_tickets(status);
CREATE INDEX IF NOT EXISTS idx_job_tickets_member ON service_job_tickets(member_id);
CREATE INDEX IF NOT EXISTS idx_job_tickets_service ON service_job_tickets(service_id);

-- 13. Shop Orders & Snapshot Items Table
CREATE TABLE IF NOT EXISTS shop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    customer_name VARCHAR(150),
    total_base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- PENDING, COMPLETED, CANCELLED, REFUNDED
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    service_id UUID REFERENCES club_services(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'PRODUCT', -- PRODUCT, SERVICE
    item_name VARCHAR(200) NOT NULL,
    sku VARCHAR(100),
    qty INT NOT NULL,
    unit_base_price NUMERIC(10, 2) NOT NULL,
    unit_discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit_tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit_final_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_item_qty CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON shop_order_items(variant_id);

-- 14. Seed Suppliers
INSERT INTO suppliers (id, name, contact_name, email, phone, payment_terms, active)
VALUES 
    ('66666666-6666-6666-6666-111111111111', 'Yonex Global Wholesale', 'Kenji Sato', 'orders@yonex-dist.com', '+1-800-449-6639', 'NET_30', true),
    ('66666666-6666-6666-6666-222222222222', 'Wilson Sporting Goods', 'Sarah Jenkins', 'proshop@wilson-supply.com', '+1-800-275-4864', 'NET_30', true),
    ('66666666-6666-6666-6666-333333333333', 'Asics Athletic Gear', 'David Miller', 'b2b@asics-sports.com', '+1-800-678-9435', 'NET_15', true)
ON CONFLICT (name) DO NOTHING;

-- 15. Seed Initial Products
INSERT INTO products (id, sku, name, description, category_id, brand, base_price, tax_category, images, active)
VALUES 
    ('77777777-7777-7777-7777-111111111111', 'PRD-ASTROX99', 'Yonex Astrox 99 Pro Badminton Racket', 'Head-heavy power racket engineered with Namd graphite for explosive offensive smashes.', '44444444-4444-4444-4444-111111111111', 'Yonex', 249.99, 'STANDARD', ARRAY['https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=600&auto=format&fit=crop&q=80'], true),
    ('77777777-7777-7777-7777-222222222222', 'PRD-PROSTAFF14', 'Wilson Pro Staff 97 v14 Tennis Racket', 'Precision braided 45 construction designed for ultimate pinpoint control and classic court feel.', '44444444-4444-4444-4444-111111111111', 'Wilson', 279.00, 'STANDARD', ARRAY['https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80'], true),
    ('77777777-7777-7777-7777-333333333333', 'PRD-AEROSENSA30', 'Yonex Aerosensa 30 Shuttlecocks (Tube of 12)', 'BWF tournament approved goose feather shuttlecocks with consistent trajectory and durability.', '44444444-4444-4444-4444-222222222222', 'Yonex', 34.50, 'STANDARD', ARRAY['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=80'], true),
    ('77777777-7777-7777-7777-444444444444', 'PRD-USOPENTEN', 'Wilson US Open Extra Duty Tennis Balls (Can of 3)', 'Official ball of the US Open Championship featuring premium high-altitude tournament woven felt.', '44444444-4444-4444-4444-222222222222', 'Wilson', 9.50, 'STANDARD', ARRAY['https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=600&auto=format&fit=crop&q=80'], true),
    ('77777777-7777-7777-7777-555555555555', 'PRD-GELROCKET11', 'Asics Gel-Rocket 11 Indoor Court Shoes', 'Multi-purpose indoor court shoe with GEL cushioning and flexible sole for lightning-quick pivots.', '44444444-4444-4444-4444-333333333333', 'Asics', 79.99, 'STANDARD', ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'], true),
    ('77777777-7777-7777-7777-666666666666', 'PRD-SUPERGRIP3', 'Yonex Super Grap Overgrip 3-Pack', 'Tacky absorbent synthetic polyurethane overgrips for maximum comfort and slip prevention.', '44444444-4444-4444-4444-444444444444', 'Yonex', 8.00, 'STANDARD', ARRAY['https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=80'], true),
    ('77777777-7777-7777-7777-777777777777', 'PRD-PROJERSEY', 'Champions Club Pro Aero Match Jersey', 'Moisture-wicking breathable dry-fit technical fabric engineered for high-intensity tournament play.', '44444444-4444-4444-4444-555555555555', 'Champions', 45.00, 'STANDARD', ARRAY['https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80'], true)
ON CONFLICT (sku) DO NOTHING;

-- 16. Seed Product Variants
INSERT INTO product_variants (id, product_id, sku, size, color, price_override, barcode, cost_price, reorder_level, reorder_qty)
VALUES 
    -- Astrox 99 Pro variants
    ('88888888-8888-8888-8888-111111111111', '77777777-7777-7777-7777-111111111111', 'VAR-ASTROX99-4U-BLK', '4U/G5', 'White/Tiger', 249.99, '890123456001', 160.00, 4, 15),
    ('88888888-8888-8888-8888-111111111112', '77777777-7777-7777-7777-111111111111', 'VAR-ASTROX99-3U-CHY', '3U/G5', 'Cherry Sunburst', 249.99, '890123456002', 160.00, 3, 10),
    -- Pro Staff 97 variants
    ('88888888-8888-8888-8888-222222222221', '77777777-7777-7777-7777-222222222222', 'VAR-PROSTAFF14-G2', 'Grip 2 (4 1/4")', 'Matte Bronze', 279.00, '890123456003', 185.00, 3, 10),
    ('88888888-8888-8888-8888-222222222222', '77777777-7777-7777-7777-222222222222', 'VAR-PROSTAFF14-G3', 'Grip 3 (4 3/8")', 'Matte Bronze', 279.00, '890123456004', 185.00, 4, 12),
    -- Aerosensa 30 shuttlecocks
    ('88888888-8888-8888-8888-333333333331', '77777777-7777-7777-7777-333333333333', 'VAR-AEROSENSA30-SPD77', 'Speed 77', 'Standard White', 34.50, '890123456005', 22.00, 10, 50),
    -- Wilson US Open Tennis Balls
    ('88888888-8888-8888-8888-444444444441', '77777777-7777-7777-7777-444444444444', 'VAR-USOPENTEN-CAN3', 'Can of 3', 'Optic Yellow', 9.50, '890123456006', 5.50, 15, 60),
    -- Asics Gel-Rocket 11 sizes
    ('88888888-8888-8888-8888-555555555551', '77777777-7777-7777-7777-555555555555', 'VAR-GELROCKET11-US9', 'US 9.0', 'Black/Electric Blue', 79.99, '890123456007', 48.00, 3, 10),
    ('88888888-8888-8888-8888-555555555552', '77777777-7777-7777-7777-555555555555', 'VAR-GELROCKET11-US10', 'US 10.0', 'Black/Electric Blue', 79.99, '890123456008', 48.00, 4, 10),
    -- Super Grap
    ('88888888-8888-8888-8888-666666666661', '77777777-7777-7777-7777-666666666666', 'VAR-SUPERGRIP3-WHT', 'Pack of 3', 'White', 8.00, '890123456009', 4.00, 12, 40),
    -- Match Jersey
    ('88888888-8888-8888-8888-777777777771', '77777777-7777-7777-7777-777777777777', 'VAR-PROJERSEY-M', 'Medium', 'Emerald/Teal', 45.00, '890123456010', 20.00, 5, 20),
    ('88888888-8888-8888-8888-777777777772', '77777777-7777-7777-7777-777777777777', 'VAR-PROJERSEY-L', 'Large', 'Emerald/Teal', 45.00, '890123456011', 20.00, 5, 20)
ON CONFLICT (sku) DO NOTHING;

-- 17. Seed Initial Inventory and Purchase Movements (Ledger Invariant: SUM(qty) == on_hand)
INSERT INTO inventory (variant_id, on_hand, reserved)
VALUES 
    ('88888888-8888-8888-8888-111111111111', 12, 0),
    ('88888888-8888-8888-8888-111111111112', 8, 0),
    ('88888888-8888-8888-8888-222222222221', 6, 0),
    ('88888888-8888-8888-8888-222222222222', 2, 0), -- Low stock! Available (2) <= reorder_level (4)
    ('88888888-8888-8888-8888-333333333331', 45, 0),
    ('88888888-8888-8888-8888-444444444441', 80, 0),
    ('88888888-8888-8888-8888-555555555551', 10, 0),
    ('88888888-8888-8888-8888-555555555552', 7, 0),
    ('88888888-8888-8888-8888-666666666661', 50, 0),
    ('88888888-8888-8888-8888-777777777771', 15, 0),
    ('88888888-8888-8888-8888-777777777772', 18, 0)
ON CONFLICT (variant_id) DO NOTHING;

-- Corresponding Append-Only Initial Stock Movements
INSERT INTO stock_movements (id, variant_id, type, qty, reference, reason)
VALUES 
    (gen_random_uuid(), '88888888-8888-8888-8888-111111111111', 'PURCHASE', 12, 'PO-INIT-001', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-111111111112', 'PURCHASE', 8, 'PO-INIT-001', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-222222222221', 'PURCHASE', 6, 'PO-INIT-002', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-222222222222', 'PURCHASE', 2, 'PO-INIT-002', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-333333333331', 'PURCHASE', 45, 'PO-INIT-001', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-444444444441', 'PURCHASE', 80, 'PO-INIT-002', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-555555555551', 'PURCHASE', 10, 'PO-INIT-003', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-555555555552', 'PURCHASE', 7, 'PO-INIT-003', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-666666666661', 'PURCHASE', 50, 'PO-INIT-001', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-777777777771', 'PURCHASE', 15, 'PO-INIT-004', 'Initial inventory opening balance'),
    (gen_random_uuid(), '88888888-8888-8888-8888-777777777772', 'PURCHASE', 18, 'PO-INIT-004', 'Initial inventory opening balance')
ON CONFLICT DO NOTHING;

-- Initial Low-Stock Alert for the low stock variant
INSERT INTO low_stock_alerts (variant_id, current_available, reorder_level, reorder_qty, status)
VALUES 
    ('88888888-8888-8888-8888-222222222222', 2, 4, 12, 'ACTIVE')
ON CONFLICT DO NOTHING;
