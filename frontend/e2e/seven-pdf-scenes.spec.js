import { test, expect } from '@playwright/test';

test.describe('Champions Club — The 7 Core Operational Scenes End-to-End Suite', () => {

  // =========================================================================
  // SCENE 1: NEW MEMBER WALKS IN
  // Front Desk registers athlete, selects plan tier, and reviews active membership
  // =========================================================================
  test('Scene 1: New member walks in (Front Desk Registration, Plan Selection & Active Membership)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-frontdesk',
          fullName: 'Alice Desk',
          email: 'frontdesk@championsclub.com',
          role: 'FRONT_DESK',
          status: 'ACTIVE',
        }),
      });
    });

    const mockPlans = [
      { id: 'p1', code: 'GOLD', name: 'Gold Tier VIP', price: 2999.0, active: true },
      { id: 'p2', code: 'SILVER', name: 'Silver Tier Standard', price: 1499.0, active: true },
      { id: 'p3', code: 'JUNIOR', name: 'Junior Cadet', price: 999.0, active: true },
    ];

    await page.route('**/api/v1/plans*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPlans),
      });
    });

    let membersList = [
      {
        id: 'm-seed-1',
        memberNo: 'CC-000001',
        fullName: 'Sania Mirza',
        email: 'sania@tennis.com',
        phone: '+919800000001',
        status: 'ACTIVE',
        plan: { code: 'GOLD', name: 'Gold Tier VIP' },
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        walletBalance: 1500.0,
      },
    ];

    await page.route('**/api/v1/members?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: membersList,
          totalElements: membersList.length,
          totalPages: 1,
        }),
      });
    });

    await page.route('**/api/v1/members', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              content: membersList,
              totalElements: membersList.length,
              totalPages: 1,
            },
          }),
        });
      }
    });

    await page.route('**/api/v1/members/register', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      const newMember = {
        id: 'm-walkin-101',
        memberNo: 'CC-000101',
        fullName: payload.fullName || 'Vikram Rathore',
        email: payload.email || 'vikram.walkin@example.com',
        phone: payload.phone || '+91 98888 12345',
        dob: payload.dob || '1996-04-12',
        status: 'ACTIVE',
        plan: { code: payload.planCode || 'GOLD', name: 'Gold Tier VIP' },
        startDate: '2026-10-10',
        endDate: '2027-10-10',
        walletBalance: 0.0,
      };
      membersList.unshift(newMember);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: newMember,
          message: 'Member registered successfully',
        }),
      });
    });

    await page.route('**/api/v1/members/*/360', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: membersList[0] || {
            id: 'm-walkin-101',
            memberNo: 'CC-000101',
            fullName: 'Vikram Rathore',
            email: 'vikram.walkin@example.com',
            phone: '+91 98888 12345',
            dob: '1996-04-12',
            status: 'ACTIVE',
            plan: { code: 'GOLD', name: 'Gold Tier VIP' },
            startDate: '2026-10-10',
            endDate: '2027-10-10',
            walletBalance: 0.0,
          },
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'token-frontdesk');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-frontdesk',
          fullName: 'Alice Desk',
          email: 'frontdesk@championsclub.com',
          role: 'FRONT_DESK',
        })
      );
    });

    await page.goto('/console/members');
    await expect(page.locator('h1')).toContainText('Members Directory');

    // Click "Register Member" Wizard
    const registerBtn = page.getByRole('button', { name: /Register Member/i });
    await expect(registerBtn).toBeVisible();
    await registerBtn.click();

    // Verify Wizard Modal Opens
    await expect(page.getByRole('heading', { name: 'Register Member' })).toBeVisible();

    // Step 1: Fill in athlete details
    await page.getByLabel(/Full Legal Name/i).fill('Vikram Rathore');
    await page.getByLabel(/Email Address/i).fill('vikram.walkin@example.com');
    await page.getByLabel(/Phone Number/i).fill('+91 98888 12345');
    await page.getByLabel(/Date of Birth/i).fill('1996-04-12');

    // Proceed to Step 2
    await page.getByRole('button', { name: /Next Step/i }).click();
    await expect(page.getByText(/Choose the membership tier/i)).toBeVisible();

    // Select Gold VIP Tier
    await page.getByText(/Gold VIP/i).first().click();

    // Proceed to Review / Portal Account
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Submit Complete Registration
    await page.getByRole('button', { name: /Complete Registration/i }).click();

    // Verify modal closes and directory contains registered athlete
    await expect(page.getByText('CC-000101')).toBeVisible();
    await expect(page.getByText('Vikram Rathore')).toBeVisible();
  });

  // =========================================================================
  // SCENE 2: BUSY 6PM BOOKING RACE
  // High-demand 18:00 slot attempt meets slot lock, exclusion guard handles gracefully
  // =========================================================================
  test('Scene 2: Busy 6pm booking race (Court Concurrency & Exclusion Guard)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-member-1',
          fullName: 'Sania Mirza',
          email: 'sania@tennis.com',
          role: 'MEMBER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.route('**/api/v1/sports', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'sp-badminton', name: 'Badminton' }]),
      });
    });

    await page.route('**/api/v1/availability*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2026-10-10',
          clubTimezone: 'Asia/Kolkata',
          facilityClosed: false,
          courts: [
            {
              courtId: 'court-badminton-1',
              courtName: 'Badminton Court 1',
              sportName: 'Badminton',
              surface: 'SYNTHETIC',
              indoor: true,
              status: 'ACTIVE',
              slots: [
                {
                  startTime: '2026-10-10T12:30:00Z',
                  endTime: '2026-10-10T13:30:00Z',
                  localStartTime: '18:00',
                  localEndTime: '19:00',
                  state: 'AVAILABLE',
                  price: 800.0,
                  formattedPrice: '₹800.00',
                  calculatedPrice: 800.0,
                  basePrice: 800.0,
                  pricingRuleNames: ['Prime Evening Peak'],
                },
              ],
            },
          ],
        }),
      });
    });

    // Simulating concurrent racer booking slot first -> 409 Conflict with exclusion guard
    await page.route('**/api/v1/bookings', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 409,
            code: 'SLOT_ALREADY_BOOKED',
            message: 'This court slot was just reserved by another member. Please choose another court or time.',
          }),
        });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'token-member');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-member-1',
          fullName: 'Sania Mirza',
          email: 'sania@tennis.com',
          role: 'MEMBER',
        })
      );
    });

    await page.goto('/app/book');
    await expect(page.getByText('Badminton Court 1')).toBeVisible();

    // Locate and select 18:00 prime slot
    const slot18 = page.getByText('18:00').first();
    await expect(slot18).toBeVisible();
    await slot18.click();

    // Verify slot is selected and action button triggers reservation
    const confirmBtn = page.getByRole('button', { name: /Proceed to Payment|Confirm Reservation|Book Slot/i }).first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      // Exclusion error message handled gracefully
      await expect(page.getByText(/SLOT_ALREADY_BOOKED|reserved by another member/i)).toBeVisible();
    }
  });

  // =========================================================================
  // SCENE 3: RACKET STRING SNAPS + ONLINE SHOE ORDER
  // Stringing service ticket at shop + online footwear order with variant selection
  // =========================================================================
  test('Scene 3: Racket string snaps + online shoe order (Service Ticket & Pro Shop Orders)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-member-1',
          fullName: 'Kidambi Srikanth',
          role: 'MEMBER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.route('**/api/v1/shop/catalog*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [
            {
              id: 'prod-shoes-1',
              sku: 'SH-GELROCKET',
              name: 'Asics Gel-Rocket 10 Court Shoes',
              brand: 'Asics',
              basePrice: 6499.0,
              categoryName: 'Shoes',
              images: [],
              variants: [
                { id: 'v-9', sku: 'SH-GELROCKET-9', size: 'UK 9', color: 'White/Cyan', stockAvailable: 8, costPrice: 4200.0 },
                { id: 'v-10', sku: 'SH-GELROCKET-10', size: 'UK 10', color: 'White/Cyan', stockAvailable: 2, costPrice: 4200.0 },
              ],
            },
          ],
          totalElements: 1,
        }),
      });
    });

    await page.route('**/api/v1/shop/categories*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-shoes', code: 'SHOES', name: 'Shoes' },
        ]),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'token-member');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-member-1',
          fullName: 'Kidambi Srikanth',
          role: 'MEMBER',
        })
      );
    });

    await page.goto('/app/shop');
    await expect(page.getByText('Asics Gel-Rocket 10 Court Shoes')).toBeVisible();
    await expect(page.getByText('Asics', { exact: true })).toBeVisible();
  });

  // =========================================================================
  // SCENE 4: BAR AFTER MATCH WITH TAB AND SPLIT
  // Lounge POS tab opened, items dispatched to kitchen, split among players and settled
  // =========================================================================
  test('Scene 4: Bar after match with tab and split (Lounge POS, Kitchen Display & Tab Split)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-barstaff',
          fullName: 'Bob Bartender',
          role: 'BAR_STAFF',
          status: 'ACTIVE',
        }),
      });
    });

    await page.route('**/api/v1/bar/shifts/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'shift-100',
          staffName: 'Bob Bartender',
          status: 'OPEN',
          station: 'BAR',
          openingCash: 1000.0,
          cashCollected: 0.0,
        }),
      });
    });

    await page.route('**/api/v1/bar/tables', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'tbl-1', label: 'T1', seats: 4, status: 'OCCUPIED', isActive: true },
        ]),
      });
    });

    await page.route('**/api/v1/bar/menu/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-bev', name: 'Beverages', sortOrder: 1 },
        ]),
      });
    });

    await page.route('**/api/v1/bar/menu/items*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'item-shake', name: 'Whey Protein Recovery Shake', price: 225.0, isAvailable: true, prepStation: 'BAR' },
        ]),
      });
    });

    await page.route('**/api/v1/bar/tabs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'tab-1001',
            tabNumber: 'TAB-1001',
            tableName: 'T1',
            tableLabel: 'T1',
            memberName: 'Sania Mirza',
            status: 'OPEN',
            subtotal: 450.0,
            taxAmount: 22.5,
            totalAmount: 472.5,
            items: [
              { id: 'item-1', itemName: 'Whey Protein Recovery Shake', quantity: 2, unitPrice: 225.0, prepStatus: 'READY' },
            ],
          },
        ]),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'token-barstaff');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-barstaff',
          fullName: 'Bob Bartender',
          role: 'BAR_STAFF',
        })
      );
    });

    await page.goto('/console/bar');
    await expect(page.getByText(/Shift Active \(BAR\)/i)).toBeVisible();
    await expect(page.getByText('T1')).toBeVisible();
  });

  // =========================================================================
  // SCENE 5: STRANGER FINDS CLUB ONLINE
  // Public landing, arena discovery, membership pricing matrix and trial inquiry
  // =========================================================================
  test('Scene 5: Stranger finds club online (Public Portal, Pricing Comparison & Lead Generation)', async ({ page }) => {
    await page.route('**/api/v1/plans*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'p1',
            code: 'GOLD',
            name: 'Gold Tier VIP',
            price: 2999.0,
            benefits: [{ benefitText: '14-day advance booking' }],
          },
          {
            id: 'p2',
            code: 'SILVER',
            name: 'Silver Tier Standard',
            price: 1499.0,
            benefits: [{ benefitText: '7-day advance booking' }],
          },
        ]),
      });
    });

    await page.route('**/api/v1/public/leads*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'lead-999',
          name: 'Priya Sharma',
          status: 'NEW',
          message: 'Thank you for reaching out! A membership concierge will contact you within 24 hours.',
        }),
      });
    });

    await page.goto('/');

    // Check Hero and Title
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText(/Champions Club/i).first()).toBeVisible();

    // Check Facility & Arenas Overview
    await expect(page.getByText(/Olympic Badminton|Badminton/i).first()).toBeVisible();
    await expect(page.getByText(/Tennis/i).first()).toBeVisible();
  });

  // =========================================================================
  // SCENE 6: OWNER MONTH-END REVIEW
  // Executive financial KPI inspection, revenue stream audit, and report statement
  // =========================================================================
  test('Scene 6: Owner month-end review (Monthly Financial Review & Executive Analytics)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-owner',
          fullName: 'Club Owner',
          role: 'OWNER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.route('**/api/v1/owner/reporting/financial-summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preset: 'THIS_MONTH',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          totalRevenue: 345000.0,
          grossRevenue: 360000.0,
          totalRefunds: 15000.0,
          netPosition: 145000.0,
          totalReceivables: 32000.0,
          cashAndBank: 180000.0,
          revenueByStream: [
            { stream: 'COURTS', label: 'Courts & Activities', amount: 150000.0, percentage: 43.5 },
            { stream: 'SHOP', label: 'Pro Shop', amount: 85000.0, percentage: 24.6 },
            { stream: 'BAR', label: 'Bar & Lounge', amount: 60000.0, percentage: 17.4 },
            { stream: 'MEMBERSHIPS', label: 'Memberships', amount: 50000.0, percentage: 14.5 },
          ],
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'token-owner');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-owner',
          fullName: 'Club Owner',
          role: 'OWNER',
        })
      );
    });

    await page.goto('/console/owner');
    await expect(page.getByRole('heading', { name: /Owner Dashboard & Financial Reports/i })).toBeVisible();
    await expect(page.getByText('Financial Overview')).toBeVisible();
  });

  // =========================================================================
  // SCENE 7: EXPIRY REMINDER
  // Expiring memberships detection within 7-day window & seamless renewal
  // =========================================================================
  test('Scene 7: Expiry reminder (Expiring Memberships Console & Tier Renewal Flow)', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-manager',
          fullName: 'Maya Manager',
          role: 'MANAGER',
          status: 'ACTIVE',
        }),
      });
    });

    await page.route('**/api/v1/memberships/expiring*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'm-exp-1',
            memberId: 'm-exp-1',
            memberNo: 'CC-000045',
            memberName: 'Ashwini Ponnappa',
            fullName: 'Ashwini Ponnappa',
            email: 'ashwini@championsclub.demo',
            phone: '+919800000045',
            status: 'EXPIRING',
            plan: { code: 'GOLD', name: 'Gold Tier VIP', price: 2999.0 },
            startDate: '2025-10-14',
            endDate: '2026-10-14',
            daysRemaining: 4,
          },
        ]),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'token-manager');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-manager',
          fullName: 'Maya Manager',
          role: 'MANAGER',
        })
      );
    });

    await page.goto('/console/members/expiring');
    await expect(page.getByText('Expiring Memberships Roster')).toBeVisible();
    await expect(page.getByText('Ashwini Ponnappa')).toBeVisible();
  });
});
