# Blocktrace Deployment

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
BITCOIN_API_BASE=https://blockstream.info/api
```

For production, you can replace the public Blockstream API base URL with your preferred Bitcoin data provider if needed.

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
docker build -t blocktrace .
```

Run the container:

```bash
docker run -p 5000:5000 --env-file backend/.env blocktrace
```

Then open:

```text
http://localhost:5000
```

## Hosting notes

Use a host that can run a Docker container or a Node.js web service.

The deployed app needs:

- port binding through `PORT`
- access to `BITCOIN_API_BASE`
- outbound internet access so the backend can talk to the Bitcoin data source

## Vercel deployment

Push the repo to GitHub, then import it into Vercel.

Project settings:

- Framework preset: Other
- Root directory: project root

Environment variables:

```env
BITCOIN_API_BASE=https://blockstream.info/api
```

You can also use your own Bitcoin indexer or API base instead of the public Blockstream endpoint.

Vercel will:

- install root and app dependencies with `vercel.json`
- build the frontend into `frontend/dist`
- serve the frontend as a static site
- run `/api/status` and `/api/wallet` as Vercel Functions
