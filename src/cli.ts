import { Command } from 'commander'
import chalk from 'chalk'
import { render } from 'ink'
import React from 'react'

import { Dashboard } from './dashboard.tsx'
import { aggregate, type Period } from './aggregate.js'
import { loadConfig, saveConfig } from './config.js'
import { toCsv, toJson } from './export.js'
import { fetchAllGasTxs } from './gas/index.js'
import { PROVIDERS } from './providers/index.js'
import type { AgentSession, Chain, GasTx } from './types.js'

const VERSION = '0.1.0'

async function loadAllSessions(): Promise<AgentSession[]> {
  const all: AgentSession[] = []
  for (const p of PROVIDERS) {
    if (!p.isAvailable()) continue
    try {
      const s = await p.loadSessions()
      all.push(...s)
    } catch (err) {
      console.error(chalk.yellow(`[${p.id}] failed to load: ${(err as Error).message}`))
    }
  }
  return all
}

async function loadAllGas(): Promise<GasTx[]> {
  const cfg = loadConfig()
  const wallets = (cfg.wallets ?? []).map((w) => ({
    address: w.address,
    chain: w.chain as Chain,
    label: w.label
  }))
  if (wallets.length === 0) return []
  return fetchAllGasTxs(wallets, {
    etherscanApiKey: cfg.etherscanApiKey,
    heliusApiKey: cfg.heliusApiKey
  })
}

async function buildDashboard(period: Period) {
  const [sessions, txs] = await Promise.all([loadAllSessions(), loadAllGas()])
  return aggregate(sessions, txs, period)
}

const program = new Command()
program.name('gasburn').description('AI agent + on-chain gas observability').version(VERSION)

program
  .command('report', { isDefault: true })
  .description('Interactive TUI dashboard (default)')
  .option('-p, --period <period>', 'today | 7d | 30d | month | all', '7d')
  .option('--format <format>', 'tui | json | csv', 'tui')
  .action(async (opts: { period: Period; format: string }) => {
    const data = await buildDashboard(opts.period)
    if (opts.format === 'json') {
      console.log(toJson(data))
      return
    }
    if (opts.format === 'csv') {
      console.log(toCsv(data))
      return
    }
    const { waitUntilExit } = render(
      React.createElement(Dashboard, { initial: data, reload: buildDashboard })
    )
    await waitUntilExit()
  })

program
  .command('today')
  .description("Today's totals (compact)")
  .option('--format <format>', 'text | json', 'text')
  .action(async (opts: { format: string }) => {
    const d = await buildDashboard('today')
    if (opts.format === 'json') {
      console.log(toJson(d))
      return
    }
    console.log(
      `${chalk.yellow('▲ gasburn today:')} ${chalk.cyan(`LLM $${d.totals.llmCostUsd.toFixed(2)}`)} · ${chalk.magenta(
        `Gas $${d.totals.gasFeeUsd.toFixed(2)}`
      )} · ${chalk.bold(`Total $${d.totals.totalUsd.toFixed(2)}`)} · ${chalk.gray(
        `${d.totals.sessions} sessions, ${d.totals.txs} txs, ${d.leaks.length} leaks`
      )}`
    )
  })

program
  .command('leaks')
  .description('Show leak findings only')
  .option('-p, --period <period>', 'today | 7d | 30d | month | all', '7d')
  .action(async (opts: { period: Period }) => {
    const d = await buildDashboard(opts.period)
    if (d.leaks.length === 0) {
      console.log(chalk.green(`no leaks detected in the last ${opts.period} — you're clean`))
      return
    }
    for (const l of d.leaks) {
      const color =
        l.severity === 'critical' || l.severity === 'high'
          ? chalk.red
          : l.severity === 'medium'
          ? chalk.yellow
          : chalk.cyan
      console.log(color(`\n[${l.severity.toUpperCase()}] ${l.title}  $${l.wastedUsd.toFixed(2)}`))
      console.log(chalk.gray(`  ${l.detail}`))
      console.log(`  fix: ${l.suggestion}`)
      if (l.evidence.length) console.log(chalk.gray(`  evidence: ${l.evidence.join('; ')}`))
    }
  })

program
  .command('export')
  .description('Export aggregated data')
  .option('-p, --period <period>', 'today | 7d | 30d | month | all', '30d')
  .option('-f, --format <format>', 'csv | json', 'csv')
  .action(async (opts: { period: Period; format: 'csv' | 'json' }) => {
    const d = await buildDashboard(opts.period)
    console.log(opts.format === 'json' ? toJson(d) : toCsv(d))
  })

const walletCmd = program.command('wallet').description('Manage tracked wallets')
walletCmd
  .command('add <address> <chain>')
  .description('Track a new wallet (chain: ethereum|base|arbitrum|optimism|polygon|solana)')
  .option('-l, --label <label>', 'human label')
  .action((address: string, chain: string, opts: { label?: string }) => {
    const cfg = loadConfig()
    cfg.wallets = cfg.wallets ?? []
    if (cfg.wallets.some((w) => w.address.toLowerCase() === address.toLowerCase() && w.chain === chain)) {
      console.log(chalk.yellow('already tracking'))
      return
    }
    cfg.wallets.push({ address, chain, label: opts.label })
    saveConfig(cfg)
    console.log(chalk.green(`added ${chain}:${address}`))
  })

walletCmd
  .command('list')
  .description('List tracked wallets')
  .action(() => {
    const cfg = loadConfig()
    if (!cfg.wallets || cfg.wallets.length === 0) {
      console.log(chalk.gray('no wallets configured'))
      return
    }
    for (const w of cfg.wallets) {
      console.log(`${chalk.yellow(w.chain.padEnd(10))} ${w.address} ${chalk.gray(w.label ?? '')}`)
    }
  })

walletCmd
  .command('remove <address>')
  .description('Stop tracking a wallet')
  .action((address: string) => {
    const cfg = loadConfig()
    const before = cfg.wallets?.length ?? 0
    cfg.wallets = (cfg.wallets ?? []).filter((w) => w.address.toLowerCase() !== address.toLowerCase())
    saveConfig(cfg)
    console.log(chalk.green(`removed ${before - cfg.wallets.length} entry/entries`))
  })

const keyCmd = program.command('key').description('Configure API keys (stored locally)')
keyCmd
  .command('set <provider> <value>')
  .description('provider: etherscan | helius')
  .action((provider: string, value: string) => {
    const cfg = loadConfig()
    if (provider === 'etherscan') cfg.etherscanApiKey = value
    else if (provider === 'helius') cfg.heliusApiKey = value
    else {
      console.error(chalk.red(`unknown provider: ${provider}`))
      process.exit(1)
    }
    saveConfig(cfg)
    console.log(chalk.green(`saved ${provider} key`))
  })

program
  .command('providers')
  .description('Show detected agent providers')
  .action(async () => {
    for (const p of PROVIDERS) {
      const ok = p.isAvailable()
      console.log(`${ok ? chalk.green('✓') : chalk.gray('·')} ${p.name.padEnd(24)} ${chalk.gray(p.defaultPaths()[0])}`)
    }
  })

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`error: ${(err as Error).message}`))
  process.exit(1)
})
