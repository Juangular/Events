import type { CandidateEvent, GateResult } from '../types'
import { isValidDateKey, isValidHttpsUrl, isoDateInLima, normalizeText } from './text'

const LIMA_DISTRICTS = new Set(
  [
    'Ancón',
    'Ate',
    'Barranco',
    'Breña',
    'Carabayllo',
    'Chaclacayo',
    'Cieneguilla',
    'Comas',
    'Chorrillos',
    'El Agustino',
    'Independencia',
    'Jesús María',
    'La Molina',
    'La Victoria',
    'Lince',
    'Los Olivos',
    'Lurigancho',
    'Lurín',
    'Magdalena del Mar',
    'Miraflores',
    'Pachacámac',
    'Pucusana',
    'Puente Piedra',
    'Pueblo Libre',
    'Punta Hermosa',
    'Punta Negra',
    'Rímac',
    'San Bartolo',
    'San Borja',
    'San Isidro',
    'San Juan de Lurigancho',
    'San Juan de Miraflores',
    'San Luis',
    'San Martín de Porres',
    'San Miguel',
    'Santa Anita',
    'Santa María del Mar',
    'Santa Rosa',
    'Santiago de Surco',
    'Surquillo',
    'Villa El Salvador',
    'Villa María del Triunfo',
  ].map((d) => normalizeText(d)),
)

const DISTRICT_ALIASES: Record<string, string> = {
  lima: 'Cercado de Lima',
  'cercado de lima': 'Cercado de Lima',
  'san borja lima': 'San Borja',
}

const NOT_LIMA = new Set(['callao', 'constitutional del callao', 'provincia constitucional del callao'])

const PAID_PATTERN = /\bs\/\.\s*\d|\bs\/\s*\d|US\$\s*\d|\$\s*\d|precio\s*:?\s*\d|desde\s+s\/|entrada\s*:?\s*s\//

const FREE_PATTERN =
  /entrada\s+libre|ingreso\s+libre|gratuit|gratis|acceso\s+libre|sin\s+costo|libre\s+y\s+gratuito|\bfree\b|a\s+precio\s+de\s+0/

export function isLimaDistrict(value: string): 'ok' | 'alias' | 'outside' | 'unknown' {
  const key = normalizeText(value)
  if (NOT_LIMA.has(key)) return 'outside'
  if (DISTRICT_ALIASES[key]) return 'alias'
  if (LIMA_DISTRICTS.has(key)) return 'ok'
  return 'unknown'
}

export function districtAlias(value: string): string {
  return DISTRICT_ALIASES[normalizeText(value)] ?? value.trim()
}

export function looksPaid(text: string): boolean {
  return PAID_PATTERN.test(text)
}

export function looksFree(text: string): boolean {
  return FREE_PATTERN.test(normalizeText(text))
}

export function runGates(candidate: CandidateEvent, today = isoDateInLima()): GateResult {
  const reject: string[] = []
  const demote: string[] = []

  const required: Array<[string, string | undefined]> = [
    ['title', candidate.title],
    ['description', candidate.description],
    ['time', candidate.time],
    ['place', candidate.place],
    ['organizer', candidate.organizer],
    ['source', candidate.source],
  ]
  for (const [field, value] of required) {
    if (!value || value.trim().length === 0) reject.push(`missing:${field}`)
  }

  if (!isValidDateKey(candidate.startDate)) reject.push('invalid:start_date')
  if (candidate.endDate && !isValidDateKey(candidate.endDate)) reject.push('invalid:end_date')
  if (candidate.endDate && candidate.endDate < candidate.startDate) reject.push('invalid:date_range')
  if (isValidDateKey(candidate.startDate)) {
    const effectiveEnd = candidate.endDate ?? candidate.startDate
    if (effectiveEnd < today) reject.push('past:event')
  }

  if (!isValidHttpsUrl(candidate.sourceUrl)) reject.push('invalid:source_url')
  if (candidate.requiresRegistration && !candidate.registrationUrl) reject.push('missing:registration_url')
  if (candidate.registrationUrl && !isValidHttpsUrl(candidate.registrationUrl)) reject.push('invalid:registration_url')

  const priceText = `${candidate.priceRaw ?? ''} ${candidate.description}`
  if (looksPaid(priceText)) reject.push('paid:event')

  if (!candidate.freeSignal && !looksFree(priceText)) demote.push('free:unverified')

  const district = candidate.district?.trim() ?? ''
  if (district.length > 0) {
    const status = isLimaDistrict(district)
    if (status === 'outside') reject.push('outside:lima')
    else if (status === 'unknown') demote.push('district:unverified')
  } else if (candidate.modality === 'Presencial') {
    demote.push('district:missing')
  }

  return { reject, demote }
}
