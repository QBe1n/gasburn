// Solana gas tracker via Helius's enhanced transaction API.
// Free tier: https://docs.helius.dev/
// We fetch the most recent parsed transactions for an address and compute
// fee in lamports → SOL → USD.

import type { Chain, GasTx } from '../types.js'

import { nativePriceUsd } from './prices.js'

interface HeliusTx {
  signature: string
  feePayer: string
  fee: number
  timestamp: number
  type?: string
  description?: string
  transactionError?: unknown
}

export async function fetchSolanaGasTxs(
  address: string,
  opts: { apiKey?: string; limit?: number } = {}
): Promise<GasTx[]> {
  const apiKey = opts.apiKey ?? process.env.HELIUS_API_KEY ?? ''
  if (!apiKey) return []
  const limit = opts.limit ?? 100
  const url = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`)
  url.searchParams.set('api-key', apiKey)
  url.searchParams.set('limit', String(limit))

  let txs: HeliusTx[] = []
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    txs = (await res.json()) as HeliusTx[]
  } catch {
    return []
  }

  const nativeUsd = await nativePriceUsd('solana')
  return txs
    .filter((t) => t.feePayer?.toLowerCase() === address.toLowerCase())
    .map<GasTx>((t) => {
      const feeLamports = BigInt(t.fee ?? 0)
      const feeSol = Number(feeLamports) / 1e9
      return {
        hash: t.signature,
        chain: 'solana' as Chain,
        from: t.feePayer,
        to: null,
        blockTime: t.timestamp * 1000,
        gasUsed: feeLamports,
        gasPriceWei: 0n,
        feeWei: feeLamports,
        feeUsd: feeSol * nativeUsd,
        method: t.type ?? null,
        success: !t.transactionError
      }
    })
}
