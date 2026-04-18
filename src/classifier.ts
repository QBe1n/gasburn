// 8-category classifier for crypto-agent turns. Pure heuristics, no LLM calls.
// Triggers are based on tool name patterns and user-message keywords.

import type { ActivityCategory } from './types.js'

interface Rule {
  category: ActivityCategory
  tools?: RegExp[]
  keywords?: RegExp[]
}

const RULES: Rule[] = [
  {
    category: 'trade-execution',
    tools: [/swap/i, /execute_?trade/i, /place_?order/i, /jupiter/i, /uniswap/i, /0x_?swap/i],
    keywords: [/\b(buy|sell|swap|long|short|entry|exit|tp|sl|market order|limit order)\b/i]
  },
  {
    category: 'contract-write',
    tools: [/write_?contract/i, /sendTransaction/i, /send_?tx/i, /approve/i, /mint/i, /stake/i, /bridge/i],
    keywords: [/\b(approve|mint|bridge|stake|deposit|withdraw)\b/i]
  },
  {
    category: 'contract-read',
    tools: [/read_?contract/i, /callContract/i, /getBalance/i, /tokenBalance/i, /ens_?/i, /eth_?call/i],
    keywords: [/\b(balance|allowance|total supply|holders)\b/i]
  },
  {
    category: 'wallet-ops',
    tools: [/wallet/i, /createKey/i, /sign_?message/i, /private_?key/i, /import_?wallet/i],
    keywords: [/\b(new wallet|create wallet|import key|sign message)\b/i]
  },
  {
    category: 'market-research',
    tools: [/coingecko/i, /dexscreener/i, /birdeye/i, /defillama/i, /etherscan_?get/i, /price_?lookup/i, /twitter_?search/i, /web_?search/i],
    keywords: [/\b(price of|market cap|tvl|volume|chart|trending|fud|alpha|is .+ legit)\b/i]
  },
  {
    category: 'social-post',
    tools: [/twitter_?post/i, /tweet/i, /telegram_?send/i, /discord_?post/i, /farcaster/i, /cast\b/i],
    keywords: [/\b(tweet|post this|shill|announce|reply to)\b/i]
  },
  {
    category: 'strategy',
    keywords: [/\b(strategy|plan|backtest|simulate|risk|position size|portfolio|rebalance)\b/i]
  }
]

export function classify(toolNames: string[], userText: string): ActivityCategory {
  const toolsStr = toolNames.join(' ')
  const hasTools = toolNames.length > 0

  for (const r of RULES) {
    const toolMatch = r.tools?.some((re) => re.test(toolsStr)) ?? false
    const kwMatch = r.keywords?.some((re) => re.test(userText)) ?? false
    if (toolMatch || kwMatch) return r.category
  }

  if (!hasTools && userText.trim().length > 0) return 'idle-chat'
  return 'general'
}
