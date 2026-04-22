import 'dotenv/config'

import { importEventDatabase, importEventDatabaseIncremental } from '../src/lib/intelligence/event-database-import'

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

function readNumberFlag(name: string): number | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return undefined
  }

  const value = Number(process.argv[index + 1])
  return Number.isFinite(value) ? value : undefined
}

async function main() {
  const sharedOptions = {
    latestOnly: readFlag('--latest-only'),
    dryRun: readFlag('--dry-run'),
    filePath: readStringFlag('--path'),
    startDate: readStringFlag('--start-date'),
    endDate: readStringFlag('--end-date'),
  }

  const result = readFlag('--incremental')
    ? await importEventDatabaseIncremental({
        ...sharedOptions,
        batchDays: readNumberFlag('--batch-days'),
        newestFirst: !readFlag('--oldest-first'),
        maxBatches: readNumberFlag('--max-batches'),
      })
    : await importEventDatabase(sharedOptions)

  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error('Event database import failed:', error)
  process.exitCode = 1
})
