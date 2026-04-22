import 'dotenv/config'

import { importWsjEvents } from '../src/lib/intelligence/wsj-events-import'

function readFlag(name: string) {
  return process.argv.includes(name)
}

function readNumberFlag(name: string): number | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return undefined
  }

  const value = Number(process.argv[index + 1])
  return Number.isFinite(value) ? value : undefined
}

function readStringFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

async function main() {
  const result = await importWsjEvents({
    latestOnly: readFlag('--latest-only'),
    dryRun: readFlag('--dry-run'),
    maxFiles: readNumberFlag('--max-files'),
    directoryPath: readStringFlag('--path'),
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error('WSJ import failed:', error)
  process.exitCode = 1
})
