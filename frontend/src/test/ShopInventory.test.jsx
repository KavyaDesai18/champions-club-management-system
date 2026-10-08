import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ShopConsolePage from '../pages/staff/ShopConsolePage';
import MemberShopPage from '../pages/member/MemberShopPage';
import { ToastProvider } from '../context/ToastContext';

// Hoisted mock shopApi object so vitest hoisting allows factory access
const { mockShopApi } = vi.hoisted(() => {
  const api = {
    getCategories: vi.fn(),
    getAllVariants: vi.fn(),
    getActiveLowStockAlerts: vi.fn(),
    getAllRecentMovements: vi.fn(),
    getJobTickets: vi.fn(),
    getServices: vi.fn(),
    getPurchaseOrders: vi.fn(),
    getSupplierBills: vi.fn(),
    getVariantMovements: vi.fn(),
    restockVariant: vi.fn(),
    adjustVariantStock: vi.fn(),
    createProduct: vi.fn(),
    generateSuggestedReorders: vi.fn(),
    updateJobTicketStatus: vi.fn(),
    createJobTicket: vi.fn(),
    receivePurchaseOrder: vi.fn(),
    lookupBarcode: vi.fn(),
    executeQuickSale: vi.fn(),
    getPublicCatalog: vi.fn(),
    getPriceQuote: vi.fn(),
  };
  return { mockShopApi: api };
});

vi.mock('../api/shopApi', () => ({
  shopApi: mockShopApi,
  default: mockShopApi,
}));

// Mock Auth
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-staff-1',
      fullName: 'Kenji Pro Shop',
      role: 'SHOP_STAFF',
    },
  }),
}));

describe('Shop Catalog & Inventory Frontend Suite', () => {
  let queryClient;

  const mockCategories = [
    { id: 'cat-1', code: 'RACKETS', name: 'Rackets' },
    { id: 'cat-2', code: 'BALLS', name: 'Balls' },
  ];

  const mockVariants = [
    {
      id: 'var-1',
      sku: 'VAR-ASTROX99-4U',
      size: '4U/G5',
      color: 'White/Tiger',
      barcode: '890123456001',
      effectivePrice: 249.99,
      costPrice: 160.0,
      onHand: 12,
      reserved: 0,
      available: 12,
      reorderLevel: 4,
      reorderQty: 15,
      stockStatus: 'IN_STOCK',
    },
    {
      id: 'var-2',
      sku: 'VAR-PROSTAFF14-G2',
      size: 'G2',
      color: 'Bronze',
      barcode: '890123456002',
      effectivePrice: 279.0,
      costPrice: 185.0,
      onHand: 2,
      reserved: 0,
      available: 2,
      reorderLevel: 4,
      reorderQty: 12,
      stockStatus: 'LOW_STOCK',
    },
  ];

  const mockAlerts = [
    {
      id: 'alert-1',
      variantId: 'var-2',
      variantSku: 'VAR-PROSTAFF14-G2',
      productName: 'Wilson Pro Staff 97',
      currentAvailable: 2,
      reorderLevel: 4,
      reorderQty: 12,
      status: 'ACTIVE',
    },
  ];

  const mockProducts = [
    {
      id: 'prd-1',
      sku: 'PRD-ASTROX99',
      name: 'Yonex Astrox 99 Pro',
      brand: 'Yonex',
      description: 'Head-heavy power racket',
      basePrice: 249.99,
      images: ['https://images.unsplash.com/photo-1613918108466-292b78a8ef95'],
      overallStockStatus: 'IN_STOCK',
      category: { id: 'cat-1', code: 'RACKETS', name: 'Rackets' },
      variants: [mockVariants[0]],
    },
    {
      id: 'prd-2',
      sku: 'PRD-PROSTAFF14',
      name: 'Wilson Pro Staff 97 v14',
      brand: 'Wilson',
      description: 'Precision control racket',
      basePrice: 279.0,
      images: ['https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0'],
      overallStockStatus: 'LOW_STOCK',
      category: { id: 'cat-1', code: 'RACKETS', name: 'Rackets' },
      variants: [mockVariants[1]],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockShopApi.getCategories.mockResolvedValue(mockCategories);
    mockShopApi.getAllVariants.mockResolvedValue(mockVariants);
    mockShopApi.getActiveLowStockAlerts.mockResolvedValue(mockAlerts);
    mockShopApi.getServices.mockResolvedValue([
      { id: 'srv-1', code: 'RESTRINGING', name: 'Pro Racket Re-Stringing', basePrice: 25.0 },
    ]);
    mockShopApi.getPublicCatalog.mockResolvedValue({ content: mockProducts });
    mockShopApi.getPriceQuote.mockResolvedValue({
      unitBasePrice: 249.99,
      discountPercentage: 20.0,
      unitDiscount: 50.0,
      unitNetPrice: 199.99,
      taxRatePercentage: 18.0,
      unitTax: 36.0,
      unitFinalPrice: 235.99,
      appliedTier: 'GOLD',
    });
  });

  const renderConsole = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <ShopConsolePage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  const renderMemberShop = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <MemberShopPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders console inventory table with variants, stock status chips and low stock alert', async () => {
    renderConsole();

    // Verify header
    expect(await screen.findByText('Pro Shop & Inventory Console')).toBeInTheDocument();

    // Verify low stock alert banner
    expect(await screen.findByTestId('low-stock-alert-banner')).toBeInTheDocument();
    expect(screen.getByText(/1 Variants Below Reorder Level/i)).toBeInTheDocument();

    // Verify variants rendered in table
    expect(await screen.findByText('VAR-ASTROX99-4U')).toBeInTheDocument();
    expect(screen.getByText('VAR-PROSTAFF14-G2')).toBeInTheDocument();

    // Verify badges
    expect(screen.getByTestId('stock-badge-VAR-ASTROX99-4U')).toHaveTextContent(/IN STOCK/i);
    expect(screen.getByTestId('stock-badge-VAR-PROSTAFF14-G2')).toHaveTextContent(/LOW STOCK/i);
  });

  it('opens inline restock modal and triggers restock mutation', async () => {
    mockShopApi.restockVariant.mockResolvedValue({ id: 'mov-1', qty: 20 });
    renderConsole();

    const restockBtn = await screen.findByTestId('inline-restock-btn-VAR-PROSTAFF14-G2');
    fireEvent.click(restockBtn);

    // Modal opens
    expect(await screen.findByText(/Restock Variant: VAR-PROSTAFF14-G2/i)).toBeInTheDocument();

    const qtyInput = screen.getByTestId('restock-qty-input');
    fireEvent.change(qtyInput, { target: { value: '20' } });

    const confirmBtn = screen.getByTestId('confirm-restock-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockShopApi.restockVariant).toHaveBeenCalledWith('var-2', expect.objectContaining({
        qty: 20,
      }));
    });
  });

  it('filters inventory table by stock status filter', async () => {
    renderConsole();

    await screen.findByText('VAR-ASTROX99-4U');

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'LOW_STOCK' } });

    // VAR-ASTROX99-4U is IN_STOCK so it should be hidden
    expect(screen.queryByText('VAR-ASTROX99-4U')).not.toBeInTheDocument();
    expect(screen.getByText('VAR-PROSTAFF14-G2')).toBeInTheDocument();
  });

  it('renders member shop grid with product cards and tier discount callout', async () => {
    renderMemberShop();

    expect(await screen.findByText(/Champions Pro Shop & Equipment Services/i)).toBeInTheDocument();
    expect(await screen.findByText('Yonex Astrox 99 Pro')).toBeInTheDocument();
    expect(screen.getByText('Wilson Pro Staff 97 v14')).toBeInTheDocument();

    // Check badges
    expect(screen.getByTestId('member-stock-badge-PRD-ASTROX99')).toHaveTextContent(/In Stock/i);
    expect(screen.getByTestId('member-stock-badge-PRD-PROSTAFF14')).toHaveTextContent(/Low Stock/i);
  });

  it('opens member product details modal with live price quote breakdown', async () => {
    renderMemberShop();

    const detailsBtn = await screen.findByTestId('view-details-PRD-ASTROX99');
    fireEvent.click(detailsBtn);

    expect(await screen.findByText(/Price Quote Breakdown/i)).toBeInTheDocument();
    expect(await screen.findByText(/Member Discount \(20%\)/i)).toBeInTheDocument();
    expect(screen.getByText('$235.99')).toBeInTheDocument();
  });
});
