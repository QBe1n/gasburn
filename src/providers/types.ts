import type { AgentSession, ProviderId } from '../types.js'

export interface Provider {
  id: ProviderId
  name: string
  defaultPaths(): string[]
  isAvailable(paths?: string[]): boolean
  loadSessions(paths?: string[]): Promise<AgentSession[]>
}
