<h1 align="center">▲ gasburn</h1>

<p align="center">See where your AI agent tokens <em>and</em> on-chain gas actually go.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/gasburn"><img src="https://img.shields.io/npm/v/gasburn.svg" alt="npm version" /></a>
  <a href="https://github.com/QBe1n/gasburn/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/gasburn.svg" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="node version" />
  <img src="https://img.shields.io/badge/status-alpha-orange.svg" alt="alpha" />
</p>

Interactive TUI dashboard for **autonomous crypto agents**. Tracks LLM spend and on-chain gas side by side, classifies turns into 8 agent-native categories, and flags leaks — sessions that burn money with nothing to show for it.

Works with **Eliza**, **LangGraph**, any **OpenAI-compatible proxy** (LiteLLM, OpenRouter), and any custom agent via a simple JSONL log. Pulls gas history from **Ethereum, Base, Arbitrum, Optimism, Polygon** (Etherscan V2) and **Solana** (Helius).

No wrappers. No proxies injected into your agent. No private keys. Reads local session data and public on-chain history only.

## Install

```bash
npm install -g gasburn
```

Or run without installing:

```bash
npx gasburn
```

### Requirements

- Node.js 20+
- At least one of: Eliza (`~/.eliza/memories.sqlite`), LangGraph (`.langgraph_api/checkpoints.sqlite`), LiteLLM/OpenRouter request log, or a JSONL log at `~/.gasburn/logs/`
- Optional: an Etherscan V2 API key (free) for EVM gas history, a Helius API key (free) for Solana

## Quick start

```bash
# see which providers gasburn detects on your machine
gasburn providers

# add a wallet (your agent's wallet, one per command)
gasburn wallet add 0xabc...def ethereum -l "main-bot"
gasburn wallet add FxKe...2j  solana   -l "sol-sniper"

# save your free API keys
gasburn key set etherscan YOUR_KEY
gasburn key set helius    YOUR_KEY

# open the dashboard (default: last 7 days)
gasburn

# just today's numbers
gasburn today

# leak detector only
gasburn leaks -p 30d

# machine-readable output
gasburn report -p 7d --format json  | jq .totals
gasburn export  -p 30d -f csv       > burn.csv
```

Arrow keys switch between Today / 7 Days / 30 Days / Month / All. Press `1` — `5` as shortcuts. Press `q` to quit.

## What it tracks

**8 agent-native task categories**, classified from tool names and user-message keywords. No LLM calls, fully deterministic.

| Category | What triggers it |
|---|---|
| Trade Execution | `swap`, `execute_trade`, `uniswap`, `jupiter`, or keywords like "buy/sell/long/short" |
| Contract Write | `sendTransaction`, `approve`, `mint`, `stake`, `bridge` |
| Contract Read | `eth_call`, `getBalance`, "balance/allowance/total supply" |
| Wallet Ops | `createKey`, `sign_message`, "new wallet / import key" |
| Market Research | `dexscreener`, `birdeye`, `coingecko`, `defillama`, "price of", "tvl", "is X legit" |
| Social Post | `twitter_post`, `telegram_send`, `farcaster`, "tweet / shill / announce" |
| Strategy | "strategy / plan / backtest / rebalance / position size" |
| Idle Chat | no tools, no action keywords |

**Breakdowns**: daily cost chart (LLM vs gas, side by side), per-category, per-model, per-wallet across chains, top 5 most expensive sessions tying LLM spend to the tx hashes they produced.

## Leak detector

The killer feature. Rule-based scans that surface money you shouldn't be spending.

| ID | What it catches |
|---|---|
| `idle-chat` | Sessions where >70% of turns are pure conversation with zero tool calls, but still rack up real cost |
| `oversized-model` | Opus/GPT-5 used on tiny turns (<300 input tokens, no tools) where Sonnet or gpt-5-mini would do |
| `failed-txs` | On-chain transactions that paid gas and reverted |
| `research-no-action` | Sessions with 5+ market-research turns, zero trade/write turns, **zero on-chain txs** in the window — your agent researched and did nothing |
| `overpaid-gas` | Transactions that paid 3×+ median gas for the chain in the window (agent using static fees instead of EIP-1559 estimation) |

Each finding ships with estimated wasted dollars, evidence (session IDs, tx hashes), and a copy-paste fix. Run `gasburn leaks` standalone or view inline in the TUI.

## Supported providers

| Provider | Data location | Status |
|---|---|---|
| Eliza | `~/.eliza/memories.sqlite` | Supported |
| LangGraph (SqliteSaver) | `.langgraph_api/checkpoints.sqlite` | Supported |
| OpenAI-compatible proxy (LiteLLM, OpenRouter, custom) | `~/.gasburn/openai-proxy.jsonl`, `~/.litellm/requests.jsonl` | Supported |
| Generic JSONL (any custom agent) | `~/.gasburn/logs/*.jsonl` | Supported |
| Virtuals | — | Planned |
| Griffain | — | Planned |
| arc | — | Planned |

### Generic JSONL format

Any custom agent can plug in by writing one line per turn to `~/.gasburn/logs/<anything>.jsonl`:

```json
{"session_id":"abc","timestamp":"2026-04-18T09:00:00Z","model":"claude-sonnet-4-5","user_message":"swap eth for usdc","input_tokens":400,"output_tokens":180,"tools":["uniswap","execute_trade"],"wallets":["0xabc..."]}
```

Fields: `session_id`, `timestamp` (ISO or unix), `model`, `user_message`, `input_tokens`, `output_tokens`, optional `cache_read_tokens`, `cache_write_tokens`, `tools: string[]`, `wallets: string[]`.

## On-chain gas

gasburn uses the **Etherscan V2** unified API (one endpoint, one key, all major EVM chains) and the **Helius** enhanced transactions API for Solana. Both have free tiers. No private keys are ever touched.

```bash
gasburn wallet add 0x... ethereum
gasburn wallet add 0x... base
gasburn wallet add 0x... arbitrum
gasburn wallet add 0x... optimism
gasburn wallet add 0x... polygon
gasburn wallet add FxK... solana
```

Native token prices for USD conversion come from CoinGecko and are cached locally for 1 hour.

## How it reads data

gasburn parses session data directly from disk — JSONL files or SQLite DBs depending on the provider — then reconciles each session's on-chain activity by matching its linked wallet addresses against public transaction history over the same time window. No wrapper around your agent, no proxy, no API keys needed to read local data. You only need Etherscan/Helius keys if you want live on-chain history.

## Project structure

```
src/
  cli.ts              Commander.js entry point (report, today, leaks, export, wallet, key, providers)
  dashboard.tsx       Ink TUI (React for terminals)
  aggregate.ts        Period filtering + rollups
  classifier.ts       8-category agent-native classifier
  pricing.ts          LLM price table (override with GASBURN_PRICING env var)
  leaks.ts            Leak detector rules
  export.ts           CSV / JSON exporters
  config.ts           ~/.config/gasburn/config.json
  types.ts            Shared types
  gas/
    index.ts          Unified fetcher
    evm.ts            Etherscan V2 (Ethereum, Base, Arbitrum, Optimism, Polygon)
    solana.ts         Helius enhanced transactions
    prices.ts         Native-token USD, 1h cached
  providers/
    types.ts          Provider interface
    index.ts          Registry
    eliza.ts          Eliza SQLite
    langgraph.ts      LangGraph SqliteSaver
    openai-proxy.ts   LiteLLM / OpenRouter / custom proxy logs
    generic-jsonl.ts  Universal JSONL escape hatch
```

## Adding a provider

The provider plugin system makes adding a new agent runtime a single file. Implement:

```ts
interface Provider {
  id: ProviderId
  name: string
  defaultPaths(): string[]
  isAvailable(paths?: string[]): boolean
  loadSessions(paths?: string[]): Promise<AgentSession[]>
}
```

See `src/providers/eliza.ts` for an example that reads a SQLite DB and normalizes it into the shared `AgentSession` shape. PRs welcome.

## Roadmap

- Virtuals / Griffain / arc native providers
- Web dashboard (shareable links, team mode)
- "Cost per profitable trade" metric (ties sessions to realized PnL)
- Telegram bot: ping when daily burn crosses a threshold
- Gas-price oracle recommendation based on your wallet's historical overpayment
- Windows / Linux tray companion

## License

MIT

## Credits

Architecturally inspired by [codeburn](https://github.com/AgentSeal/codeburn) (the AI coding cost TUI). gasburn takes that lens — local data, zero config, interactive TUI, rule-based leak detector — and points it at autonomous crypto agents instead of coding agents. Different data sources, different category model, different leak rules; same love of pure-local observability.

Pricing inspired by [LiteLLM](https://github.com/BerriAI/litellm). Gas data via [Etherscan V2](https://docs.etherscan.io/etherscan-v2) and [Helius](https://docs.helius.dev/). Prices via [CoinGecko](https://www.coingecko.com/).

Built by [@QBe1n](https://github.com/QBe1n).
