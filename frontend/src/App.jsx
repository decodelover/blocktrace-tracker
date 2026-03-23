import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react'
import './App.css'

const DEFAULT_WALLET = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
const HERO_WORDS = ['UTXOs', 'satoshis', 'balances', 'mempool']
const SAMPLE_WALLETS = [
  {
    label: 'Legacy sample',
    address: DEFAULT_WALLET,
  },
]

let preferredApiBase = null

function formatBtc(amount) {
  const value = String(amount ?? '0').trim()

  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    return value || '0'
  }

  const isNegative = value.startsWith('-')
  const unsignedValue = isNegative ? value.slice(1) : value
  const [wholePart, fractionPart = ''] = unsignedValue.split('.')
  const groupedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const trimmedFraction = fractionPart.replace(/0+$/, '')

  return `${isNegative ? '-' : ''}${groupedWhole}${
    trimmedFraction ? `.${trimmedFraction}` : ''
  }`
}

function formatSats(amount) {
  const value = String(amount ?? '0').trim()

  if (!/^-?\d+$/.test(value)) {
    return value || '0'
  }

  const isNegative = value.startsWith('-')
  const digits = isNegative ? value.slice(1) : value
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${isNegative ? '-' : ''}${grouped}`
}

function formatDateTime(value) {
  if (!value) {
    return 'Pending'
  }

  return new Date(value).toLocaleString()
}

function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatRelativeTime(value) {
  if (!value) {
    return 'Unconfirmed'
  }

  const diffSeconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }

  const diffMinutes = Math.floor(diffSeconds / 60)

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function shortenHash(value) {
  if (!value) {
    return 'Not available'
  }

  return `${value.slice(0, 8)}...${value.slice(-8)}`
}

function readApiError(error) {
  if (error instanceof Error && error.message) {
    if (error.message === 'Failed to fetch') {
      return 'Could not reach the Bitcoin API. If you are working locally, start the project from the root folder with npm run dev.'
    }

    return error.message
  }

  return 'Something went wrong while fetching Bitcoin wallet data.'
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

function getApiBases() {
  const bases = []

  if (preferredApiBase) {
    bases.push(preferredApiBase)
  }

  bases.push('/api')

  if (typeof window !== 'undefined') {
    const { hostname } = window.location

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      bases.push('http://127.0.0.1:5000/api')
      bases.push('http://localhost:5000/api')
    }
  }

  return [...new Set(bases)]
}

async function requestWalletData(address) {
  let lastError = null

  for (const base of getApiBases()) {
    try {
      const response = await fetch(
        `${base}/wallet/${encodeURIComponent(address)}`,
      )
      const data = await parseResponse(response)

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Unable to fetch Bitcoin wallet data.',
        )
      }

      preferredApiBase = base
      return data
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Unable to fetch Bitcoin wallet data.')
}

function App() {
  const hasTriggeredInitialLookup = useRef(false)
  const [walletAddress, setWalletAddress] = useState(DEFAULT_WALLET)
  const [walletData, setWalletData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasBooted, setHasBooted] = useState(false)
  const [error, setError] = useState('')
  const [typedWord, setTypedWord] = useState('UTXOs')
  const [clock, setClock] = useState(new Date())
  const [copyState, setCopyState] = useState('idle')
  const [sourceInfo, setSourceInfo] = useState({
    label: 'Waiting for scan',
    detail: 'Blocktrace is ready to inspect a Bitcoin address.',
    tone: 'neutral',
  })

  async function trackWallet(address) {
    const trimmedAddress = address.trim()

    if (!trimmedAddress) {
      setWalletData(null)
      setError('Please enter a Bitcoin wallet address.')
      return
    }

    setIsLoading(true)
    setError('')
    setCopyState('idle')

    try {
      const data = await requestWalletData(trimmedAddress)

      startTransition(() => {
        setWalletData(data)
        setSourceInfo({
          label: data.source || 'Bitcoin API',
          detail: `Live address data fetched from ${data.sourceUrl}.`,
          tone: 'live',
        })
        setError('')
      })
    } catch (requestError) {
      startTransition(() => {
        setWalletData(null)
        setError(readApiError(requestError))
        setSourceInfo({
          label: 'Scan failed',
          detail:
            'Blocktrace could not load this address. Check the address format or your API connection.',
          tone: 'error',
        })
      })
    } finally {
      setIsLoading(false)

      if (!hasBooted) {
        setHasBooted(true)
      }
    }
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClock(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let wordIndex = 0
    let characterIndex = 0
    let isDeleting = false
    let timeoutId

    const tick = () => {
      const currentWord = HERO_WORDS[wordIndex]

      if (isDeleting) {
        characterIndex -= 1
      } else {
        characterIndex += 1
      }

      setTypedWord(currentWord.slice(0, characterIndex))

      if (!isDeleting && characterIndex === currentWord.length) {
        isDeleting = true
        timeoutId = window.setTimeout(tick, 1000)
        return
      }

      if (isDeleting && characterIndex === 0) {
        isDeleting = false
        wordIndex = (wordIndex + 1) % HERO_WORDS.length
        timeoutId = window.setTimeout(tick, 180)
        return
      }

      timeoutId = window.setTimeout(tick, isDeleting ? 45 : 80)
    }

    timeoutId = window.setTimeout(tick, 250)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const runInitialLookup = useEffectEvent(() => {
    void trackWallet(DEFAULT_WALLET)
  })

  useEffect(() => {
    if (hasTriggeredInitialLookup.current) {
      return
    }

    hasTriggeredInitialLookup.current = true
    runInitialLookup()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    await trackWallet(walletAddress)
  }

  async function handleSampleWallet(address) {
    setWalletAddress(address)
    await trackWallet(address)
  }

  async function handleCopyAddress() {
    if (!walletData?.walletAddress) {
      return
    }

    try {
      await navigator.clipboard.writeText(walletData.walletAddress)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <main className="app-shell">
      {!hasBooted ? (
        <div className="app-loader" role="status" aria-live="polite">
          <div className="loader-panel">
            <div className="loader-emblem">
              <span className="loader-ring loader-ring-primary" />
              <span className="loader-ring loader-ring-secondary" />
              <span className="loader-core">B</span>
            </div>
            <p className="loader-kicker">Blocktrace</p>
            <h2>Parsing Bitcoin address state</h2>
            <p>Warming up the tracker, syncing sats, and preparing your first scan.</p>
          </div>
        </div>
      ) : null}

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <section className="dashboard-frame">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <span className="brand-mark-core">B</span>
            </div>
            <div>
              <p className="brand-name">Blocktrace</p>
              <p className="brand-tagline">Bitcoin Address Intelligence</p>
            </div>
          </div>

          <div className="utility-pills">
            <div className={`status-pill ${sourceInfo.tone}`}>{sourceInfo.label}</div>
            <div className="clock-pill">{formatClock(clock)}</div>
          </div>
        </header>

        <section className="hero-grid">
          <div className="hero-copy-block">
            <p className="eyebrow">Bitcoin tracker</p>
            <h1>
              Scan <span className="typed-word">{typedWord}</span>
              <br />
              with on-chain clarity.
            </h1>
            <p className="hero-copy">
              Blocktrace is a Bitcoin-only wallet tracker for inspecting address
              balances, pending movement, and recent transaction flow from one
              sharp dashboard.
            </p>

            <form className="tracker-form" onSubmit={handleSubmit}>
              <label htmlFor="walletAddress" className="label">
                Bitcoin address
              </label>

              <div className="input-row">
                <input
                  id="walletAddress"
                  className="wallet-input"
                  type="text"
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  placeholder="Enter a Bitcoin address"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  className="track-button"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="button-loader" aria-hidden="true" />
                      Scanning...
                    </>
                  ) : (
                    'Track Address'
                  )}
                </button>
              </div>

              <div className="shortcut-row">
                {SAMPLE_WALLETS.map((wallet) => (
                  <button
                    key={wallet.label}
                    type="button"
                    className="shortcut-chip"
                    onClick={() => void handleSampleWallet(wallet.address)}
                  >
                    {wallet.label}
                  </button>
                ))}

                <button
                  type="button"
                  className="shortcut-chip subtle"
                  onClick={() => {
                    setWalletAddress('')
                    setWalletData(null)
                    setError('')
                    setSourceInfo({
                      label: 'Ready',
                      detail: 'Paste a Bitcoin address to begin a new scan.',
                      tone: 'neutral',
                    })
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="source-note">
              <span className="source-note-label">Data source</span>
              <p>{sourceInfo.detail}</p>
            </div>

            {isLoading && hasBooted ? (
              <div className="lookup-loader" role="status" aria-live="polite">
                <span className="lookup-loader-dot" />
                <span>Scanning the address and recent UTXO movement...</span>
              </div>
            ) : null}

            {error ? (
              <div className="message-card error-message">
                <strong>Address lookup failed</strong>
                <p>{error}</p>
              </div>
            ) : null}
          </div>

          <aside className="signal-stage">
            <div className={`signal-core-card ${isLoading ? 'is-loading' : ''}`}>
              <p>Total balance</p>
              <strong>
                {walletData ? `${formatBtc(walletData.balances.totalBtc)} BTC` : '--'}
              </strong>
              <span>
                {walletData
                  ? `${formatSats(walletData.balances.totalSats)} sats`
                  : 'Awaiting first scan'}
              </span>
            </div>

            <div className="float-card float-card-one">
              <span>Address type</span>
              <strong>{walletData?.addressType || 'Bitcoin Address'}</strong>
            </div>

            <div className="float-card float-card-two">
              <span>Recent activity</span>
              <strong>
                {walletData
                  ? `${walletData.activity.confirmedTxCount} confirmed txs`
                  : 'No snapshot yet'}
              </strong>
            </div>

            <div className="float-card float-card-three">
              <span>Network</span>
              <strong>{walletData?.network || 'bitcoin-mainnet'}</strong>
            </div>
          </aside>
        </section>

        <section className="stats-grid">
          <article className="metric-card accent">
            <p>Confirmed</p>
            <strong>
              {walletData ? `${formatBtc(walletData.balances.confirmedBtc)} BTC` : '--'}
            </strong>
            <span>
              {walletData
                ? `${formatSats(walletData.balances.confirmedSats)} sats`
                : 'Confirmed on-chain balance'}
            </span>
          </article>

          <article className="metric-card">
            <p>Pending</p>
            <strong>
              {walletData ? `${formatBtc(walletData.balances.unconfirmedBtc)} BTC` : '--'}
            </strong>
            <span>
              {walletData
                ? `${walletData.activity.mempoolTxCount} mempool txs`
                : 'Unconfirmed movement'}
            </span>
          </article>

          <article className="metric-card">
            <p>Total received</p>
            <strong>
              {walletData ? `${formatBtc(walletData.activity.totalReceivedBtc)} BTC` : '--'}
            </strong>
            <span>
              {walletData
                ? `${formatSats(walletData.activity.totalReceivedSats)} sats`
                : 'Historical inflow'}
            </span>
          </article>

          <article className="metric-card">
            <p>Total spent</p>
            <strong>
              {walletData ? `${formatBtc(walletData.activity.totalSpentBtc)} BTC` : '--'}
            </strong>
            <span>
              {walletData
                ? `${walletData.activity.spentOutputs} spent outputs`
                : 'Historical outflow'}
            </span>
          </article>
        </section>

        <section className="results-grid">
          <article className="panel panel-wide">
            <div className="panel-head">
              <div>
                <p className="panel-label">Address snapshot</p>
                <h3>{walletData?.walletAddress || 'No address scanned yet'}</h3>
              </div>

              <button
                type="button"
                className="ghost-button"
                onClick={() => void handleCopyAddress()}
                disabled={!walletData?.walletAddress}
              >
                {copyState === 'copied'
                  ? 'Copied'
                  : copyState === 'failed'
                    ? 'Copy failed'
                    : 'Copy address'}
              </button>
            </div>

            <code className="address-block">
              {walletData?.walletAddress || 'Paste a Bitcoin address to inspect it.'}
            </code>

            <div className="detail-row">
              <span>Last updated</span>
              <strong>{walletData ? formatDateTime(walletData.timestamp) : '--'}</strong>
            </div>

            <div className="detail-row">
              <span>Tracker source</span>
              <strong>{walletData?.source || 'Blocktrace API'}</strong>
            </div>
          </article>

          <article className="panel">
            <p className="panel-label">Network health</p>
            <h3>{walletData?.network || 'bitcoin-mainnet'}</h3>
            <p className="panel-text">
              {walletData
                ? `${walletData.activity.confirmedTxCount} confirmed transactions with ${walletData.activity.mempoolTxCount} pending in mempool.`
                : 'Once scanned, this panel summarizes the address activity footprint.'}
            </p>
          </article>
        </section>

        <section className="transactions-panel">
          <div className="panel-head">
            <div>
              <p className="panel-label">Recent activity</p>
              <h3>Latest Bitcoin transactions</h3>
            </div>
            <span className="transactions-count">
              {walletData?.recentTransactions?.length || 0} items
            </span>
          </div>

          {walletData?.recentTransactions?.length ? (
            <div className="transactions-list">
              {walletData.recentTransactions.map((transaction) => (
                <article key={transaction.txid} className="transaction-card">
                  <div className="transaction-top">
                    <span
                      className={`tx-direction ${transaction.direction}`}
                    >
                      {transaction.direction}
                    </span>
                    <strong>{shortenHash(transaction.txid)}</strong>
                  </div>

                  <div className="transaction-values">
                    <div>
                      <span>Net value</span>
                      <strong>
                        {transaction.netSats >= 0 ? '+' : '-'}
                        {formatBtc(Math.abs(transaction.netBtc))} BTC
                      </strong>
                    </div>

                    <div>
                      <span>Fee</span>
                      <strong>{formatSats(transaction.feeSats)} sats</strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {transaction.confirmed
                          ? `Confirmed ${formatRelativeTime(transaction.timestamp)}`
                          : 'Pending'}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-transactions">
              <p>No recent transactions available for this address yet.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
