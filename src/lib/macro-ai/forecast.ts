import 'server-only'

import type { MacroForecastPayload } from './types'

const DEFAULT_TIMEOUT_MS = 15000

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getMacroForecast(series: string, horizon = 3): Promise<MacroForecastPayload | null> {
  const baseUrl = process.env.TIMESFM_API_URL
  if (!baseUrl) return null

  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/forecast/${encodeURIComponent(series)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        series,
        horizon,
        context_len: 128,
        num_samples: 20,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const values = Array.isArray(data?.predictions?.mean) ? data.predictions.mean : []
    const lower80 = Array.isArray(data?.lower_80) ? data.lower_80 : []
    const upper80 = Array.isArray(data?.upper_80) ? data.upper_80 : []

    if (values.length === 0) return null

    return {
      series,
      horizon: Number(data?.horizon || horizon),
      values,
      lower80,
      upper80,
      model: 'ChronosBolt',
      forecastDate: typeof data?.forecast_date === 'string' ? data.forecast_date : undefined,
    }
  } catch {
    return null
  }
}

