# Changelog

## 0.1.0 — 2026-04-18

Initial release.

- Interactive Ink TUI dashboard: daily LLM + gas burn, by category, by model, by wallet, top sessions, leak detector
- 4 providers: Eliza (SQLite), LangGraph (SqliteSaver), OpenAI-compatible proxy (LiteLLM/OpenRouter/custom), generic JSONL
- 8 agent-native task categories with deterministic keyword + tool classifier
- Gas tracker: Etherscan V2 (Ethereum, Base, Arbitrum, Optimism, Polygon) + Helius (Solana)
- Leak detector with 5 rules: idle-chat, oversized-model, failed-txs, research-no-action, overpaid-gas
- CSV / JSON export
- Wallet and API-key management via config file at `~/.config/gasburn/config.json`
- `gasburn today` / `gasburn leaks` / `gasburn providers` convenience commands
