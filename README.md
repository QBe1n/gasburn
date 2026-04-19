```text
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║      ██████╗  █████╗ ███████╗██████╗ ██╗   ██╗██████╗ ███╗   ██╗              ║
║     ██╔════╝ ██╔══██╗██╔════╝██╔══██╗██║   ██║██╔══██╗████╗  ██║              ║
║     ██║  ███╗███████║███████╗██████╔╝██║   ██║██████╔╝██╔██╗ ██║              ║
║     ██║   ██║██╔══██║╚════██║██╔══██╗██║   ██║██╔══██╗██║╚██╗██║              ║
║     ╚██████╔╝██║  ██║███████║██████╔╝╚██████╔╝██║  ██║██║ ╚████║              ║
║      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝              ║
║                                                                               ║
║          See where your AI agent tokens and on-chain gas actually go          ║
║                                  v0.1-alpha                                   ║
║                                                                               ║
║                       TUI dashboard for autonomous                            ║
║                             crypto agents                                     ║
║                                                                               ║
║                     Maintainer: QBe1n (@QBe1n)                                ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

           ⠀⠀⠀⢀⣀
          ⠀⠀⣴⣿⠟        ⣠⣴⣶⣶⣤⣀
         ⠀⣠⣿⠟⠁        ⢠⣾⣿⣿⣿⣿⣿⣿⣧⡀          "Your agent spent $47
        ⢀⣾⣿⠃         ⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷            on Opus to answer
       ⢠⣿⡿⠁          ⣿⣿⣿⠟⠋⠉⠛⣿⣿⣿             'hello' seven times.
      ⢠⣿⣿⠁           ⣿⣿⣿      ⢿⣿⣿             That shouldn't take a
     ⢀⣾⣿⣷            ⢻⣿⣿⡄    ⢀⣾⣿⠇             dashboard to find."
    ⣠⣾⣿⣿⣿⣦⣤⣀         ⠈⠻⣿⣿⣷⣶⣾⣿⠟⠁
  ⢀⣴⣿⣿⣿⣿⣿⣿⣿⣷⣆          ⠈⠙⠛⠋⠁
⢠⣾⣿⣿⣿⣿⣿⡿⠟⠛⠛⠛⠃
⠛⠛⠛⠋⠉⠁
```

# Know exactly what your crypto agent is burning — on tokens AND on gas

Your autonomous crypto agent has two wallets draining at the same time: the LLM tab and the on-chain gas. Nobody shows you both side by side. **gasburn does.** Across `6 chains`, `4 agent runtimes`, `8 task categories`, `5 leak rules` — no proxy, no wrapper, no private keys.

[![npm](https://img.shields.io/npm/v/gasburn.svg?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/gasburn)
[![license](https://img.shields.io/npm/l/gasburn.svg?style=flat-square&color=blue)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![chains](https://img.shields.io/badge/chains-ETH_|_Base_|_Arb_|_OP_|_Polygon_|_SOL-627eea?style=flat-square)](#on-chain-gas)
[![runtimes](https://img.shields.io/badge/runtimes-Eliza_|_LangGraph_|_OpenAI_proxy-ff69b4?style=flat-square)](#supported-providers)
[![leak rules](https://img.shields.io/badge/leak_rules-5-ff4c4c?style=flat-square)](#leak-detector)
[![status](https://img.shields.io/badge/status-alpha-orange?style=flat-square)](CHANGELOG.md)
[![PRs](https://img.shields.io/badge/PRs-welcome-00c7b7?style=flat-square)](#adding-a-provider)

**Maintainer:** QBe1n ([@QBe1n](https://github.com/QBe1n))

**License:** MIT (see LICENSE file)

**Repository:** https://github.com/QBe1n/gasburn

---

## What is gasburn?

gasburn is an interactive **terminal dashboard for autonomous crypto agents**. It reads local session data from your agent runtime, reconciles each session against public on-chain history, and shows you exactly where the money went — both the LLM spend and the gas spend — in one place.

It's what [codeburn](https://github.com/AgentSeal/codeburn) is for coding agents, but pointed at crypto agents: different data sources, different category model, different leak rules, same love of pure-local observability.

1. **Pulls local session data** from Eliza, LangGraph, OpenAI-compatible proxies (LiteLLM, OpenRouter), or any custom agent via a JSONL log
2. **Fetches on-chain gas history** for your wallets across Ethereum, Base, Arbitrum, Optimism, Polygon (Etherscan V2) and Solana (Helius)
3. **Classifies every turn** into one of 8 agent-native task categories — fully deterministic, no LLM calls
4. **Side-by-side cost chart** — LLM tokens vs gas, daily and per-category
5. **Per-model breakdown** — where is Opus leaking; where would Sonnet or gpt-5-mini do
6. **Per-wallet breakdown** across all chains
7. **Top 5 most expensive sessions** tying LLM spend directly to the tx hashes they triggered
8. **Leak detector** — 5 rules that catch money you shouldn't be spending
9. **JSON + CSV exporters** for team dashboards
10. **No wrappers, no proxies, no private keys** — local files and public RPC only

**Disclaimer: It's a vibe-coded alpha and we can't stop using it.**
Built in one week to scratch our own itch. Expect rough edges. If something is wrong, open a PR — we review within 24 hours.

---

## See it in action

```text
┌─ gasburn · last 7 days ────────────────────────────────────────────────────┐
│                                                                            │
│   LLM spend     $184.22       Gas spent      $41.07       Total  $225.29   │
│                                                                            │
│   ┌─ Daily cost ────────────────────────────────────────────────────────┐  │
│   │  LLM  ██▅▆▇█▂       Gas  ▃▂█▂▁▄▁                                   │  │
│   │  Mon Tue Wed Thu Fri Sat Sun                                        │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   By category                       By model                               │
│   ─────────────────                 ────────────────                       │
│   Trade Execution  $89.12  (40%)    claude-opus-4-5   $102.44  (55%)       │
│   Market Research  $54.22  (24%)    gpt-5-mini         $34.12  (19%)       │
│   Contract Write   $38.44  (17%)    claude-sonnet-4-5  $28.80  (16%)       │
│   Idle Chat        $21.03  ( 9%)    gemini-2-flash      $18.86  (10%)      │
│   Strategy         $13.18  ( 6%)                                           │
│                                                                            │
│   ⚠  3 leaks detected · est waste $68.40                                  │
│   │                                                                        │
│   │  idle-chat          2 sessions  · $21.03  — pure chat on Opus          │
│   │  oversized-model   11 turns     · $34.80  — Opus on tiny prompts       │
│   │  research-no-action 1 session   · $12.57  — 14 research turns, 0 txs   │
│                                                                            │
│ [1] Today  [2] 7d  [3] 30d  [4] Month  [5] All            [L] Leaks  [Q]uit│
└────────────────────────────────────────────────────────────────────────────┘
```

No proxy between your agent and the LLM. No private keys. Just what happened, from disk.

---

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
- At least one of:
  - Eliza (`~/.eliza/memories.sqlite`)
  - LangGraph (`.langgraph_api/checkpoints.sqlite`)
  - LiteLLM / OpenRouter request log
  - JSONL log at `~/.gasburn/logs/`
- Optional: a free Etherscan V2 API key (EVM gas history), a free Helius API key (Solana)

---

## Quick start

```bash
# 1. see which providers gasburn detects on your machine
gasburn providers

# 2. add your agent's wallets, one per command
gasburn wallet add 0xabc...def ethereum -l "main-bot"
gasburn wallet add FxKe...2j  solana   -l "sol-sniper"

# 3. save your free API keys (only needed for on-chain history)
gasburn key set etherscan YOUR_KEY
gasburn key set helius    YOUR_KEY

# 4. open the dashboard (default: last 7 days)
gasburn

# 5. just today's numbers
gasburn today

# 6. leak detector only
gasburn leaks -p 30d

# 7. machine-readable output
gasburn report -p 7d --format json | jq .totals
gasburn export  -p 30d -f csv       > burn.csv
```

Arrow keys or `1`–`5` switch between Today / 7d / 30d / Month / All. `q` to quit.

---

## What it tracks

**8 agent-native task categories**, classified from tool names and user-message keywords. No LLM calls — fully deterministic.

| Category | What triggers it |
|---|---|
| **Trade Execution** | `swap`, `execute_trade`, `uniswap`, `jupiter`, keywords "buy / sell / long / short" |
| **Contract Write** | `sendTransaction`, `approve`, `mint`, `stake`, `bridge` |
| **Contract Read** | `eth_call`, `getBalance`, keywords "balance / allowance / total supply" |
| **Wallet Ops** | `createKey`, `sign_message`, keywords "new wallet / import key" |
| **Market Research** | `dexscreener`, `birdeye`, `coingecko`, `defillama`, keywords "price of / tvl / is X legit" |
| **Social Post** | `twitter_post`, `telegram_send`, `farcaster`, keywords "tweet / shill / announce" |
| **Strategy** | keywords "strategy / plan / backtest / rebalance / position size" |
| **Idle Chat** | no tools, no action keywords |

---

## Leak detector

The killer feature. Rule-based scans that surface money you shouldn't be spending.

| Leak rule | What it catches |
|---|---|
| `idle-chat` | Sessions where >70% of turns are pure conversation with zero tool calls, but still rack up real cost |
| `oversized-model` | Opus / GPT-5 used on tiny turns (<300 input tokens, no tools) where Sonnet or gpt-5-mini would do |
| `failed-txs` | On-chain transactions that paid gas and reverted |
| `research-no-action` | Sessions with 5+ market-research turns, zero trade or write turns, **zero on-chain txs** in the window — your agent researched and did nothing |
| `overpaid-gas` | Transactions that paid 3×+ median gas for the chain in the window (static fees vs EIP-1559) |

Each finding ships with estimated wasted dollars, evidence (session IDs, tx hashes), and a copy-paste fix. Run `gasburn leaks` standalone or view inline in the TUI.

---

## Supported providers

| Runtime | Data location | Status |
|---|---|---|
| **Eliza** | `~/.eliza/memories.sqlite` | ✅ Works |
| **LangGraph (SqliteSaver)** | `.langgraph_api/checkpoints.sqlite` | ✅ Works |
| **OpenAI-compatible proxy** (LiteLLM, OpenRouter, custom) | `~/.gasburn/openai-proxy.jsonl`, `~/.litellm/requests.jsonl` | ✅ Works |
| **Generic JSONL** (any custom agent) | `~/.gasburn/logs/*.jsonl` | ✅ Works |
| **Virtuals** | — | ⚠️ Planned |
| **Griffain** | — | ⚠️ Planned |
| **arc** | — | ⚠️ Planned |

### Generic JSONL format

Any custom agent can plug in by writing one line per turn to `~/.gasburn/logs/<anything>.jsonl`:

```json
{"session_id":"abc","timestamp":"2026-04-18T09:00:00Z","model":"claude-sonnet-4-5","user_message":"swap eth for usdc","input_tokens":400,"output_tokens":180,"tools":["uniswap","execute_trade"],"wallets":["0xabc..."]}
```

Fields: `session_id`, `timestamp` (ISO or unix), `model`, `user_message`, `input_tokens`, `output_tokens`, optional `cache_read_tokens`, `cache_write_tokens`, `tools: string[]`, `wallets: string[]`.

---

## On-chain gas

gasburn uses the **Etherscan V2** unified API (one endpoint, one key, all major EVM chains) and the **Helius** enhanced transactions API for Solana. Both free tiers. Private keys are never touched.

```bash
gasburn wallet add 0x... ethereum
gasburn wallet add 0x... base
gasburn wallet add 0x... arbitrum
gasburn wallet add 0x... optimism
gasburn wallet add 0x... polygon
gasburn wallet add FxK... solana
```

Native-token USD prices come from CoinGecko, cached locally for 1 hour.

---

## How it reads data

gasburn parses session data directly from disk — JSONL or SQLite depending on the runtime — then reconciles each session's on-chain activity by matching its linked wallet addresses against public transaction history over the same time window. No wrapper around your agent, no proxy, no API keys needed to read local data. Etherscan / Helius keys are only required for live on-chain history.

---

## Why this beats the alternatives

| | Dune dashboard | Generic LLM observability (Langfuse, Helicone) | Staring at your wallet | **gasburn** |
|---|---|---|---|---|
| See LLM spend | ❌ | ✅ | ❌ | ✅ |
| See on-chain gas | ⚠️ Generic wallet | ❌ | ✅ | ✅ Linked to sessions |
| Agent-native task categories | ❌ | ⚠️ Manual tags | ❌ | ✅ 8 deterministic |
| Leak rules | ❌ | ❌ | ❌ | ✅ 5 rules |
| Local-only, no proxy | n/a | ❌ Proxy required | ✅ | ✅ |
| Works with Eliza / LangGraph | ❌ | ⚠️ Via shim | ❌ | ✅ Native |
| Setup time | Hours, SQL | 30 min + code changes | 0 | One command |

---

## Project structure

```
src/
  cli.ts              Commander.js entry (report, today, leaks, export, wallet, key, providers)
  dashboard.tsx       Ink TUI (React for terminals)
  aggregate.ts        Period filtering and rollups
  classifier.ts       8-category agent-native classifier
  pricing.ts          LLM price table (override via GASBURN_PRICING env)
  leaks.ts            Leak detector rules
  export.ts           CSV and JSON exporters
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

---

## Adding a provider

The plugin system makes adding a runtime a single file. Implement:

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

---

## Roadmap

- Virtuals / Griffain / arc native providers
- Web dashboard (shareable links, team mode)
- "Cost per profitable trade" — ties sessions to realized PnL
- Telegram bot: ping when daily burn crosses a threshold
- Gas-price oracle recommendation based on your wallet's historical overpayment
- Windows / Linux tray companion
- Your idea here — PRs welcome

---

## Contribute

Open an issue or a PR. First contributions we'd love:

- Another agent runtime
- A new leak rule you caught in the wild
- A new chain via Etherscan V2 (it's nearly free to add)
- Pricing corrections when providers update their rates
- Classifier keyword tuning for your agent domain

**Community:** [GitHub issues](https://github.com/QBe1n/gasburn/issues) · [@QBe1n on X](https://github.com/QBe1n) · [Habibi Hub Telegram](https://t.me/habibihub)

---

## Credits

Architecturally inspired by [codeburn](https://github.com/AgentSeal/codeburn) (the AI coding cost TUI). gasburn takes that lens — local data, zero config, interactive TUI, rule-based leak detector — and points it at autonomous crypto agents. Different data sources, different category model, different leak rules; same love of pure-local observability.

Pricing inspired by [LiteLLM](https://github.com/BerriAI/litellm). Gas data via [Etherscan V2](https://docs.etherscan.io/etherscan-v2) and [Helius](https://docs.helius.dev/). Prices via [CoinGecko](https://www.coingecko.com/).

Built by [@QBe1n](https://github.com/QBe1n).

---

## License

MIT License — Copyright (c) 2026 QBe1n and contributors

See `LICENSE` file for full text.

---

## Support

- **Issues:** https://github.com/QBe1n/gasburn/issues
- **npm:** https://www.npmjs.com/package/gasburn
- **Repository:** https://github.com/QBe1n/gasburn
- **Maintainer:** [@QBe1n](https://github.com/QBe1n)
