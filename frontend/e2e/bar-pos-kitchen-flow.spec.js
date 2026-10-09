import { test, expect } from '@playwright/test';

test.describe('Bar POS, Kitchen Display & UPI Settlement E2E Flow', () => {
  test('Waiter opens tab, adds order, kitchen sees ticket and marks ready, waiter settles by UPI', async ({ page }) => {
    // 1. Mock Authentication as BAR_STAFF
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-bar-1',
          fullName: 'Vikram Barista',
          email: 'vikram@championsclub.com',
          role: 'BAR_STAFF',
          status: 'ACTIVE',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'mock-bar-staff-token');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-bar-1',
          fullName: 'Vikram Barista',
          email: 'vikram@championsclub.com',
          role: 'BAR_STAFF',
          status: 'ACTIVE',
        })
      );
    });

    // 2. Mock Shift API
    const mockShift = {
      id: 'shift-100',
      staffUserId: 'user-bar-1',
      staffName: 'Vikram Barista',
      station: 'BAR',
      openingCash: 1000.0,
      cashCollected: 0.0,
      cashVariance: 0.0,
      status: 'OPEN',
      startTime: new Date().toISOString(),
    };

    await page.route('**/api/v1/bar/shifts/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockShift),
      });
    });

    // 3. Mock Tables API
    let mockTables = [
      { id: 'tbl-1', label: 'T1', seats: 4, status: 'FREE', isActive: true },
      { id: 'tbl-2', label: 'T2', seats: 2, status: 'FREE', isActive: true },
    ];

    await page.route('**/api/v1/bar/tables', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTables),
      });
    });

    // 4. Mock Menu Catalog
    const mockCategories = [
      { id: 'cat-1', name: 'Appetizers & Mains', sortOrder: 1 },
      { id: 'cat-2', name: 'Craft Beverages', sortOrder: 2 },
    ];

    const mockMenuItems = [
      {
        id: 'menu-1',
        name: 'Artisan Club Sandwich',
        price: 320.0,
        taxCategory: 'GST_5',
        prepStation: 'KITCHEN',
        isAlcoholic: false,
        isAvailable: true,
      },
      {
        id: 'menu-2',
        name: 'Cold Pressed Orange Juice',
        price: 180.0,
        taxCategory: 'GST_5',
        prepStation: 'BAR',
        isAlcoholic: false,
        isAvailable: true,
      },
    ];

    await page.route('**/api/v1/bar/menu/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCategories),
      });
    });

    await page.route('**/api/v1/bar/menu/items**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMenuItems),
      });
    });

    // 5. State for Tab & Tickets
    let activeTab = null;
    let kitchenTickets = [];

    // Open Tab Endpoint
    await page.route('**/api/v1/bar/tabs/open', async (route) => {
      activeTab = {
        id: 'tab-101',
        tabNumber: 'TAB-101',
        tableId: 'tbl-1',
        tableLabel: 'T1',
        guestName: 'Rohit Sharma',
        guestIsUnder18: false,
        status: 'OPEN',
        subtotal: 0.0,
        discountAmount: 0.0,
        taxAmount: 0.0,
        tipAmount: 0.0,
        totalAmount: 0.0,
        version: 0,
        items: [],
      };
      mockTables = mockTables.map((t) =>
        t.id === 'tbl-1' ? { ...t, status: 'OCCUPIED', currentTabId: 'tab-101', currentTabTotal: 0 } : t
      );
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(activeTab),
      });
    });

    // Get Tab Details Endpoint
    await page.route('**/api/v1/bar/tabs/tab-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeTab),
      });
    });

    // Add Items to Tab Endpoint
    await page.route('**/api/v1/bar/tabs/tab-101/items', async (route) => {
      activeTab = {
        ...activeTab,
        version: 1,
        subtotal: 500.0,
        taxAmount: 25.0,
        totalAmount: 525.0,
        items: [
          {
            id: 'ti-1',
            menuItemId: 'menu-1',
            itemName: 'Artisan Club Sandwich',
            qty: 1,
            unitPrice: 320.0,
            lineTotal: 336.0,
            station: 'KITCHEN',
            status: 'NEW',
          },
          {
            id: 'ti-2',
            menuItemId: 'menu-2',
            itemName: 'Cold Pressed Orange Juice',
            qty: 1,
            unitPrice: 180.0,
            lineTotal: 189.0,
            station: 'BAR',
            status: 'NEW',
          },
        ],
      };

      kitchenTickets = [
        {
          id: 'kt-1',
          ticketNumber: 'KDS-001',
          tabId: 'tab-101',
          station: 'KITCHEN',
          tableLabel: 'T1',
          serverName: 'Vikram Barista',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          items: [
            {
              id: 'kti-1',
              itemName: 'Artisan Club Sandwich',
              qty: 1,
              status: 'NEW',
            },
          ],
        },
      ];

      mockTables = mockTables.map((t) =>
        t.id === 'tbl-1' ? { ...t, currentTabTotal: 525.0 } : t
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeTab),
      });
    });

    // Kitchen Display Tickets Endpoint
    await page.route('**/api/v1/bar/kitchen-display/active**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(kitchenTickets),
      });
    });

    // Kitchen Bump Ticket Endpoint
    await page.route('**/api/v1/bar/kitchen-display/tickets/kt-1/bump', async (route) => {
      if (kitchenTickets.length > 0) {
        kitchenTickets[0].status = 'PREPARING';
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(kitchenTickets[0] || {}),
      });
    });

    // Kitchen Item Status Endpoint
    await page.route('**/api/v1/bar/kitchen-display/items/kti-1/status', async (route) => {
      if (kitchenTickets.length > 0 && kitchenTickets[0].items.length > 0) {
        kitchenTickets[0].items[0].status = 'READY';
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, newStatus: 'READY' }),
      });
    });

    // Settle Tab Endpoint
    await page.route('**/api/v1/bar/tabs/tab-101/settle', async (route) => {
      activeTab = {
        ...activeTab,
        status: 'SETTLED',
        paymentMethod: 'UPI',
        paidAmount: 525.0,
      };
      mockTables = mockTables.map((t) =>
        t.id === 'tbl-1' ? { ...t, status: 'FREE', currentTabId: null, currentTabTotal: 0 } : t
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeTab),
      });
    });

    // --- STEP 1: Navigate to Bar POS ---
    await page.goto('/console/bar');
    await expect(page.getByText('Bar & Cafeteria POS')).toBeVisible();
    await expect(page.getByText(/Shift Active \(BAR\)/i)).toBeVisible();

    // Floor Plan should show Table T1 as free
    await expect(page.getByText('T1')).toBeVisible();

    // --- STEP 2: Waiter opens Tab on Table T1 ---
    await page.getByText('T1').click();
    await expect(page.getByText('Open New Tab')).toBeVisible();

    // Enter guest name
    await page.getByPlaceholder(/Guest name/i).fill('Rohit Sharma');
    await page.getByRole('button', { name: 'Open Tab' }).click();

    // Tab Header should show #TAB-101 and Table T1
    await expect(page.getByText('#TAB-101', { exact: true })).toBeVisible();
    await expect(page.getByText('Table T1')).toBeVisible();
    await expect(page.getByText('Rohit Sharma')).toBeVisible();

    // --- STEP 3: Waiter selects menu items and sends order ---
    await expect(page.getByText('Artisan Club Sandwich')).toBeVisible();
    await page.getByText('Artisan Club Sandwich').click();

    await expect(page.getByText('Cold Pressed Orange Juice')).toBeVisible();
    await page.getByText('Cold Pressed Orange Juice').click();

    // Send to Kitchen/Bar button should appear
    const sendBtn = page.getByRole('button', { name: /Send to Kitchen\/Bar/i });
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();

    // Tab items should now be confirmed on the tab
    await expect(page.getByText(/Running Total/i)).toBeVisible();
    await expect(page.getByText('₹525.00', { exact: true })).toBeVisible();

    // --- STEP 4: Switch to Kitchen KDS Queue ---
    await page.goto('/console/kitchen');
    await expect(page.getByText(/Kitchen & Bar Display/i)).toBeVisible();
    await expect(page.getByText('#KDS-001')).toBeVisible();
    await expect(page.getByText('Artisan Club Sandwich')).toBeVisible();

    // Tap item status or bump ticket
    const bumpBtn = page.getByRole('button', { name: /Bump Ticket/i });
    await expect(bumpBtn).toBeVisible();
    await bumpBtn.click();

    // Advance item status to READY
    const itemCard = page.locator('button:has-text("Artisan Club Sandwich")');
    await itemCard.click();

    // --- STEP 5: Return to Bar POS and Settle by UPI ---
    await page.goto('/console/bar');
    await expect(page.getByText('T1')).toBeVisible();
    await page.getByText('T1').click();

    await expect(page.getByText('#TAB-101', { exact: true })).toBeVisible();
    const settleBtn = page.getByRole('button', { name: /Settle Tab/i });
    await expect(settleBtn).toBeVisible();
    await settleBtn.click();

    // Modal pops up with payment options
    await expect(page.getByText('Settle Bill')).toBeVisible();
    await expect(page.getByText('UPI')).toBeVisible();

    // Select UPI payment method and confirm
    await page.locator('button:has-text("UPI")').click();
    await page.getByRole('button', { name: 'Complete Payment' }).click();

    // Verify Tab is closed and table returned to FREE
    await expect(page.getByText(/Tab Settled & Table Released/i)).toBeVisible();
  });
});
