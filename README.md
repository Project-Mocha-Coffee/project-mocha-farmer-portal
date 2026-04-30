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

All path variables also accept a full URL if your integration uses different hosts per endpoint.

The frontend calls internal API routes:

- `GET /api/farmer-profile?phone=...`
- `POST /api/offramp-session`

These routes fetch live data from ElementPay and normalize it for the dashboard.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy

Production is deployed on Vercel. Set the same ElementPay environment variables in the Vercel project settings so live data works in production.
