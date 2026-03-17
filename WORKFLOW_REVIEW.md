# Tayal Yoga Class — Complete Workflow Review

> Generated: 2026-03-17 | Scope: src/app/api/**, src/lib/aisensy.ts, src/lib/googleSheets.ts, .env

---

## 1. Complete Message Flow

All 12 WhatsApp templates sent via AiSensy Campaign API at `https://backend.aisensy.com/campaign/t1/api/v2`.  
Phone format required by AiSensy: `91XXXXXXXXXX` (no `+` prefix).

### Free Trial Templates (T1–T8)

| # | Template Name | Trigger | Route/Cron | Params Passed |
|---|---------------|---------|------------|---------------|
| T1 | `yoga_freetrial_welcome` | Immediately on registration | `POST /api/free-trial` | `{{1}}`=Name, `{{2}}`=StartDate, `{{3}}`=EndDate, `{{4}}`=PersonalJoinLink |
| T2 | `yoga_freetrial_schedule` | 3 minutes after T1 | `POST /api/free-trial` (delayed async) | `{{1}}`=StartDate, `{{2}}`=EndDate, `{{3}}`=PersonalJoinLink |
| T3 | `yoga_freetrial_daily_reminder` | Day 1–7 at 4:30 PM IST | `GET /api/cron/send-messages` | `{{1}}`=Name, `{{2}}`=TodayDate, `{{3}}`=PersonalJoinLink |
| T4 | `yoga_freetrial_mid_nudge` | Day 3 (alongside T3) | `GET /api/cron/send-messages` | `{{1}}`=Name, `{{2}}`=RegistrationURL |
| T5 | `yoga_freetrial_urgency` | Day 6 (alongside T3) | `GET /api/cron/send-messages` | `{{1}}`=Name, `{{2}}`=RegistrationURL |
| T6 | `yoga_freetrial_lastday` | Day 7 (alongside T3) | `GET /api/cron/send-messages` | `{{1}}`=Name, `{{2}}`=PersonalJoinLink, `{{3}}`=RegistrationURL |
| T7 | `yoga_freetrial_expired_d8` | Day 8, 9, 10 (no Zoom link) | `GET /api/cron/send-messages` | `{{1}}`=Name, `{{2}}`=RegistrationURL |
| T8 | `yoga_freetrial_joined_confirm` | User clicks "Confirm My Trial" button | `POST /api/webhook/aisensy` (**NOT YET CREATED**) | `{{1}}`=Name |

### Paid Member Templates (T9–T12)

| # | Template Name | Trigger | Route/Cron | Params Passed |
|---|---------------|---------|------------|---------------|
| T9 | `yoga_paid_welcome` | Immediately on successful Paytm payment | `POST /api/paytm-callback` | `{{1}}`=Name, `{{2}}`=PlanName, `{{3}}`=EndDate, `{{4}}`=PersonalJoinLink |
| T10 | `yoga_paid_daily_reminder` | Daily at 4:30 PM IST for all active paid members | `GET /api/cron/send-messages` | `{{1}}`=Name, `{{2}}`=TodayDate, `{{3}}`=PersonalJoinLink |
| T11 | `yoga_paid_weekly_info` | Weekly (Saturday/Sunday) | **NOT IMPLEMENTED** — function exists but no CRON calls it | `{{1}}`=Name, `{{2}}`=WeeklyTitle, `{{3}}`=WeeklyContent, `{{4}}`=PersonalJoinLink |
| T12 | `yoga_paid_renewal_reminder` | 7 days before subscription expiry | `GET /api/cron/send-messages` | `{{1}}`=Name, `{{2}}`=ExpiryDate, `{{3}}`=RegistrationURL |

---

## 2. CRON Job Logic

### `GET /api/cron/send-messages` — Daily at 4:30 PM IST

Protected by `x-cron-secret` header matching `CRON_SECRET` env var.

**Step-by-step:**

1. **Build `baseUrl`** from `NEXT_PUBLIC_BASE_URL` env (currently – post-fix will use `BASE_URL`)
2. **Fetch Active Free Trial members** from `FreeTrialMembers` tab (status = "Active")
3. For each active trial member:
   - Calculate `dayNumber = ceil((now - startDate) / 86400000)`
   - **Day 1–7:** Send T3 (`yoga_freetrial_daily_reminder`) with Zoom link
   - **Day 3 only:** Also send T4 (`yoga_freetrial_mid_nudge`) — purchase offer
   - **Day 6 only:** Also send T5 (`yoga_freetrial_urgency`) — trial ends tomorrow
   - **Day 7 only:** Also send T6 (`yoga_freetrial_lastday`) — last free session + CTA
   - Increment `messagesSent` by 1 and update Google Sheet
4. **Fetch Recently Expired Trials** — status = "Expired", endDate within last 5 days
5. For each expired trial member:
   - Calculate `dayNumber` from startDate
   - **Day 8–10:** Send T7 (`yoga_freetrial_expired_d8`) — no Zoom link, conversion nudge
   - Increment `messagesSent` if message sent
6. **Fetch Active Paid Members** from `PaidMembers` tab (status = "Active")
7. For each paid member:
   - Send T10 (`yoga_paid_daily_reminder`) with Zoom link
   - If `daysToExpiry > 0 && daysToExpiry <= 7`: also send T12 (`yoga_paid_renewal_reminder`)
   - Increment `messagesSent` by 1 and update Google Sheet

**`messagesSent` counter usage:** Tracks how many WhatsApp messages each member has received total. Updated after each CRON run. Used for analytics — does NOT control which message is sent (day number controls that).

### `GET /api/cron/expire-trials` — Daily at 4:00 AM IST

Protected by `x-cron-secret` or `Authorization: Bearer <secret>` header.

1. Fetch all active free trial members
2. If `row.endDate <= today` (IST date): update status to "Expired" in sheet
3. Send T7 (`yoga_freetrial_expired_d8`) — fire-and-forget

---

## 3. Google Sheet Operations

**Spreadsheet ID:** `GOOGLE_SPREADSHEET_ID` env var  
**Auth:** Google Service Account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`)

### Tab: `Payment Form`

| Operation | Function | Columns | Trigger |
|-----------|----------|---------|---------|
| Write (append) | `appendPayment()` | A–H: Timestamp, Name, WhatsApp, Plan, Amount, Payment Status, TxnID, OrderID | User submits payment form |
| Read | `getPaymentByOrderId()` | Reads all A:Z, matches col H (OrderID) | Paytm callback |
| Update | `updatePaymentStatus()` | Reads col H, updates F (Payment Status), G (TxnID) | Paytm callback |

### Tab: `FreeTrialMembers`

| Operation | Function | Columns | Trigger |
|-----------|----------|---------|---------|
| Write (append) | `appendFreeTrial()` | A–I: Timestamp, Name, WhatsApp, StartDate, EndDate, Status, CustomLinkId, MessagesSent, LastMessageDate | Free trial registration |
| Read by phone | `findFreeTrialByPhone()` | Reads col C (WhatsApp) | Duplicate check, payment callback (conversion), webhook |
| Read by LinkId | `findFreeTrialByLinkId()` | Reads col G (customLinkId) | `/api/join/[userId]` |
| Read all active | `getActiveFreeTrials()` | Reads col F (Status=Active) | CRON send-messages, expire-trials |
| Read recently expired | `getRecentlyExpiredTrials(5)` | Status=Expired, col E (endDate) within last 5 days | CRON send-messages |
| Update status | `expireFreeTrial()` | Col F → "Expired" | CRON expire-trials |
| Update message count | `updateFreeTrialMessageCount()` | Col H (messagesSent), I (lastMessageDate) | CRON send-messages, free-trial reg |
| Delete row | `deleteFreeTrialRow()` | Deletes entire row | Paytm callback (trial→paid conversion) |

### Tab: `PaidMembers`

| Operation | Function | Columns | Trigger |
|-----------|----------|---------|---------|
| Write (append) | `appendPaidMember()` | A–N: Timestamp, Name, WhatsApp, Plan, Amount, StartDate, EndDate, Status, TxnID, OrderID, CustomLinkId, Source, MessagesSent, LastMessageDate | Successful payment |
| Read by phone | `findPaidMemberByPhone()` | Col C | Duplicate check, member status check |
| Read by LinkId | `findPaidMemberByLinkId()` | Col K (customLinkId) | `/api/join/[userId]` |
| Read all active | `getActivePaidMembers()` | Col H (Status=Active) | CRON send-messages |
| Update message count | `updatePaidMemberMessageCount()` | Col M (messagesSent), N (lastMessageDate) | CRON send-messages |

### Tab: `ConvertedFromTrial`

| Operation | Function | Columns | Trigger |
|-----------|----------|---------|---------|
| Write (append) | `logConversion()` | A–I: Name, WhatsApp, TrialStart, TrialEnd, PaidPlan, PaidAmount, ConversionDate, TxnID, DaysToConvert | Paytm callback when prior free trial exists |

---

## 4. Join Link Flow

### Link Generation
- **Function:** `generateLinkId(fullName)` in `src/lib/linkGenerator.ts`
- **Format:** `firstname-lastname-XXXX` (lowercase slug + 4-char random hex)
- **Example:** `bhavesh-kanoje-3ddb`
- Generated at: free trial registration (`/api/free-trial`) and payment success (`/api/paytm-callback`)
- Stored in column G of `FreeTrialMembers` / column K of `PaidMembers`

### Personal Join Link
- **Format:** `https://tayal-yoga-class.web.app/join/<customLinkId>`
- Sent in WhatsApp templates T1, T2, T3, T6, T9, T10

### How `/join/[userId]` Works

The page at `src/app/join/[userId]/page.tsx` calls `GET /api/join/[userId]`:

1. **Look up in FreeTrialMembers** by `customLinkId` (col G)
   - If found + status = "Active" → return `{ redirect: true, url: ZOOM_MEETING_LINK }`
   - If found + status = "Expired" → return `{ redirect: false, reason: "expired" }`
2. **Look up in PaidMembers** by `customLinkId` (col K)
   - If found + status = "Active" → return `{ redirect: true, url: ZOOM_MEETING_LINK }`
   - If found + status = "Expired" → return `{ redirect: false, reason: "expired" }`
3. If not found → return `{ redirect: false, reason: "not_found" }` (404)

**What the page does with the response:**
- `redirect: true` → redirects browser to Zoom URL (`ZOOM_MEETING_LINK`)
- `redirect: false, reason: "expired"` → shows "Your trial/subscription has expired" message with CTA to purchase
- `redirect: false, reason: "not_found"` → shows "Link not found" message
- `redirect: false, reason: "no_zoom_link"` → shows "Session not configured" message (fallback if ZOOM_MEETING_LINK is empty)

---

## 5. Known Bugs Found

### 🔴 BUG 1: `NEXT_PUBLIC_BASE_URL` Doesn't Work in API Routes (Build-time only)
**Files affected:**
- `src/app/api/free-trial/route.ts` (partially fixed last session, uses new `NEXT_PUBLIC_BASE_URL` but same issue remain)
- `src/app/api/paytm-callback/route.ts` (uses `request.headers.get("host")`)
- `src/app/api/cron/send-messages/route.ts` (uses `NEXT_PUBLIC_BASE_URL`)
- `src/app/api/cron/expire-trials/route.ts` (uses `request.headers.get("host")` for `paymentLink`)

**Fix:** Add `BASE_URL=https://tayal-yoga-class.web.app` (no NEXT_PUBLIC_ prefix) and use `process.env.BASE_URL` in API routes.

### 🔴 BUG 2: T8 Webhook Not Implemented
When a student clicks **"Confirm My Trial"** in WhatsApp, no `POST /api/webhook/aisensy` route exists.  
`sendFreeTrialJoinedConfirm()` is coded in `aisensy.ts` but never called by any route.  
**Fix:** Create the webhook route (Task 2).

### 🟡 BUG 3: `expire-trials` CRON Uses Wrong Auth Format (Inconsistency)
`expire-trials/route.ts` accepts BOTH `Authorization: Bearer <secret>` AND `x-cron-secret: <secret>`.  
`send-messages/route.ts` only accepts `x-cron-secret`.  
If cron-job.org is configured the same way for both, one will fail.  
**Recommendation:** Standardize both to use `x-cron-secret` header.

### 🟡 BUG 4: Day Number Calculation May Be Off by 1 (Timezone)
In `send-messages/route.ts` and `expire-trials/route.ts`, day number is calculated using UTC `new Date()` and subtracting `startDate` (which is stored in IST). If the CRON runs at 4:30 PM IST, UTC is 11:00 AM — the same calendar day. But midnight-crossover edge cases could cause off-by-one day numbers for students registered late at night.  
**Recommendation:** Convert both `now` and `startDate` to IST before calculating the difference.

### 🟡 BUG 5: `send-messages` Sends T7 Even on Day 8–10 from `getRecentlyExpiredTrials`, But `expire-trials` ALSO Sends T7 on Expiry Day
A student who expires on Day 7 will receive T7 from `expire-trials/route.ts` (runs at 4 AM IST), AND T7 again from `send-messages/route.ts` (runs at 4:30 PM IST on Days 8–10).  
**Result:** Possible duplicate messages on the expiry day.

---

## 6. Missing Features

| Feature | Status | Details |
|---------|--------|---------|
| T8 Webhook (Confirm My Trial) | ❌ Not built | `sendFreeTrialJoinedConfirm()` exists but nothing calls it. Webhook route missing. |
| T11 Weekly Info | ❌ Not built | `sendPaidWeeklyInfo()` exists in aisensy.ts but no CRON or route calls it. |
| Paid member expiry CRON | ❌ Not built | `expire-trials` only marks FreeTrialMembers as expired. Paid plan expiry is never automatically marked "Expired". |
| WhatsApp confirmation on expiry counting | ⚠️ Partial | `messagesSent` is incremented by 1 in expire-trials but the WhatsApp `sendTrialExpired` call in `send-messages/route.ts` also increments — potential double-count for day 8–10 expired members. |
| Duplicate-send guard in CRON | ❌ Not built | `lastMessageDate` is stored but never checked before sending. Messages could send twice on same day if CRON runs twice. |
| AiSensy webhook registration | ⚠️ Manual step | Webhook URL must be manually set in AiSensy Dashboard — not automated. |
