import { startTransition, useEffect, useState } from 'react'
import './App.css'

const DEFAULT_WALLET = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
const HERO_WORDS = ['whales', 'wallets', 'portfolios', 'on-chain moves']
const SAMPLE_WALLETS = [
  {
    label: 'Sample whale',
    address: DEFAULT_WALLET,
  },
]

let preferredApiBase = null

function formatBalance(balance) {
  return Number(balance).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString()
}

function shortenAddress(address) {
  if (!address) {
    return 'No wallet loaded'
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

function readApiError(error) {
  if (error instanceof Error && error.message) {
    if (error.message === 'Failed to fetch') {
      return 'Could not reach the API. If you are developing locally, start the project from the root folder with npm run dev.'
    }

    return error.message
  }

  return 'Something went wrong while fetching wallet data.'
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

function isInvalidWalletError(error) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return (
    message.includes('invalid solana wallet address') ||
    message.includes('invalid param') ||
    message.includes('base58')
  )
}

async function requestBackendWallet(address) {
  let lastError = null

  for (const base of getApiBases()) {
    try {
      const response = await fetch(
        `${base}/wallet/${encodeURIComponent(address)}`,
      )
      const data = await parseResponse(response)

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Unable to fetch wallet data.',
        )
      }

      preferredApiBase = base

      return {
        data,
        sourceLabel: 'Backend API',
        sourceDetail: 'Fetched through your Express backend.',
      }
    } catch (error) {
      if (isInvalidWalletError(error)) {
        throw error
      }

      lastError = error
    }
  }

  throw lastError || new Error('Unable to fetch wallet data.')
}

async function requestWalletData(address) {
  return requestBackendWallet(address)
}

function App() {
  const [walletAddress, setWalletAddress] = useState(DEFAULT_WALLET)
  const [walletData, setWalletData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [typedWord, setTypedWord] = useState('wallets')
  const [clock, setClock] = useState(new Date())
  const [copyState, setCopyState] = useState('idle')
  const [sourceInfo, setSourceInfo] = useState({
    label: 'Checking source',
    detail: 'Preparing the backend connection.',
    tone: 'checking',
  })

  async function trackWallet(address, options = {}) {
    const trimmedAddress = address.trim()

    if (!trimmedAddress) {
      setWalletData(null)
      setError('Please enter a Solana wallet address.')
      return
    }

    setIsLoading(true)
    setError('')
    setCopyState('idle')

    try {
      const lookup = await requestWalletData(trimmedAddress)

      startTransition(() => {
        setWalletData(lookup.data)
        setSourceInfo({
          label: lookup.sourceLabel,
          detail: lookup.sourceDetail,
          tone: 'backend',
        })
        setError('')
      })
    } catch (requestError) {
      startTransition(() => {
        setWalletData(null)
        setError(readApiError(requestError))
        setSourceInfo({
          label: 'Connection issue',
          detail:
            'The frontend could not talk to your backend API on port 5000.',
          tone: 'error',
        })
      })
    } finally {
      setIsLoading(false)
    }

    if (options.clearInput) {
      setWalletAddress('')
    }
  }

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setClock(new Date())
    }, 1000)

    return () => window.clearInterval(clockInterval)
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
        timeoutId = window.setTimeout(tick, 1100)
        return
      }

      if (isDeleting && characterIndex === 0) {
        isDeleting = false
        wordIndex = (wordIndex + 1) % HERO_WORDS.length
        timeoutId = window.setTimeout(tick, 220)
        return
      }

      timeoutId = window.setTimeout(tick, isDeleting ? 55 : 90)
    }

    timeoutId = window.setTimeout(tick, 250)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    void trackWallet(DEFAULT_WALLET)
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
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <section className="dashboard-frame">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <span className="brand-mark-core" />
            </div>
            <div>
              <p className="brand-name">Soltrace</p>
              <p className="brand-tagline">Live Solana Wallet Tracker</p>
            </div>
          </div>

          <div className="utility-pills">
            <div className={`source-pill ${sourceInfo.tone}`}>{sourceInfo.label}</div>
            <div className="clock-pill">{formatTime(clock)}</div>
          </div>
        </header>

        <section className="hero-grid">
          <div className="hero-copy-block">
            <p className="eyebrow">Solana wallet intelligence</p>
            <h1>
              Monitor <span className="typed-word">{typedWord}</span>
              <br />
              in real time.
            </h1>
            <p className="hero-copy">
              Paste any public Solana address and Soltrace will fetch the live
              SOL balance through your Express backend.
            </p>

            <form className="tracker-form" onSubmit={handleSubmit}>
              <label htmlFor="walletAddress" className="label">
                Wallet address
              </label>

              <div className="input-row">
                <input
                  id="walletAddress"
                  className="wallet-input"
                  type="text"
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  placeholder="Enter a Solana wallet address"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  className="track-button"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Track Wallet'}
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
                      detail: 'Paste a wallet address to begin a new lookup.',
                      tone: 'checking',
                    })
                  }}
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="source-note">
              <span className="source-note-label">Request source</span>
              <p>{sourceInfo.detail}</p>
            </div>

            {error ? (
              <div className="message-card error-message">
                <strong>Lookup failed</strong>
                <p>{error}</p>
              </div>
            ) : null}
          </div>

          <aside className="signal-stage">
            <div className="signal-core-card">
              <p>Live SOL balance</p>
              <strong>
                {walletData ? `${formatBalance(walletData.balance)} SOL` : '--'}
              </strong>
              <span>
                {walletData
                  ? `Updated ${formatTimestamp(walletData.timestamp)}`
                  : 'Run a wallet lookup to load live data'}
              </span>
            </div>

            <div className="float-card float-card-one">
              <span>Tracked wallet</span>
              <strong>{shortenAddress(walletData?.walletAddress)}</strong>
            </div>

            <div className="float-card float-card-two">
              <span>Network</span>
              <strong>{walletData?.network || 'mainnet-beta'}</strong>
            </div>

            <div className="float-card float-card-three">
              <span>Mode</span>
              <strong>{sourceInfo.label}</strong>
            </div>
          </aside>
        </section>

        <section className="results-grid">
          <article className="panel panel-balance">
            <p className="panel-label">Balance</p>
            <h2>
              {walletData ? `${formatBalance(walletData.balance)} SOL` : '--'}
            </h2>
            <p className="panel-text">
              Live balance for the wallet currently loaded in the tracker.
            </p>
          </article>

          <article className="panel">
            <p className="panel-label">Source</p>
            <h3>{sourceInfo.label}</h3>
            <p className="panel-text">{sourceInfo.detail}</p>
          </article>

          <article className="panel">
            <p className="panel-label">Wallet</p>
            <code className="address-block">
              {walletData?.walletAddress || 'No wallet loaded yet.'}
            </code>
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
          </article>

          <article className="panel">
            <p className="panel-label">Updated</p>
            <h3>{walletData ? formatTimestamp(walletData.timestamp) : '--'}</h3>
            <p className="panel-text">
              The tracker stamps each successful lookup with its latest fetch
              time.
            </p>
          </article>
        </section>
      </section>
    </main>
  )
}

export default App
