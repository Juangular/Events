import type { EventItem, EventOccurrence } from '../types'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function groupKey(event: EventItem): string {
  try {
    const url = new URL(event.sourceUrl)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(ref|aff)$/i.test(key)) url.searchParams.delete(key)
    }
    url.searchParams.sort()
    url.pathname = url.pathname.replace(/\/$/, '') || '/'
    return JSON.stringify([url.toString(), normalize(event.title), normalize(event.place), event.district,
      event.department, event.modality, event.category, event.organizer, event.source, event.requiresRegistration ?? false, event.registrationUrl])
  } catch { return event.id }
}

// Call after month/state filters so a card only contains the functions being viewed.
export function groupEventFunctions(events: readonly EventItem[]): EventItem[] {
  const groups = new Map<string, EventItem[]>()
  for (const event of events) {
    const key = groupKey(event)
    const group = groups.get(key) ?? []
    group.push(event)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0]!
    const sorted = [...group].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id))
    const occurrences = new Map<string, EventOccurrence>()
    for (const event of sorted) {
      const key = JSON.stringify([event.startDate, event.endDate, event.time])
      if (!occurrences.has(key)) occurrences.set(key, { id: event.id, startDate: event.startDate, endDate: event.endDate, time: event.time })
    }
    return { ...sorted[0]!, occurrences: occurrences.size > 1 ? [...occurrences.values()] : undefined }
  })
}
