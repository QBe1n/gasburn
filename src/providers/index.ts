import { elizaProvider } from './eliza.js'
import { genericJsonlProvider } from './generic-jsonl.js'
import { langgraphProvider } from './langgraph.js'
import { openaiProxyProvider } from './openai-proxy.js'
import type { Provider } from './types.js'

export const PROVIDERS: Provider[] = [
  elizaProvider,
  langgraphProvider,
  openaiProxyProvider,
  genericJsonlProvider
]

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}
