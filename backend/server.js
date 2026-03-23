import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchBitcoinWalletData } from '../lib/bitcoinTracker.mjs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000
const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist')
const hasFrontendBuild = fs.existsSync(frontendDistPath)

app.use(cors())
app.use(express.json())

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Blocktrace Bitcoin backend is live.',
    network: 'bitcoin-mainnet',
    source: 'Blockstream Esplora',
  })
})

app.get('/api/wallet/:address', async (req, res) => {
  try {
    const data = await fetchBitcoinWalletData(req.params.address)
    return res.json(data)
  } catch (error) {
    const status = error.status === 400 || error.status === 404 ? 400 : 500

    return res.status(status).json({
      error:
        status === 400
          ? 'Invalid or unsupported Bitcoin address.'
          : 'Failed to fetch live data from the Bitcoin network.',
    })
  }
})

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath))

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Blocktrace backend is running on port ${PORT}`)
})
