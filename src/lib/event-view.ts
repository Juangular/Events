export type EventScope = 'disponibles' | 'pasados'
export type EventView = EventScope | 'archivo' | 'proximos'

export function getEventView(month: number, year: number, today: string, scope: EventScope): EventView {
  const selectedMonth = `${year}-${String(month + 1).padStart(2, '0')}`
  const currentMonth = today.slice(0, 7)
  if (selectedMonth < currentMonth) return 'archivo'
  if (selectedMonth > currentMonth) return 'proximos'
  return scope
}

export function matchesEventView(view: EventView, endDate: string, today: string): boolean {
  // The archive includes everything that overlapped that month, even a still-running event.
  if (view === 'archivo') return true
  return view === 'pasados' ? endDate < today : endDate >= today
}
