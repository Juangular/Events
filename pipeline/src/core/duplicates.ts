import { isValidDateKey, normalizeText } from './text'

export interface DuplicateEvent {
  title: string
  place: string
  source_url: string
  start_date: string
  end_date: string | null
  fingerprint: string | null
}

function rangeKey(event: DuplicateEvent): string | undefined {
  const end = event.end_date ?? event.start_date
  if (!isValidDateKey(event.start_date) || !isValidDateKey(end) || end < event.start_date) return
  try {
    const url = new URL(event.source_url)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(ref|aff)$/i.test(key)) url.searchParams.delete(key)
    }
    url.searchParams.sort()
    url.pathname = url.pathname.replace(/\/$/, '') || '/'
    return JSON.stringify([normalizeText(event.title), normalizeText(event.place), url.toString(), end])
  } catch { return undefined }
}

export class EventDuplicates {
  private fingerprints = new Set<string>()
  private publications = new Set<string>()
  private ranges = new Set<string>()

  has(event: DuplicateEvent): boolean {
    if (event.fingerprint && this.fingerprints.has(event.fingerprint)) return true
    const key = rangeKey(event)
    if (!key) return false
    // A source may move an ongoing event's start to today while retaining its end.
    return (event.end_date && event.end_date > event.start_date ? this.publications : this.ranges).has(key)
  }

  add(event: DuplicateEvent): void {
    if (event.fingerprint) this.fingerprints.add(event.fingerprint)
    const key = rangeKey(event)
    if (!key) return
    this.publications.add(key)
    if (event.end_date && event.end_date > event.start_date) this.ranges.add(key)
  }
}

export function planRangeDuplicates<T extends DuplicateEvent & { id: string }>(rows: T[]): Array<{ keep: T; archive: T[] }> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = rangeKey(row)
    if (!key) continue
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  return [...groups.values()].flatMap((group) => {
    if (group.length < 2 || !group.some(row => row.end_date && row.end_date > row.start_date)) return []
    const [keep, ...archive] = [...group].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id))
    return [{ keep: keep!, archive }]
  })
}
