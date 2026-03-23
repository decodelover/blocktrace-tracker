import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js'

const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
  'confirmed',
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('address') || ''

  let publicKey

  try {
    publicKey = new PublicKey(walletAddress)
  } catch {
    return Response.json(
      {
        error: 'Invalid Solana wallet address. Please check your entry.',
      },
      { status: 400 },
    )
  }

  try {
    const balanceInLamports = await solanaConnection.getBalance(publicKey)

    return Response.json({
      success: true,
      walletAddress: publicKey.toString(),
      balance: balanceInLamports / LAMPORTS_PER_SOL,
      network: 'mainnet-beta',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Vercel wallet lookup error:', error)

    return Response.json(
      {
        error: 'Failed to fetch live data from the Solana blockchain.',
      },
      { status: 500 },
    )
  }
}
