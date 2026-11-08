import assert from 'node:assert/strict'
import test from 'node:test'
import { EventDuplicates, planRangeDuplicates } from './duplicates'

const event = {
  id: 'original', title: 'Exposición de arte', place: 'Galería', source_url: 'https://example.com/event/arte/',
  start_date: '2026-11-06', end_date: '2026-12-19', fingerprint: 'original',
}

test('an ongoing publication is not inserted again when its start moves to today', () => {
  const known = new EventDuplicates()
  known.add(event)
  assert.equal(known.has({ ...event, start_date: '2026-11-07', fingerprint: 'next-day' }), true)
  assert.equal(known.has({ ...event, start_date: event.end_date, end_date: null, fingerprint: 'last-day' }), true)
})

test('real functions on different dates and different publications remain separate', () => {
  const known = new EventDuplicates()
  known.add({ ...event, end_date: null })
  assert.equal(known.has({ ...event, start_date: '2026-11-07', end_date: null, fingerprint: 'second-function' }), false)
  known.add(event)
  assert.equal(known.has({ ...event, end_date: '2027-12-19', start_date: '2027-11-06', fingerprint: 'next-year' }), false)
  assert.equal(known.has({ ...event, source_url: 'https://example.com/event/arte-2/', fingerprint: 'another-publication' }), false)
  assert.equal(known.has({ ...event, place: 'Otra galería', fingerprint: 'another-place' }), false)
})

test('tracking links share identity while meaningful query parameters remain distinct', () => {
  const known = new EventDuplicates()
  known.add({ ...event, source_url: `${event.source_url}?utm_source=mail&ref=list` })
  assert.equal(known.has({ ...event, start_date: '2026-11-07', fingerprint: 'shifted' }), true)
  assert.equal(known.has({ ...event, source_url: `${event.source_url}?session=2`, fingerprint: 'another-session' }), false)
})

test('repair keeps the earliest complete range, not an arbitrary last scrape', () => {
  const shifted = { ...event, id: 'shifted', start_date: '2026-11-07', fingerprint: 'shifted' }
  const lastDay = { ...event, id: 'last-day', start_date: event.end_date, end_date: null, fingerprint: 'last' }
  const other = { ...event, id: 'other', source_url: 'https://example.com/event/arte-2/', fingerprint: 'other' }
  assert.deepEqual(planRangeDuplicates([shifted, other, lastDay, event]).map(({ keep, archive }) => ({ keep: keep.id, archive: archive.map(row => row.id) })), [
    { keep: 'original', archive: ['shifted', 'last-day'] },
  ])
  assert.deepEqual(planRangeDuplicates([{ ...event, end_date: null }, { ...shifted, end_date: null }]), [])
})
