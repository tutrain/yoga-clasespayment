# Deployment Guide — Tayal Yoga Class (Vercel + GitHub)

This guide walks you through deploying the Tayal Yoga Class registration form to Vercel using the `tutrain` GitHub account.

---

## Step 1: Push Code to GitHub

### If this is a new repo:

1. Open a terminal in the project folder
2. Run:

```bash
# Initialize git (already done if you cloned)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Tayal Yoga Class registration form"

# Add GitHub remote (replace with your actual repo URL)
git remote add origin https://github.com/tutrain/yoga-clasespayment.git

# Push to main branch
git branch -M main
git push -u origin main
```

### If the repo already exists:

```bash
git add .
git commit -m "Add yoga registration form with Paytm + Google Sheets"
git push
```

---

## Step 2: Import Project in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Under **"Import Git Repository"**, find `tutrain/yoga-clasespayment`
   - If you don't see it, click **"Adjust GitHub App Permissions"** and grant access to the `tutrain` account/org
4. Click **Import**

---

## Step 3: Configure Project Settings

On the project configuration page:

1. **Framework Preset:** Should auto-detect as **Next.js**
2. **Root Directory:** Leave as `.` (default)
3. **Build Command:** `npm run build` (default)
4. **Output Directory:** Leave default (Next.js handles this)
5. **Install Command:** `npm install` (default)

---

## Step 4: Add Environment Variables

**This is the most important step!** Before clicking Deploy, add all environment variables:

Click **"Environment Variables"** and add each one:

| Key | Value | Notes |
|-----|-------|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `yoga-sheet-writer@tayalyoga.iam.gserviceaccount.com` | From Google Cloud |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Full key, no quotes needed in Vercel |
| `GOOGLE_SPREADSHEET_ID` | `1BxiMVs0XRA5nFMd...` | From Google Sheet URL |
| `GOOGLE_SHEET_NAME` | `Sheet1` | Or your sheet tab name |
| `PAYTM_MID` | `YourMerchantID123` | From Paytm Dashboard |
| `PAYTM_MERCHANT_KEY` | `YourSecretKey123` | From Paytm Dashboard |
| `PAYTM_WEBSITE` | `DEFAULT` | From Paytm Dashboard |
| `PAYTM_ENVIRONMENT` | `production` | Use `staging` for testing |

> **Important for `GOOGLE_PRIVATE_KEY`:** In Vercel, paste the key value directly (including `-----BEGIN PRIVATE KEY-----` and all the `\n` characters). Don't wrap it in quotes.

---

## Step 5: Deploy

1. Click **Deploy**
2. Wait for the build to complete (usually 1-2 minutes)
3. Once deployed, you'll get a URL like: `https://yoga-clasespayment.vercel.app`

---

## Step 6: Update Paytm Callback URL

After deployment, update the Paytm callback URL:

1. Go to Paytm Dashboard → Developer Settings
2. Update the callback URL to: `https://yoga-clasespayment.vercel.app/api/paytm-callback`
3. (Use your actual Vercel domain)

---

## Step 7: Test the Live Deployment

1. Open your Vercel URL
2. Fill in a test name and WhatsApp number
3. Click a plan button
4. Complete the payment on Paytm
5. Verify:
   - ✅ You're redirected to the success page
   - ✅ Google Sheet has a new row with "SUCCESS" status
   - ✅ Transaction ID is populated

---

## Custom Domain (Optional)

If you want a custom domain like `pay.tayalyoga.com`:

1. In Vercel, go to **Project Settings** → **Domains**
2. Add your domain: `pay.tayalyoga.com`
3. Vercel will show DNS records to add
4. Go to your domain registrar (GoDaddy, Namecheap, etc.) and add the DNS records:
   - **CNAME:** `pay` → `cname.vercel-dns.com`
5. Wait for DNS propagation (usually 5-30 minutes)
6. Update your Paytm callback URL to use the custom domain

---

## Automatic Deployments

Vercel automatically deploys when you push to the `main` branch:

- **Push to `main`** → Production deployment
- **Push to other branches** → Preview deployment (with a temporary URL)

This means to update the site, just:
```bash
git add .
git commit -m "Your change description"
git push
```

---

## Monitoring & Logs

### Vercel Logs
- Go to your project in Vercel Dashboard
- Click **"Logs"** tab to see real-time server logs
- Useful for debugging payment callback issues

### Google Sheet
- Open your Google Sheet to see all registrations in real-time
- Filter by "Payment Status" column to see pending/failed payments

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Vercel build logs. Common: missing env vars, TypeScript errors |
| Payment callback not working | Verify callback URL in Paytm matches your Vercel domain |
| Google Sheets not updating | Check Vercel logs for errors. Verify env vars are set correctly |
| 500 error on /api/register | Missing or incorrect environment variables |
| "Module not found" errors | Run `npm install` locally and push `package-lock.json` |
