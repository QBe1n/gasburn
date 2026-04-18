import { describe, it, expect } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

import { genericJsonlProvider } from '../src/providers/generic-jsonl.js'
import { aggregate } from '../src/aggregate.js'
import { detectLeaks } from '../src/leaks.js'
import { classify } from '../src/classifier.js'
import { costUsd } from '../src/pricing.js'

describe('classifier', () => {
  it('detects trade-execution from tool names', () => {
    expect(classify(['uniswap', 'swap'], 'buy some eth')).toBe('trade-execution')
  })
  it('detects market-research from keywords', () => {
    expect(classify([], 'what is the price of pepe')).toBe('market-research')
  })
  it('detects idle chat when no tools and no keywords', () => {
    expect(classify([], 'lol ok')).toBe('idle-chat')
  })
  it('detects contract-write', () => {
    expect(classify(['sendTransaction'], 'send tx')).toBe('contract-write')
  })
})

describe('pricing', () => {
  it('prices opus correctly (mtok basis)', () => {
    const c = costUsd('claude-opus-4', 1_000_000, 0, 0, 0)
    expect(c).toBeCloseTo(15, 2)
  })
  it('falls back to unknown pricing safely', () => {
    const c = costUsd('mystery-model', 1000, 1000, 0, 0)
    expect(c).toBeGreaterThan(0)
  })
})

describe('generic-jsonl provider', () => {
  it('loads the sample fixture and builds sessions', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gasburn-'))
    fs.copyFileSync(
      path.join(process.cwd(), 'fixtures', 'sample.jsonl'),
      path.join(tmp, 'sample.jsonl')
    )
    const sessions = await genericJsonlProvider.loadSessions([tmp])
    expect(sessions.length).toBe(3)
    const s1 = sessions.find((s) => s.sessionId === 'sess-1')!
    expect(s1.turns.length).toBe(6)
    expect(s1.llmCostUsd).toBeGreaterThan(0)
  })
})

describe('aggregate + leak detector', () => {
  it('flags the idle-chat leak on sess-1 and research-no-action on sess-2', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gasburn-'))
    fs.copyFileSync(
      path.join(process.cwd(), 'fixtures', 'sample.jsonl'),
      path.join(tmp, 'sample.jsonl')
    )
    const sessions = await genericJsonlProvider.loadSessions([tmp])
    const leaks = detectLeaks(sessions, [])
    const ids = leaks.map((l) => l.id)
    expect(ids).toContain('idle-chat')
    expect(ids).toContain('research-no-action')
  })

  it('aggregates into a full dashboard shape', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gasburn-'))
    fs.copyFileSync(
      path.join(process.cwd(), 'fixtures', 'sample.jsonl'),
      path.join(tmp, 'sample.jsonl')
    )
    const sessions = await genericJsonlProvider.loadSessions([tmp])
    const d = aggregate(sessions, [], 'all')
    expect(d.totals.sessions).toBe(3)
    expect(d.byCategory.length).toBeGreaterThan(0)
    expect(d.byModel.length).toBeGreaterThan(0)
    expect(d.byDay.length).toBeGreaterThan(0)
  })
})
