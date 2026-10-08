import { test, expect } from '@playwright/test';

test.describe('Champions Club - Shop Orders Race Concurrency E2E (PROMPT 9)', () => {
  test('Member orders shoes online while staff sells last pair at counter: exactly one wins', async ({ browser }) => {
    // Shared atomic stock state for the last pair of shoes
    let remainingStock = 1;
    let reservedStock = 0;
    let successfulOrders = [];
    let failedAttempts = [];

    // 1. Setup Online Member Context
    const contextMember = await browser.newContext();
    const pageMember = await contextMember.newPage();

    await pageMember.addInitScript(() => {
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-member-roger',
          memberId: 'mem-roger-01',
          fullName: 'Roger Federer',
          email: 'roger@tennis.com',
          role: 'MEMBER',
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('champions_token', 'mock-token-roger');
    });

    // 2. Setup Staff Counter Context
    const contextStaff = await browser.newContext();
    const pageStaff = await contextStaff.newPage();

    await pageStaff.addInitScript(() => {
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-staff-pro',
          fullName: 'Pro Shop Desk Staff',
          email: 'staff@championsclub.com',
          role: 'SHOP_STAFF',
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('champions_token', 'mock-token-staff');
    });

    // Shared Catalog Data
    const mockCategories = [
      { id: 'cat-shoes', code: 'SHOES', name: 'Shoes' },
    ];

    const getShoesVariant = () => ({
      id: 'var-asics-10',
      productId: 'prod-asics-gel',
      sku: 'VAR-ASICS9-M10',
      productName: 'Asics Gel Resolution 9 Shoes',
      categoryName: 'Shoes',
      size: '10 US',
      color: 'Navy / White',
      barcode: '890123456099',
      effectivePrice: 140.0,
      costPrice: 85.0,
      onHand: remainingStock,
      reserved: reservedStock,
      available: Math.max(0, remainingStock - reservedStock),
      reorderLevel: 2,
      reorderQty: 10,
      stockStatus: remainingStock > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
    });

    const mockCatalog = () => ({
      content: [
        {
          id: 'prod-asics-gel',
          sku: 'PRD-ASICS9',
          name: 'Asics Gel Resolution 9 Shoes',
          brand: 'Asics',
          basePrice: 140.0,
          category: { id: 'cat-shoes', code: 'SHOES', name: 'Shoes' },
          images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff'],
          variants: [getShoesVariant()],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 50,
      number: 0,
    });

    // Route interceptor helper for both contexts
    const attachRoutes = async (page, channelName) => {
      await page.route('**/api/v1/shop/categories', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockCategories) });
      });

      await page.route('**/api/v1/shop/catalog**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockCatalog()) });
      });

      await page.route('**/api/v1/shop/inventory/variants**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([getShoesVariant()]) });
      });

      await page.route('**/api/v1/shop/inventory/low-stock-alerts', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });

      await page.route('**/api/v1/shop/services', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });

      await page.route('**/api/v1/shop/orders/queue', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });

      await page.route('**/api/v1/shop/cart', async (route) => {
        if (route.request().method() === 'GET') {
          const avail = Math.max(0, remainingStock - reservedStock);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              cartId: 'cart-roger-1',
              memberId: 'mem-roger-01',
              items: [
                {
                  id: 'item-cart-1',
                  variantId: 'var-asics-10',
                  productName: 'Asics Gel Resolution 9 Shoes',
                  variantSku: 'VAR-ASICS9-M10',
                  size: '10 US',
                  quantity: 1,
                  unitBasePrice: 140.0,
                  unitFinalPrice: 140.0,
                  totalPrice: 140.0,
                  currentAvailable: avail,
                  outOfStock: avail <= 0,
                },
              ],
              subtotal: 140.0,
              totalItemCount: 1,
              hasOutOfStockItems: avail <= 0,
            }),
          });
        } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
        }
      });

      // Online Member Checkout Route (Atomic reservation check)
      await page.route('**/api/v1/shop/checkout', async (route) => {
        // Atomic evaluation
        const availableNow = remainingStock - reservedStock;
        if (availableNow >= 1) {
          reservedStock += 1;
          successfulOrders.push({ channel: 'ONLINE', orderNo: 'ORD-ONLINE-WIN' });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'ord-online-1',
              orderNo: 'ORD-ONLINE-WIN',
              channel: 'ONLINE',
              fulfilmentType: 'PICKUP',
              status: 'PLACED',
              pickupCode: 'PK-9912',
              total: 140.0,
              items: [{ variantSku: 'VAR-ASICS9-M10', quantity: 1, totalPrice: 140.0 }],
            }),
          });
        } else {
          failedAttempts.push({ channel: 'ONLINE', reason: 'OUT_OF_STOCK' });
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 400,
              error: 'BAD_REQUEST',
              message: 'Insufficient stock for variant VAR-ASICS9-M10. Available: 0, Requested: 1',
            }),
          });
        }
      });

      await page.route('**/api/v1/shop/orders/*/pay', async (route) => {
        remainingStock -= 1;
        reservedStock -= 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ord-online-1',
            orderNo: 'ORD-ONLINE-WIN',
            status: 'PAID',
            pickupCode: 'PK-9912',
            total: 140.0,
          }),
        });
      });

      // Staff Counter Sale Route (Atomic sale check)
      await page.route('**/api/v1/shop/staff/orders/counter-sale', async (route) => {
        // Atomic evaluation
        const availableNow = remainingStock - reservedStock;
        if (availableNow >= 1) {
          remainingStock -= 1;
          successfulOrders.push({ channel: 'COUNTER', orderNo: 'ORD-COUNTER-WIN' });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'ord-counter-1',
              orderNo: 'ORD-COUNTER-WIN',
              channel: 'COUNTER',
              fulfilmentType: 'INSTORE',
              status: 'COMPLETED',
              total: 140.0,
              guestName: 'Walk-in Player',
              items: [{ variantSku: 'VAR-ASICS9-M10', productName: 'Asics Gel Resolution 9 Shoes', quantity: 1, totalPrice: 140.0 }],
              createdAt: new Date().toISOString(),
            }),
          });
        } else {
          failedAttempts.push({ channel: 'COUNTER', reason: 'OUT_OF_STOCK' });
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 400,
              error: 'BAD_REQUEST',
              message: 'Insufficient stock for variant VAR-ASICS9-M10. Available: 0, Requested: 1',
            }),
          });
        }
      });
    };

    await attachRoutes(pageMember, 'ONLINE');
    await attachRoutes(pageStaff, 'COUNTER');

    // 3. Open Online Shop in Page Member
    await pageMember.goto('/app/shop');
    await expect(pageMember.locator('#shop-page-title')).toContainText('Champions Pro Shop');

    // Member opens cart drawer
    const openCartBtn = pageMember.locator('#open-cart-btn');
    await expect(openCartBtn).toBeVisible();
    await openCartBtn.click();

    // Member clicks proceed to checkout to open checkout modal
    const proceedCheckoutBtn = pageMember.locator('#proceed-checkout-btn');
    await expect(proceedCheckoutBtn).toBeVisible();
    await proceedCheckoutBtn.click();

    // Member is now on the checkout confirmation modal with pickup selected
    const memberConfirmBtn = pageMember.locator('#confirm-checkout-btn');
    await expect(memberConfirmBtn).toBeVisible();

    // 4. Open Staff Shop Console in Page Staff
    await pageStaff.goto('/console/shop');
    await expect(pageStaff.locator('text=Pro Shop & Inventory Console')).toBeVisible();

    // Staff opens Quick Sale tab
    const quickSaleTab = pageStaff.locator('#tab-quick_sale');
    await expect(quickSaleTab).toBeVisible();
    await quickSaleTab.click();

    // Staff clicks the shoes variant chip
    const shoesVariantBtn = pageStaff.locator('#quick-variant-VAR-ASICS9-M10');
    await expect(shoesVariantBtn).toBeVisible();
    await shoesVariantBtn.click();

    // Staff sees Complete Quick Sale button ready
    const staffCompleteBtn = pageStaff.locator('#complete-quick-sale-btn');
    await expect(staffCompleteBtn).toBeVisible();

    // 5. THE CONCURRENCY RACE: Both click at the exact same moment
    await Promise.all([
      memberConfirmBtn.click(),
      staffCompleteBtn.click(),
    ]);

    // Give asynchronous network operations time to settle
    await pageMember.waitForTimeout(1000);
    await pageStaff.waitForTimeout(1000);

    // 6. INVARIANT CHECKS: Exactly one wins, exactly one fails!
    expect(successfulOrders.length).toBe(1);
    expect(failedAttempts.length).toBe(1);

    const winner = successfulOrders[0];
    const loser = failedAttempts[0];

    // Assert remaining stock is strictly 0 (never negative)
    expect(remainingStock - reservedStock).toBe(0);

    if (winner.channel === 'ONLINE') {
      // Online member won: Sees live tracking modal with pickup code
      await expect(pageMember.locator('#order-pickup-code')).toBeVisible();
      // Staff counter lost: Sees Insufficient stock error toast
      await expect(pageStaff.getByText('Insufficient stock').first()).toBeVisible();
    } else {
      // Staff counter won: Sees printable receipt modal
      await expect(pageStaff.locator('#printable-receipt-card')).toBeVisible();
      // Online member lost: Sees error toast
      await expect(pageMember.getByText('Insufficient stock').first()).toBeVisible();
    }

    await contextMember.close();
    await contextStaff.close();
  });
});
