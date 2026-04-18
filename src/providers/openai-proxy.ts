// OpenAI-proxy provider. If you run any agent through LiteLLM, OpenRouter,
// or a custom OpenAI-compatible proxy, tail its request log (JSONL) here.
// Expected log shape (per line):
// {
//   "session_id"?: string,
//   "timestamp": string | number,
//   "model": string,
//   "usage": { "prompt_tokens": number, "completion_tokens": number },
//   "tools"?: string[],
//   "user_message"?: string
// }

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { classify } from '../classifier.js'
import { costUsd } from '../pricing.js'
import type { AgentSession, AgentTurn } from '../types.js'

import type { Provider } from './types.js'

function candidatePaths(): string[] {
  return [
    path.join(os.homedir(), '.gasburn', 'openai-proxy.jsonl'),
    path.join(os.homedir(), '.litellm', 'requests.jsonl'),
    path.join(process.cwd(), 'openai-proxy.jsonl')
  ]
}

function toMs(ts: unknown): number {
  if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts
  if (typeof ts === 'string') {
    const p = Date.parse(ts)
    if (!Number.isNaN(p)) return p
  }
  return Date.now()
}

export const openaiProxyProvider: Provider = {
  id: 'openai-proxy',
  name: 'OpenAI-compatible Proxy',

  defaultPaths() {
    return candidatePaths()
  },

  isAvailable(paths) {
    const searchPaths = paths ?? this.defaultPaths()
    return searchPaths.some((p) => fs.existsSync(p))
  },

  async loadSessions(paths) {
    const searchPaths = paths ?? this.defaultPaths()
    const sessionsMap = new Map<string, AgentSession>()

    for (const file of searchPaths) {
      if (!fs.existsSync(file)) continue
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
      for (const line of lines) {
        let obj: Record<string, unknown>
        try {
          obj = JSON.parse(line)
        } catch {
          continue
        }
        const sessionId = String(obj.session_id ?? obj.request_id ?? 'default')
        const model = String(obj.model ?? 'unknown')
        const usage = (obj.usage ?? {}) as Record<string, number>
        const input = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0)
        const output = Number(usage.completion_tokens ?? usage.output_tokens ?? 0)
        const tools = Array.isArray(obj.tools) ? (obj.tools as string[]).map(String) : []
        const userText = String(obj.user_message ?? '')
        const ts = toMs(obj.timestamp)
        const turn: AgentTurn = {
          sessionId,
          provider: 'openai-proxy',
          timestamp: ts,
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
            provider: 'openai-proxy',
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
      }
    }

    return [...sessionsMap.values()]
  }
}
