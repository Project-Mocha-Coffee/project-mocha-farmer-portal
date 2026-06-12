## Project Mocha Farmer Portal

Mobile-first farmer dashboard with ElementPay-backed live wallet mapping, balances, transactions, and off-ramp initiation.

## Live ElementPay Configuration

Copy `.env.example` to `.env.local` and set real values:

```bash
cp .env.example .env.local
```

Required:

- `ELEMENTPAY_API_BASE_URL`: ElementPay API base URL
  - Example: `https://api.elementpay.net/api/v1`

Optional (defaults provided):

- `ELEMENTPAY_API_KEY`
- `ELEMENTPAY_PHONE_WALLET_PATH`
- `ELEMENTPAY_METRICS_PATH`
- `ELEMENTPAY_TRANSACTIONS_PATH`
- `ELEMENTPAY_OFFRAMP_PATH`
- `ELEMENTPAY_ORDERS_ME_PATH`
- `ELEMENTPAY_ORDERS_WALLET_PATH`
- `ELEMENTPAY_TOKEN_ADDRESS` (recommended for `/orders/create` integrations)

All path variables also accept a full URL if your integration uses different hosts per endpoint.

The frontend calls internal API routes:

- `GET /api/farmer-profile?phone=...`
- `POST /api/offramp-session`

These routes fetch live data from ElementPay and normalize it for the dashboard.

Marketplace live dashboard:

- `GET /api/marketplace-live`
- Canonical marketplace URL: `https://mocha-coffee-marketplace.vercel.app/`
- Paid-order, merchant, and customer metrics require marketplace admin auth. Use either:
  - `MARKETPLACE_ADMIN_EMAIL` + `MARKETPLACE_ADMIN_PASSWORD` (recommended), or
  - `MARKETPLACE_SERVICE_TOKEN` (admin JWT pasted from browser)

### Where to find `MARKETPLACE_SERVICE_TOKEN`

1. Open [https://mocha-coffee-marketplace.vercel.app/admin/login](https://mocha-coffee-marketplace.vercel.app/admin/login)
2. Sign in with your **admin** email and password
3. Open browser DevTools → Application → Local Storage
4. Copy the value of `admin_token` (this is the JWT)

Alternatively, set `MARKETPLACE_ADMIN_EMAIL` and `MARKETPLACE_ADMIN_PASSWORD` in Vercel instead — the farmer portal will sign in server-side automatically.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy

Production: [https://project-mocha-farmer-portal.vercel.app](https://project-mocha-farmer-portal.vercel.app)

Pushes to `main` auto-deploy via GitHub Actions (`.github/workflows/deploy-vercel.yml`). Set these GitHub repository secrets if you fork the project:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Set the ElementPay and marketplace environment variables in the Vercel project settings so live data works in production.
