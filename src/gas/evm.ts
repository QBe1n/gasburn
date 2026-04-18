// EVM gas tracker — uses the Etherscan V2 unified API (one endpoint, chainid param).
// Docs: https://docs.etherscan.io/etherscan-v2
// Covers Ethereum, Base, Arbitrum, Optimism, Polygon. No wallet private keys
// are ever touched; we only query public transaction history.

import type { Chain, GasTx } from '../types.js'

import { nativePriceUsd } from './prices.js'

const CHAIN_IDS: Partial<Record<Chain, number>> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137
}

export function isEvmChain(chain: Chain): boolean {
  return chain in CHAIN_IDS
}

interface EtherscanTx {
  hash: string
  from: string
  to: string
  gasUsed: string
  gasPrice: string
  timeStamp: string
  isError: string
  functionName?: string
  input?: string
}

export async function fetchEvmGasTxs(
  address: string,
  chain: Chain,
  opts: { apiKey?: string; fromBlock?: number; limit?: number } = {}
): Promise<GasTx[]> {
  const chainId = CHAIN_IDS[chain]
  if (!chainId) return []
  const apiKey = opts.apiKey ?? process.env.ETHERSCAN_API_KEY ?? ''
  const limit = opts.limit ?? 1000
  const url = new URL('https://api.etherscan.io/v2/api')
  url.searchParams.set('chainid', String(chainId))
  url.searchParams.set('module', 'account')
  url.searchParams.set('action', 'txlist')
  url.searchParams.set('address', address)
  url.searchParams.set('startblock', String(opts.fromBlock ?? 0))
  url.searchParams.set('endblock', '99999999')
  url.searchParams.set('page', '1')
  url.searchParams.set('offset', String(limit))
  url.searchParams.set('sort', 'desc')
  if (apiKey) url.searchParams.set('apikey', apiKey)

  let txs: EtherscanTx[] = []
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const body = (await res.json()) as { status: string; result: EtherscanTx[] | string }
    if (body.status !== '1' || !Array.isArray(body.result)) return []
    txs = body.result
  } catch {
    return []
  }

  const nativeUsd = await nativePriceUsd(chain)
  const normalized = txs
    .filter((t) => t.from.toLowerCase() === address.toLowerCase())
    .map<GasTx>((t) => {
      const gasUsed = BigInt(t.gasUsed ?? '0')
      const gasPrice = BigInt(t.gasPrice ?? '0')
      const feeWei = gasUsed * gasPrice
      const feeEth = Number(feeWei) / 1e18
      return {
        hash: t.hash,
        chain,
        from: t.from,
        to: t.to || null,
        blockTime: Number(t.timeStamp) * 1000,
        gasUsed,
        gasPriceWei: gasPrice,
        feeWei,
        feeUsd: feeEth * nativeUsd,
        method: t.functionName || null,
        success: t.isError === '0'
      }
    })
  return normalized
}
