import assert from 'node:assert/strict'
import test from 'node:test'
import { publicationDecision } from './publication'
import type { CandidateEvent } from '../types'

const valid: CandidateEvent = {
  title: 'Feria del libro', description: 'Ingreso libre.', category: 'Cultura', modality: 'Presencial',
  startDate: '2026-11-14', time: '10:00 a. m.', place: 'Centro cultural', district: 'Miraflores',
  organizer: 'Organización cultural', source: 'EntradaLibre', sourceUrl: 'https://entradalibre.me/event/libro/',
  requiresRegistration: false, tags: [], freeSignal: true, raw: { provenance: 'aggregator' },
}

test('all valid sources publish without an aggregator or legacy review exception', () => {
  for (const source of ['EntradaLibre', 'Running4Peru', 'Vamos Eventos', 'Gran Teatro Nacional', 'Mall del Sur', 'Plaza Norte']) {
    const historical = { ...valid, source, needsReview: true }
    assert.equal(publicationDecision(historical, '2026-11-06').status, 'published', source)
  }
})

test('invalid data is rejected, never stored as a draft or published', () => {
  const invalid: CandidateEvent[] = [
    { ...valid, description: 'Entrada S/50.' }, { ...valid, startDate: '2026-11-05' },
    { ...valid, district: 'Callao' }, { ...valid, district: undefined },
    { ...valid, requiresRegistration: true }, { ...valid, qualityIssues: ['date:inferred'] },
    { ...valid, qualityIssues: ['schedule:ambiguous'] }, { ...valid, time: 'Consultar horario' },
    { ...valid, freeSignal: false, description: 'Actividad sin precio confirmado.' },
  ]
  for (const candidate of invalid) {
    const decision = publicationDecision(candidate, '2026-11-06')
    assert.equal(decision.status, 'rejected')
    assert.ok(decision.reasons.length)
  }
})
