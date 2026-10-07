import { test, expect } from '@playwright/test';

test.describe('Champions Club - Booking Concurrency & Slot Conflict E2E', () => {
  test('Two browser contexts race for the same slot: Context A wins hold, Context B receives friendly 409 conflict with alternatives', async ({ browser }) => {
    // 1. Setup Context A (Member A: Roger Federer)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.addInitScript(() => {
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-roger',
          memberId: 'mem-roger',
          fullName: 'Roger Federer',
          email: 'roger@tennis.com',
          role: 'MEMBER',
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('champions_token', 'mock-token-roger');
    });

    // 2. Setup Context B (Member B: Novak Djokovic)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.addInitScript(() => {
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-novak',
          memberId: 'mem-novak',
          fullName: 'Novak Djokovic',
          email: 'novak@tennis.com',
          role: 'MEMBER',
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('champions_token', 'mock-token-novak');
    });

    const mockSports = [
      { id: 'sport-tennis', name: 'Tennis' },
    ];

    const mockAvailability = {
      date: '2026-10-08',
      clubTimezone: 'Asia/Kolkata',
      facilityClosed: false,
      courts: [
        {
          courtId: 'court-center-1',
          courtName: 'Center Court 1',
          sportName: 'Tennis',
          surface: 'CLAY',
          indoor: false,
          status: 'ACTIVE',
          slots: [
            {
              startTime: '2026-10-08T10:00:00Z',
              endTime: '2026-10-08T11:00:00Z',
              localStartTime: '10:00',
              localEndTime: '11:00',
              state: 'AVAILABLE',
              price: 35.0,
              formattedPrice: '$35.00',
            },
            {
              startTime: '2026-10-08T11:00:00Z',
              endTime: '2026-10-08T12:00:00Z',
              localStartTime: '11:00',
              localEndTime: '12:00',
              state: 'AVAILABLE',
              price: 35.0,
              formattedPrice: '$35.00',
            },
          ],
        },
      ],
    };

    // Shared mock endpoints setup
    for (const page of [pageA, pageB]) {
      await page.route('**/sports', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSports),
        });
      });

      await page.route('**/availability*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAvailability),
        });
      });

      await page.route('**/sse/**', async (route) => {
        await route.abort();
      });
    }

    // Context A (Roger) - Booking creation succeeds (wins 5-minute hold)
    await pageA.route('**/bookings', async (route) => {
      if (route.request().method() === 'POST') {
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'booking-hold-roger',
            bookingReference: 'CC-BK-ROGER1',
            courtId: 'court-center-1',
            courtName: 'Center Court 1',
            startTime: '2026-10-08T10:00:00Z',
            endTime: '2026-10-08T11:00:00Z',
            status: 'HELD',
            holdExpiresAt: fiveMinutesFromNow,
            price: 35.0,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Context B (Novak) - Booking creation encounters conflict (HTTP 409 SLOT_TAKEN)
    await pageB.route('**/bookings', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 409,
            code: 'SLOT_TAKEN',
            message: 'Slot has already been taken by another booking.',
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 3. Both navigate to the court booking page
    await pageA.goto('/app/book');
    await pageB.goto('/app/book');

    await expect(pageA.getByText('Center Court 1')).toBeVisible();
    await expect(pageB.getByText('Center Court 1')).toBeVisible();

    // 4. Both users select the exact same 10:00 AM slot
    const slotA = pageA.getByRole('button', { name: /available/i }).first();
    const slotB = pageB.getByRole('button', { name: /available/i }).first();

    await slotA.click();
    await slotB.click();

    // Both users see the reservation drawer
    await expect(pageA.getByText('Reserve Court Session')).toBeVisible();
    await expect(pageB.getByText('Reserve Court Session')).toBeVisible();

    // 5. User A clicks Hold Slot first -> Wins hold
    const holdBtnA = pageA.getByRole('button', { name: /Hold Slot/i });
    await holdBtnA.click();

    // User A successfully receives the 5-minute hold badge with countdown
    await expect(pageA.getByText('Slot Held Exclusively For You')).toBeVisible();
    await expect(pageA.getByText('Ref: CC-BK-ROGER1')).toBeVisible();
    await expect(pageA.getByRole('button', { name: /Confirm & Reserve/i })).toBeVisible();

    // 6. User B clicks Hold Slot for the same slot -> Receives 409 Conflict
    const holdBtnB = pageB.getByRole('button', { name: /Hold Slot/i });
    await holdBtnB.click();

    // User B receives the friendly conflict state showing:
    // - Friendly warning message: "Slot has already been taken" / "Another athlete just booked or held this slot"
    // - Nearby alternatives recommendation
    // - Waitlist CTA button: "Join Waitlist (Get notified if released)"
    await expect(pageB.getByText(/Slot has already been taken/i).first()).toBeVisible();
    await expect(pageB.getByText(/Another athlete just booked or held this slot/i)).toBeVisible();
    await expect(pageB.getByRole('button', { name: /Join Waitlist/i })).toBeVisible();

    // Clean up contexts
    await contextA.close();
    await contextB.close();
  });
});
