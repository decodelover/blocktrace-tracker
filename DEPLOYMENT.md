# Soltrace Deployment

This project is set up to deploy as a single service:

- Express serves the API
- Express also serves the built React frontend
- No database is required

It is also prepared for Vercel:

- Vite builds the frontend from `frontend/`
- Vercel Functions handle the API from `api/`
- `vercel.json` routes wallet requests and supports SPA navigation

## Environment variables

Create `backend/.env` from `backend/.env.example`.

Required values:

```env
PORT=5000
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

For production, it is better to replace the public RPC URL with your own provider URL.

## Local development

From the project root:

```bash
npm run setup
npm run dev
```

## Local production test

Build the frontend and run the backend as a production server:

```bash
npm run build
npm start
```

Then open:

```text
http://localhost:5000
```

## Docker deployment

Build the image:

```bash
docker build -t soltrace .
```

Run the container:

```bash
docker run -p 5000:5000 --env-file backend/.env soltrace
```

Then open:

```text
http://localhost:5000
```

## Hosting notes

Use a host that can run a Docker container or a Node.js web service.

The deployed app needs:

- port binding through `PORT`
- access to `SOLANA_RPC_URL`
- outbound internet access so the backend can talk to Solana

## Vercel deployment

Push the repo to GitHub, then import it into Vercel.

Project settings:

- Framework preset: Other
- Root directory: project root

Environment variables:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

You can also use your own RPC provider URL instead of the public endpoint.

Vercel will:

- install root and app dependencies with `vercel.json`
- build the frontend into `frontend/dist`
- serve the frontend as a static site
- run `/api/status` and `/api/wallet` as Vercel Functions
