-- Flyway V9: Shop Orders, Member Carts, Fulfilment Lifecycle & Status Machine

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    guest_name VARCHAR(150),
    guest_phone VARCHAR(50),
    guest_email VARCHAR(150),
    channel VARCHAR(20) NOT NULL, -- COUNTER, ONLINE
    fulfilment_type VARCHAR(20) NOT NULL, -- PICKUP, DELIVERY, INSTORE
    status VARCHAR(30) NOT NULL DEFAULT 'CART', -- CART, PLACED, PAID, PACKED, READY, OUT_FOR_DELIVERY, COMPLETED, CANCELLED, REFUNDED
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    idempotency_key VARCHAR(100) UNIQUE,
    pickup_code VARCHAR(20),
    delivery_address TEXT,
    delivery_city VARCHAR(100),
    delivery_pincode VARCHAR(20),
    delivery_notes TEXT,
    payment_method VARCHAR(50), -- CASH, CARD, UPI, WALLET
    payment_reference VARCHAR(100),
    paid_at TIMESTAMPTZ,
    placed_at TIMESTAMPTZ,
    packed_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    out_for_delivery_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    refund_reference VARCHAR(100),
    refund_amount NUMERIC(10, 2),
    refunded_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    service_id UUID REFERENCES club_services(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'PRODUCT', -- PRODUCT, SERVICE
    item_name VARCHAR(200) NOT NULL,
    sku VARCHAR(100),
    qty INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    unit_discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit_tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_items_qty CHECK (qty > 0)
);

CREATE TABLE IF NOT EXISTS order_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order ON order_status_logs(order_id);
