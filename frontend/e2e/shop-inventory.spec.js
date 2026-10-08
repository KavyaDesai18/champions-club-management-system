import { test, expect } from '@playwright/test';

test.describe('Champions Club - Shop Inventory & Restock Lifecycle', () => {
  let lowStockAlerts = [];
  let variantsList = [];

  const categories = [
    { id: 'cat-rackets', code: 'RACKETS', name: 'Rackets' },
    { id: 'cat-balls', code: 'BALLS', name: 'Balls' },
    { id: 'cat-shoes', code: 'SHOES', name: 'Shoes' },
  ];

  const publicCatalog = {
    content: [
      {
        id: 'prod-wilson-ps',
        name: 'Wilson Pro Staff 97 v14',
        brand: 'Wilson',
        categoryName: 'Rackets',
        basePrice: 279.0,
        taxCategory: 'STANDARD',
        images: ['https://images.unsplash.com/photo-1617083934555-ac7d4efe0f46'],
        variants: [
          {
            id: 'v-ps-g2',
            sku: 'VAR-PROSTAFF14-G2',
            size: 'G2 (4 1/4")',
            color: 'Matte Bronze',
            effectivePrice: 279.0,
            stockStatus: 'LOW_STOCK',
          },
        ],
      },
      {
        id: 'prod-wilson-balls',
        name: 'Wilson US Open Extra Duty Balls',
        brand: 'Wilson',
        categoryName: 'Balls',
        basePrice: 12.5,
        taxCategory: 'STANDARD',
        images: ['https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0'],
        variants: [
          {
            id: 'v-balls-can',
            sku: 'VAR-USOPEN-4BALL',
            size: '4-Ball Can',
            color: 'Yellow',
            effectivePrice: 12.5,
            stockStatus: 'IN_STOCK',
          },
        ],
      },
    ],
    totalElements: 2,
    totalPages: 1,
    number: 0,
    size: 50,
  };

  test.beforeEach(async ({ page }) => {
    // Reset state before each test
    lowStockAlerts = [
      {
        id: 'alert-ps-g2',
        variantId: 'v-ps-g2',
        variantSku: 'VAR-PROSTAFF14-G2',
        currentAvailable: 2,
        reorderLevel: 5,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      },
    ];

    variantsList = [
      {
        id: 'v-ps-g2',
        productId: 'prod-wilson-ps',
        sku: 'VAR-PROSTAFF14-G2',
        productName: 'Wilson Pro Staff 97 v14',
        brand: 'Wilson',
        categoryName: 'Rackets',
        size: 'G2 (4 1/4")',
        color: 'Matte Bronze',
        barcode: '887768912345',
        effectivePrice: 279.0,
        costPrice: 175.0,
        onHand: 2,
        reserved: 0,
        available: 2,
        reorderLevel: 5,
        reorderQty: 15,
        stockStatus: 'LOW_STOCK',
      },
      {
        id: 'v-balls-can',
        productId: 'prod-wilson-balls',
        sku: 'VAR-USOPEN-4BALL',
        productName: 'Wilson US Open Extra Duty Balls',
        brand: 'Wilson',
        categoryName: 'Balls',
        size: '4-Ball Can',
        color: 'Yellow',
        barcode: '887768923456',
        effectivePrice: 12.5,
        costPrice: 6.8,
        onHand: 48,
        reserved: 0,
        available: 48,
        reorderLevel: 12,
        reorderQty: 48,
        stockStatus: 'IN_STOCK',
      },
    ];

    // Seed authenticated SHOP_STAFF user session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-owner-01',
          email: 'alex@championsclub.com',
          fullName: 'Alex Rodriguez',
          role: 'OWNER',
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('champions_token', 'mock-owner-jwt-token');
    });

    // Mock API routes using exact backend endpoint signatures
    await page.route('**/api/v1/shop/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      });
    });

    await page.route('**/api/v1/shop/catalog**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(publicCatalog),
      });
    });

    await page.route('**/api/v1/shop/inventory/low-stock-alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(lowStockAlerts),
      });
    });

    await page.route('**/api/v1/shop/inventory/variants', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(variantsList),
      });
    });

    await page.route('**/api/v1/shop/inventory/*/restock', async (route) => {
      const url = route.request().url();
      const variantId = url.split('/inventory/')[1].split('/restock')[0];
      const requestData = route.request().postDataJSON();

      const target = variantsList.find((v) => v.id === variantId);
      if (target) {
        target.onHand += requestData.qty;
        target.available += requestData.qty;
        target.stockStatus = 'IN_STOCK';
      }

      // Clear alerts after successful restock
      lowStockAlerts = [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mov-mock-restock',
          variantId,
          type: 'PURCHASE',
          qty: requestData.qty,
          reference: 'RESTOCK-MOCK',
          reason: requestData.reason || 'Restocked in store',
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/v1/shop/inventory/movements**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/shop/services/tickets**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/shop/services', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/shop/purchase-orders**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/shop/supplier-bills**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('restocks low-stock variant and sees low-stock alert banner disappear', async ({ page }) => {
    // 1. Navigate to staff shop console
    await page.goto('/console/shop');

    // 2. Verify page heading renders
    await expect(page.locator('h1')).toContainText(/Pro Shop & Inventory Console/i);

    // 3. Low-stock banner MUST be visible with the alert info
    const alertBanner = page.locator('#low-stock-alert-banner');
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText(/1 Variants Below Reorder Level/i);
    await expect(alertBanner).toContainText(/VAR-PROSTAFF14-G2/i);

    // 4. Verify low-stock badge in the table
    const lowStockBadge = page.locator('[data-testid="stock-badge-VAR-PROSTAFF14-G2"]');
    await expect(lowStockBadge).toBeVisible();
    await expect(lowStockBadge).toContainText(/LOW STOCK/i);

    // 5. Click inline Restock button for the low-stock variant
    const restockBtn = page.locator('[data-testid="inline-restock-btn-VAR-PROSTAFF14-G2"]');
    await expect(restockBtn).toBeVisible();
    await restockBtn.click();

    // 6. Restock modal should appear
    const restockQtyInput = page.locator('#restock-qty-input');
    await expect(restockQtyInput).toBeVisible();
    await restockQtyInput.fill('20');

    // 7. Click confirm restock
    const confirmBtn = page.locator('#confirm-restock-btn');
    await confirmBtn.click();

    // 8. Low-stock alert banner MUST disappear after restock
    await expect(alertBanner).not.toBeVisible();

    // 9. Variant badge in table updates to IN STOCK
    await expect(lowStockBadge).toContainText(/IN STOCK/i);
  });

  test('allows member to browse pro shop catalog and view stock status', async ({ page }) => {
    await page.goto('/app/shop');
    await expect(page.locator('#shop-page-title')).toContainText(/Champions Pro Shop/i);
    await expect(page.getByText('Wilson Pro Staff 97 v14').first()).toBeVisible();
    await expect(page.getByText('Wilson US Open Extra Duty Balls').first()).toBeVisible();
  });
});
