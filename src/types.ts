export type Category = 'Cultura' | 'Música' | 'Deportes' | 'Educación' | 'Tecnología' | 'Gastronomía' | 'Familiar' | 'Otros'
export type Modality = 'Presencial' | 'Virtual'

export interface EventItem {
  id: string
  title: string
  description: string
  category: Category
  modality: Modality
  image: string
  startDate: string
  endDate?: string
  time: string
  place: string
  district?: string
  organizer: string
  source: string
  sourceUrl: string
  registrationUrl?: string
  requiresRegistration?: boolean
  tags: string[]
}

export interface EventRow {
  id: string
  title: string
  description: string
  category: Category
  modality: Modality
  image_url: string | null
  start_date: string
  end_date: string | null
  time: string
  place: string
  district: string | null
  department: string
  organizer: string
  source: string
  source_url: string
  registration_url: string | null
  requires_registration: boolean
  price_type: 'free' | 'paid'
  status: 'draft' | 'published' | 'cancelled' | 'finished' | 'inactive'
  tags: string[] | null
}
