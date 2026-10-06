import { test, expect } from '@playwright/test';

test.describe('Champions Club - Members & Plans E2E Lifecycle', () => {
  const registeredMembers = [];

  test.beforeEach(async ({ page }) => {
    registeredMembers.length = 0;

    // Seed mock plans
    await page.route('**/plans', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'plan-gold',
              code: 'GOLD',
              name: 'Gold Champion',
              price: 25000,
              durationMonths: 12,
              courtDiscountPct: 50,
              shopDiscountPct: 20,
              barDiscountPct: 15,
              freeCourts: true,
              maxBookingsPerDay: 4,
              advanceBookingDays: 14,
              benefits: [{ benefit: 'Unlimited court bookings' }],
            },
            {
              id: 'plan-silver',
              code: 'SILVER',
              name: 'Silver Ace',
              price: 15000,
              durationMonths: 12,
              courtDiscountPct: 25,
              shopDiscountPct: 10,
              barDiscountPct: 5,
              freeCourts: false,
              maxBookingsPerDay: 2,
              advanceBookingDays: 7,
              benefits: [{ benefit: 'Standard court bookings' }],
            },
            {
              id: 'plan-junior',
              code: 'JUNIOR',
              name: 'Junior Cadet',
              price: 8000,
              durationMonths: 12,
              courtDiscountPct: 30,
              shopDiscountPct: 15,
              barDiscountPct: 0,
              freeCourts: false,
              maxBookingsPerDay: 2,
              advanceBookingDays: 7,
              benefits: [{ benefit: 'Youth coaching clinics' }],
            },
          ],
        }),
      });
    });

    // Mock search / list endpoint
    await page.route('**/members?**', async (route) => {
      const url = new URL(route.request().url());
      const query = (url.searchParams.get('query') || '').toLowerCase().trim();

      let matched = [...registeredMembers];
      if (query) {
        matched = matched.filter((m) =>
          (m.fullName || '').toLowerCase().includes(query) ||
          (m.phone || '').includes(query) ||
          (m.memberNo || '').toLowerCase().includes(query) ||
          (m.email || '').toLowerCase().includes(query)
        );
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            content: matched,
            totalElements: matched.length,
            totalPages: 1,
            size: 15,
            number: 0,
          },
        }),
      });
    });

    // Mock register member
    await page.route('**/members/register', async (route) => {
      const payload = JSON.parse(route.request().postData());
      const newMember = {
        id: `mem-${Date.now()}`,
        memberNo: 'CC-000042',
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        dob: payload.dob,
        age: 12,
        status: 'ACTIVE',
        planCode: payload.planCode || 'JUNIOR',
        guardianName: payload.guardianName,
        guardianPhone: payload.guardianPhone,
        guardian: {
          name: payload.guardianName,
          phone: payload.guardianPhone,
          relation: payload.guardianRelation || 'Father',
          consentAt: new Date().toISOString(),
        },
        plan: {
          code: payload.planCode || 'JUNIOR',
          name: 'Junior Cadet',
          price: 8000,
          durationMonths: 12,
        },
        entitlements: {
          courtDiscountPct: 30,
          shopDiscountPct: 15,
          barDiscountPct: 0,
          freeCourts: false,
          maxBookingsPerDay: 2,
          advanceBookingDays: 7,
        },
      };
      registeredMembers.push(newMember);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: newMember,
        }),
      });
    });

    // Mock Member 360 endpoint
    await page.route(/\/members\/[^\/]+\/360/, async (route) => {
      const member = registeredMembers[0] || {
        id: 'mem-default',
        memberNo: 'CC-000042',
        fullName: 'Arjun Cadet',
        phone: '9876543299',
        dob: '2014-06-10',
        age: 12,
        status: 'ACTIVE',
        upgradeDue: false,
        guardian: {
          name: 'Suresh Cadet',
          phone: '9876543298',
          relation: 'Father',
          consentAt: new Date().toISOString(),
        },
        plan: {
          code: 'JUNIOR',
          name: 'Junior Cadet',
          price: 8000,
          durationMonths: 12,
        },
        entitlements: {
          courtDiscountPct: 30,
          shopDiscountPct: 15,
          barDiscountPct: 0,
          freeCourts: false,
          maxBookingsPerDay: 2,
          advanceBookingDays: 7,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: member,
        }),
      });
    });

    // Mock auth / me
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-front-desk',
          email: 'frontdesk@championsclub.com',
          fullName: 'Receptionist Aarti',
          role: 'FRONT_DESK',
          status: 'ACTIVE',
        }),
      });
    });

    // Seed session into localStorage
    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'mock-valid-staff-token');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-front-desk',
          email: 'frontdesk@championsclub.com',
          fullName: 'Receptionist Aarti',
          role: 'FRONT_DESK',
          status: 'ACTIVE',
        })
      );
    });
  });

  test('Register a Junior member with guardian then find them by phone in members directory', async ({ page }) => {
    // 1. Navigate to Members Console
    await page.goto('/console/members');
    await expect(page.getByRole('heading', { name: /Members Directory/i })).toBeVisible();

    // 2. Open Register Member wizard modal
    await page.getByRole('button', { name: /Register Member/i }).click();
    await expect(page.getByRole('heading', { name: /Register Member/i })).toBeVisible();

    // 3. Fill Step 1: Personal Details for a minor
    await page.locator('#wizard-fullname').fill('Arjun Cadet');
    await page.locator('#wizard-email').fill('arjun.cadet@example.com');
    await page.locator('#wizard-phone').fill('9876543299');
    await page.locator('#wizard-dob').fill('2014-06-10');

    // Verify Minor badge appears
    await expect(page.getByText(/Minor \(<18\) — Guardian Required/i)).toBeVisible();

    // Proceed to Step 2: Guardian Details
    await page.getByRole('button', { name: /Next Step/i }).click();
    await expect(page.getByText(/Minor Safety Mandate/i)).toBeVisible();

    // 4. Fill Step 2: Guardian Details
    await page.locator('#wizard-guardian-name').fill('Suresh Cadet');
    await page.locator('#wizard-guardian-phone').fill('9876543298');
    await page.locator('#wizard-guardian-consent').check();

    // Proceed to Step 3: Plan Tier
    await page.getByRole('button', { name: /Next Step/i }).click();
    await expect(page.locator('span:text("Junior Cadet")')).toBeVisible();

    // Proceed to Step 4: Portal & Review
    await page.getByRole('button', { name: /Next Step/i }).click();
    await expect(page.getByText(/Create Member App \/ Portal Account/i)).toBeVisible();

    // Complete Registration
    await page.getByRole('button', { name: /Complete Registration/i }).click();

    // 5. User is redirected to Member 360 page for the newly registered member
    await expect(page).toHaveURL(/\/console\/members\//);
    await expect(page.getByRole('heading', { name: /Arjun Cadet/i })).toBeVisible();
    await expect(page.getByText('CC-000042')).toBeVisible();

    // Verify guardian tab & details on Member 360 page
    await page.getByRole('button', { name: /Guardian & Emergency/i }).click();
    await expect(page.getByText('Suresh Cadet')).toBeVisible();
    await expect(page.getByText('9876543298')).toBeVisible();

    // 6. Return to Members Directory and search for member by phone
    await page.goto('/console/members');
    await expect(page.getByRole('heading', { name: /Members Directory/i })).toBeVisible();

    const searchInput = page.getByPlaceholder(/Search by name, phone, email, or member no/i);
    await searchInput.fill('9876543299');

    // Wait for debounced search result
    await expect(page.getByText('Arjun Cadet')).toBeVisible();
    await expect(page.getByText('9876543299')).toBeVisible();
    await expect(page.getByText('CC-000042')).toBeVisible();
    await expect(page.getByText('JUNIOR').first()).toBeVisible();
  });
});
