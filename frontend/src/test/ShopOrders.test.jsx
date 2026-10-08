import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';
import MemberShopPage from '../pages/member/MemberShopPage';
import ShopConsolePage from '../pages/staff/ShopConsolePage';
import shopApi from '../api/shopApi';

// Hoisted mock shopApi object so vitest hoisting allows factory access
const { mockShopApi } = vi.hoisted(() => {
  const api = {
    getCategories: vi.fn(),
    getServices: vi.fn(),
    getPublicCatalog: vi.fn(),
    getAllVariants: vi.fn(),
    getActiveLowStockAlerts: vi.fn(),
    getOrderQueue: vi.fn(),
    getCart: vi.fn(),
    addToCart: vi.fn(),
    updateCartItemQty: vi.fn(),
    removeCartItem: vi.fn(),
    clearCart: vi.fn(),
    checkout: vi.fn(),
    payOrder: vi.fn(),
    getMyOrders: vi.fn(),
    updateOrderStatus: vi.fn(),
    createCounterSale: vi.fn(),
    refundOrder: vi.fn(),
    getJobTickets: vi.fn(),
    getPurchaseOrders: vi.fn(),
    getSupplierBills: vi.fn(),
    getPriceQuote: vi.fn(),
  };
  return { mockShopApi: api };
});

vi.mock('../api/shopApi', () => ({
  shopApi: mockShopApi,
  default: mockShopApi,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', username: 'member_roger', role: 'MEMBER' },
    isAuthenticated: true,
  }),
}));

describe('Shop Orders Module Frontend Suite (PROMPT 9)', () => {
  let queryClient;

  const mockCartData = {
    cartId: 'cart-123',
    memberId: 'mem-123',
    items: [
      {
        id: 'item-1',
        variantId: 'var-shoes-1',
        productName: 'Asics Gel Resolution 9',
        variantSku: 'VAR-ASICS9-M10',
        size: '10 US',
        color: 'Navy/White',
        quantity: 1,
        unitBasePrice: 140.0,
        unitFinalPrice: 120.0,
        totalPrice: 120.0,
        currentAvailable: 1,
        outOfStock: false,
        priceChanged: false,
      },
    ],
    subtotal: 120.0,
    itemCount: 1,
    hasOutOfStockItems: false,
    hasPriceChanges: false,
  };

  const mockQueueOrders = [
    {
      id: 'ord-101',
      orderNo: 'ORD-20261008-001',
      memberId: 'mem-123',
      guestName: null,
      channel: 'ONLINE',
      fulfilmentType: 'PICKUP',
      status: 'PAID',
      subtotal: 120.0,
      discount: 20.0,
      tax: 21.6,
      deliveryFee: 0.0,
      total: 141.6,
      pickupCode: 'PK-4829',
      deliveryAddressSnapshot: null,
      createdAt: '2026-10-08T10:00:00Z',
      items: [
        {
          id: 'oi-1',
          variantSku: 'VAR-ASICS9-M10',
          productName: 'Asics Gel Resolution 9',
          quantity: 1,
          unitPriceSnapshot: 120.0,
          totalPrice: 120.0,
        },
      ],
    },
    {
      id: 'ord-102',
      orderNo: 'ORD-20261008-002',
      memberId: null,
      guestName: 'Walk-in John',
      channel: 'COUNTER',
      fulfilmentType: 'INSTORE',
      status: 'PACKED',
      subtotal: 9.99,
      discount: 0.0,
      tax: 1.8,
      deliveryFee: 0.0,
      total: 11.79,
      pickupCode: null,
      deliveryAddressSnapshot: null,
      createdAt: '2026-10-08T10:15:00Z',
      items: [
        {
          id: 'oi-2',
          variantSku: 'VAR-BALLS-US',
          productName: 'Wilson US Open Tennis Balls (Can)',
          quantity: 1,
          unitPriceSnapshot: 9.99,
          totalPrice: 9.99,
        },
      ],
    },
  ];

  const mockVariants = [
    {
      id: 'var-shoes-1',
      sku: 'VAR-ASICS9-M10',
      productName: 'Asics Gel Resolution 9',
      size: '10 US',
      color: 'Navy',
      effectivePrice: 120.0,
      costPrice: 80.0,
      onHand: 1,
      reserved: 0,
      available: 1,
      reorderLevel: 2,
      reorderQty: 5,
      stockStatus: 'LOW_STOCK',
    },
    {
      id: 'var-balls-1',
      sku: 'VAR-BALLS-US',
      productName: 'Wilson US Open Tennis Balls (Can)',
      size: 'Standard',
      color: 'Yellow',
      effectivePrice: 9.99,
      costPrice: 6.0,
      onHand: 50,
      reserved: 0,
      available: 50,
      reorderLevel: 10,
      reorderQty: 40,
      stockStatus: 'IN_STOCK',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockShopApi.getCategories.mockResolvedValue([]);
    mockShopApi.getServices.mockResolvedValue([]);
    mockShopApi.getPublicCatalog.mockResolvedValue({ content: [] });
    mockShopApi.getAllVariants.mockResolvedValue(mockVariants);
    mockShopApi.getActiveLowStockAlerts.mockResolvedValue([]);
    mockShopApi.getOrderQueue.mockResolvedValue(mockQueueOrders);
    mockShopApi.getCart.mockResolvedValue(mockCartData);
    mockShopApi.getMyOrders.mockResolvedValue(mockQueueOrders);
    mockShopApi.getJobTickets.mockResolvedValue([]);
    mockShopApi.getPurchaseOrders.mockResolvedValue([]);
    mockShopApi.getSupplierBills.mockResolvedValue([]);
  });

  const renderMemberShop = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            <MemberShopPage />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

  const renderStaffConsole = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>
            <ShopConsolePage />
          </ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders member cart badge and opens cart drawer with items and subtotal', async () => {
    renderMemberShop();

    const cartBadge = await screen.findByTestId('cart-badge-count');
    expect(cartBadge).toHaveTextContent('1');

    const openCartBtn = screen.getByTestId('open-cart-btn');
    fireEvent.click(openCartBtn);

    expect(await screen.findByText('Asics Gel Resolution 9')).toBeInTheDocument();
    expect(screen.getByText(/VAR-ASICS9-M10/)).toBeInTheDocument();
    expect(screen.getAllByText(/\$120\.00/)[0]).toBeInTheDocument();
    expect(screen.getByTestId('proceed-to-checkout-btn')).toBeInTheDocument();
  });

  it('opens checkout modal and validates delivery address and pincode', async () => {
    renderMemberShop();

    await screen.findByTestId('cart-badge-count');
    fireEvent.click(screen.getByTestId('open-cart-btn'));

    const proceedBtn = await screen.findByTestId('proceed-to-checkout-btn');
    fireEvent.click(proceedBtn);

    expect(await screen.findByText(/Order Checkout & Fulfillment/i)).toBeInTheDocument();

    // Switch to Home Delivery
    const deliveryTab = screen.getByRole('button', { name: /Home Delivery/i });
    fireEvent.click(deliveryTab);

    // Fill address, city, and invalid pincode
    const addressInput = await screen.findByTestId('delivery-address-input');
    fireEvent.change(addressInput, { target: { value: '123 Court St' } });
    const cityInput = screen.getByTestId('delivery-city-input');
    fireEvent.change(cityInput, { target: { value: 'Metropolis' } });
    const pincodeInput = screen.getByTestId('delivery-pincode-input');
    fireEvent.change(pincodeInput, { target: { value: '123' } });

    // Submit checkout
    const placeOrderBtn = screen.getByTestId('confirm-checkout-btn');
    fireEvent.click(placeOrderBtn);

    expect(await screen.findByText(/5 to 6 digits/i)).toBeInTheDocument();
  });

  it('renders staff order queue board with Kanban stages and advances order to PACKED', async () => {
    mockShopApi.updateOrderStatus.mockResolvedValue({
      ...mockQueueOrders[0],
      status: 'PACKED',
    });

    renderStaffConsole();

    // Wait for console to load
    await screen.findByText(/Pro Shop & Inventory Console/i);

    // Click Queue Tab by ID
    const queueTabBtn = screen.getByRole('button', { name: /Order Queue Board/i });
    fireEvent.click(queueTabBtn);

    expect(await screen.findByText(/Fulfilment & Order Queue Board/i)).toBeInTheDocument();
    expect(await screen.findByText('#ORD-20261008-001')).toBeInTheDocument();
    expect(screen.getByText('PK-4829')).toBeInTheDocument();

    // Advance status to PACKED
    const packBtn = await screen.findByTestId('pack-btn-ORD-20261008-001');
    fireEvent.click(packBtn);

    await waitFor(() => {
      expect(mockShopApi.updateOrderStatus).toHaveBeenCalledWith('ord-101', {
        newStatus: 'PACKED',
        reason: 'Staff packed order items',
      });
    });
  });

  it('executes Quick Sale in under 3 taps and pops up printable receipt modal', async () => {
    mockShopApi.createCounterSale.mockResolvedValue({
      id: 'ord-qs-999',
      orderNo: 'ORD-QUICK-099',
      channel: 'COUNTER',
      fulfilmentType: 'INSTORE',
      status: 'COMPLETED',
      subtotal: 9.99,
      discount: 0.0,
      tax: 1.8,
      deliveryFee: 0.0,
      total: 11.79,
      guestName: 'Walk-in Player',
      items: [
        {
          id: 'item-qs-1',
          variantSku: 'VAR-BALLS-US',
          productName: 'Wilson US Open Balls (Can)',
          quantity: 1,
          unitPriceSnapshot: 9.99,
          totalPrice: 9.99,
        },
      ],
      createdAt: '2026-10-08T12:00:00Z',
    });

    renderStaffConsole();

    // Wait for console to load variants
    await screen.findByText(/Pro Shop & Inventory Console/i);

    // Tap 0: Switch to Quick Sale tab
    const quickSaleTab = screen.getByRole('button', { name: /Quick Sale/i });
    fireEvent.click(quickSaleTab);

    expect(await screen.findByText(/Quick Sale Express Tiles/i)).toBeInTheDocument();

    // Tap 1: Click the big "Wilson US Open Balls" tile
    const ballsTile = screen.getByTestId('quick-tile-0');
    fireEvent.click(ballsTile);

    // Tap 2: Complete Quick Sale button
    const completeBtn = await screen.findByTestId('complete-quick-sale-btn');
    expect(completeBtn).toBeInTheDocument();
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(mockShopApi.createCounterSale).toHaveBeenCalled();
    });

    // Receipt Modal should pop up with Print button
    expect(await screen.findByTestId('printable-receipt-card')).toBeInTheDocument();
    expect(screen.getAllByText(/CHAMPIONS CLUB PRO SHOP/i)[0]).toBeInTheDocument();
    expect(screen.getByText('#ORD-QUICK-099')).toBeInTheDocument();
    expect(screen.getByTestId('print-receipt-btn')).toBeInTheDocument();
  });
});
