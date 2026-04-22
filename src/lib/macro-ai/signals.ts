import 'server-only'

import { promises as fs } from 'fs'
import path from 'path'

const DEFAULT_SIGNAL_FILES = [
  'latest_signals.json',
  'leading_indicators_latest.json',
  'indicator_relationships.json',
  'macro_indicator_relationships.json',
]

export async function readMacroSignals() {
  const configuredDir = process.env.MACRO_SIGNALS_DIR
  if (!configuredDir) {
    return { files: [], items: [] as Array<{ file: string; content: unknown }> }
  }

  const signalDir = path.isAbsolute(configuredDir)
    ? configuredDir
    : path.join(process.cwd(), configuredDir)

  const items: Array<{ file: string; content: unknown }> = []
  for (const file of DEFAULT_SIGNAL_FILES) {
    const fullPath = path.join(signalDir, file)
    try {
      const raw = await fs.readFile(fullPath, 'utf8')
      items.push({ file, content: JSON.parse(raw) })
    } catch {
      // Optional signal files are allowed to be absent.
    }
  }

  return {
    files: items.map((item) => item.file),
    items,
  }
}

