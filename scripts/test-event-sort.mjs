import assert from 'node:assert/strict'
import test from 'node:test'
import { eventSortOptions, sortEvents } from '../src/lib/event-sort.ts'

const events = [
  { id: 'z', title: 'Zapatos', startDate: '2026-11-01', category: 'Deportes', district: 'Miraflores' },
  { id: 'a', title: 'Árboles', startDate: '2026-11-03', category: 'Cultura', district: 'Barranco' },
  { id: 'n', title: 'Niños', startDate: '2026-11-02', category: 'Familiar', district: undefined },
  { id: 'b', title: 'barcos', startDate: '2026-11-02', category: 'Deportes', district: 'San Borja' },
]
const ids = (order) => sortEvents(events, order).map((event) => event.id)

test('orders Spanish names in both directions without mutating the source array', () => {
  const original = [...events]
  assert.deepEqual(ids('name-asc'), ['a', 'b', 'n', 'z'])
  assert.deepEqual(ids('name-desc'), ['z', 'n', 'b', 'a'])
  assert.deepEqual(events, original)
})

test('orders dates before pagination with deterministic alphabetical ties', () => {
  assert.deepEqual(ids('date-asc'), ['z', 'b', 'n', 'a'])
  assert.deepEqual(ids('date-desc'), ['a', 'b', 'n', 'z'])
})

test('orders categories and districts, placing events without district last', () => {
  assert.deepEqual(ids('category-asc'), ['a', 'b', 'z', 'n'])
  assert.deepEqual(ids('district-asc'), ['a', 'z', 'b', 'n'])
  assert.equal(eventSortOptions.length, 6)
})
