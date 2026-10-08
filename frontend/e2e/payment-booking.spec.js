import { test, expect } from '@playwright/test';

test.describe('Champions Club - Payments, Invoicing & Ledger E2E Flow', () => {
  test('Member books slot, completes payment via modal, and receives official tax invoice', async ({ page }) => {
    // 1. Authenticate Member
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-member-1',
          memberId: 'mem-1',
          fullName: 'Sania Mirza',
          email: 'sania@tennis.com',
          role: 'MEMBER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'mock-token-sania');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-member-1',
          memberId: 'mem-1',
          fullName: 'Sania Mirza',
          email: 'sania@tennis.com',
          role: 'MEMBER',
          status: 'ACTIVE',
        })
      );
    });

    const mockSports = [{ id: 'sport-tennis', name: 'Tennis' }];
    const mockAvailability = {
      date: '2026-10-08',
      clubTimezone: 'Asia/Kolkata',
      facilityClosed: false,
      courts: [
        {
          courtId: 'court-1',
          courtName: 'Championship Court 1',
          sportName: 'Tennis',
          surface: 'HARD',
          indoor: false,
          status: 'ACTIVE',
          slots: [
            {
              startTime: '2026-10-08T10:00:00Z',
              endTime: '2026-10-08T11:00:00Z',
              localStartTime: '10:00',
              localEndTime: '11:00',
              state: 'AVAILABLE',
              price: 800.0,
              formattedPrice: '₹800.00',
              calculatedPrice: 800.0,
              basePrice: 800.0,
              pricingRuleNames: ['Peak Morning'],
            },
          ],
        },
      ],
    };

    // Route mocks
    await page.route('**/sports', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSports) }));
    await page.route('**/availability*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAvailability) }));
    await page.route('**/cash-drawer/current', (route) => route.fulfill({ json: { status: 'CLOSED' } }));
    await page.route('**/corporate-accounts*', (route) => route.fulfill({ json: [] }));
    await page.route('**/sse/**', (route) => route.abort());

    // Mock Booking Hold
    await page.route('**/bookings', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'bk-hold-999',
            bookingReference: 'BK-2026-00099',
            courtId: 'court-1',
            courtName: 'Championship Court 1',
            startTime: '2026-10-08T10:00:00Z',
            endTime: '2026-10-08T11:00:00Z',
            status: 'HELD',
            totalPrice: 800.0,
            price: 800.0,
            holdExpiresAt: new Date(Date.now() + 300000).toISOString(),
          }),
        });
      }
      return route.fulfill({ json: [] });
    });

    // Mock Payment Processing
    await page.route('**/payments', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'pay-uuid-1',
            status: 'SUCCEEDED',
            amount: 800.0,
            method: 'CARD',
            providerRef: 'SIM-PAY-800',
            invoiceId: 'inv-paid-1',
          }),
        });
      }
      return route.fulfill({ json: [] });
    });

    // Mock Booking Confirmation
    await page.route('**/bookings/bk-hold-999/confirm', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'bk-hold-999',
          bookingReference: 'BK-2026-00099',
          courtName: 'Championship Court 1',
          status: 'CONFIRMED',
          totalPrice: 800.0,
        }),
      });
    });

    // Mock Invoice Detail
    await page.route('**/invoices/inv-paid-1', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'inv-paid-1',
          invoiceNumber: 'INV-2026-00099',
          status: 'PAID',
          financialYear: '2026-2027',
          issueDate: '2026-10-08',
          customerName: 'Sania Mirza',
          subtotal: 677.97,
          cgstTotal: 61.02,
          sgstTotal: 61.01,
          totalAmount: 800.0,
          paidAmount: 800.0,
          balanceDue: 0.0,
          lines: [
            {
              id: 'l1',
              description: 'Championship Court 1 Reservation (10:00 - 11:00)',
              quantity: 1,
              unitPrice: 677.97,
              taxRatePercent: 18.0,
              cgstAmount: 61.02,
              sgstAmount: 61.01,
              totalAmount: 800.0,
            },
          ],
        }),
      });
    });

    await page.route('**/invoices/inv-paid-1/pdf', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4 Mock PDF Content'),
      });
    });

    // 2. Navigate to Court Booking Page
    await page.goto('/app/book');

    await expect(page.getByText('Championship Court 1')).toBeVisible();

    // 3. Click Available Slot
    const slotButton = page.getByRole('button', { name: /available/i }).first();
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    // 4. Drawer opens, click "Hold Slot (5 Min)"
    const holdButton = page.getByRole('button', { name: /Hold Slot/i });
    await expect(holdButton).toBeVisible();
    await holdButton.click();

    // 5. Active Hold Badge displays; Click "Proceed to Payment"
    const payProceedButton = page.getByRole('button', { name: /Proceed to Payment/i });
    await expect(payProceedButton).toBeVisible();
    await payProceedButton.click();

    // 6. Payment Modal opens; Switch to CARD
    const cardTab = page.getByRole('button', { name: /Credit\/Debit Card/i });
    await expect(cardTab).toBeVisible();
    await cardTab.click();

    const cardInput = page.getByPlaceholder(/4000 1234 5678 9010/i);
    await cardInput.fill('4000 1234 5678 9000');

    // Submit Payment
    const submitPay = page.getByRole('button', { name: /Pay ₹800.00/i });
    await submitPay.click();

    // 7. Verify Official Tax Invoice Modal renders
    await expect(page.getByRole('heading', { name: /Invoice: INV-2026-00099/i })).toBeVisible();
    await expect(page.getByText('PAID', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Download Official PDF/i })).toBeVisible();
  });

  test('Staff can manage Cash Drawer shift and Corporate Accounts with GSTIN validation', async ({ page }) => {
    // Authenticate Staff
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-owner-1',
          fullName: 'Club Owner',
          email: 'owner@champions.club',
          role: 'OWNER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'mock-token-owner');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-owner-1',
          fullName: 'Club Owner',
          email: 'owner@champions.club',
          role: 'OWNER',
          status: 'ACTIVE',
        })
      );
    });

    // Mock Cash Drawer session
    await page.route('**/cash-drawer/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sess-shift-42',
          status: 'OPEN',
          openedByUserName: 'Club Owner',
          openedAt: new Date().toISOString(),
          openingFloat: 2000.0,
          cashSalesTotal: 4500.0,
          cashRefundsTotal: 500.0,
          calculatedExpectedCash: 6000.0,
          entries: [],
        }),
      });
    });

    await page.route('**/cash-drawer/sessions**', (route) => route.fulfill({ json: [] }));

    // Mock Corporate Accounts
    await page.route('**/corporate-accounts', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'corp-1',
            companyName: 'Wipro Enterprises',
            gstin: '29AAACW1234P1Z8',
            creditLimit: 50000.0,
            usedCredit: 12000.0,
            availableCredit: 38000.0,
            paymentTermsDays: 30,
          },
        ]),
      });
    });

    // 1. Visit Cash Drawer Console
    await page.goto('/console/cash-drawer');
    await expect(page.getByText(/Active Shift #sess-shi/i)).toBeVisible();
    await expect(page.getByText('₹6000.00')).toBeVisible();

    // 2. Visit Corporate Accounts Page
    await page.goto('/console/corporate');
    await expect(page.getByText('Wipro Enterprises')).toBeVisible();
    await expect(page.getByText('29AAACW1234P1Z8')).toBeVisible();
    await expect(page.getByText('₹50000.00')).toBeVisible();

    // Click Add Corporate Client & test GSTIN validator
    const addCorpBtn = page.getByRole('button', { name: /Add Corporate Client/i });
    await addCorpBtn.click();

    const gstinInput = page.getByPlaceholder('27AAPCU5050K1Z0');
    await gstinInput.fill('INVALID_GST');
    await expect(page.getByText(/Invalid GSTIN format/i)).toBeVisible();

    await gstinInput.fill('27AAPCU5050K1Z0');
    await expect(page.getByText(/Valid Format/i)).toBeVisible();
  });
});
