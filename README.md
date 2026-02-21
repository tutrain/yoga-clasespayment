# Tayal Yoga Class — Registration & Payment Portal

A secure registration form for Tayal Yoga Class that collects student information, processes payments via Paytm, and saves registrations to Google Sheets.

## Features

- **Clean UI** — Modern checkout form with teal/green theme matching Tayal Yoga Class branding
- **Two Plans** — ₹999 (1 Month) and ₹1999 (3 Months) subscriptions
- **Paytm Payments** — Integrated Paytm Payment Gateway (UPI, Cards, Netbanking, Wallet)
- **Google Sheets** — Automatic registration logging with payment status tracking
- **Responsive** — Works on mobile, tablet, and desktop
- **Deployed on Vercel** — Fast, reliable hosting with auto-deploy from GitHub

## Tech Stack

- **Next.js 16** (App Router) — React framework with server-side API routes
- **Tailwind CSS** — Utility-first CSS framework
- **TypeScript** — Type-safe code
- **Google Sheets API** — Data storage via service account
- **Paytm Payment Gateway** — Payment processing
- **Vercel** — Hosting & deployment

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/tutrain/yoga-clasespayment.git
cd yoga-clasespayment
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials. See the setup guides for details:
- [Google Sheets Setup](guides/GOOGLE_SHEETS_SETUP.md)
- [Paytm Setup](guides/PAYTM_SETUP.md)

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy

See [Deployment Guide](guides/DEPLOYMENT.md) for Vercel deployment instructions.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main checkout form
│   ├── layout.tsx                  # Root layout with metadata
│   ├── globals.css                 # Global styles & animations
│   ├── success/page.tsx            # Payment success page
│   ├── failure/page.tsx            # Payment failure page
│   └── api/
│       ├── register/route.ts       # Registration + payment initiation API
│       └── paytm-callback/route.ts # Paytm payment callback handler
├── lib/
│   ├── googleSheets.ts             # Google Sheets API helper
│   └── paytm.ts                    # Paytm checksum & transaction helpers
guides/
├── GOOGLE_SHEETS_SETUP.md          # Step-by-step Google Sheets setup
├── PAYTM_SETUP.md                  # Step-by-step Paytm setup
└── DEPLOYMENT.md                   # Vercel deployment guide
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Google service account private key |
| `GOOGLE_SPREADSHEET_ID` | Target Google Sheet ID |
| `GOOGLE_SHEET_NAME` | Sheet tab name (default: `Sheet1`) |
| `PAYTM_MID` | Paytm Merchant ID |
| `PAYTM_MERCHANT_KEY` | Paytm Merchant Key (secret) |
| `PAYTM_WEBSITE` | Paytm website name (default: `DEFAULT`) |
| `PAYTM_ENVIRONMENT` | `production` or `staging` |

## Payment Flow

1. User fills name + WhatsApp number
2. Clicks ₹999 or ₹1999 plan
3. Data saved to Google Sheet (status: PENDING)
4. Paytm transaction initiated → user redirected to Paytm
5. User completes payment
6. Paytm callback → server verifies → updates Google Sheet
7. User sees success/failure page

## License

Private — Tayal Yoga Class
