const DEFAULT_BITCOIN_API_BASE = 'https://blockstream.info/api'
const SATOSHIS_PER_BTC = 100_000_000

function normaliseApiBase(apiBase = DEFAULT_BITCOIN_API_BASE) {
  return apiBase.replace(/\/+$/, '')
}

async function parseResponse(response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function fetchBitcoinApi(path, apiBase) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${normaliseApiBase(apiBase)}${path}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    const data = await parseResponse(response)

    if (!response.ok) {
      const error = new Error(
        data.error ||
          data.message ||
          `Bitcoin API request failed with status ${response.status}.`,
      )

      error.status = response.status
      throw error
    }

    return data
  } finally {
    clearTimeout(timeoutId)
  }
}

function toBtc(satoshis) {
  return Number((satoshis / SATOSHIS_PER_BTC).toFixed(8))
}

function inferAddressType(address) {
  if (address.startsWith('bc1p')) {
    return 'Taproot'
  }

  if (address.startsWith('bc1q')) {
    return 'Native SegWit'
  }

  if (address.startsWith('3')) {
    return 'Script Hash'
  }

  if (address.startsWith('1')) {
    return 'Legacy'
  }

  return 'Bitcoin Address'
}

function summariseTransaction(transaction, address) {
  const receivedSats = (transaction.vout || []).reduce((total, output) => {
    return output.scriptpubkey_address === address
      ? total + (output.value || 0)
      : total
  }, 0)

  const sentSats = (transaction.vin || []).reduce((total, input) => {
    return input.prevout?.scriptpubkey_address === address
      ? total + (input.prevout.value || 0)
      : total
  }, 0)

  const netSats = receivedSats - sentSats

  return {
    txid: transaction.txid,
    direction:
      netSats > 0 ? 'received' : netSats < 0 ? 'sent' : 'internal',
    netSats,
    netBtc: toBtc(netSats),
    feeSats: transaction.fee || 0,
    feeBtc: toBtc(transaction.fee || 0),
    confirmed: Boolean(transaction.status?.confirmed),
    blockHeight: transaction.status?.block_height || null,
    timestamp: transaction.status?.block_time
      ? new Date(transaction.status.block_time * 1000).toISOString()
      : null,
  }
}

export async function fetchBitcoinWalletData(
  address,
  apiBase = process.env.BITCOIN_API_BASE || DEFAULT_BITCOIN_API_BASE,
) {
  const [addressData, recentTransactionsResponse] = await Promise.all([
    fetchBitcoinApi(`/address/${encodeURIComponent(address)}`, apiBase),
    fetchBitcoinApi(`/address/${encodeURIComponent(address)}/txs`, apiBase).catch(
      () => [],
    ),
  ])

  const chainStats = addressData.chain_stats || {}
  const mempoolStats = addressData.mempool_stats || {}

  const confirmedSats =
    (chainStats.funded_txo_sum || 0) - (chainStats.spent_txo_sum || 0)
  const unconfirmedSats =
    (mempoolStats.funded_txo_sum || 0) - (mempoolStats.spent_txo_sum || 0)
  const totalSats = confirmedSats + unconfirmedSats

  return {
    success: true,
    walletAddress: addressData.address || address,
    network: 'bitcoin-mainnet',
    source: 'Blockstream Esplora',
    sourceUrl: normaliseApiBase(apiBase),
    addressType: inferAddressType(addressData.address || address),
    balances: {
      confirmedSats,
      unconfirmedSats,
      totalSats,
      confirmedBtc: toBtc(confirmedSats),
      unconfirmedBtc: toBtc(unconfirmedSats),
      totalBtc: toBtc(totalSats),
    },
    activity: {
      confirmedTxCount: chainStats.tx_count || 0,
      mempoolTxCount: mempoolStats.tx_count || 0,
      fundedOutputs: chainStats.funded_txo_count || 0,
      spentOutputs: chainStats.spent_txo_count || 0,
      totalReceivedSats: chainStats.funded_txo_sum || 0,
      totalSpentSats: chainStats.spent_txo_sum || 0,
      totalReceivedBtc: toBtc(chainStats.funded_txo_sum || 0),
      totalSpentBtc: toBtc(chainStats.spent_txo_sum || 0),
    },
    recentTransactions: Array.isArray(recentTransactionsResponse)
      ? recentTransactionsResponse.slice(0, 6).map((transaction) => {
          return summariseTransaction(transaction, addressData.address || address)
        })
      : [],
    timestamp: new Date().toISOString(),
  }
}
