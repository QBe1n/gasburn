// Generic JSONL provider. Reads any directory of *.jsonl files where each line
// is a turn with shape:
// {
//   "session_id": string,
//   "timestamp": number | ISO string,
//   "model": string,
//   "user_message"?: string,
//   "input_tokens"?: number,
//   "output_tokens"?: number,
//   "cache_read_tokens"?: number,
//   "cache_write_tokens"?: number,
//   "tools"?: string[],
//   "wallets"?: string[]
// }
// This is the "escape hatch" so any custom agent can plug in by writing a log.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { classify } from '../classifier.js'
import { costUsd } from '../pricing.js'
import type { AgentSession, AgentTurn } from '../types.js'

import type { Provider } from './types.js'

function toMs(ts: unknown): number {
  if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts)
    if (!Number.isNaN(parsed)) return parsed
  }
  return Date.now()
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()!
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const full = path.join(current, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full)
    }
  }
  return out
}

export const genericJsonlProvider: Provider = {
  id: 'generic-jsonl',
  name: 'Generic JSONL',

  defaultPaths() {
    return [
      path.join(os.homedir(), '.gasburn', 'logs'),
      path.join(process.cwd(), 'logs')
    ]
  },

  isAvailable(paths) {
    const searchPaths = paths ?? this.defaultPaths()
    return searchPaths.some((p) => walk(p).length > 0)
  },

  async loadSessions(paths) {
    const searchPaths = paths ?? this.defaultPaths()
    const files = searchPaths.flatMap((p) => walk(p))
    const sessionsMap = new Map<string, AgentSession>()

    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
      for (const line of lines) {
        let obj: Record<string, unknown>
        try {
          obj = JSON.parse(line)
        } catch {
          continue
        }
        const sessionId = String(obj.session_id ?? path.basename(file, '.jsonl'))
        const model = String(obj.model ?? 'unknown')
        const input = Number(obj.input_tokens ?? 0)
        const output = Number(obj.output_tokens ?? 0)
        const cacheRead = Number(obj.cache_read_tokens ?? 0)
        const cacheWrite = Number(obj.cache_write_tokens ?? 0)
        const tools = Array.isArray(obj.tools) ? (obj.tools as string[]).map(String) : []
        const wallets = Array.isArray(obj.wallets) ? (obj.wallets as string[]).map(String) : []
        const ts = toMs(obj.timestamp)
        const userText = String(obj.user_message ?? '')
        const category = classify(tools, userText)
        const turn: AgentTurn = {
          sessionId,
          provider: 'generic-jsonl',
          timestamp: ts,
          model,
          inputTokens: input,
          outputTokens: output,
          cacheReadTokens: cacheRead,
          cacheWriteTokens: cacheWrite,
          toolNames: tools,
          userMessageText: userText,
          category,
          costUsd: costUsd(model, input, output, cacheRead, cacheWrite)
        }

        let session = sessionsMap.get(sessionId)
        if (!session) {
          session = {
            sessionId,
            provider: 'generic-jsonl',
            startedAt: ts,
            endedAt: ts,
            turns: [],
            llmCostUsd: 0,
            linkedWallets: []
          }
          sessionsMap.set(sessionId, session)
        }
        session.turns.push(turn)
        session.startedAt = Math.min(session.startedAt, ts)
        session.endedAt = Math.max(session.endedAt, ts)
        session.llmCostUsd += turn.costUsd
        for (const w of wallets) {
          if (!session.linkedWallets.includes(w)) session.linkedWallets.push(w)
        }
      }
    }

    return [...sessionsMap.values()]
  }
}
