import React from 'react'
import { Box, Text, useApp, useInput } from 'ink'

import type { DashboardData } from './types.js'
import type { Period } from './aggregate.js'

interface Props {
  initial: DashboardData
  reload: (period: Period) => Promise<DashboardData>
}

const PERIODS: Period[] = ['today', '7d', '30d', 'month', 'all']
const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
  month: 'Month',
  all: 'All'
}

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`
  if (n >= 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(3)}`
}

function bar(frac: number, width: number): string {
  const safe = Math.max(0, Math.min(1, frac))
  const filled = Math.round(safe * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function sevColor(s: string): 'red' | 'yellow' | 'cyan' | 'gray' {
  switch (s) {
    case 'critical':
      return 'red'
    case 'high':
      return 'red'
    case 'medium':
      return 'yellow'
    case 'low':
      return 'cyan'
    default:
      return 'gray'
  }
}

export function Dashboard({ initial, reload }: Props): React.ReactElement {
  const { exit } = useApp()
  const [data, setData] = React.useState(initial)
  const [loading, setLoading] = React.useState(false)

  useInput((input) => {
    if (input === 'q') exit()
    const idx = Number(input)
    if (idx >= 1 && idx <= PERIODS.length) {
      setLoading(true)
      reload(PERIODS[idx - 1])
        .then(setData)
        .finally(() => setLoading(false))
    }
  })

  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.costUsd))
  const maxModel = Math.max(1, ...data.byModel.map((m) => m.costUsd))
  const maxDay = Math.max(
    1,
    ...data.byDay.map((d) => d.llmUsd + d.gasUsd)
  )

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color="yellow" bold>
          ▲ gasburn
        </Text>
        <Text color="gray"> — see where your AI agent tokens and on-chain gas actually go</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Period: </Text>
        {PERIODS.map((p, i) => (
          <Text key={p} color={p === data.period ? 'yellow' : 'gray'}>
            {' '}
            [{i + 1}] {PERIOD_LABELS[p]}
          </Text>
        ))}
        {loading && <Text color="cyan"> loading…</Text>}
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>Overview</Text>
        <Box>
          <Text color="cyan">LLM </Text>
          <Text>{fmtUsd(data.totals.llmCostUsd).padEnd(10)}</Text>
          <Text color="magenta">Gas </Text>
          <Text>{fmtUsd(data.totals.gasFeeUsd).padEnd(10)}</Text>
          <Text color="yellow" bold>
            Total {fmtUsd(data.totals.totalUsd)}
          </Text>
        </Box>
        <Box>
          <Text color="gray">
            {data.totals.sessions} sessions · {data.totals.turns} turns · {data.totals.txs} txs
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>Daily burn</Text>
        {data.byDay.length === 0 && <Text color="gray">no activity in window</Text>}
        {data.byDay.map((d) => {
          const total = d.llmUsd + d.gasUsd
          return (
            <Box key={d.day}>
              <Text color="gray">{d.day} </Text>
              <Text color="cyan">{bar(d.llmUsd / maxDay, 20)}</Text>
              <Text color="magenta">{bar(d.gasUsd / maxDay, 20)}</Text>
              <Text> {fmtUsd(total)}</Text>
            </Box>
          )
        })}
      </Box>

      <Box marginTop={1}>
        <Box flexDirection="column" width={42} borderStyle="round" borderColor="gray" paddingX={1} marginRight={1}>
          <Text bold>By category</Text>
          {data.byCategory.length === 0 && <Text color="gray">—</Text>}
          {data.byCategory.slice(0, 8).map((c) => (
            <Box key={c.category}>
              <Text color="cyan">{c.category.padEnd(18)}</Text>
              <Text>{bar(c.costUsd / maxCat, 12)}</Text>
              <Text> {fmtUsd(c.costUsd)}</Text>
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" width={42} borderStyle="round" borderColor="gray" paddingX={1}>
          <Text bold>By model</Text>
          {data.byModel.length === 0 && <Text color="gray">—</Text>}
          {data.byModel.slice(0, 8).map((m) => (
            <Box key={m.model}>
              <Text color="magenta">{m.model.slice(0, 20).padEnd(20)}</Text>
              <Text>{bar(m.costUsd / maxModel, 10)}</Text>
              <Text> {fmtUsd(m.costUsd)}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>Wallets</Text>
        {data.byWallet.length === 0 && (
          <Text color="gray">no wallets configured — run `gasburn wallet add 0x... ethereum`</Text>
        )}
        {data.byWallet.slice(0, 5).map((w) => (
          <Box key={`${w.chain}:${w.address}`}>
            <Text color="yellow">{w.chain.padEnd(10)}</Text>
            <Text color="gray">{w.address.slice(0, 10)}…{w.address.slice(-6)} </Text>
            <Text>{w.txCount.toString().padStart(4)} txs </Text>
            <Text color="magenta">{fmtUsd(w.gasFeeUsd)}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
        <Text bold color="red">
          🔥 Leak detector ({data.leaks.length})
        </Text>
        {data.leaks.length === 0 && <Text color="green">no leaks detected in this window — you're clean</Text>}
        {data.leaks.map((l) => (
          <Box key={l.id} flexDirection="column" marginTop={1}>
            <Box>
              <Text color={sevColor(l.severity)} bold>
                [{l.severity.toUpperCase()}]{' '}
              </Text>
              <Text bold>{l.title} </Text>
              <Text color="yellow">{fmtUsd(l.wastedUsd)}</Text>
            </Box>
            <Text color="gray">{l.detail}</Text>
            <Text color="cyan">fix: {l.suggestion}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">[1-5] switch period · [q] quit</Text>
      </Box>
    </Box>
  )
}
