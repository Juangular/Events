import type { EventItem } from '../types'

export const eventSortOptions = [
  { value: 'name-asc', label: 'Nombre: A–Z' },
  { value: 'name-desc', label: 'Nombre: Z–A' },
  { value: 'date-asc', label: 'Fecha: ascendente' },
  { value: 'date-desc', label: 'Fecha: descendente' },
  { value: 'category-asc', label: 'Categoría: A–Z' },
  { value: 'district-asc', label: 'Distrito: A–Z' },
] as const

export type EventSort = (typeof eventSortOptions)[number]['value']
const collator = new Intl.Collator('es-PE', { sensitivity: 'base', numeric: true, ignorePunctuation: true })

export function sortEvents(events: readonly EventItem[], order: EventSort): EventItem[] {
  return [...events].sort((a, b) => {
    let primary = 0
    switch (order) {
      case 'name-asc': primary = collator.compare(a.title, b.title); break
      case 'name-desc': primary = collator.compare(b.title, a.title); break
      case 'date-asc': primary = a.startDate.localeCompare(b.startDate); break
      case 'date-desc': primary = b.startDate.localeCompare(a.startDate); break
      case 'category-asc': primary = collator.compare(a.category, b.category); break
      case 'district-asc': primary = a.district && b.district ? collator.compare(a.district, b.district) : a.district ? -1 : b.district ? 1 : 0; break
    }
    return primary || collator.compare(a.title, b.title) || a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id)
  })
}
