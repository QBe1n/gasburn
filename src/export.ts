import type { DashboardData } from './types.js'

export function toJson(data: DashboardData): string {
  return JSON.stringify(data, null, 2)
}

function csvRow(vals: (string | number)[]): string {
  return vals
    .map((v) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    })
    .join(',')
}

export function toCsv(data: DashboardData): string {
  const lines: string[] = []
  lines.push(`# gasburn export — period ${data.period}`)
  lines.push('')
  lines.push('## totals')
  lines.push(csvRow(['llm_usd', 'gas_usd', 'total_usd', 'sessions', 'turns', 'txs']))
  lines.push(
    csvRow([
      data.totals.llmCostUsd.toFixed(4),
      data.totals.gasFeeUsd.toFixed(4),
      data.totals.totalUsd.toFixed(4),
      data.totals.sessions,
      data.totals.turns,
      data.totals.txs
    ])
  )
  lines.push('')
  lines.push('## by_day')
  lines.push(csvRow(['day', 'llm_usd', 'gas_usd']))
  for (const d of data.byDay) lines.push(csvRow([d.day, d.llmUsd.toFixed(4), d.gasUsd.toFixed(4)]))
  lines.push('')
  lines.push('## by_category')
  lines.push(csvRow(['category', 'cost_usd', 'turns']))
  for (const c of data.byCategory) lines.push(csvRow([c.category, c.costUsd.toFixed(4), c.turns]))
  lines.push('')
  lines.push('## by_model')
  lines.push(csvRow(['model', 'cost_usd', 'turns', 'input_tokens', 'output_tokens']))
  for (const m of data.byModel)
    lines.push(csvRow([m.model, m.costUsd.toFixed(4), m.turns, m.inputTokens, m.outputTokens]))
  lines.push('')
  lines.push('## by_wallet')
  lines.push(csvRow(['chain', 'address', 'tx_count', 'gas_usd', 'first', 'last']))
  for (const w of data.byWallet)
    lines.push(
      csvRow([
        w.chain,
        w.address,
        w.txCount,
        w.gasFeeUsd.toFixed(4),
        new Date(w.first).toISOString(),
        new Date(w.last).toISOString()
      ])
    )
  lines.push('')
  lines.push('## leaks')
  lines.push(csvRow(['id', 'severity', 'title', 'wasted_usd', 'suggestion']))
  for (const l of data.leaks) lines.push(csvRow([l.id, l.severity, l.title, l.wastedUsd.toFixed(4), l.suggestion]))
  return lines.join('\n')
}
