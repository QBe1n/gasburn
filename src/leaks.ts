// Leak detector — the killer feature. Finds sessions and patterns that burn
// money with no payoff. Rule-based, deterministic, no LLM calls.

import type { AgentSession, GasTx, LeakFinding } from './types.js'

interface Ctx {
  sessions: AgentSession[]
  txs: GasTx[]
  totalLlmUsd: number
  totalGasUsd: number
}

// 1. Idle-chat leak: sessions where >70% of turns are idle-chat/general with
//    no tool calls, but racked up meaningful cost.
function idleChatLeak(ctx: Ctx): LeakFinding | null {
  const bad = ctx.sessions.filter((s) => {
    if (s.turns.length < 5) return false
    const idle = s.turns.filter(
      (t) => (t.category === 'idle-chat' || t.category === 'general') && t.toolNames.length === 0
    ).length
    return idle / s.turns.length > 0.7 && s.llmCostUsd > 0.5
  })
  if (bad.length === 0) return null
  const wasted = bad.reduce((n, s) => n + s.llmCostUsd, 0)
  return {
    id: 'idle-chat',
    severity: wasted > 20 ? 'high' : 'medium',
    title: 'Agent talking instead of doing',
    detail: `${bad.length} session${bad.length > 1 ? 's' : ''} spent mostly on pure conversation with no tool calls.`,
    wastedUsd: wasted,
    evidence: bad.slice(0, 5).map((s) => `${s.sessionId} — $${s.llmCostUsd.toFixed(2)}`),
    suggestion: 'Cap max conversation turns per session. Force a tool call or exit after N idle turns.'
  }
}

// 2. Opus-on-small-turn leak: expensive model used for turns with <300 input
//    tokens and no tool calls — overkill.
function opusSmallTurnLeak(ctx: Ctx): LeakFinding | null {
  let waste = 0
  let count = 0
  for (const s of ctx.sessions) {
    for (const t of s.turns) {
      const isExpensive = /opus|gpt-5(?!-mini)/i.test(t.model)
      if (isExpensive && t.inputTokens < 300 && t.toolNames.length === 0) {
        waste += t.costUsd * 0.85 // 85% savings if downgraded to sonnet/gpt-5-mini
        count += 1
      }
    }
  }
  if (count === 0 || waste < 0.1) return null
  return {
    id: 'oversized-model',
    severity: waste > 10 ? 'high' : 'medium',
    title: 'Premium model on small turns',
    detail: `${count} tiny turns (<300 input tokens, no tools) used Opus/GPT-5. That's $${waste.toFixed(
      2
    )} of potential savings by routing to Sonnet/mini.`,
    wastedUsd: waste,
    evidence: [`${count} turns flagged`, 'Routing rule: tokens<300 && no_tools → cheap tier'],
    suggestion: 'Add a size-based router: small context → Sonnet or gpt-5-mini, large/tool-heavy → Opus.'
  }
}

// 3. Failed-tx gas leak: on-chain transactions that paid gas but reverted.
function failedTxLeak(ctx: Ctx): LeakFinding | null {
  const failed = ctx.txs.filter((t) => !t.success)
  if (failed.length === 0) return null
  const waste = failed.reduce((n, t) => n + t.feeUsd, 0)
  return {
    id: 'failed-txs',
    severity: waste > 50 ? 'critical' : 'high',
    title: 'Reverted transactions still cost gas',
    detail: `${failed.length} reverted transaction${failed.length > 1 ? 's' : ''} paid gas and did nothing.`,
    wastedUsd: waste,
    evidence: failed.slice(0, 5).map((t) => `${t.hash.slice(0, 12)}… — $${t.feeUsd.toFixed(2)} (${t.chain})`),
    suggestion: 'Simulate before sending: estimateGas + callStatic (EVM) or simulateTransaction (Solana).'
  }
}

// 4. Research-without-action leak: sessions with heavy market-research turns
//    but zero trade-execution or contract-write turns and zero on-chain txs.
function researchNoActionLeak(ctx: Ctx): LeakFinding | null {
  const bad = ctx.sessions.filter((s) => {
    const research = s.turns.filter((t) => t.category === 'market-research').length
    const action = s.turns.filter(
      (t) => t.category === 'trade-execution' || t.category === 'contract-write'
    ).length
    if (research < 5 || action > 0) return false
    // correlated on-chain activity?
    const sessionWallets = new Set(s.linkedWallets.map((w) => w.toLowerCase()))
    const relatedTxs = ctx.txs.filter(
      (t) =>
        sessionWallets.has(t.from.toLowerCase()) &&
        t.blockTime >= s.startedAt - 60_000 &&
        t.blockTime <= s.endedAt + 60_000
    )
    return relatedTxs.length === 0 && s.llmCostUsd > 0.5
  })
  if (bad.length === 0) return null
  const wasted = bad.reduce((n, s) => n + s.llmCostUsd, 0)
  return {
    id: 'research-no-action',
    severity: wasted > 10 ? 'high' : 'medium',
    title: 'Research sessions with zero action',
    detail: `${bad.length} session${bad.length > 1 ? 's' : ''} did heavy market-research but never traded or signed.`,
    wastedUsd: wasted,
    evidence: bad.slice(0, 5).map((s) => `${s.sessionId} — $${s.llmCostUsd.toFixed(2)}`),
    suggestion: 'Add a decision gate: after N research turns, force the agent to propose an action or halt.'
  }
}

// 5. Overpaid gas leak: gas fees far above median for the chain in the window.
function overpaidGasLeak(ctx: Ctx): LeakFinding | null {
  if (ctx.txs.length < 10) return null
  const byChain = new Map<string, number[]>()
  for (const t of ctx.txs) {
    if (!byChain.has(t.chain)) byChain.set(t.chain, [])
    byChain.get(t.chain)!.push(t.feeUsd)
  }
  let waste = 0
  const outliers: string[] = []
  for (const [chain, fees] of byChain) {
    if (fees.length < 10) continue
    const sorted = [...fees].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    for (const t of ctx.txs) {
      if (t.chain !== chain) continue
      if (t.feeUsd > median * 3 && t.feeUsd > 0.5) {
        waste += t.feeUsd - median
        if (outliers.length < 5) outliers.push(`${t.hash.slice(0, 12)}… ${chain} $${t.feeUsd.toFixed(2)} (median $${median.toFixed(2)})`)
      }
    }
  }
  if (waste < 1) return null
  return {
    id: 'overpaid-gas',
    severity: waste > 20 ? 'high' : 'medium',
    title: 'Transactions overpaid gas 3x+ over median',
    detail: 'Agent used static gas prices instead of dynamic fee estimation.',
    wastedUsd: waste,
    evidence: outliers,
    suggestion: 'Use EIP-1559 suggestion APIs (eth_feeHistory) or a gas oracle; priority fee should be dynamic.'
  }
}

export function detectLeaks(sessions: AgentSession[], txs: GasTx[]): LeakFinding[] {
  const ctx: Ctx = {
    sessions,
    txs,
    totalLlmUsd: sessions.reduce((n, s) => n + s.llmCostUsd, 0),
    totalGasUsd: txs.reduce((n, t) => n + t.feeUsd, 0)
  }
  const checks = [idleChatLeak, opusSmallTurnLeak, failedTxLeak, researchNoActionLeak, overpaidGasLeak]
  const findings = checks.map((fn) => fn(ctx)).filter((f): f is LeakFinding => f !== null)
  return findings.sort((a, b) => b.wastedUsd - a.wastedUsd)
}
