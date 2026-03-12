# 🧘 Tayal Yoga Class — Project Handover Document
**Prepared for:** Continuing Claude session  
**Date:** March 2026  
**Project Owner:** Bhavesh (Somveer Tayal)  
**Business:** Yoga with Renu Tayal — Online Yoga Classes

---

## 🎯 PROJECT OVERVIEW

This is an **online yoga class registration + WhatsApp automation system** for **Renu Tayal**, a certified yoga instructor (IIT-JEE Maths Faculty, 15+ years experience). The project includes:

- A **Next.js registration form** where users sign up and pay
- **Free 7-day trial** system before paid membership
- **WhatsApp automation** via AiSensy to send messages automatically
- **Google Sheets** as the database
- **Paytm** as the payment gateway
- **Firebase** for hosting

Tagline / Hashtag: `#HarVyaktiTakYog`  
Daily session timing: **5:00 PM – 6:00 PM IST (Evening)**  
Platform: **Zoom** (live daily classes)

---

## 🏗️ EXISTING CODEBASE

**GitHub Repository:** https://github.com/tutrain/yoga-clasespayment  
**Deployed on:** Firebase Hosting  
**Live URL:** `yoga-clasespayment.web.app`

### Current Tech Stack
| Component | Technology | Status |
|-----------|-----------|--------|
| Frontend | Next.js 16 + Tailwind CSS + TypeScript | Live |
| Payment | Paytm (UPI, Cards, Netbanking, Wallet) | Live |
| Database | Google Sheets API (Service Account) | Live |
| Hosting | Firebase Hosting | Live |
| WhatsApp | AiSensy WhatsApp Business API | Partially set up |
| Repository | github.com/tutrain/yoga-clasespayment | Live |

### Current File Structure
```
src/
├── app/
│   ├── page.tsx                    # Main checkout form
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── success/page.tsx            # Payment success page
│   ├── failure/page.tsx            # Payment failure page
│   └── api/
│       ├── register/route.ts       # Registration + payment API
│       └── paytm-callback/route.ts # Paytm callback + WhatsApp
├── lib/
│   ├── googleSheets.ts             # Google Sheets helper
│   ├── paytm.ts                    # Paytm checksum helpers
│   ├── aisensy.ts                  # AiSensy WhatsApp helper (PARTIAL)
│   └── firebase.ts                 # Firebase client SDK
```

### Current Payment Plans (LIVE)
- ₹999 — 1 Month
- ₹1,999 — 3 Months

### Plans to ADD (NOT YET BUILT)
- ₹2,999 — 6 Months (Save 50%)
- ₹3,999 — 12 Months (Save 67% — Most Recommended)
- **7 Day Free Trial** button (completely new flow)

---

## 📋 WHAT NEEDS TO BE BUILT (Full Scope)

### 1. Updated Registration Form
- Add 4 plan options (currently only 2)
- Add **"7 Day Free Trial"** button
- Free trial button checks for duplicate phone numbers before registering

### 2. Google Sheet — New Tab Structure
Currently only 1 tab (Sheet1). Need to add 3 more:

| Tab Name | Purpose | Key Columns |
|----------|---------|-------------|
| `PaymentInfo` (existing) | All payment attempts | Timestamp, Name, WhatsApp, Plan, Amount, Status, TxnID, OrderID |
| `FreeTrialMembers` (NEW) | Active free trial users | Timestamp, Name, WhatsApp, Start Date, End Date, Status (Active/Expired), Custom Link ID |
| `PaidMembers` (NEW) | Paid subscription members | Timestamp, Name, WhatsApp, Plan, Amount, Start Date, End Date, Status, TxnID, Source |
| `ConvertedFromTrial` (NEW) | Audit log for trial→paid | Name, WhatsApp, Trial Start, Trial End, Paid Plan, Amount, Conversion Date, TxnID |

**Key Rule:** When a free trial user purchases a paid plan:
- Remove from `FreeTrialMembers`
- Add to `PaidMembers` with Source = 'FreeTrial'
- Log entry in `ConvertedFromTrial`

### 3. Duplicate Registration Prevention
Before registering free trial:
- If found in `FreeTrialMembers` (active) → "You already have an active free trial"
- If found in `FreeTrialMembers` (expired) → "Your free trial has expired. Please purchase a plan"
- If found in `PaidMembers` → "You are already a paid member"
- If not found → Allow registration

### 4. Custom Personal Zoom Links (Link Masking) ⭐ IMPORTANT
**The Zoom link must NEVER be sent directly to users.**  
Instead each user gets a personal redirect link:

```
User registers → generate unique ID e.g. "priya-a3f2"
Personal link: yoga-clasespayment.web.app/join/priya-a3f2
When clicked → server checks if trial/subscription active
If active → redirect to real Zoom link
If expired → redirect to registration page
```

When someone shares this link, it only works for the registered user.  
The real Zoom link is stored in environment variable `ZOOM_MEETING_LINK`.

### 5. Auto-Expiration of Free Trial
- Daily CRON job (Firebase Cloud Scheduler) runs at 4:00 AM IST
- Checks all rows in `FreeTrialMembers` where Status = "Active"
- If today > End Date → update Status to "Expired"
- Expired users stop getting daily messages
- Their personal link stops working

### 6. WhatsApp Automation via AiSensy
**Daily CRON at 4:30 PM IST** sends session reminders to all active members.  
Logic checks which day of trial each user is on and sends appropriate template.

---

## ✅ AISENSY WHATSAPP TEMPLATES — COMPLETED

> **Status:** All 12 templates submitted to AiSensy. Awaiting Meta approval (24–48 hours).  
> **AiSensy Plan:** Currently Free/Trial — needs upgrade to **Starter (₹999/month)** before automation can work.  
> **Important:** Image is NOT uploaded during template creation in AiSensy. Images are passed via API when sending.

### AiSensy Account Details
- **Platform:** app.aisensy.com
- **WCC Credits:** ₹50 (needs top-up before going live)
- **WhatsApp Business Number:** Already connected

---

### FREE TRIAL TEMPLATES (8 templates)

#### T1 — `yoga_freetrial_welcome`
- **Category:** UTILITY
- **Type:** IMAGE (attach: Welcome.jpeg — namaste pose banner)
- **Trigger:** Day 0 — INSTANTLY on registration
- **Variables:** {{1}}=Name, {{2}}=StartDate, {{3}}=EndDate, {{4}}=PersonalJoinLink
- **Button:** Quick Reply — "Confirm My Trial"
- **Body:**
```
Namaste *{{1}}*! 🙏

Welcome to your *7-Day Free Yoga Trial* with Renu Tayal.

✅ Your trial starts today!

📅 Start Date: {{2}}
📅 End Date: {{3}}
🕔 Session Time: 5:00 - 6:00 PM daily
🔗 Your Join Link: {{4}}

See you on the mat! 🧘
```
- **Footer:** #HarVyaktiTakYog

---

#### T2 — `yoga_freetrial_schedule`
- **Category:** UTILITY
- **Type:** IMAGE (attach: Time.jpeg — Join Today 5-6 PM banner)
- **Trigger:** Day 0 — 3 minutes after T1
- **Variables:** {{1}}=StartDate, {{2}}=EndDate, {{3}}=PersonalJoinLink
- **Buttons:** Quick Reply — "Invite a Friend" | "Share on WhatsApp"
- **Body:**
```
Your Free Trial schedule is confirmed! 📅

📆 Start Date: {{1}}
📆 End Date: {{2}}
🕔 Session Time: 5:00 - 6:00 PM daily
🔗 Join Link: {{3}}

*Invite a friend to join you on the mat!* 🧘🙏
```
- **Footer:** #HarVyaktiTakYog

---

#### T3 — `yoga_freetrial_daily_reminder`
- **Category:** UTILITY
- **Type:** IMAGE (attach: Msg2.jpeg — Join Today pointing pose banner)
- **Trigger:** Day 1–7 — Daily CRON at 4:30 PM IST
- **Variables:** {{1}}=Name, {{2}}=TodayDate, {{3}}=PersonalJoinLink
- **Button:** Quick Reply — "Join Session Now"
- **Body:**
```
Namaste *{{1}}*! 🙏

Today's yoga session is starting soon 🧘

📅 Date: {{2}}
🕔 Time: 5:00 - 6:00 PM
🔗 Join Now: {{3}}

We are live until 6 PM - don't miss it! 💪

_Yoga with Renu Tayal_
```
- **Footer:** #HarVyaktiTakYog

---

#### T4 — `yoga_freetrial_mid_nudge`
- **Category:** MARKETING
- **Type:** IMAGE (attach: 7_Day_Free.jpeg — 7-Day Free Yoga Start Now banner)
- **Trigger:** Day 3 — sent alongside daily reminder
- **Variables:** {{1}}=Name, {{2}}=RegistrationURL
- **Button:** Call to Action — "See Plans" → https://yoga-clasespayment.web.app
- **Body:**
```
Namaste *{{1}}*! 🙏

How is your yoga journey going? 🌟

We hope you are feeling the difference! 💫

*Continue your daily yoga after 7 days:*

🏆 12 Months - Rs.3999 _(Save 67%)_
⭐ 6 Months - Rs.2999 _(Save 50%)_
🔵 3 Months - Rs.1999 _(Save 34%)_
🔹 1 Month - Rs.999

👉 Register here: {{2}}

See you on the mat! 🧘🙏
```
- **Footer:** #HarVyaktiTakYog

---

#### T5 — `yoga_freetrial_urgency`
- **Category:** MARKETING
- **Type:** IMAGE (attach: 7_Day_Free.jpeg — same as T4)
- **Trigger:** Day 6 — sent alongside daily reminder
- **Variables:** {{1}}=Name, {{2}}=RegistrationURL
- **Button:** Call to Action — "Keep My Access" → https://yoga-clasespayment.web.app
- **Body:**
```
Namaste *{{1}}*! 🙏

Your free trial ends *tomorrow*! ⏰

Don't lose access to daily yoga with Renu Tayal.

*Continue your journey - purchase now:*

🏆 12 Months - Rs.3999 _(Save 67%)_
⭐ 6 Months - Rs.2999 _(Save 50%)_
🔵 3 Months - Rs.1999 _(Save 34%)_
🔹 1 Month - Rs.999

👉 Register here: {{2}}

We'd love to keep you on the mat! 🧘🙏
```
- **Footer:** #HarVyaktiTakYog

---

#### T6 — `yoga_freetrial_lastday`
- **Category:** MARKETING
- **Type:** IMAGE (attach: Msg3.jpeg)
- **Trigger:** Day 7 — sent alongside daily reminder
- **Variables:** {{1}}=Name, {{2}}=PersonalJoinLink, {{3}}=RegistrationURL
- **Buttons:** Quick Reply — "Join Today's Session" | CTA — "Purchase Plan"
- **Body:**
```
Namaste *{{1}}*! 🙏

Today is your *last free session!* 🎯

Join now before 6 PM 🧘
🔗 {{2}}

*To continue daily yoga - choose your plan:*

🏆 12 Months - Rs.3999 _(Save 67%)_
⭐ 6 Months - Rs.2999 _(Save 50%)_
🔵 3 Months - Rs.1999 _(Save 34%)_
🔹 1 Month - Rs.999

👉 Register here: {{3}}

Thank you for being part of our yoga family 🙏
```
- **Footer:** #HarVyaktiTakYog

---

#### T7 — `yoga_freetrial_expired_d8`
- **Category:** MARKETING
- **Type:** IMAGE (attach: Welcome.jpeg)
- **Trigger:** Day 8, 9, 10 — NO Zoom link in this message
- **Variables:** {{1}}=Name, {{2}}=RegistrationURL
- **Button:** Call to Action — "Rejoin Now" → https://yoga-clasespayment.web.app
- **Body:**
```
Namaste *{{1}}*! 🙏

Your 7-day free trial with Yoga by Renu Tayal has ended.

We hope you felt the power of daily yoga! 💪

*Ready to continue? Choose your plan:*

🏆 12 Months - Rs.3999 _(Save 67% - Best Value)_
⭐ 6 Months - Rs.2999 _(Save 50%)_
🔵 3 Months - Rs.1999 _(Save 34%)_
🔹 1 Month - Rs.999

👉 Register here: {{2}}

We would love to have you back on the mat 🧘🙏
```
- **Footer:** #HarVyaktiTakYog

---

#### T8 — `yoga_freetrial_joined_confirm`
- **Category:** UTILITY
- **Type:** TEXT (no image — personal and warm)
- **Trigger:** After user joins Zoom session
- **Variables:** {{1}}=Name
- **Buttons:** None
- **Body:**
```
Thank you for joining today's session, *{{1}}*! 🙏🌟

We are so happy to have you on the mat with us 🧘

You are doing amazing - keep it up! 💪

See you tomorrow at 5:00 PM!

_Yoga with Renu Tayal_
```
- **Footer:** #HarVyaktiTakYog

---

### PAID MEMBER TEMPLATES (4 templates)

#### T9 — `yoga_paid_welcome`
- **Category:** UTILITY
- **Type:** IMAGE
- **Trigger:** Immediately on successful payment
- **Variables:** {{1}}=Name, {{2}}=PlanName, {{3}}=EndDate, {{4}}=PersonalJoinLink
- **Button:** Quick Reply — "Join Today's Session"
- **Body:**
```
Namaste *{{1}}*! 🙏🎉

Welcome to *Yoga with Renu Tayal!*

Your *{{2}} plan* is now active ✅

📅 Valid Till: {{3}}
🕔 Session Time: 5:00 - 6:00 PM daily
🔗 Your Personal Join Link: {{4}}

This link is personal to you - please
do not share it with others 🙏

See you on the mat every day! 🧘
```
- **Footer:** #HarVyaktiTakYog

---

#### T10 — `yoga_paid_daily_reminder`
- **Category:** UTILITY
- **Type:** IMAGE
- **Trigger:** Daily CRON at 4:30 PM IST for all active paid members
- **Variables:** {{1}}=Name, {{2}}=TodayDate, {{3}}=PersonalJoinLink
- **Button:** Quick Reply — "Join Session Now"
- **Body:**
```
Good evening *{{1}}*! 🌅🙏

Today's yoga session is starting soon 🧘

📅 Date: {{2}}
🕔 Time: 5:00 - 6:00 PM
🔗 Join Now: {{3}}

We are live until 6 PM - see you there! 💪

_Yoga with Renu Tayal_
```
- **Footer:** #HarVyaktiTakYog

---

#### T11 — `yoga_paid_weekly_info`
- **Category:** MARKETING
- **Type:** IMAGE
- **Trigger:** Weekly (every Saturday or Sunday)
- **Variables:** {{1}}=Name, {{2}}=WeeklyTitle, {{3}}=WeeklyContent, {{4}}=PersonalJoinLink
- **Button:** Quick Reply — "Join Session Now"
- **Note:** {{2}} and {{3}} change every week — one template for all weekly messages
- **Body:**
```
Namaste *{{1}}*! 🙏

*{{2}}*

{{3}}

Keep showing up on the mat every day -
consistency is the key to transformation! 🌟

🕔 Daily Session: 5:00 - 6:00 PM
🔗 Join Here: {{4}}

_Yoga with Renu Tayal_ 🧘
```
- **Footer:** #HarVyaktiTakYog

---

#### T12 — `yoga_paid_renewal_reminder`
- **Category:** MARKETING
- **Type:** IMAGE
- **Trigger:** 7 days before subscription expiry
- **Variables:** {{1}}=Name, {{2}}=ExpiryDate, {{3}}=RegistrationURL
- **Button:** Call to Action — "Renew My Plan" → https://yoga-clasespayment.web.app
- **Body:**
```
Namaste *{{1}}*! 🙏

Your yoga subscription expires on *{{2}}* ⏰

Don't break your daily yoga habit!
Renew now and keep the momentum going 💪

*Renew at discounted rates:*

🏆 12 Months - Rs.3999 _(Save 67%)_
⭐ 6 Months - Rs.2999 _(Save 50%)_
🔵 3 Months - Rs.1999 _(Save 34%)_
🔹 1 Month - Rs.999

👉 Renew here: {{3}}

Thank you for being part of our
yoga family 🧘🙏
```
- **Footer:** #HarVyaktiTakYog

---

## 🔑 ENVIRONMENT VARIABLES NEEDED

Add all these to Firebase Functions config / `.env.local`:

```env
# Existing (already set up)
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_SPREADSHEET_ID=...
GOOGLE_SHEET_NAME=Sheet1
PAYTM_MID=...
PAYTM_MERCHANT_KEY=...
PAYTM_WEBSITE=DEFAULT
PAYTM_ENVIRONMENT=production
AISENSY_API_KEY=...
AISENSY_PAYMENT_SUCCESS_CAMPAIGN=...

# NEW - Add these
GOOGLE_SHEET_NAME_FREETRIAL=FreeTrialMembers
GOOGLE_SHEET_NAME_PAID=PaidMembers
GOOGLE_SHEET_NAME_CONVERTED=ConvertedFromTrial
ZOOM_MEETING_LINK=https://us05web.zoom.us/j/84443007700?pwd=kcJmrOBbtargehLaWFKtsRLSdubEX3.1
NEXT_PUBLIC_BASE_URL=https://yoga-clasespayment.web.app
CRON_SECRET=your-random-secret-here

# AiSensy Template Names
AISENSY_TEMPLATE_FREETRIAL_WELCOME=yoga_freetrial_welcome
AISENSY_TEMPLATE_FREETRIAL_SCHEDULE=yoga_freetrial_schedule
AISENSY_TEMPLATE_FREETRIAL_DAILY=yoga_freetrial_daily_reminder
AISENSY_TEMPLATE_FREETRIAL_NUDGE=yoga_freetrial_mid_nudge
AISENSY_TEMPLATE_FREETRIAL_URGENCY=yoga_freetrial_urgency
AISENSY_TEMPLATE_FREETRIAL_LASTDAY=yoga_freetrial_lastday
AISENSY_TEMPLATE_FREETRIAL_EXPIRED=yoga_freetrial_expired_d8
AISENSY_TEMPLATE_FREETRIAL_JOINED=yoga_freetrial_joined_confirm
AISENSY_TEMPLATE_PAID_WELCOME=yoga_paid_welcome
AISENSY_TEMPLATE_PAID_DAILY=yoga_paid_daily_reminder
AISENSY_TEMPLATE_PAID_WEEKLY=yoga_paid_weekly_info
AISENSY_TEMPLATE_PAID_RENEWAL=yoga_paid_renewal_reminder
```

---

## 🗂️ NEW FILES TO CREATE IN CODEBASE

| File Path | Purpose |
|-----------|---------|
| `src/app/api/free-trial/route.ts` | Free trial registration — validate, check duplicates, save to FreeTrialMembers, trigger T1+T2 |
| `src/app/api/check-member/route.ts` | Check if phone number already registered in any tab |
| `src/app/api/join/[userId]/route.ts` | Personal Zoom link redirect — check active status then redirect |
| `src/app/api/cron/expire-trials/route.ts` | Daily CRON — expire trials past 7 days |
| `src/app/api/cron/send-messages/route.ts` | Daily CRON — send WhatsApp messages to all active members |
| `src/app/join/[userId]/page.tsx` | Frontend page for personal join link |
| `src/app/trial-expired/page.tsx` | Page shown when expired user clicks join link |
| `src/app/trial-success/page.tsx` | Page shown after free trial registration |
| `src/lib/interakt.ts` → rename to `src/lib/aisensy.ts` | AiSensy API helper — sendTemplate() function |
| `src/lib/linkGenerator.ts` | Generate unique user link IDs |

---

## 📅 NEW API ROUTES LOGIC

### `/api/free-trial` (POST)
```
1. Receive: name, whatsapp, startDate
2. Check phone in FreeTrialMembers → if exists, block with error
3. Check phone in PaidMembers → if exists, block with error
4. Generate unique link ID: name-slug + random 4 chars
5. Calculate endDate = startDate + 7 days
6. Save to FreeTrialMembers tab in Google Sheet
7. Call AiSensy → send yoga_freetrial_welcome (T1)
8. After 3 min delay → send yoga_freetrial_schedule (T2)
9. Return success
```

### `/api/join/[userId]` (GET)
```
1. Look up userId in FreeTrialMembers and PaidMembers
2. If found + Status = Active → redirect to ZOOM_MEETING_LINK
3. If found + Status = Expired → redirect to /trial-expired
4. If not found → redirect to home registration page
```

### `/api/cron/send-messages` (GET — runs daily 4:30 PM IST)
```
1. Verify CRON_SECRET header
2. Fetch all rows from FreeTrialMembers where Status = Active
3. For each user:
   - Calculate trial day number (today - startDate)
   - Day 1–7: send yoga_freetrial_daily_reminder
   - Day 3: also send yoga_freetrial_mid_nudge
   - Day 6: also send yoga_freetrial_urgency
   - Day 7: also send yoga_freetrial_lastday
   - Day 8–10: send yoga_freetrial_expired_d8 (NO zoom link)
4. Fetch all rows from PaidMembers where Status = Active
5. For each paid user:
   - Send yoga_paid_daily_reminder
   - If daysToExpiry <= 7: also send yoga_paid_renewal_reminder
```

### `/api/cron/expire-trials` (GET — runs daily 4:00 AM IST)
```
1. Verify CRON_SECRET header
2. Fetch all FreeTrialMembers where Status = Active
3. If today > endDate → update Status to Expired
```

---

## 💡 AISENSY API — HOW TO SEND TEMPLATE

The existing `aisensy.ts` only has one campaign. It needs a new `sendTemplate()` function:

```typescript
// src/lib/aisensy.ts
export async function sendTemplate(
  templateName: string,
  phone: string,
  variables: string[],
  imageUrl?: string
) {
  const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: process.env.AISENSY_API_KEY,
      campaignName: templateName,
      destination: phone, // format: 919876543210 (91 + number)
      userName: 'Tayal Yoga Class',
      templateParams: variables, // array matching {{1}}, {{2}} etc.
      media: imageUrl ? {
        url: imageUrl,
        filename: 'yoga_poster.jpeg'
      } : undefined
    })
  });
  return response.json();
}
```

**Phone number format for AiSensy:** `91XXXXXXXXXX` (country code + 10 digit number, no + sign)

---

## 🖼️ BANNER IMAGES AVAILABLE

These images are already designed and ready to attach to templates:

| File | Used In | Description |
|------|---------|-------------|
| `Welcome.jpeg` | T1, T7, T9 | "Welcome Towards a Healthier Lifestyle" — Renu Tayal namaste pose |
| `Time.jpeg` | T2 | "Join Today Evening 5:00–6:00 PM" — pointing pose |
| `Msg2.jpeg` | T3, T10 | "Join Today Evening 5–6 PM" — yellow top pointing |
| `Msg3.jpeg` | T6 | "Join Today Evening 5–6 PM" — pink top pointing |
| `7_Day_Free.jpeg` | T4, T5 | "7-Day Online Free Yoga — Start Now" — with phone mockup |
| `don_tuse.jpeg` | — | Not used in templates |

---

## ⚠️ IMPORTANT DECISIONS ALREADY MADE

1. **Google Sheets over Firebase** — Stick with Google Sheets for now. Works fine up to 1,000+ users. Firebase is overkill at current scale and would require rewriting existing integration.

2. **AiSensy over Interakt** — Project already uses AiSensy. Continue with it.

3. **Personal join links over raw Zoom link** — Never send raw Zoom link. Always use `yoga-clasespayment.web.app/join/[userId]` which checks active status.

4. **Firebase Cloud Scheduler for CRON** — Since app is on Firebase (not Vercel), use Firebase Cloud Scheduler instead of Vercel Cron.

5. **WhatsApp sharing** — When user clicks "Share on WhatsApp", only share registration form link + poster image. NEVER share Zoom link.

---

## 🚀 PENDING TASKS (What Still Needs To Be Done)

### Immediate (waiting on)
- [ ] Meta approval of all 12 AiSensy templates (24–48 hours)
- [ ] AiSensy upgrade to Starter plan (₹999/month) — needed for API automation

### Phase 1 — Google Sheets + Form (Week 1)
- [ ] Create 3 new tabs: FreeTrialMembers, PaidMembers, ConvertedFromTrial
- [ ] Update `googleSheets.ts` to support reading/writing multiple tabs
- [ ] Add phone number lookup across all tabs
- [ ] Update frontend — add 4 plan buttons + "7 Day Free Trial" button
- [ ] Create `/api/free-trial` endpoint
- [ ] Create `/api/check-member` endpoint
- [ ] Update `/api/register` to support 6M and 12M plans
- [ ] Update `/api/paytm-callback` to move free trial users to paid on conversion

### Phase 2 — Custom Join Links (Week 1–2)
- [ ] Create `linkGenerator.ts`
- [ ] Create `/join/[userId]` page
- [ ] Create `/api/join/[userId]` redirect API
- [ ] Create `trial-expired` page
- [ ] Store Zoom link in env variable

### Phase 3 — WhatsApp Automation (Week 2–3)
- [ ] Update `aisensy.ts` with `sendTemplate()` function
- [ ] Integrate T1 + T2 into `/api/free-trial`
- [ ] Integrate T9 into `/api/paytm-callback`
- [ ] Create `/api/cron/send-messages`
- [ ] Create `/api/cron/expire-trials`

### Phase 4 — Firebase CRON (Week 3)
- [ ] Set up Firebase Cloud Scheduler
- [ ] CRON 1: 4:00 AM IST — expire-trials
- [ ] CRON 2: 4:30 PM IST — send-messages
- [ ] Add CRON_SECRET to Firebase config

### Phase 5 — Testing (Week 3–4)
- [ ] End-to-end test: free trial → WhatsApp → Day 7 expiry → purchase → conversion
- [ ] Test personal link: active works, expired blocked, unregistered blocked
- [ ] Test sharing: only poster + form link shared, no Zoom link
- [ ] Deploy and test with 5–10 real users

---

## 📞 CONTEXT FOR NEXT CLAUDE SESSION

> **Hey Claude! Here's what you need to know:**
>
> This project is a Next.js yoga class registration system on Firebase. The owner is Bhavesh building this for Renu Tayal's yoga classes.
>
> **We have already:**
> - Reviewed the full project architecture
> - Submitted all 12 WhatsApp templates to AiSensy (waiting for Meta approval)
> - Documented the complete message flow for free trial (8 templates) and paid members (4 templates)
>
> **The next step is writing the actual code**, starting with:
> 1. `src/lib/aisensy.ts` — add `sendTemplate()` function
> 2. `src/lib/googleSheets.ts` — add multi-tab support
> 3. `src/app/api/free-trial/route.ts` — new free trial registration API
>
> **Please review the GitHub repo first:** https://github.com/tutrain/yoga-clasespayment  
> Specifically read the existing `src/lib/aisensy.ts` and `src/lib/googleSheets.ts` files before writing new code so you match the existing coding style.
>
> All template names, variable mappings, and architecture decisions are documented above. Follow them exactly.

---

*Document generated: March 2026 | Tayal Yoga Class Project*
