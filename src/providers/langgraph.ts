// LangGraph provider. LangGraph persists state checkpoints via SqliteSaver
// at .langgraph_api/checkpoints.sqlite (dev) or wherever the user configured.
// We treat each thread_id as one session and derive turns from checkpoint diffs.

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
    path.join(process.cwd(), '.langgraph_api', 'checkpoints.sqlite'),
    path.join(os.homedir(), '.langgraph', 'checkpoints.sqlite'),
    path.join(process.cwd(), 'checkpoints.sqlite')
  ]
}

export const langgraphProvider: Provider = {
  id: 'langgraph',
  name: 'LangGraph',

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
      console.error('[langgraph] install better-sqlite3 to enable LangGraph support')
      return []
    }

    const db = new Sqlite(dbPath, { readonly: true, fileMustExist: true })
    const sessionsMap = new Map<string, AgentSession>()

    try {
      // LangGraph checkpoint schema: checkpoints(thread_id, checkpoint_id, parent_id, metadata, checkpoint)
      const rows = db
        .prepare(
          `SELECT thread_id, checkpoint_id, metadata, checkpoint FROM checkpoints ORDER BY checkpoint_id ASC`
        )
        .all() as { thread_id: string; checkpoint_id: string; metadata: Buffer; checkpoint: Buffer }[]

      for (const r of rows) {
        let meta: Record<string, unknown> = {}
        try {
          meta = JSON.parse(r.metadata.toString('utf8'))
        } catch {
          /* ignore */
        }
        const writes = (meta as any).writes ?? {}
        // Pull model + usage out of messages in the writes object.
        for (const node of Object.values(writes) as Record<string, unknown>[]) {
          const messages = Array.isArray((node as any)?.messages) ? (node as any).messages : []
          for (const m of messages) {
            if (m?.type !== 'ai' && m?.role !== 'assistant') continue
            const model = String(m?.response_metadata?.model_name ?? m?.model ?? 'unknown')
            const usage = m?.usage_metadata ?? m?.response_metadata?.usage ?? {}
            const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0)
            const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0)
            const tools = Array.isArray(m?.tool_calls)
              ? m.tool_calls.map((t: any) => String(t?.name ?? ''))
              : []
            const userText = String(m?.content ?? '')
            const ts = Number(m?.created_at ?? Date.now())
            const sessionId = String(r.thread_id)
            const turn: AgentTurn = {
              sessionId,
              provider: 'langgraph',
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
                provider: 'langgraph',
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
        }
      }
    } catch {
      // Unknown schema — skip.
    } finally {
      db.close()
    }

    return [...sessionsMap.values()]
  }
}
