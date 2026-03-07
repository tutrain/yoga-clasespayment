# Firebase Deployment Guide — Tayal Yoga Class

This guide walks you through deploying the Tayal Yoga Class registration form to Firebase Hosting.

---

## Prerequisites

- **Node.js 18+** installed
- **Firebase CLI** installed: `npm install -g firebase-tools`
- **Firebase project** on the **Blaze plan** (required for SSR/Cloud Functions)
- **Google account** with access to the Firebase project (`eqourse@gmail.com`)

---

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window — log in with `eqourse@gmail.com`.

## Step 3: Enable Web Frameworks (if not already)

```bash
firebase experiments:enable webframeworks
```

This enables Firebase's integrated support for Next.js.

## Step 4: Verify Configuration

The project already has `firebase.json` and `.firebaserc` configured:

- **Project**: `tayal-yoga-class`
- **Region**: `asia-south1` (Mumbai — optimal for Indian users)
- **Framework**: Auto-detected as Next.js

## Step 5: Set Environment Variables

Firebase doesn't use `.env.local` in production. You need to set environment variables using Firebase Functions config or Google Cloud Secret Manager.

### Option A: Using `.env` files for Firebase Functions

Create a `.env` file in the project root (this file is for Firebase Functions):

```bash
# Copy from .env.local (Firebase will read this during deployment)
cp .env.local .env
```

### Option B: Using Google Cloud Secret Manager (recommended for production)

```bash
# Set each secret
firebase functions:secrets:set GOOGLE_PRIVATE_KEY
firebase functions:secrets:set PAYTM_MERCHANT_KEY
firebase functions:secrets:set AISENSY_API_KEY
```

## Step 6: Build & Deploy

```bash
# Build the Next.js app
npm run build

# Deploy to Firebase
firebase deploy
```

After deployment, you'll get a URL like:
- `https://tayal-yoga-class.web.app`
- `https://tayal-yoga-class.firebaseapp.com`

## Step 7: Update Paytm Callback URL

After deployment, update the Paytm callback URL:

1. The callback URL in the code auto-detects the host — no code changes needed
2. However, if you have a whitelist in Paytm Dashboard, add:
   - `https://tayal-yoga-class.web.app/api/paytm-callback`

## Step 8: Test the Deployment

1. Open your Firebase Hosting URL
2. Fill in a test name and WhatsApp number
3. Click a plan button
4. Complete the payment on Paytm
5. Verify:
   - ✅ You're redirected to the success page
   - ✅ Google Sheet has a new row with "SUCCESS" status
   - ✅ WhatsApp confirmation received (if AiSensy templates are configured)

---

## Custom Domain (Optional)

1. In Firebase Console → Hosting → "Add custom domain"
2. Enter your domain: `pay.tayalyoga.com`
3. Firebase will show DNS records to add
4. Go to your domain registrar and add the DNS records
5. Wait for DNS propagation and SSL certificate provisioning

---

## Monitoring & Logs

### Firebase Console Logs
- Go to [Firebase Console](https://console.firebase.google.com/project/tayal-yoga-class)
- Click **Functions** → **Logs** to see server-side logs
- Useful for debugging payment callback issues and WhatsApp delivery

### Google Sheet
- Open your Google Sheet to see all registrations in real-time
- Filter by "Payment Status" column to see pending/failed payments

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check build logs. Common: missing env vars, TypeScript errors |
| `firebase deploy` fails | Ensure Blaze plan is active. Run `firebase login` again |
| Payment callback not working | Verify the Firebase URL is whitelisted in Paytm |
| WhatsApp not sending | Check AiSensy dashboard for delivery status. Ensure templates are "Live" |
| Google Sheets not updating | Check Firebase Functions logs for errors |
| 500 error on /api/register | Missing or incorrect environment variables |
