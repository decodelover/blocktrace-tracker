const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} = require('@solana/web3.js')

require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000
const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist')
const hasFrontendBuild = fs.existsSync(frontendDistPath)

app.use(cors())
app.use(express.json())

const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
  'confirmed',
)

app.get('/api/status', (req, res) => {
  res.json({ message: 'Soltrace backend is live and tracking.' })
})

app.get('/api/wallet/:address', async (req, res) => {
  try {
    const walletAddress = req.params.address

    let publicKey

    try {
      publicKey = new PublicKey(walletAddress)
    } catch {
      return res.status(400).json({
        error: 'Invalid Solana wallet address. Please check your entry.',
      })
    }

    const balanceInLamports = await solanaConnection.getBalance(publicKey)
    const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL

    return res.json({
      success: true,
      walletAddress: publicKey.toString(),
      balance: balanceInSol,
      network: 'mainnet-beta',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Soltrace tracking error:', error)

    return res.status(500).json({
      error: 'Failed to fetch live data from the Solana blockchain.',
    })
  }
})

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath))

  // Serve the React app for every non-API route in production.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Soltrace backend is running on port ${PORT}`)
})
