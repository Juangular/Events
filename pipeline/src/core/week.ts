import { isoDateInLima } from './text'

export interface Week {
  start: string
  end: string
}

export function currentWeekInLima(now = new Date()): Week {
  const today = isoDateInLima(now)
  const date = new Date(`${today}T12:00:00Z`)
  const weekday = date.getUTCDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  date.setUTCDate(date.getUTCDate() + mondayOffset)
  const start = date.toISOString().slice(0, 10)
  date.setUTCDate(date.getUTCDate() + 6)
  return { start, end: date.toISOString().slice(0, 10) }
}
