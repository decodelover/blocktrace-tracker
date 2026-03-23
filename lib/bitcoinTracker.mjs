const DEFAULT_BITCOIN_API_BASE = 'https://blockstream.info/api'
const SATOSHIS_PER_BTC = 100_000_000n

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

function toSatsBigInt(value) {
  try {
    return BigInt(value ?? 0)
  } catch {
    return 0n
  }
}

function toSafeSatsNumber(value) {
  return Number(toSatsBigInt(value))
}

function toBtcString(value) {
  const satoshis = toSatsBigInt(value)
  const isNegative = satoshis < 0n
  const absoluteValue = isNegative ? -satoshis : satoshis
  const whole = absoluteValue / SATOSHIS_PER_BTC
  const fraction = (absoluteValue % SATOSHIS_PER_BTC)
    .toString()
    .padStart(8, '0')

  return `${isNegative ? '-' : ''}${whole}.${fraction}`
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
      ? total + toSatsBigInt(output.value)
      : total
  }, 0n)

  const sentSats = (transaction.vin || []).reduce((total, input) => {
    return input.prevout?.scriptpubkey_address === address
      ? total + toSatsBigInt(input.prevout.value)
      : total
  }, 0n)

  const netSats = receivedSats - sentSats
  const feeSats = toSatsBigInt(transaction.fee)

  return {
    txid: transaction.txid,
    direction:
      netSats > 0 ? 'received' : netSats < 0 ? 'sent' : 'internal',
    netSats: toSafeSatsNumber(netSats),
    netBtc: toBtcString(netSats),
    feeSats: toSafeSatsNumber(feeSats),
    feeBtc: toBtcString(feeSats),
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
  const [addressData, recentTransactionsResponse, utxos] = await Promise.all([
    fetchBitcoinApi(`/address/${encodeURIComponent(address)}`, apiBase),
    fetchBitcoinApi(`/address/${encodeURIComponent(address)}/txs`, apiBase).catch(
      () => [],
    ),
    fetchBitcoinApi(`/address/${encodeURIComponent(address)}/utxo`, apiBase),
  ])

  const chainStats = addressData.chain_stats || {}
  const mempoolStats = addressData.mempool_stats || {}
  const totalReceivedSats =
    toSatsBigInt(chainStats.funded_txo_sum) +
    toSatsBigInt(mempoolStats.funded_txo_sum)
  const totalSpentSats =
    toSatsBigInt(chainStats.spent_txo_sum) +
    toSatsBigInt(mempoolStats.spent_txo_sum)
  const fundedOutputs =
    toSafeSatsNumber(chainStats.funded_txo_count) +
    toSafeSatsNumber(mempoolStats.funded_txo_count)
  const spentOutputs =
    toSafeSatsNumber(chainStats.spent_txo_count) +
    toSafeSatsNumber(mempoolStats.spent_txo_count)
  const confirmedSats = Array.isArray(utxos)
    ? utxos.reduce((total, utxo) => {
        return utxo.status?.confirmed
          ? total + toSatsBigInt(utxo.value)
          : total
      }, 0n)
    : 0n
  const unconfirmedSats = Array.isArray(utxos)
    ? utxos.reduce((total, utxo) => {
        return utxo.status?.confirmed
          ? total
          : total + toSatsBigInt(utxo.value)
      }, 0n)
    : 0n
  const totalSats = confirmedSats + unconfirmedSats

  return {
    success: true,
    walletAddress: addressData.address || address,
    network: 'bitcoin-mainnet',
    source: 'Blockstream Esplora',
    sourceUrl: normaliseApiBase(apiBase),
    addressType: inferAddressType(addressData.address || address),
    balances: {
      confirmedSats: toSafeSatsNumber(confirmedSats),
      unconfirmedSats: toSafeSatsNumber(unconfirmedSats),
      totalSats: toSafeSatsNumber(totalSats),
      confirmedBtc: toBtcString(confirmedSats),
      unconfirmedBtc: toBtcString(unconfirmedSats),
      totalBtc: toBtcString(totalSats),
    },
    activity: {
      confirmedTxCount: chainStats.tx_count || 0,
      mempoolTxCount: mempoolStats.tx_count || 0,
      fundedOutputs,
      spentOutputs,
      totalReceivedSats: toSafeSatsNumber(totalReceivedSats),
      totalSpentSats: toSafeSatsNumber(totalSpentSats),
      totalReceivedBtc: toBtcString(totalReceivedSats),
      totalSpentBtc: toBtcString(totalSpentSats),
    },
    recentTransactions: Array.isArray(recentTransactionsResponse)
      ? recentTransactionsResponse.slice(0, 6).map((transaction) => {
          return summariseTransaction(transaction, addressData.address || address)
        })
      : [],
    timestamp: new Date().toISOString(),
  }
}
