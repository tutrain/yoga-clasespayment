# Paytm Payment Gateway Setup Guide — Tayal Yoga Class

This guide walks you through setting up the Paytm Payment Gateway for the Tayal Yoga Class registration form.

---

## Prerequisites

- A **Paytm for Business** account (if you already have one for your website, you can use the same one)
- Access to the Paytm Business Dashboard

---

## Step 1: Access Paytm Business Dashboard

1. Go to [Paytm for Business](https://business.paytm.com/)
2. Log in with your registered mobile number / email
3. If you don't have an account yet:
   - Click **Sign Up**
   - Choose **Online Payments**
   - Complete KYC verification (PAN, Aadhaar, bank details)
   - Wait for approval (usually 1-2 business days)

---

## Step 2: Find Your API Keys

### For Production (Live Payments):

1. Log in to [Paytm Business Dashboard](https://dashboard.paytm.com/next/apikeys)
2. Navigate to: **Developer Settings** → **API Keys**
   - Or directly visit: https://dashboard.paytm.com/next/apikeys
3. You will see:
   - **Merchant ID (MID):** Something like `YourCo12345678901234`
   - **Merchant Key:** Something like `abcDEF123ghiJKL456`
   - **Website Name:** Usually `DEFAULT` or a custom name like `YourCoWEB`
   - **Industry Type:** `Retail` or similar

> **Important:** The **Merchant Key is secret**. Never expose it in frontend code or commit it to Git.

### For Testing/Staging (Test Payments):

1. Go to [Paytm Staging Dashboard](https://dashboard.paytm.com/next/apikeys)
2. Toggle the **Test/Staging** mode switch (if available)
3. Or use these default staging credentials that Paytm provides for testing:
   - MID and Key from your staging/sandbox environment
4. Staging host: `https://securegw-stage.paytm.in`

> **Tip:** Always test with staging credentials first before going live!

---

## Step 3: Configure Callback URL

The callback URL is where Paytm sends the user after payment (success or failure).

1. In the Paytm Dashboard, go to **Developer Settings**
2. Look for **Callback URL** or **Webhook Settings**
3. Add your callback URL:
   - **For production:** `https://your-domain.vercel.app/api/paytm-callback`
   - **For local testing:** `http://localhost:3000/api/paytm-callback` (may not work — use ngrok for local testing)

> **Note:** Replace `your-domain.vercel.app` with your actual Vercel deployment URL.

---

## Step 4: Set Environment Variables

Add these to your `.env.local` file (for local development) and to Vercel (for production):

### Required Variables:

```env
# Paytm Merchant ID — from Dashboard → API Keys
PAYTM_MID=YourMerchantID123456

# Paytm Merchant Key (SECRET) — from Dashboard → API Keys
PAYTM_MERCHANT_KEY=YourSecretMerchantKey

# Paytm Website Name — from Dashboard → API Keys (usually "DEFAULT")
PAYTM_WEBSITE=DEFAULT

# Environment — "production" for live, "staging" for testing
PAYTM_ENVIRONMENT=production
```

### How to find each value:

| Variable | Where to Find | Example |
|----------|--------------|---------|
| `PAYTM_MID` | Dashboard → Developer Settings → API Keys → Merchant ID | `TayalY12345678901234` |
| `PAYTM_MERCHANT_KEY` | Dashboard → Developer Settings → API Keys → Merchant Key | `abcDEF123ghiJKL456` |
| `PAYTM_WEBSITE` | Dashboard → Developer Settings → API Keys → Website Name | `DEFAULT` |
| `PAYTM_ENVIRONMENT` | Set by you — `production` or `staging` | `production` |

---

## Step 5: Understand the Payment Flow

Here's how the payment works end-to-end:

```
User fills form → Clicks ₹999 or ₹1999
       ↓
Our server creates order → Saves to Google Sheet (PENDING)
       ↓
Our server calls Paytm "Initiate Transaction" API → Gets transaction token
       ↓
User is redirected to Paytm payment page
       ↓
User completes payment (UPI / Card / Netbanking / Paytm Wallet)
       ↓
Paytm redirects user back to our callback URL (/api/paytm-callback)
       ↓
Our server verifies payment with Paytm "Order Status" API
       ↓
Updates Google Sheet (SUCCESS / FAILED) → Shows success/failure page
```

---

## Step 6: Test with Staging Credentials

Before going live, test the full flow:

1. Set `PAYTM_ENVIRONMENT=staging` in your `.env.local`
2. Use your staging MID and Merchant Key
3. Run `npm run dev` locally
4. Fill the form and click a plan
5. On the Paytm staging page, use these test card details:
   - **Card Number:** `4111 1111 1111 1111`
   - **Expiry:** Any future date (e.g., `12/30`)
   - **CVV:** `123`
   - **OTP:** `123456`
6. Verify:
   - The Google Sheet shows the registration with "SUCCESS" status
   - The success page is displayed with transaction details

---

## Step 7: Go Live (Production)

When testing is complete:

1. Change `PAYTM_ENVIRONMENT=production` in Vercel environment variables
2. Use your **production** MID and Merchant Key
3. Ensure callback URL is set to your Vercel domain: `https://your-domain.vercel.app/api/paytm-callback`
4. Deploy to Vercel
5. Do one real test payment with ₹1 (if Paytm allows custom amounts) or with the actual plan amount
6. Verify the entire flow works

---

## Using the Same Paytm Account as Your Website

Since you already have a Paytm account for your website:

1. **You can use the same MID and Merchant Key** — Paytm allows multiple integrations under one merchant account
2. The `WEBSITE` parameter can be the same (usually `DEFAULT`)
3. Each transaction gets a unique `orderId` (we prefix ours with `TAYAL_`) so there's no conflict with your website's transactions
4. All payments (from your website + yoga registration) will appear in the same Paytm dashboard

> **Tip:** You can differentiate yoga class transactions in your Paytm dashboard by searching for orders starting with `TAYAL_`.

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `"resultStatus":"F"` on initiate transaction | Check that MID, Merchant Key, and Website are correct |
| `Invalid Merchant` | Your Paytm account may not be activated for online payments. Contact Paytm support. |
| `Callback URL not whitelisted` | Add your callback URL in Paytm Dashboard → Developer Settings |
| Payment succeeds but sheet shows PENDING | Check the callback URL is accessible. Verify `PAYTM_ENVIRONMENT` matches your credentials. |
| `Checksum validation failed` | Make sure `PAYTM_MERCHANT_KEY` is correct and matches the `PAYTM_MID` |
| `Transaction amount mismatch` | Don't modify the amount between initiation and callback |

---

## Paytm API Reference

| API | URL (Production) | URL (Staging) |
|-----|-------------------|---------------|
| Initiate Transaction | `https://securegw.paytm.in/theia/api/v1/initiateTransaction` | `https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction` |
| Payment Page | `https://securegw.paytm.in/theia/api/v1/showPaymentPage` | `https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage` |
| Order Status | `https://securegw.paytm.in/v3/order/status` | `https://securegw-stage.paytm.in/v3/order/status` |

---

## Security Best Practices

- **Never expose `PAYTM_MERCHANT_KEY`** in frontend code, Git, or browser console
- Always verify payments on the **server side** using the Order Status API (don't trust frontend data)
- Use **HTTPS** for all callback URLs (Vercel provides this automatically)
- Monitor your Paytm dashboard regularly for any suspicious transactions
