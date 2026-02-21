# Google Sheets Setup Guide — Tayal Yoga Class

This guide walks you through setting up Google Sheets to automatically store registration data from the Tayal Yoga Class payment form.

---

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **+ Blank spreadsheet**
3. Name it: **Tayal Yoga Registrations**
4. In the first row (Row 1), add these headers in columns A through H:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Timestamp | Full Name | WhatsApp Number | Plan | Amount (₹) | Payment Status | Transaction ID | Order ID |

5. **Copy the Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_IS_HERE/edit
   ```
   The part between `/d/` and `/edit` is your **Spreadsheet ID**. Save it — you'll need it later.

> **Note:** The app will automatically add headers if the sheet is empty, but it's good to set them up manually for clarity.

---

## Step 2: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **New Project**
3. Name: **TayalYogaClass** (or any name you prefer)
4. Click **Create**
5. Make sure the new project is selected in the dropdown

---

## Step 3: Enable Google Sheets API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**  
   Direct link: https://console.cloud.google.com/apis/library
2. Search for **"Google Sheets API"**
3. Click on it → Click **Enable**
4. Wait for it to be enabled (takes a few seconds)

---

## Step 4: Create a Service Account

1. Go to **APIs & Services** → **Credentials**  
   Direct link: https://console.cloud.google.com/apis/credentials
2. Click **+ CREATE CREDENTIALS** → **Service account**
3. Fill in:
   - **Service account name:** `yoga-sheet-writer`
   - **Service account ID:** (auto-filled, e.g., `yoga-sheet-writer@tayalyogaclass.iam.gserviceaccount.com`)
   - **Description:** `Writes yoga class registrations to Google Sheet`
4. Click **Create and Continue**
5. For **Role**, select **Editor** (or skip this step — the role doesn't matter for Sheets)
6. Click **Continue** → **Done**

---

## Step 5: Create a JSON Key

1. On the **Credentials** page, under **Service Accounts**, click on the service account you just created (`yoga-sheet-writer@...`)
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** → Click **Create**
5. A `.json` file will download. **Keep this safe!** It contains:
   ```json
   {
     "type": "service_account",
     "project_id": "tayalyogaclass",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "yoga-sheet-writer@tayalyogaclass.iam.gserviceaccount.com",
     "client_id": "...",
     ...
   }
   ```

You need two values from this file:
- **`client_email`** — This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **`private_key`** — This is your `GOOGLE_PRIVATE_KEY`

---

## Step 6: Share Google Sheet with Service Account

1. Open your Google Sheet (**Tayal Yoga Registrations**)
2. Click the **Share** button (top right)
3. In the "Add people" field, paste the **service account email**:  
   Example: `yoga-sheet-writer@tayalyogaclass.iam.gserviceaccount.com`
4. Set permission to **Editor**
5. Uncheck "Notify people"
6. Click **Share**

> **Important:** If you skip this step, the app will get a "403 Forbidden" error when trying to write to the sheet.

---

## Step 7: Set Environment Variables

You need to set 3 environment variables (in `.env.local` for local dev, or in Vercel dashboard for production):

### `GOOGLE_SERVICE_ACCOUNT_EMAIL`
Copy the `client_email` value from the JSON key file:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=yoga-sheet-writer@tayalyogaclass.iam.gserviceaccount.com
```

### `GOOGLE_PRIVATE_KEY`
Copy the `private_key` value from the JSON key file. **Important formatting notes:**
- The key starts with `-----BEGIN PRIVATE KEY-----` and ends with `-----END PRIVATE KEY-----`
- Keep the `\n` characters as-is (the app handles the conversion)
- Wrap the entire value in double quotes in your `.env.local` file

```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...(your key here)...\n-----END PRIVATE KEY-----\n"
```

> **For Vercel:** When adding the private key in Vercel's environment variables settings, paste the key value **without quotes**. Vercel handles the formatting.

### `GOOGLE_SPREADSHEET_ID`
The ID you copied from the spreadsheet URL in Step 1:
```
GOOGLE_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

### `GOOGLE_SHEET_NAME` (Optional)
If your sheet tab is not named "Sheet1", set this:
```
GOOGLE_SHEET_NAME=Sheet1
```

---

## Verification

After setting everything up, your Google Sheet will automatically populate with data when users register:

| Timestamp | Full Name | WhatsApp Number | Plan | Amount (₹) | Payment Status | Transaction ID | Order ID |
|-----------|-----------|-----------------|------|------------|----------------|----------------|----------|
| 21/02/2026, 1:30:00 PM | Rahul Sharma | +919876543210 | 1 Month Subscription | 999 | PENDING | | TAYAL_1708... |
| 21/02/2026, 1:31:00 PM | Rahul Sharma | +919876543210 | 1 Month Subscription | 999 | SUCCESS | 2024022... | TAYAL_1708... |

- When a user clicks "Pay", a row is added with **PENDING** status
- After successful payment, the status changes to **SUCCESS** with the Paytm Transaction ID
- If payment fails, the status changes to **FAILED**

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `403: The caller does not have permission` | Make sure you shared the Google Sheet with the service account email as **Editor** |
| `404: Requested entity was not found` | Check that `GOOGLE_SPREADSHEET_ID` is correct |
| `private key must be a string` | Make sure the private key in `.env.local` is wrapped in double quotes and contains `\n` for newlines |
| `invalid_grant` | The service account key may be expired. Create a new key from Google Cloud Console |

---

## Security Notes

- **Never commit** the JSON key file or `.env.local` to Git
- The service account has **no access** to your personal Google account — it only accesses sheets explicitly shared with it
- Rotate the service account key periodically for security
