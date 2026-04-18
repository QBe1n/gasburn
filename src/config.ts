import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'gasburn')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export interface GasburnConfig {
  wallets?: { address: string; chain: string; label?: string }[]
  etherscanApiKey?: string
  heliusApiKey?: string
  elizaPath?: string
  langgraphPath?: string
  openaiProxyLogPath?: string
}

export function loadConfig(): GasburnConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function saveConfig(cfg: GasburnConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

export function configPaths() {
  return { CONFIG_DIR, CONFIG_FILE }
}
