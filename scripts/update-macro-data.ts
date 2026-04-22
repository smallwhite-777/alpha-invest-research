import { spawnSync } from 'node:child_process'

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`${command} ${args.join(' ')} failed with status ${result.status}`)
  }
}

function resolvePythonCommand() {
  const candidates = [
    { command: 'python', args: ['--version'] },
    { command: 'python3', args: ['--version'] },
  ]

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.args, {
      stdio: 'pipe',
      shell: false,
      encoding: 'utf8',
    })

    if (result.status === 0) {
      return candidate.command
    }
  }

  throw new Error('No usable Python interpreter found. Tried: python, python3')
}

function resolveNpmCommand() {
  return 'npm'
}

function main() {
  const python = resolvePythonCommand()
  const npm = resolveNpmCommand()

  console.log(`[macro:update] Using Python: ${python}`)
  run(python, ['scripts/refresh_macro_upstream.py'])

  console.log('[macro:update] Rebuilding published macro dataset')
  run(npm, ['run', 'macro:rebuild-data'])
}

main()
