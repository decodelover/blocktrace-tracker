export function GET() {
  return Response.json({
    message: 'Blocktrace Bitcoin API is live.',
    network: 'bitcoin-mainnet',
    source: 'Blockstream Esplora',
  })
}
