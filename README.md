# Soltrace

Live Solana wallet tracker built with React, Vite, Node.js, Express, and Solana Web3. Soltrace lets you paste a public Solana wallet address and fetch its live SOL balance through a simple dashboard.

Live app: [https://soltrace-tracker.vercel.app](https://soltrace-tracker.vercel.app)

## Features

- Live Solana wallet balance lookup
- Responsive dashboard UI
- Local Express backend for development
- Vercel Functions for production API routes
- One-domain deployment on Vercel

## Tech Stack

- React
- Vite
- Node.js
- Express
- `@solana/web3.js`
- Vercel Functions

## Local Setup

From the project root:

```bash
npm run setup
npm run dev
```

Frontend runs in `frontend/`.
Local backend runs in `backend/`.

## Production Build

```bash
npm run build
npm start
```

Then open:

```text
http://localhost:5000
```

## API Routes

- `/api/status`
- `/api/wallet?address=<SOLANA_PUBLIC_KEY>`

## Deployment

This repo is configured for Vercel:

- Static frontend built from `frontend/`
- Serverless API routes in `api/`
- Routing defined in `vercel.json`

Set this environment variable in Vercel:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

For a full deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).
