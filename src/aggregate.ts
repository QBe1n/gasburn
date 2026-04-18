import { detectLeaks } from './leaks.js'
import { summarizeByWallet } from './gas/index.js'
import type {
  ActivityCategory,
  AgentSession,
  AgentTurn,
  DashboardData,
  GasTx
} from './types.js'

export type Period = 'today' | '7d' | '30d' | 'month' | 'all'

export function rangeFor(period: Period, now = Date.now()): { from: number; to: number } {
  const d = new Date(now)
  switch (period) {
    case 'today': {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      return { from: start, to: now }
    }
    case '7d':
      return { from: now - 7 * 86400_000, to: now }
    case '30d':
      return { from: now - 30 * 86400_000, to: now }
    case 'month': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      return { from: start, to: now }
    }
    case 'all':
    default:
      return { from: 0, to: now }
  }
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return d.toISOString().slice(0, 10)
}

export function aggregate(
  sessions: AgentSession[],
  txs: GasTx[],
  period: Period = '7d'
): DashboardData {
  const { from, to } = rangeFor(period)

  const scopedSessions = sessions
    .map((s) => ({
      ...s,
      turns: s.turns.filter((t) => t.timestamp >= from && t.timestamp <= to)
    }))
    .filter((s) => s.turns.length > 0)
    .map((s) => ({
      ...s,
      llmCostUsd: s.turns.reduce((n, t) => n + t.costUsd, 0)
    }))

  const scopedTxs = txs.filter((t) => t.blockTime >= from && t.blockTime <= to)

  const turns: AgentTurn[] = scopedSessions.flatMap((s) => s.turns)

  const llmCostUsd = turns.reduce((n, t) => n + t.costUsd, 0)
  const gasFeeUsd = scopedTxs.reduce((n, t) => n + t.feeUsd, 0)

  const byDayMap = new Map<string, { llmUsd: number; gasUsd: number }>()
  for (const t of turns) {
    const k = dayKey(t.timestamp)
    const e = byDayMap.get(k) ?? { llmUsd: 0, gasUsd: 0 }
    e.llmUsd += t.costUsd
    byDayMap.set(k, e)
  }
  for (const t of scopedTxs) {
    const k = dayKey(t.blockTime)
    const e = byDayMap.get(k) ?? { llmUsd: 0, gasUsd: 0 }
    e.gasUsd += t.feeUsd
    byDayMap.set(k, e)
  }
  const byDay = [...byDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, ...v }))

  const catMap = new Map<ActivityCategory, { costUsd: number; turns: number }>()
  for (const t of turns) {
    const e = catMap.get(t.category) ?? { costUsd: 0, turns: 0 }
    e.costUsd += t.costUsd
    e.turns += 1
    catMap.set(t.category, e)
  }
  const byCategory = [...catMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const modelMap = new Map<string, { costUsd: number; turns: number; inputTokens: number; outputTokens: number }>()
  for (const t of turns) {
    const e = modelMap.get(t.model) ?? { costUsd: 0, turns: 0, inputTokens: 0, outputTokens: 0 }
    e.costUsd += t.costUsd
    e.turns += 1
    e.inputTokens += t.inputTokens
    e.outputTokens += t.outputTokens
    modelMap.set(t.model, e)
  }
  const byModel = [...modelMap.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const byWallet = summarizeByWallet(scopedTxs)

  const topSessions = scopedSessions
    .map((s) => {
      const walletSet = new Set(s.linkedWallets.map((w) => w.toLowerCase()))
      const related = scopedTxs.filter((t) => walletSet.has(t.from.toLowerCase()))
      const gasUsd = related.reduce((n, t) => n + t.feeUsd, 0)
      return {
        sessionId: s.sessionId,
        provider: s.provider,
        startedAt: s.startedAt,
        llmUsd: s.llmCostUsd,
        gasUsd,
        totalUsd: s.llmCostUsd + gasUsd,
        txs: related.length
      }
    })
    .sort((a, b) => b.totalUsd - a.totalUsd)
    .slice(0, 5)

  const leaks = detectLeaks(scopedSessions, scopedTxs)

  return {
    period,
    range: { from, to },
    totals: {
      llmCostUsd: llmCostUsd,
      gasFeeUsd,
      totalUsd: llmCostUsd + gasFeeUsd,
      sessions: scopedSessions.length,
      turns: turns.length,
      txs: scopedTxs.length
    },
    byDay,
    byCategory,
    byModel,
    byWallet,
    topSessions,
    leaks
  }
}
