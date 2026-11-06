import assert from 'node:assert/strict'
import test from 'node:test'
import { getEventView, matchesEventView } from '../src/lib/event-view.ts'

test('past and future months select their own view, regardless of the current-month choice', () => {
  for (const scope of ['disponibles', 'pasados']) {
    assert.equal(getEventView(9, 2026, '2026-11-06', scope), 'archivo')
    assert.equal(getEventView(11, 2026, '2026-11-06', scope), 'proximos')
    assert.equal(getEventView(10, 2026, '2026-11-06', scope), scope)
    assert.equal(getEventView(11, 2025, '2026-01-01', scope), 'archivo')
    assert.equal(getEventView(0, 2027, '2026-12-31', scope), 'proximos')
  }
})

test('current-month available and past events separate at the Lima date boundary', () => {
  const today = '2026-11-06'
  for (const endDate of ['2026-11-05', today, '2026-11-07']) {
    assert.equal(matchesEventView('disponibles', endDate, today), endDate >= today)
    assert.equal(matchesEventView('pasados', endDate, today), endDate < today)
  }
})

test('the archive does not lose multi-month events that are still available today', () => {
  const view = getEventView(9, 2026, '2026-11-06', 'disponibles')
  assert.equal(matchesEventView(view, '2026-10-12', '2026-11-06'), true)
  assert.equal(matchesEventView(view, '2026-12-31', '2026-11-06'), true)
  assert.equal(matchesEventView('proximos', '2026-12-31', '2026-11-06'), true)
})
