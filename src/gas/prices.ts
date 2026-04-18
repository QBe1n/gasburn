// Fetch native-token USD prices from a free public API. Cached for 1h on disk.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { Chain } from '../types.js'

const CACHE_DIR = path.join(os.homedir(), '.cache', 'gasburn')
const CACHE_FILE = path.join(CACHE_DIR, 'prices.json')
const TTL_MS = 60 * 60 * 1000

const COINGECKO_IDS: Record<Chain, string> = {
  ethereum: 'ethereum',
  base: 'ethereum',
  arbitrum: 'ethereum',
  optimism: 'ethereum',
  polygon: 'matic-network',
  solana: 'solana'
}

interface CacheShape {
  fetchedAt: number
  prices: Record<string, number>
}

function readCache(): CacheShape | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as CacheShape
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(data: CacheShape): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data))
  } catch {
    /* best effort */
  }
}

export async function nativePriceUsd(chain: Chain): Promise<number> {
  const cacheKey = COINGECKO_IDS[chain]
  const cache = readCache()
  if (cache && cache.prices[cacheKey] !== undefined) return cache.prices[cacheKey]

  const ids = [...new Set(Object.values(COINGECKO_IDS))].join(',')
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    )
    if (!res.ok) throw new Error(`coingecko ${res.status}`)
    const body = (await res.json()) as Record<string, { usd: number }>
    const prices: Record<string, number> = {}
    for (const [id, v] of Object.entries(body)) prices[id] = v.usd
    writeCache({ fetchedAt: Date.now(), prices })
    return prices[cacheKey] ?? 0
  } catch {
    // Offline fallback — common sense defaults, clearly wrong but nonzero.
    const fallback: Record<string, number> = {
      ethereum: 3500,
      'matic-network': 0.5,
      solana: 180
    }
    return fallback[cacheKey] ?? 0
  }
}
