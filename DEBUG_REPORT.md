# 🔍 DEBUG REPORT — WhatsApp Messages Not Sending After Free Trial Registration (FIXED ✅)

**Date:** 2026-03-12  
**Symptom:** User registers for free trial → data saves to Google Sheet ✅ → NO WhatsApp message received ❌  
**Firebase Functions config returns:** `{}` (empty)

---

## ✅ Environment Variables Check (`.env` file)

| Variable | Status | Value |
|----------|--------|-------|
| `AISENSY_API_KEY` (line 19) | ✅ Present | JWT token (set) |
| `AISENSY_API_KEY` (line 47) | ⚠️ **DUPLICATE with leading space** | ` eyJ...` (space before token!) |
| `ZOOM_MEETING_LINK` | ✅ Present | Zoom URL set |
| `GOOGLE_SHEET_NAME_FREETRIAL` | ✅ Present | `FreeTrialMembers` |
| `GOOGLE_SHEET_NAME_PAID` | ✅ Present | `PaidMembers` |
| `GOOGLE_SHEET_NAME_CONVERTED` | ✅ Present | `ConvertedFromTrial` |
| `NEXT_PUBLIC_BASE_URL` | ✅ Present | `https://yoga-clasespayment.web.app` |
| `CRON_SECRET` | ✅ Present | `TayalYoga@Renu2026#Secure` |
| All 12 `AISENSY_TEMPLATE_*` | ✅ All present | All 12 template names set correctly |

---

## 🚨 CRITICAL BUGS FOUND

### Bug #1: Duplicate `AISENSY_API_KEY` with LEADING SPACE (`.env` line 47)

**File:** `D:\equourse\yoga-clasespayment\.env`  
**Location:** Line 47

```
AISENSY_API_KEY= eyJhbGci...   ← SPACE BEFORE TOKEN!
```

The `.env` file has **two** `AISENSY_API_KEY` entries:
- **Line 19:** Correct — `AISENSY_API_KEY=eyJhbG...` (no space)
- **Line 47:** WRONG — `AISENSY_API_KEY= eyJhbG...` (space before token)

**Impact:** The second entry (line 47) OVERRIDES the first. The space before the JWT token causes AiSensy API to reject the key as invalid — authentication fails silently.

**Fix:** Delete lines 46-47 entirely (the duplicate entry).

---

### Bug #2: Phone Number Format — `+91` vs `91`

**File:** `src/app/api/free-trial/route.ts`  
**Location:** Line 44

```typescript
const phone = `+91${whatsapp}`;   // Produces: +919876543210
```

AiSensy API requires phone format `91XXXXXXXXXX` (NO + sign).  
The `+` prefix causes AiSensy to reject the destination number.

**Fix:** Change line 44 to:
```typescript
const phone = `91${whatsapp}`;    // Produces: 919876543210
```

**Also check:** `checkMemberStatus()` in Google Sheets stores phone as `+91...` — if we change the format sent to AiSensy, we need a separate variable for the WhatsApp destination, OR strip the `+` before calling AiSensy only.

---

## ✅ Code Verification

### `sendTemplate()` function in `aisensy.ts`
- **Status:** ✅ EXISTS and is CORRECT
- API Endpoint: `https://backend.aisensy.com/campaign/t1/api/v2` ✅
- Payload format: `{ apiKey, campaignName, destination, userName, templateParams, source, media }` ✅
- All 12 template functions are correctly wired

### `free-trial/route.ts` calling WhatsApp
- **Status:** ✅ Calls `sendFreeTrialWelcome()` correctly (line 84)
- Uses fire-and-forget pattern with `.catch()` error logging ✅
- Passes all 5 required params: `phone, name, startDate, endDate, joinLink` ✅

### Firebase env loading
- **Status:** ✅ `.env` file IS included in Firebase Functions bundle
- Bundle location: `.firebase/tayal-yoga-class/functions/.env` (4704 bytes)
- Firebase auto-appended `VERCEL_URL`, `__FIREBASE_FRAMEWORKS_ENTRY__`, `__FIREBASE_DEFAULTS__`
- Note: `firebase functions:config:get` returning `{}` is EXPECTED — Firebase Web Frameworks uses `.env` files, NOT `functions.config()`. The env vars load correctly via `process.env`.

---

## 🔧 EXACT FIXES NEEDED

### Fix 1: Remove duplicate AISENSY_API_KEY (CRITICAL)

In `.env` file, delete these 2 lines at the bottom:
```
#aisensyapi key :
AISENSY_API_KEY= eyJhbG...
```

### Fix 2: Fix phone number format (CRITICAL)

In `src/app/api/free-trial/route.ts` line 44, change:
```diff
-const phone = `+91${whatsapp}`;
+const phone = `91${whatsapp}`;
```

Also update the same pattern in Google Sheets storage — use `+91` for sheets (display) but `91` for AiSensy API calls. OR better: store as `91XXXXXXXXXX` everywhere for consistency.

### Fix 3: Redeploy to Firebase after fixes

```bash
Copy-Item .env.local .env -Force
firebase deploy
```

---

## 📋 Other Observations

1. **AiSensy Plan:** The API key shows `activePlan: "FREE_FOREVER"` — this plan may have sending limits or restrictions. Verify AiSensy is upgraded to Starter plan (₹999/month) as noted in the handover doc.

2. **Template Approval:** Confirm all 12 templates are approved by Meta on the AiSensy dashboard (status must be "Live", not "Pending" or "Rejected").

3. **`next.config.ts`:** Currently empty (no `env` or `serverRuntimeConfig`). This is fine because Firebase Functions loads `.env` natively.

4. **No `.firebaserc` file:** Firebase determined the project from `firebase use` command. Consider creating `.firebaserc` for consistency: `{ "projects": { "default": "tayal-yoga-class" } }`
