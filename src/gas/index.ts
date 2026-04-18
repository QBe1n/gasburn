import type { Chain, GasTx, WalletSummary } from '../types.js'

import { fetchEvmGasTxs, isEvmChain } from './evm.js'
import { fetchSolanaGasTxs } from './solana.js'

export interface WalletConfig {
  address: string
  chain: Chain
  label?: string
}

export async function fetchAllGasTxs(
  wallets: WalletConfig[],
  opts: { etherscanApiKey?: string; heliusApiKey?: string; limit?: number } = {}
): Promise<GasTx[]> {
  const all: GasTx[] = []
  for (const w of wallets) {
    try {
      if (w.chain === 'solana') {
        const txs = await fetchSolanaGasTxs(w.address, {
          apiKey: opts.heliusApiKey,
          limit: opts.limit
        })
        all.push(...txs)
      } else if (isEvmChain(w.chain)) {
        const txs = await fetchEvmGasTxs(w.address, w.chain, {
          apiKey: opts.etherscanApiKey,
          limit: opts.limit
        })
        all.push(...txs)
      }
    } catch {
      /* per-wallet failure doesn't kill the whole run */
    }
  }
  return all
}

export function summarizeByWallet(txs: GasTx[]): WalletSummary[] {
  const map = new Map<string, WalletSummary>()
  for (const t of txs) {
    const key = `${t.chain}:${t.from.toLowerCase()}`
    let s = map.get(key)
    if (!s) {
      s = {
        address: t.from,
        chain: t.chain,
        txCount: 0,
        gasFeeUsd: 0,
        first: t.blockTime,
        last: t.blockTime
      }
      map.set(key, s)
    }
    s.txCount += 1
    s.gasFeeUsd += t.feeUsd
    s.first = Math.min(s.first, t.blockTime)
    s.last = Math.max(s.last, t.blockTime)
  }
  return [...map.values()].sort((a, b) => b.gasFeeUsd - a.gasFeeUsd)
}
