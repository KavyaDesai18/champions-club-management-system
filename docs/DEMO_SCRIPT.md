# Champions Club — 5-Minute Live Demo Script

This script provides an exact, click-by-click demonstration flow for judges and evaluators, highlighting the 7 core operational scenarios outlined in the project specification.

---

## Pre-Requisites
- Frontend running at `http://localhost:5173` (or production URL).
- Backend running at `http://localhost:8081`.
- Realistic demo data loaded via `RealisticDemoDataSeeder` or `POST /api/v1/public/demo/seed`.
- **Default Owner Credentials:**
  - Email: `owner@championsclub.com`
  - Password: `Champions@123`

---

## 🎬 Scenario Walkthrough (5 Minutes)

### ⏱ 0:00 – 0:45 | Scene 1: New Member Walks In
**Goal:** Showcase front-desk onboarding, live age verification, tier assignment, and instant QR badge issuance.
1. Log in as Front Desk staff or Owner (`owner@championsclub.com` / `Champions@123`).
2. Navigate to **Console > Members Directory** (`/console/members`).
3. Click the green **`+ Register Member`** button in the top right.
4. **Step 1 (Personal Details):**
   - Full Name: `Vikram Rathore`
   - Email: `vikram.rathore@example.com`
   - Phone: `+91 98888 12345`
   - Date of Birth: `1996-05-15` (Notice the live badge: `Adult Member (30 years)`).
   - Click **`Next Step`**.
5. **Step 2 (Plan Selection):**
   - Click **`Gold VIP`** card.
   - Notice the entitlements preview: `14-day advance booking, 25% court discount, 2 complimentary guest passes`.
   - Click **`Next Step`**.
6. **Step 3 (Confirmation & Review):**
   - Notice `Create Member Portal Account` is toggled on.
   - Click **`Complete Registration`**.
7. **Outcome:** Vikram Rathore appears in the directory with Member ID `CC-000101`, status `ACTIVE`, and a downloadable digital QR badge.

---

### ⏱ 0:45 – 1:30 | Scene 2: The Busy 6 PM Friday Booking Race
**Goal:** Prove non-negotiable database-level exclusion constraint preventing concurrent double bookings.
1. Log in as a Member (or switch to Member App `/app/book`).
2. Navigate to **Book Court** (`/app/book`).
3. Select **Badminton Court 1** for today's date.
4. Locate the high-demand **`18:00 – 19:00`** prime evening slot.
5. Click the `18:00` slot and click **`Confirm Booking`** (Athlete A secures it).
6. Simulate Athlete B attempting to claim the identical slot:
   - The PostgreSQL `btree_gist` exclusion constraint rejects the overlapping interval at the DB engine level.
   - The frontend intercepts the RFC 7807 problem details response and displays a graceful toast:
     > *"Slot already reserved by another member. Please choose another court or time."*
7. **Outcome:** Zero race conditions, zero orphaned state, database integrity remains rock solid.

---

### ⏱ 1:30 – 2:15 | Scene 3: Racket String Snaps + Pro Shop Order
**Goal:** Demonstrate pro-shop repairs workflow and online merchandising with variant inventory and low-stock alarms.
1. Navigate to **Console > Pro Shop & Equipment** (`/console/shop`).
2. Click the **`Service Tickets`** tab.
3. Review active ticket **`TK-STR-1001`**:
   - Equipment: *Yonex Astrox 99 Pro*
   - Service: *Stringing & Tensioning (Yonex BG 65 Ti @ 27 lbs)*
   - Status: `IN_PROGRESS` with promised 24-hour turnaround.
4. Switch to Member App **Pro Shop** (`/app/shop`).
5. Select **`Asics Gel-Rocket 10 Court Shoes`**.
6. Select variant **`UK 10`**: Notice the amber alert: `Only 2 units remaining (Low Stock)`.
7. Add to cart and complete checkout.
8. Switch back to Staff Console: Inventory count updates in real-time to `1`, triggering a automated reorder suggestion to the vendor.

---

### ⏱ 2:15 – 3:00 | Scene 4: Post-Match Lounge Tab & 50/50 Split
**Goal:** Show point-of-sale lounge operations, kitchen prep queue, bill splitting, and multi-tender settlement.
1. Navigate to **Console > Bar & Lounge Tabs** (`/console/bar`).
2. Open active tab **`TAB-1001`** for **Table T1** (Member: *Sania Mirza*).
3. Review order items: 2x *Whey Protein Recovery Shake* and 1x *Fresh Lime Soda*.
4. Open **Kitchen Display System (KDS)** (`/console/kitchen`):
   - Items appear with preparation station badge (`BAR` vs `KITCHEN`).
   - Click **`Mark Ready`** on tickets.
5. In Bar POS, click **`Split Tab`**:
   - Select **50 / 50 Equal Split** between *Sania Mirza* and co-player *Rohan Bopanna*.
   - Each player pays their ₹162.75 share via UPI / Member Wallet.
6. Click **`Close Tab`**: Tab closes with official GST tax breakdown and ledger entries generated.

---

### ⏱ 3:00 – 3:45 | Scene 5: Stranger Discovers Club Online
**Goal:** Showcase public portal, SEO, responsive mobile design, and automated CRM lead capture.
1. Open Incognito window / log out and visit the public homepage (`/`).
2. Scroll through the Olympic court specifications (synthetic & wooden shock-absorbing surfaces).
3. Check the interactive **Membership Tier Comparison** (`Gold VIP` vs `Silver Standard` vs `Junior Cadet`).
4. In the **Book a Free Trial Session** section, submit an inquiry:
   - Name: `Priya Sharma`
   - Email: `priya@example.com`
   - Phone: `+91 98765 43210`
   - Sport Interest: `Badminton & Tennis`
5. Click **`Submit Inquiry`**: Success confirmation appears instantly.
6. Switch to Staff Console **Lead CRM** (`/console/leads`): Priya Sharma appears at stage `NEW`, ready for concierge follow-up.

---

### ⏱ 3:45 – 4:30 | Scene 6: Owner Month-End Review & Shared Report Link
**Goal:** Demonstrate 100% ledger-reconciled financial reporting, multi-stream revenue breakdown, and signed sharing links.
1. Log in as Owner and navigate to **Owner Dashboard** (`/console/owner`).
2. Review the executive summary cards:
   - **Total Monthly Revenue:** Reconciled across Courts, Shop, Bar, and Subscriptions.
   - **Net Operating Income:** Revenue minus operating expenses (Rent, Power, Net maintenance).
   - **Receivables & Payables Aging:** Aging slabs (Current, 31-60 days, 60+ days).
3. Click the **`Export`** dropdown and select **`Export CSV`** to trigger instant client-side download.
4. Click **`Share Link`**:
   - Select expiration window: `7 Days`.
   - Copy generated signed share token URL.
5. Open the copied URL in a private browser window (`/shared-report/[token]`):
   - The external stakeholder/investor views the live financial dashboard without needing staff credentials or passwords.

---

### ⏱ 4:30 – 5:00 | Scene 7: 7-Day Expiry Automation & Tier Renewal
**Goal:** Demonstrate automatic renewal detection, grace-period preservation, and one-click extension.
1. Navigate to **Console > Expiring Memberships** (`/console/members/expiring`).
2. Notice member *Ashwini Ponnappa* flagged with `Expires in 4 days`.
3. Click **`Renew Membership`**:
   - The renewal modal calculates a +12 month extension from the *original end date* (not from today), ensuring the athlete never loses remaining days.
   - Select Payment Method: `UPI` / `Member Wallet`.
4. Click **`Confirm Renewal`**:
   - Status updates, wallet is billed, and an official digital invoice receipt is generated with immutable audit logging.
