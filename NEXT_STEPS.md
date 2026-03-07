# Team TODO — Remaining Tasks for Go-Live

These tasks cannot be done by the developer and require team action.

---

## 1. 📊 Google Sheet: Create New Tabs

Open the spreadsheet: https://docs.google.com/spreadsheets/d/1NBQNJKbGHL2ultEg4ntHy_O7ZTYP4FkCsjACdgTXSK0/edit

Create **3 new tabs** (click "+" at the bottom):

### Tab: `FreeTrialMembers`
Add these headers in Row 1:
| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Timestamp | Full Name | WhatsApp Number | Start Date | End Date | Status | Custom Link ID | Messages Sent | Last Message Date |

### Tab: `PaidMembers`
Add these headers in Row 1:
| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Full Name | WhatsApp Number | Plan | Amount | Start Date | End Date | Status | Transaction ID | Order ID | Custom Link ID | Source | Messages Sent | Last Message Date |

### Tab: `ConvertedFromTrial`
Add these headers in Row 1:
| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Full Name | WhatsApp Number | Trial Start Date | Trial End Date | Paid Plan | Paid Amount | Conversion Date | Transaction ID | Days to Convert |

---

## 2. 📱 AiSensy: Create WhatsApp Message Templates

Go to [AiSensy Dashboard](https://app.aisensy.com/) → Templates → Create.

### Templates to Create:

| Campaign Name | Category | Body Text |
|--------------|----------|-----------|
| `welcome_freetrial` | MARKETING | Namaste {{1}}! Welcome to 7 Day Free Trial. Start: {{2}}, End: {{3}}. Join: {{4}} |
| `daily_session_link` | MARKETING | Namaste {{1}}! Today's yoga session is live. Join: {{2}}. We are live 5-6 PM! |
| `mid_trial_nudge` | MARKETING | Hi {{1}}, enjoying yoga? Continue after 7 days: 12M ₹3999 \| 6M ₹2999 \| 3M ₹1999 \| 1M ₹999. Register: {{2}} |
| `trial_expiry_warning` | MARKETING | Hi {{1}}, your free trial ends tomorrow! Purchase now: {{2}} |
| `trial_expired` | MARKETING | Hi {{1}}, your 7-day trial has ended. Register for full access: {{2}} |
| `welcome_paid` | MARKETING | Thank you {{1}}! Your {{2}} plan: ₹{{3}} (Order: {{4}}). Active till {{5}}. Join: {{6}} |
| `paid_daily_session` | UTILITY | Good evening {{1}}! Today's session: {{2}}. Live 5-6 PM! |
| `renewal_reminder` | MARKETING | Hi {{1}}, your subscription expires on {{2}}. Renew now: {{3}} |

**After each template is approved by Meta:**
1. Create an **API Campaign** for each template
2. Set the campaign to **"Live"**
3. The campaign names above must match the env variables exactly

---

## 3. 🎥 Zoom Meeting Link

Provide the recurring Zoom meeting link for daily sessions.

**Format:** `https://zoom.us/j/123456789?pwd=xxxxx`

This will be added to the `.env.local` file as `ZOOM_MEETING_LINK`.

---

## 4. 🖼️ Poster Images (Optional)

Design 6-8 poster images in Canva (1080×1080px) for WhatsApp messages:
- `welcome-poster.jpg` — Welcome to Yoga with Renu Tayal
- `daily-session-poster.jpg` — Today's Live Session 5-6 PM
- `purchase-nudge-poster.jpg` — Continue your journey, plans from ₹999
- `trial-expiry-poster.jpg` — Only 1 day left!
- `welcome-paid-poster.jpg` — Welcome to the family!
- `invite-friend-poster.jpg` — Gift 7 Days FREE Yoga

Upload to the `public/posters/` folder in the project.

---

## 5. 🔐 CRON Secret

Generate a random secret string for CRON job authentication:
```
CRON_SECRET=<paste a random 32+ character string here>
```

This prevents unauthorized people from triggering your CRON endpoints.

---

## 6. 🚀 Firebase Deployment

```bash
npm install -g firebase-tools
firebase login
firebase experiments:enable webframeworks
firebase deploy
```

After deployment, update Paytm callback URL to:
`https://tayal-yoga-class.web.app/api/paytm-callback`

---

## 7. ⏰ Set Up CRON (External Scheduler)

Use [cron-job.org](https://cron-job.org/) (free) to trigger these endpoints daily:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `GET https://tayal-yoga-class.web.app/api/cron/expire-trials` | 4:00 AM IST daily | Expire free trials past 7 days |
| `GET https://tayal-yoga-class.web.app/api/cron/send-messages` | 4:30 PM IST daily | Send daily session links |

**Add header:** `Authorization: Bearer YOUR_CRON_SECRET`

---

## Summary Checklist

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Create 3 Google Sheet tabs | Team | ⬜ |
| 2 | Create 8 AiSensy templates + API campaigns | Team | ⬜ |
| 3 | Provide Zoom meeting link | Team | ⬜ |
| 4 | Design poster images | Team | ⬜ Optional |
| 5 | Generate CRON secret | Team | ⬜ |
| 6 | Deploy to Firebase | Developer | ⬜ |
| 7 | Set up CRON scheduler | Developer | ⬜ |
