# Blocktrace

Blocktrace is a Bitcoin-only address tracker built with React, Vite, Node.js, Express, and Vercel Functions. It lets you paste a public Bitcoin address and inspect live balance data, address type, pending movement, and recent on-chain activity from one dashboard.

## Features

- Live Bitcoin address balance lookup
- Address type detection
- Recent transaction summaries
- Responsive, animated dashboard UI
- Local Express backend for development
- Vercel Functions for production API routes
- One-domain deployment on Vercel

## Tech Stack

- React
- Vite
- Node.js
- Express
- Blockstream Esplora API
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
- `/api/wallet?address=<BITCOIN_ADDRESS>`

## Deployment

This repo is configured for Vercel:

- Static frontend built from `frontend/`
- Serverless API routes in `api/`
- Routing defined in `vercel.json`

Set this environment variable in Vercel:

```env
BITCOIN_API_BASE=https://blockstream.info/api
```

For a full deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).
