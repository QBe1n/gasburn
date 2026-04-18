// Core types for gasburn — sessions, turns, wallets, findings.

export type ProviderId = 'eliza' | 'langgraph' | 'openai-proxy' | 'generic-jsonl'

export type Chain = 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'polygon' | 'solana'

export type ActivityCategory =
  | 'trade-execution'
  | 'market-research'
  | 'wallet-ops'
  | 'contract-read'
  | 'contract-write'
  | 'social-post'
  | 'strategy'
  | 'idle-chat'
  | 'general'

export interface AgentTurn {
  sessionId: string
  provider: ProviderId
  timestamp: number // unix ms
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  toolNames: string[]
  userMessageText: string
  category: ActivityCategory
  costUsd: number
}

export interface AgentSession {
  sessionId: string
  provider: ProviderId
  startedAt: number
  endedAt: number
  turns: AgentTurn[]
  llmCostUsd: number
  linkedWallets: string[] // wallets used by the agent in this session
}

export interface GasTx {
  hash: string
  chain: Chain
  from: string
  to: string | null
  blockTime: number // unix ms
  gasUsed: bigint
  gasPriceWei: bigint
  feeWei: bigint
  feeUsd: number
  method: string | null
  success: boolean
}

export interface WalletSummary {
  address: string
  chain: Chain
  txCount: number
  gasFeeUsd: number
  first: number
  last: number
}

export interface LeakFinding {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  detail: string
  wastedUsd: number
  evidence: string[]
  suggestion: string
}

export interface DashboardData {
  period: string
  range: { from: number; to: number }
  totals: {
    llmCostUsd: number
    gasFeeUsd: number
    totalUsd: number
    sessions: number
    turns: number
    txs: number
  }
  byDay: { day: string; llmUsd: number; gasUsd: number }[]
  byCategory: { category: ActivityCategory; costUsd: number; turns: number }[]
  byModel: { model: string; costUsd: number; turns: number; inputTokens: number; outputTokens: number }[]
  byWallet: WalletSummary[]
  topSessions: {
    sessionId: string
    provider: ProviderId
    startedAt: number
    llmUsd: number
    gasUsd: number
    totalUsd: number
    txs: number
  }[]
  leaks: LeakFinding[]
}
