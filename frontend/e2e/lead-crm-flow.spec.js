import { test, expect } from '@playwright/test';

test.describe('Public Website & Lead CRM Pipeline E2E Flow', () => {
  test('Visitor submits public enquiry, staff reviews in CRM pipeline, creates quote, and converts to member', async ({ page }) => {
    // 1. Mock Public API Endpoints
    let recordedEnquiry = null;
    await page.route('**/api/v1/public/enquiry', async (route) => {
      const data = JSON.parse(route.request().postData());
      recordedEnquiry = data;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'lead-test-01',
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: 'NEW',
          source: 'WEB_FORM',
          interest: data.interest,
          message: data.message,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // 2. Navigate to Public Homepage
    await page.goto('/');

    // Check Hero and Brand Elements
    await expect(page.locator('h1')).toContainText('Master Your Sport at');
    await expect(page.locator('text=Champions Club').first()).toBeVisible();

    // Check SEO & Sports Sections
    await expect(page.locator('text=Badminton').first()).toBeVisible();
    await expect(page.locator('text=Tennis').first()).toBeVisible();

    // Fill Public Enquiry Form
    await page.locator('#enquiry-name-input').fill('Ananya Sharma');
    await page.locator('#enquiry-email-input').fill('ananya.sharma@example.com');
    await page.locator('#enquiry-phone-input').fill('+919876543210');
    await page.locator('#enquiry-interest-select').selectOption('Badminton');
    await page.locator('#enquiry-message-input').fill('Interested in premium badminton membership and private coaching.');

    // Ensure honeypot is empty and submit form
    await page.locator('#enquiry-submit-btn').click();

    // Check success feedback
    await expect(page.locator('text=Thank you! Your enquiry has been received.')).toBeVisible();
    expect(recordedEnquiry.name).toBe('Ananya Sharma');
    expect(recordedEnquiry.email).toBe('ananya.sharma@example.com');

    // 3. Now authenticate as FRONT_DESK staff to manage the CRM
    let mockLeads = [
      {
        id: 'lead-test-01',
        name: 'Ananya Sharma',
        email: 'ananya.sharma@example.com',
        phone: '+919876543210',
        status: 'NEW',
        source: 'WEB_FORM',
        interest: 'Badminton',
        message: 'Interested in premium badminton membership and private coaching.',
        assignedTo: 'Desk Officer',
        activities: [
          {
            id: 'act-1',
            type: 'ENQUIRY_RECEIVED',
            details: 'Initial enquiry submitted via Web Form: Interested in premium badminton membership and private coaching.',
            createdBy: 'System',
            createdAt: new Date().toISOString(),
          },
        ],
        quotes: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'lead-test-02',
        name: 'Rohan Deshmukh',
        email: 'rohan@example.com',
        phone: '+919876543211',
        status: 'CONTACTED',
        source: 'PHONE',
        interest: 'Tennis',
        assignedTo: 'Desk Officer',
        activities: [],
        quotes: [],
        createdAt: new Date().toISOString(),
      },
    ];

    let mockFunnel = {
      totalLeads: 2,
      newCount: 1,
      contactedCount: 1,
      quoteSentCount: 0,
      trialBookedCount: 0,
      wonCount: 0,
      lostCount: 0,
      winRatePercentage: 0.0,
      overdueFollowUpsCount: 0,
      activeQuotesCount: 0,
    };

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-frontdesk',
          fullName: 'Desk Officer',
          email: 'desk@championsclub.com',
          role: 'FRONT_DESK',
          status: 'ACTIVE',
        }),
      });
    });

    // Abort SSE and mock notifications to prevent background connection errors
    await page.route('**/sse/**', (route) => route.abort());
    await page.route('**/notifications/**', (route) => route.fulfill({ status: 200, json: [] }));

    await page.route(/\/api\/v1\/crm\/leads(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLeads),
      });
    });

    await page.route(/\/api\/v1\/crm\/leads\/funnel(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFunnel),
      });
    });

    await page.route(/\/api\/v1\/crm\/leads\/overdue(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/v1\/crm\/leads\/[^/?]+$/, async (route) => {
      const url = route.request().url();
      const leadId = url.split('/leads/')[1];
      const lead = mockLeads.find((l) => l.id === leadId) || mockLeads[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(lead),
      });
    });

    await page.route(/\/api\/v1\/crm\/leads\/[^/]+\/status/, async (route) => {
      const url = route.request().url();
      const leadId = url.split('/leads/')[1].split('/status')[0];
      const lead = mockLeads.find((l) => l.id === leadId) || mockLeads[0];
      const data = JSON.parse(route.request().postData());
      lead.status = data.status;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(lead),
      });
    });

    await page.route(/\/api\/v1\/crm\/leads\/[^/]+\/activities/, async (route) => {
      const url = route.request().url();
      const leadId = url.split('/leads/')[1].split('/activities')[0];
      const lead = mockLeads.find((l) => l.id === leadId) || mockLeads[0];
      const data = JSON.parse(route.request().postData());
      const newAct = {
        id: 'act-' + Date.now(),
        type: data.type,
        details: data.details,
        performerName: 'Desk Officer',
        createdAt: new Date().toISOString(),
      };
      lead.activities.unshift(newAct);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newAct),
      });
    });

    await page.route('**/api/v1/crm/quotes', async (route) => {
      const data = JSON.parse(route.request().postData());
      const newQuote = {
        id: 'quote-test-101',
        quoteNumber: 'QT-2026-0001',
        leadId: data.leadId,
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
        status: 'ACTIVE',
        subtotal: 5000.0,
        taxAmount: 900.0,
        total: 5900.0,
        lines: (data.lines || []).map((l, idx) => ({
          id: 'line-' + idx,
          itemDescription: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          totalPrice: l.quantity * l.unitPrice,
        })),
        createdAt: new Date().toISOString(),
      };
      mockLeads[0].quotes.push(newQuote);
      mockLeads[0].status = 'QUOTE_SENT';
      mockFunnel.quoteSentCount = 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newQuote),
      });
    });

    await page.route(/\/api\/v1\/crm\/leads\/[^/]+\/convert/, async (route) => {
      const url = route.request().url();
      const leadId = url.split('/leads/')[1].split('/convert')[0];
      const lead = mockLeads.find((l) => l.id === leadId) || mockLeads[0];
      lead.status = 'WON';
      lead.convertedMemberId = 'm-new-99';
      lead.convertedMemberNo = 'CC-1099';
      mockFunnel.wonCount = 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leadId: lead.id,
          memberId: 'm-new-99',
          convertedMemberNo: 'CC-1099',
          membershipNumber: 'CC-1099',
          welcomeVoucherCode: 'WELCOME100',
          tourTaskCreated: true,
          portalInviteSent: true,
        }),
      });
    });

    // Set auth tokens and visit /console/leads
    await page.addInitScript(() => {
      localStorage.setItem('champions_token', 'mock-frontdesk-token');
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'user-frontdesk',
          fullName: 'Desk Officer',
          email: 'desk@championsclub.com',
          role: 'FRONT_DESK',
          status: 'ACTIVE',
        })
      );
    });

    await page.goto('/console/leads');

    // 4. Verify Kanban Board Loaded
    await expect(page.locator('text=Lead CRM & Pipeline')).toBeVisible();
    await expect(page.locator('text=Ananya Sharma').first()).toBeVisible();
    await expect(page.locator('text=New Enquiries').first()).toBeVisible();

    // 5. Move Lead from NEW to CONTACTED
    const contactBtn = page.locator('button:has-text("Contact →")').first();
    await contactBtn.click();
    await expect(page.locator('text=Lead moved to CONTACTED')).toBeVisible();

    // 6. Click Lead Card to Open Lead Detail Modal
    await page.locator('text=Ananya Sharma').first().click();
    await expect(page.locator('text=Enquiry submitted via Web Form').first()).toBeVisible();

    // Log Activity Note
    await page.locator('input[placeholder*="Log call notes"]').fill('Spoke to Ananya. She requested quote for Gold Annual Badminton Plan.');
    await page.locator('button:has-text("Log")').click();
    await expect(page.locator('text=Spoke to Ananya').first()).toBeVisible();

    // 7. Open Quote Builder Modal
    await page.locator('button:has-text("Create Quote")').click();
    await expect(page.locator('text=Quote Builder for Ananya Sharma')).toBeVisible();

    // Fill Quote Form
    await page.locator('input[placeholder="Description"]').first().fill('Gold Annual Membership + 10 Coaching Sessions');
    await page.locator('input[placeholder="Rate"]').first().fill('50000');

    // Submit Quote
    await page.locator('button:has-text("Issue & Send Quote")').click();
    await expect(page.locator('text=Quotation Dispatched!')).toBeVisible();

    // Close quote modal and detail modal
    await page.locator('#done-quote-modal-btn').click();
    await page.locator('#close-lead-detail-modal-btn').click();

    // 8. Convert Lead to Member in One Click
    const convertBtn = page.locator('button:has-text("Convert ✓")').first();
    await convertBtn.click();

    await expect(page.locator('text=One-Click Member Conversion')).toBeVisible();
    await page.locator('#convert-submit-btn').click();

    // Verify converted notification
    await expect(page.locator('text=Lead successfully converted to Member CC-1099!')).toBeVisible();
  });
});
