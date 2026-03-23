import { fetchBitcoinWalletData } from '../lib/bitcoinTracker.mjs'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('address') || ''

  try {
    const data = await fetchBitcoinWalletData(walletAddress)
    return Response.json(data)
  } catch (error) {
    const status = error.status === 400 || error.status === 404 ? 400 : 500

    return Response.json(
      {
        error:
          status === 400
            ? 'Invalid or unsupported Bitcoin address.'
            : 'Failed to fetch live data from the Bitcoin network.',
      },
      { status },
    )
  }
}
