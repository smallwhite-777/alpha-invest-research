import 'dotenv/config'

import { importEventDatabase } from '../src/lib/intelligence/event-database-import'

function readFlag(name: string) {
  return process.argv.includes(name)
}

function readStringFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

async function main() {
  const result = await importEventDatabase({
    latestOnly: readFlag('--latest-only'),
    dryRun: readFlag('--dry-run'),
    filePath: readStringFlag('--path'),
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error('Event database import failed:', error)
  process.exitCode = 1
})
