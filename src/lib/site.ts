const DEFAULT_SITE_URL = 'https://open1nvest.com'

function normalizeUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL

  return normalizeUrl(configuredUrl)
}

export function getSiteOrigin() {
  return new URL(getSiteUrl())
}
