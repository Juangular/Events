export type Category =
  | 'Cultura'
  | 'Música'
  | 'Deportes'
  | 'Educación'
  | 'Tecnología'
  | 'Gastronomía'
  | 'Familiar'
  | 'Otros'

export type Modality = 'Presencial' | 'Virtual'

export interface CandidateEvent {
  title: string
  description: string
  category: Category
  modality: Modality
  startDate: string
  endDate?: string
  time: string
  place: string
  district?: string
  organizer: string
  source: string
  sourceUrl: string
  registrationUrl?: string
  requiresRegistration: boolean
  tags: string[]
  imageUrl?: string
  freeSignal: boolean
  priceRaw?: string
  needsReview?: boolean
  raw: unknown
}

export interface SourceAdapter {
  key: string
  label: string
  collect(): Promise<CandidateEvent[]>
}

export interface GateResult {
  reject: string[]
  demote: string[]
}

export interface RunCounters {
  fetched: number
  insertable: number
  published: number
  drafted: number
  skippedDupes: number
  rejected: number
  errors: string[]
}
