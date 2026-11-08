import assert from 'node:assert/strict'
import test from 'node:test'
import { groupEventFunctions } from '../src/lib/event-groups.ts'
import { matchesEventView } from '../src/lib/event-view.ts'
import { sortEvents } from '../src/lib/event-sort.ts'
import { getPagination } from '../src/lib/pagination.ts'

const base = {
  title: 'KARAOKE CON JORGE COLLAO', place: 'Mall del Sur — Rotonda', sourceUrl: 'https://malldelsur.pe/eventos/karaoke-con-jorge-collao/',
  source: 'Mall del Sur', organizer: 'Mall del Sur', district: 'San Juan de Miraflores', department: 'Lima',
  category: 'Música', modality: 'Presencial', description: 'Todos los miércoles y viernes. Entrada libre.',
  image: 'https://example.com/poster.jpg', tags: [], time: '6:00 p. m. – 8:00 p. m.',
}
const functions = [11, 13, 18, 20, 25, 27].map(day => Object.freeze({ ...base, id: `karaoke-${day}`, startDate: `2026-11-${day}` }))

test('six real karaoke functions become one card with all dates and no invented range', () => {
  const result = groupEventFunctions(Object.freeze([...functions].reverse()))
  assert.equal(result.length, 1)
  assert.equal(result[0].startDate, '2026-11-11')
  assert.equal(result[0].endDate, undefined)
  assert.deepEqual(result[0].occurrences.map(o => o.startDate), functions.map(o => o.startDate))
  assert.ok(result[0].occurrences.every(o => o.time === base.time))
  assert.ok(functions.every(o => !o.occurrences))
})

test('separate publications, venues and registration destinations are not merged by title', () => {
  for (const change of [{ sourceUrl: `${base.sourceUrl}?session=other` }, { sourceUrl: 'https://malldelsur.pe/eventos/otra-ficha/' },
    { place: 'Plaza Norte — Rotonda' }, { registrationUrl: 'https://example.com/another-registration' }]) {
    assert.equal(groupEventFunctions([functions[0], { ...functions[1], ...change }]).length, 2)
  }
})

test('tracking links do not split a series and distinct times on one day are preserved', () => {
  const result = groupEventFunctions([functions[0], { ...functions[1], sourceUrl: `${base.sourceUrl}?ref=agenda&utm_source=test` },
    { ...functions[0], id: 'late', time: '9:00 p. m.' }, { ...functions[0], id: 'duplicate' }])
  assert.equal(result.length, 1)
  assert.equal(result[0].occurrences.length, 3)
  assert.deepEqual(result[0].occurrences.map(o => o.time), [base.time, '9:00 p. m.', base.time])
})

test('filtering by month and state before grouping retains only matching functions', () => {
  const otherMonth = { ...functions[0], id: 'december', startDate: '2026-12-02' }
  const visible = view => groupEventFunctions([...functions, otherMonth].filter(event => event.startDate.startsWith('2026-11')
    && matchesEventView(view, event.endDate ?? event.startDate, '2026-11-19')))
  assert.deepEqual(visible('disponibles')[0].occurrences.map(o => o.startDate), ['2026-11-20', '2026-11-25', '2026-11-27'])
  assert.deepEqual(visible('pasados')[0].occurrences.map(o => o.startDate), ['2026-11-11', '2026-11-13', '2026-11-18'])
})

test('sorting and pagination operate on cards rather than the underlying functions', () => {
  const single = { ...functions[0], id: 'single', title: 'Otro evento', sourceUrl: 'https://example.com/other', startDate: '2026-11-09' }
  const cards = sortEvents(groupEventFunctions([...functions, single]), 'date-asc')
  assert.deepEqual(cards.map(c => c.id), ['single', 'karaoke-11'])
  assert.equal(getPagination(cards.length, 1, 10).pageCount, 1)
  assert.equal(cards.length, 2)
})
