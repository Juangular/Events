import { createHash } from 'node:crypto'

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

export function normalizeText(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fingerprint(title: string, startDate: string, place: string): string {
  return createHash('sha256')
    .update(`${normalizeText(title)}|${startDate}|${normalizeText(place)}`)
    .digest('hex')
}

export function isoDateInLima(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

const MONTHS_ES: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  set: 9,
  oct: 10,
  nov: 11,
  dic: 12,
}

export function parseSpanishMonth(raw: string): number | null {
  const key = stripAccents(raw).toLowerCase().slice(0, 3)
  return MONTHS_ES[key] ?? null
}

export function toIsoDate(year: number, month: number, day: number): string | null {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const key = `${year}-${mm}-${dd}`
  return isValidDateKey(key) ? key : null
}

export function isValidDateKey(value: string): boolean {
  const date = new Date(`${value}T12:00:00`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

function to12h(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'a. m.' : 'p. m.'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`
}

function normalizeClock(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  const isPm = match[3]?.toLowerCase() === 'p'
  if (hour > 12 || minute > 59) return null
  const hour24 = isPm ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour
  return to12h(hour24, minute)
}

export function normalizeTimeText(value: string): string | null {
  const text = value.trim()
  const range = text.match(/^(?:de\s+)?(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)\s*(?:a|–|-|—)\s*(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)$/i)
  if (range) {
    const start = normalizeClock(range[1] ?? '')
    const end = normalizeClock(range[2] ?? '')
    if (start && end) return `${start} – ${end}`
    return null
  }
  return normalizeClock(text)
}

export function timeRangeFromIso(startIso?: string, endIso?: string): string {
  const start = startIso?.match(/T(\d{2}):(\d{2})/)
  const end = endIso?.match(/T(\d{2}):(\d{2})/)
  const startText = start ? to12h(Number(start[1]), Number(start[2])) : ''
  const endText = end ? to12h(Number(end[1]), Number(end[2])) : ''
  if (startText && endText && endIso && startIso && endIso.slice(0, 10) === startIso.slice(0, 10)) {
    return `${startText} – ${endText}`
  }
  return startText || endText || 'Consultar horario'
}

export function dateFromIso(value?: string): string | null {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

export function firstSentence(value: string, maxLength = 600): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  const cut = clean.slice(0, maxLength)
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut).trim()
}
