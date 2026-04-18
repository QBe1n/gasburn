// Eliza provider. Eliza persists memories in a SQLite DB at
// ~/.eliza/memories.sqlite (or project-local ./agent/memories.sqlite).
// Schema varies across Eliza versions; we query defensively and fall back
// to JSONL logs if the DB isn't found.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { classify } from '../classifier.js'
import { costUsd } from '../pricing.js'
import type { AgentSession, AgentTurn } from '../types.js'

import type { Provider } from './types.js'

async function loadSqlite() {
  try {
    const mod = await import('better-sqlite3')
    return mod.default
  } catch {
    return null
  }
}

function candidateDbPaths(): string[] {
  return [
    path.join(os.homedir(), '.eliza', 'memories.sqlite'),
    path.join(os.homedir(), '.eliza', 'db.sqlite'),
    path.join(process.cwd(), 'agent', 'memories.sqlite'),
    path.join(process.cwd(), 'data', 'db.sqlite')
  ]
}

export const elizaProvider: Provider = {
  id: 'eliza',
  name: 'Eliza',

  defaultPaths() {
    return candidateDbPaths()
  },

  isAvailable(paths) {
    const searchPaths = paths ?? this.defaultPaths()
    return searchPaths.some((p) => fs.existsSync(p))
  },

  async loadSessions(paths) {
    const searchPaths = paths ?? this.defaultPaths()
    const dbPath = searchPaths.find((p) => fs.existsSync(p))
    if (!dbPath) return []

    const Sqlite = await loadSqlite()
    if (!Sqlite) {
      console.error('[eliza] install better-sqlite3 to enable Eliza support')
      return []
    }

    const db = new Sqlite(dbPath, { readonly: true, fileMustExist: true })
    const sessionsMap = new Map<string, AgentSession>()

    // Try known Eliza schemas. Wrap in try/catch so a missing table just means
    // "this DB isn't Eliza" rather than a crash.
    try {
      const rows = db
        .prepare(
          `SELECT roomId, userId, content, createdAt FROM memories ORDER BY createdAt ASC`
        )
        .all() as { roomId: string; userId: string; content: string; createdAt: number }[]

      for (const r of rows) {
        let parsed: Record<string, unknown> = {}
        try {
          parsed = typeof r.content === 'string' ? JSON.parse(r.content) : r.content
        } catch {
          parsed = { text: r.content }
        }
        const model = String(parsed.model ?? 'unknown')
        const input = Number((parsed.usage as any)?.prompt_tokens ?? parsed.input_tokens ?? 0)
        const output = Number((parsed.usage as any)?.completion_tokens ?? parsed.output_tokens ?? 0)
        const tools = Array.isArray((parsed as any).actions) ? (parsed as any).actions.map(String) : []
        const userText = String(parsed.text ?? '')
        const ts = Number(r.createdAt ?? Date.now())
        const sessionId = String(r.roomId ?? 'default')
        const turn: AgentTurn = {
          sessionId,
          provider: 'eliza',
          timestamp: ts < 1e12 ? ts * 1000 : ts,
          model,
          inputTokens: input,
          outputTokens: output,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          toolNames: tools,
          userMessageText: userText,
          category: classify(tools, userText),
          costUsd: costUsd(model, input, output, 0, 0)
        }
        let session = sessionsMap.get(sessionId)
        if (!session) {
          session = {
            sessionId,
            provider: 'eliza',
            startedAt: turn.timestamp,
            endedAt: turn.timestamp,
            turns: [],
            llmCostUsd: 0,
            linkedWallets: []
          }
          sessionsMap.set(sessionId, session)
        }
        session.turns.push(turn)
        session.startedAt = Math.min(session.startedAt, turn.timestamp)
        session.endedAt = Math.max(session.endedAt, turn.timestamp)
        session.llmCostUsd += turn.costUsd
      }
    } catch (err) {
      // Unknown schema — return empty rather than crash.
    } finally {
      db.close()
    }

    return [...sessionsMap.values()]
  }
}
