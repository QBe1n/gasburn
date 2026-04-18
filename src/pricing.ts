// Minimal LLM pricing table. Per-million-token USD. Keep small and hardcoded so
// gasburn works fully offline. Users can override via GASBURN_PRICING env var
// pointing to a JSON file with the same shape.

import fs from 'node:fs'

export interface ModelPrice {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

const BASE: Record<string, ModelPrice> = {
  // Anthropic
  'claude-opus-4-1': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  // OpenAI
  'gpt-5': { input: 5, output: 15, cacheRead: 0.5, cacheWrite: 0 },
  'gpt-5-mini': { input: 0.5, output: 1.5, cacheRead: 0.05, cacheWrite: 0 },
  'gpt-4o': { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
  'o1': { input: 15, output: 60, cacheRead: 7.5, cacheWrite: 0 },
  // Google
  'gemini-2-5-pro': { input: 1.25, output: 10, cacheRead: 0.31, cacheWrite: 0 },
  'gemini-2-5-flash': { input: 0.3, output: 2.5, cacheRead: 0.075, cacheWrite: 0 },
  // Cheap fallback
  unknown: { input: 1, output: 3, cacheRead: 0.1, cacheWrite: 0 }
}

let cache: Record<string, ModelPrice> | null = null

export function loadPricing(): Record<string, ModelPrice> {
  if (cache) return cache
  const override = process.env.GASBURN_PRICING
  if (override && fs.existsSync(override)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(override, 'utf8'))
      cache = { ...BASE, ...parsed }
      return cache
    } catch {
      /* fall through */
    }
  }
  cache = BASE
  return cache
}

function normalize(model: string): string {
  const m = model.toLowerCase()
  // collapse versioned names to canonical keys
  if (m.includes('opus')) return 'claude-opus-4-1'
  if (m.includes('sonnet')) return 'claude-sonnet-4-5'
  if (m.includes('haiku')) return 'claude-haiku-4'
  if (m.startsWith('gpt-5-mini')) return 'gpt-5-mini'
  if (m.startsWith('gpt-5')) return 'gpt-5'
  if (m.startsWith('gpt-4o')) return 'gpt-4o'
  if (m.startsWith('o1')) return 'o1'
  if (m.includes('gemini') && m.includes('pro')) return 'gemini-2-5-pro'
  if (m.includes('gemini')) return 'gemini-2-5-flash'
  return 'unknown'
}

export function priceFor(model: string): ModelPrice {
  const table = loadPricing()
  return table[normalize(model)] ?? table.unknown
}

export function costUsd(
  model: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheWrite: number
): number {
  const p = priceFor(model)
  return (
    (input * p.input) / 1e6 +
    (output * p.output) / 1e6 +
    (cacheRead * p.cacheRead) / 1e6 +
    (cacheWrite * p.cacheWrite) / 1e6
  )
}
