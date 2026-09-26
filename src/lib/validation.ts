export function isValidHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

export function isValidTimestamp(value: string) {
  return !Number.isNaN(Date.parse(value))
}

export function isValidDateKey(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export function isValidImageUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}
