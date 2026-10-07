import { test, expect } from '@playwright/test';

test.describe('Champions Club - Friday Social Play E2E', () => {
  test('Member joins Friday session, session becomes full, next member sees waitlist', async ({ browser }) => {
    // 1. Setup Context A (Member A: Carlos Alcaraz)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    const userCarlos = {
      id: 'user-carlos',
      memberId: 'mem-carlos',
      fullName: 'Carlos Alcaraz',
      email: 'carlos@championsclub.com',
      role: 'MEMBER',
      status: 'ACTIVE',
    };

    await pageA.addInitScript((u) => {
      localStorage.setItem('champions_user', JSON.stringify(u));
      localStorage.setItem('champions_token', 'mock-token-carlos');
    }, userCarlos);

    // 2. Setup Context B (Member B: Jannik Sinner)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    const userJannik = {
      id: 'user-jannik',
      memberId: 'mem-jannik',
      fullName: 'Jannik Sinner',
      email: 'jannik@championsclub.com',
      role: 'MEMBER',
      status: 'ACTIVE',
    };

    await pageB.addInitScript((u) => {
      localStorage.setItem('champions_user', JSON.stringify(u));
      localStorage.setItem('champions_token', 'mock-token-jannik');
    }, userJannik);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    const mockSports = [
      { id: 'sport-padel', name: 'Padel' },
      { id: 'sport-tennis', name: 'Tennis' },
    ];

    const mockCourts = [
      { id: 'court-1', name: 'Padel Court 1', surface: 'TURF', status: 'ACTIVE' },
    ];

    // Shared state between contexts: initially 1 spot remaining (7/8 capacity)
    let currentSession = {
      id: 'session-friday-social-1',
      courtId: 'court-1',
      courtName: 'Padel Court 1',
      sportId: 'sport-padel',
      sportName: 'Padel',
      title: 'Friday Night Padel Social & Mixer',
      startAt: '2026-10-09T18:00:00Z',
      endAt: '2026-10-09T21:00:00Z',
      capacity: 8,
      minParticipants: 4,
      feeMember: 10.0,
      feeGuest: 15.0,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR;COUNT=8',
      status: 'SCHEDULED',
      allowJunior: true,
      joinedCount: 7,
      waitlistCount: 0,
      availableSpots: 1,
      isFull: false,
      participants: [
        { id: 'p-1', memberId: 'm-1', memberName: 'Player 1', status: 'JOINED', paymentStatus: 'PAID' },
        { id: 'p-2', memberId: 'm-2', memberName: 'Player 2', status: 'JOINED', paymentStatus: 'PAID' },
        { id: 'p-3', memberId: 'm-3', memberName: 'Player 3', status: 'JOINED', paymentStatus: 'PAID' },
        { id: 'p-4', memberId: 'm-4', memberName: 'Player 4', status: 'JOINED', paymentStatus: 'PAID' },
        { id: 'p-5', memberId: 'm-5', memberName: 'Player 5', status: 'JOINED', paymentStatus: 'PAID' },
        { id: 'p-6', memberId: 'm-6', memberName: 'Player 6', status: 'JOINED', paymentStatus: 'PAID' },
        { id: 'p-7', memberId: 'm-7', memberName: 'Player 7', status: 'JOINED', paymentStatus: 'PAID' },
      ],
    };

    // Setup routes for Context A (Carlos)
    await pageA.route(/\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(userCarlos),
      });
    });

    // Setup routes for Context B (Jannik)
    await pageB.route(/\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(userJannik),
      });
    });

    for (const page of [pageA, pageB]) {
      await page.route(/\/notifications/, async (route) => {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ notifications: [], totalUnread: 0, unreadCount: 0 }),
        });
      });

      await page.route(/\/sports/, async (route) => {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify(mockSports),
        });
      });

      await page.route(/\/courts/, async (route) => {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify(mockCourts),
        });
      });

      await page.route(/\/social-sessions/, async (route) => {
        const method = route.request().method();
        const url = route.request().url();

        if (method === 'OPTIONS') {
          await route.fulfill({
            status: 204,
            headers: corsHeaders,
          });
          return;
        }

        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify([currentSession]),
          });
        } else if (method === 'POST' && url.includes('/join')) {
          let reqBody = {};
          try {
            reqBody = route.request().postDataJSON() || {};
          } catch {
            reqBody = {};
          }

          const isCarlos = reqBody.memberId === 'user-carlos' || reqBody.memberId === 'mem-carlos';

          if (currentSession.joinedCount < currentSession.capacity) {
            currentSession.joinedCount += 1;
            currentSession.availableSpots -= 1;
            if (currentSession.availableSpots <= 0) {
              currentSession.isFull = true;
            }
            const newParticipant = {
              id: 'part-carlos-1',
              sessionId: currentSession.id,
              memberId: isCarlos ? 'user-carlos' : reqBody.memberId,
              memberName: isCarlos ? 'Carlos Alcaraz' : 'Player',
              status: 'JOINED',
              paymentStatus: 'PAID',
            };
            currentSession.participants.push(newParticipant);
            await route.fulfill({
              status: 200,
              headers: corsHeaders,
              contentType: 'application/json',
              body: JSON.stringify(newParticipant),
            });
          } else {
            // Waitlist auto-positioning
            currentSession.waitlistCount += 1;
            const waitlistPos = currentSession.waitlistCount;
            const waitlistedParticipant = {
              id: 'part-jannik-waitlist',
              sessionId: currentSession.id,
              memberId: 'user-jannik',
              memberName: 'Jannik Sinner',
              status: 'WAITLISTED',
              paymentStatus: 'PENDING',
              waitlistPosition: waitlistPos,
            };
            currentSession.participants.push(waitlistedParticipant);
            await route.fulfill({
              status: 200,
              headers: corsHeaders,
              contentType: 'application/json',
              body: JSON.stringify(waitlistedParticipant),
            });
          }
        } else {
          await route.continue();
        }
      });
    }

    // Step 1: Member A loads Social Play page
    await pageA.goto('/app/social');
    await expect(pageA.locator('#social-play-container')).toBeVisible({ timeout: 10000 });
    await expect(pageA.locator('text=Friday Night Padel Social & Mixer')).toBeVisible();

    // Verify 1 spot left
    await expect(pageA.locator('text=1 Left')).toBeVisible();
    const joinBtnA = pageA.locator('#join-session-btn-session-friday-social-1');
    await expect(joinBtnA).toBeVisible();
    await expect(joinBtnA).toHaveText(/Join Session/);

    // Step 2: Member A clicks Join and confirms in modal
    await joinBtnA.click();
    await expect(pageA.locator('text=Confirm to lock in your spot immediately.')).toBeVisible();
    await pageA.locator('#confirm-join-btn').click();

    // Step 3: Member A is now booked (sees Booked badge or Leave button)
    await expect(pageA.locator('text=Booked')).toBeVisible({ timeout: 8000 });
    await expect(pageA.locator('#leave-session-btn-session-friday-social-1')).toBeVisible();

    // Step 4: Member B visits the page after Member A took the last seat
    await pageB.goto('/app/social');
    await expect(pageB.locator('#social-play-container')).toBeVisible({ timeout: 10000 });
    await expect(pageB.locator('text=Friday Night Padel Social & Mixer')).toBeVisible();

    // Step 5: Member B sees FULL status badge and "Join Waitlist" CTA button
    await expect(pageB.locator('text=Full')).toBeVisible();
    const waitlistBtnB = pageB.locator('#join-waitlist-btn-session-friday-social-1');
    await expect(waitlistBtnB).toBeVisible();
    await expect(waitlistBtnB).toHaveText(/Join Waitlist/);

    // Step 6: Member B clicks Join Waitlist and confirms
    await waitlistBtnB.click();
    await expect(pageB.locator('text=auto-promoting waitlist')).toBeVisible();
    await pageB.locator('#confirm-join-btn').click();

    // Step 7: Member B now sees waitlisted state with Leave Waitlist option
    await expect(pageB.locator('text=Waitlist #1')).toBeVisible({ timeout: 8000 });
    await expect(pageB.locator('#leave-session-btn-session-friday-social-1')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
