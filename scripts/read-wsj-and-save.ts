import 'dotenv/config'

import { importWsjEvents } from '../src/lib/intelligence/wsj-events-import'

async function main() {
  const result = await importWsjEvents({
    directoryPath: 'C:/Users/dafi/WorkBuddy/Knowledge Base/wsj_events_db/',
    dryRun: true,
    saveSnapshot: true,
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => {
  console.error('Failed to read WSJ data and save snapshot:', error)
  process.exitCode = 1
})
