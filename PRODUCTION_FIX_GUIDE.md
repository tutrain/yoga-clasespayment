# Tayal Yoga Class — Production Fix Guide

> Generated: March 18, 2026 | All fixes needed to make the project production-ready

---

## PART A: ANTIGRAVITY AGENT PROMPT

Copy-paste the entire section below into your Antigravity agent:

---

### START OF ANTIGRAVITY PROMPT

You are working on the Tayal Yoga Class project (GitHub repo: `tutrain/yoga-clasespayment`). This is a Next.js app deployed on Firebase at `tayal-yoga-class.web.app`.

I need you to make the following production-ready fixes. Please implement ALL changes listed below carefully.

---

#### FIX 1: Replace IMAGE_LASTDAY with IMAGE_WELCOME in send-messages CRON

**File:** `src/app/api/cron/send-messages/route.ts`

**What to change:** Find the line where T6 (`sendFreeTrialLastDay`) is called. It currently uses `process.env.IMAGE_LASTDAY`. Change it to use `process.env.IMAGE_WELCOME` instead.

**Find this line:**
```typescript
await sendFreeTrialLastDay(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', joinLink, baseUrl, process.env.IMAGE_LASTDAY);
```

**Replace with:**
```typescript
await sendFreeTrialLastDay(toAiSensyPhone(row.whatsapp), row.fullName + ' ji', joinLink, baseUrl, process.env.IMAGE_WELCOME);
```

**Reason:** We are standardizing on Welcome.jpeg poster for all messages that previously used Msg3.jpeg.

---

#### FIX 2: Create new post-session CRON endpoint for T8 (replaces webhook)

**Problem:** T8 (`yoga_freetrial_joined_confirm`) was supposed to be triggered by an AiSensy webhook when a user clicks "Confirm My Trial", but AiSensy requires a PRO plan for webhooks and we are on Basic plan. So instead, we will send T8 automatically as a post-session appreciation message via a new CRON job that runs daily at 6:15 PM IST (after the 5-6 PM session ends).

**Create new file:** `src/app/api/cron/post-session/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
    getActiveFreeTrials,
} from "@/lib/googleSheets";
import { sendFreeTrialJoinedConfirm } from "@/lib/aisensy";

/**
 * GET /api/cron/post-session
 *
 * CRON job: Run daily at 6:15 PM IST (after the 5-6 PM session ends).
 * Sends T8 (yoga_freetrial_joined_confirm) — a warm "thank you for joining"
 * message to all ACTIVE free trial members.
 *
 * This replaces the webhook-based approach (AiSensy webhook requires PRO plan).
 * Instead of detecting who clicked "Confirm My Trial", we send an appreciation
 * message to all active trial members after every session.
 *
 * Protected by x-cron-secret header.
 */

/** Strip + prefix from phone — AiSensy needs 91XXXXXXXXXX, not +91XXXXXXXXXX */
function toAiSensyPhone(phone: string): string {
    return phone.replace(/^\+/, "");
}

export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const incoming = request.headers.get("x-cron-secret");

    if (!incoming || incoming !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
        }); // YYYY-MM-DD

        const activeTrials = await getActiveFreeTrials();
        let sent = 0;
        let skipped = 0;

        for (const { row } of activeTrials) {
            // Calculate day number to only send during active trial period (Day 1-7)
            const startDate = new Date(row.startDate);
            const now = new Date();
            const dayNumber = Math.ceil(
                (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Only send T8 during active trial days (1-7)
            if (dayNumber >= 1 && dayNumber <= 7) {
                const success = await sendFreeTrialJoinedConfirm(
                    toAiSensyPhone(row.whatsapp),
                    row.fullName + " ji"
                );

                if (success) {
                    sent++;
                    console.log(
                        `[PostSession] T8 sent to ${row.fullName} (Day ${dayNumber})`
                    );
                }
            } else {
                skipped++;
            }
        }

        console.log(
            `[PostSession] Done. Sent: ${sent}, Skipped: ${skipped}, Total active: ${activeTrials.length}`
        );

        return NextResponse.json({
            success: true,
            sent,
            skipped,
            totalActive: activeTrials.length,
            date: today,
        });
    } catch (error) {
        console.error("[PostSession] Error:", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `CRON job failed: ${errMsg}` },
            { status: 500 }
        );
    }
}
```

---

#### FIX 3: Delete the webhook route (no longer needed)

**Delete the file:** `src/app/api/webhook/aisensy/route.ts`

**Reason:** Since AiSensy webhooks require PRO plan and we are on Basic plan, this route can never be called. We replaced its functionality with the post-session CRON in FIX 2 above. Keeping dead code in production is bad practice.

---

#### FIX 4: Fix day number calculation timezone issue (BUG 4)

**File:** `src/app/api/cron/send-messages/route.ts`

**Problem:** The day number calculation uses `new Date()` which returns UTC time, but `startDate` is stored as an IST date string (e.g., "2026-03-18"). This can cause off-by-one errors at timezone boundaries.

**Find this code block** (inside the free trial member loop):
```typescript
const startDate = new Date(row.startDate);
const now = new Date();
const dayNumber = Math.ceil(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
);
```

**Replace with:**
```typescript
// Use IST dates for both to avoid timezone off-by-one
const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const istStart = new Date(row.startDate + "T00:00:00+05:30");
const dayNumber = Math.ceil(
    (istNow.getTime() - istStart.getTime()) / (1000 * 60 * 60 * 24)
);
```

**Do the same fix** for the expired trial member loop (further down in the same file). Find:
```typescript
const startDate = new Date(row.startDate);
const now = new Date();
const dayNumber = Math.ceil(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
);
```

Replace with the same IST-aware calculation:
```typescript
const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const istStart = new Date(row.startDate + "T00:00:00+05:30");
const dayNumber = Math.ceil(
    (istNow.getTime() - istStart.getTime()) / (1000 * 60 * 60 * 24)
);
```

**Also fix the same issue** for the paid member weekly info calculation in the same file. Find:
```typescript
const startDate = new Date(row.startDate);
const now = new Date();
const daysSinceStart = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
);
```

Replace with:
```typescript
const istNowPaid = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const istStartPaid = new Date(row.startDate + "T00:00:00+05:30");
const daysSinceStart = Math.floor(
    (istNowPaid.getTime() - istStartPaid.getTime()) / (1000 * 60 * 60 * 24)
);
```

And for the paid member renewal/expiry check. Find:
```typescript
const endDate = new Date(row.endDate);
const now = new Date();
const daysToExpiry = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
);
```

Replace with:
```typescript
const istNowExp = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
const istEnd = new Date(row.endDate + "T23:59:59+05:30");
const daysToExpiry = Math.ceil(
    (istEnd.getTime() - istNowExp.getTime()) / (1000 * 60 * 60 * 24)
);
```

---

#### FIX 5: Remove IMAGE_LASTDAY from .env references

**File:** `.env.example` (or `.env.local` if it exists)

Remove the line:
```
IMAGE_LASTDAY=https://firebasestorage.googleapis.com/...Msg3.jpeg
```

This env variable is no longer used since FIX 1 replaced it with IMAGE_WELCOME.

---

#### SUMMARY OF ALL CODE CHANGES

1. `src/app/api/cron/send-messages/route.ts` — Changed IMAGE_LASTDAY to IMAGE_WELCOME for T6, fixed all timezone calculations to use IST
2. `src/app/api/cron/post-session/route.ts` — NEW FILE created for T8 post-session CRON
3. `src/app/api/webhook/aisensy/route.ts` — DELETED (not usable on Basic plan)
4. `.env.example` — Removed IMAGE_LASTDAY reference

After making these changes, deploy to Firebase:
```bash
firebase deploy
```

### END OF ANTIGRAVITY PROMPT

---

## PART B: MANUAL STEPS (You do these yourself)

### Step 1: Fix Expire Trials CRON Timing

Go to: https://console.cron-job.org/jobs/7366909

**Current:** Every day at 22:00 (UTC) = 3:30 AM IST
**Change to:** Every day at 22:30 (UTC) = 4:00 AM IST

Steps:
1. Click on the "Common" tab
2. Change the hour from `22` to `22` and minutes from `00` to `30`
3. OR switch to "Custom" and enter crontab: `30 22 * * *`
4. Save

### Step 2: Send Messages CRON — Already Correct!

URL: https://console.cron-job.org/jobs/7366912
Current: Every day at 11:00 UTC = 4:30 PM IST ✅ No change needed.

### Step 3: Create NEW Post-Session CRON Job

Go to: https://console.cron-job.org → Create New

| Setting | Value |
|---------|-------|
| **Title** | Tayal Yoga - Post Session Thank You |
| **URL** | `https://tayal-yoga-class.web.app/api/cron/post-session` |
| **Enable job** | ON |
| **Save responses** | ON |
| **Schedule** | Every day at `12` : `45` (this is UTC = 6:15 PM IST) |
| **Crontab** | `45 12 * * *` |

Then go to **ADVANCED** tab:
| Setting | Value |
|---------|-------|
| **Headers Key** | `x-cron-secret` |
| **Headers Value** | `TayalYoga@Renu2026#Secure` |
| **Time zone** | `UTC` |
| **Request method** | `GET` |
| **Timeout** | `30` seconds |

Save the job.

### Step 4: Remove IMAGE_LASTDAY from Firebase Environment

Since the code no longer uses IMAGE_LASTDAY, you can remove it from your Firebase environment variables. The IMAGE_WELCOME variable is already set and will be used for T6 (last day) messages going forward.

If you set env vars via Firebase console or CLI:
```bash
# If using firebase functions config (not needed if env vars are set differently)
# Just ensure IMAGE_LASTDAY is removed from wherever you store env vars
```

### Step 5: Verify CTA Button URLs in AiSensy Templates

Go to AiSensy Dashboard → Campaigns → Check these templates:

| Template | Button Type | Button Text | Should Open URL |
|----------|-------------|-------------|----------------|
| T4 yoga_freetrial_mid_nudge | CTA | "See Plans" | `https://tayal-yoga-class.web.app` |
| T5 yoga_freetrial_urgency | CTA | "Keep My Access" | `https://tayal-yoga-class.web.app` |
| T6 yoga_freetrial_lastday | CTA | "Purchase Plan" | `https://tayal-yoga-class.web.app` |
| T7 yoga_freetrial_expired_d8 | CTA | "Rejoin Now" | `https://tayal-yoga-class.web.app` |
| T12 yoga_paid_renewal_reminder | CTA | "Renew My Plan" | `https://tayal-yoga-class.web.app` |

**If any URL points to the old domain** (`yoga-clasespayment.web.app`), you'll need to create a new template version with the correct URL in AiSensy and get it re-approved by Meta.

**Quick Reply buttons** ("Confirm My Trial", "Join Session Now", "Invite a Friend", "Share on WhatsApp") — these just send text replies back. They don't open URLs. Without webhook (PRO plan), they won't trigger any backend action. This is fine because:
- "Confirm My Trial" → replaced by post-session CRON (FIX 2)
- "Join Session Now" → user uses the join link in the message body instead
- "Invite a Friend" / "Share on WhatsApp" → these are engagement buttons, no backend action needed

### Step 6: Deploy and Test

After Antigravity implements all code changes:

1. **Deploy:** `firebase deploy`
2. **Test expire-trials:** Wait for next execution at 4:00 AM IST (or manually trigger from cron-job.org)
3. **Test send-messages:** Wait for 4:30 PM IST (or manually trigger)
4. **Test post-session:** Wait for 6:15 PM IST (or manually trigger)
5. **Verify in WhatsApp:** Check that a free trial member receives:
   - T3 (daily reminder) at ~4:30 PM
   - T8 (thank you message) at ~6:15 PM
6. **Verify image:** T6 (last day) should now show Welcome.jpeg poster, not Msg3.jpeg

---

## PART C: COMPLETE CRON SCHEDULE (Final Production State)

| # | Job Name | URL | UTC Time | IST Time | Crontab |
|---|----------|-----|----------|----------|---------|
| 1 | Expire Trials | `/api/cron/expire-trials` | 22:30 | 4:00 AM | `30 22 * * *` |
| 2 | Send Messages | `/api/cron/send-messages` | 11:00 | 4:30 PM | `0 11 * * *` |
| 3 | Post Session | `/api/cron/post-session` | 12:45 | 6:15 PM | `45 12 * * *` |

All three jobs use:
- Header: `x-cron-secret: TayalYoga@Renu2026#Secure`
- Method: GET
- Timezone: UTC

---

## PART D: FINAL IMAGE MAPPING (After Fixes)

| Template | Image Used | Env Variable | Poster File |
|----------|-----------|--------------|-------------|
| T1 Welcome | Welcome.jpeg | IMAGE_WELCOME | Renu Tayal namaste pose |
| T2 Schedule | Time.jpeg | IMAGE_TIME | Join Today 5-6 PM |
| T3 Daily Reminder | Msg2.jpeg | IMAGE_DAILY | Yellow top pointing |
| T4 Mid Nudge | 7_Day_Free.jpeg | IMAGE_FREE | 7-Day Free with phone mockup |
| T5 Urgency | 7_Day_Free.jpeg | IMAGE_FREE | 7-Day Free with phone mockup |
| T6 Last Day | **Welcome.jpeg** | **IMAGE_WELCOME** | **Changed from Msg3.jpeg** |
| T7 Expired | Welcome.jpeg | IMAGE_WELCOME | Renu Tayal namaste pose |
| T8 Joined Confirm | No image | — | Text only |
| T9 Paid Welcome | Welcome.jpeg | IMAGE_WELCOME | Renu Tayal namaste pose |
| T10 Paid Daily | Msg2.jpeg | IMAGE_DAILY | Yellow top pointing |
| T11 Weekly Info | No image | — | Text only |
| T12 Renewal | Welcome.jpeg | IMAGE_WELCOME | Renu Tayal namaste pose |

---

## PART E: KNOWN LIMITATIONS (Acceptable for Production)

1. **Quick Reply buttons don't trigger backend actions** — This is fine. Users click the join link in the message body to join sessions. The buttons serve as engagement indicators only.

2. **T8 goes to ALL active trial members, not just those who joined** — Without webhook or Zoom API integration, we can't detect who actually joined the session. Sending a warm "thank you" to all active trial members is good for engagement regardless.

3. **T11 Weekly Info uses hardcoded content** — The weekly title and content are hardcoded as "This Week's Yoga Focus" in the CRON. To make it dynamic, you would need to update it weekly in the codebase or add a Google Sheet column for weekly themes (future enhancement).
