export type Category = 'Cultura' | 'Música' | 'Deportes' | 'Educación' | 'Tecnología' | 'Gastronomía' | 'Familiar' | 'Otros'
export type Modality = 'Presencial' | 'Virtual'
export type PlaceCategory = 'Historia y patrimonio' | 'Cultura y museos' | 'Parques y naturaleza' | 'Miradores y paseos' | 'Playas' | 'Barrios y arquitectura'

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

export interface PlaceItem {
  id: string
  name: string
  description: string
  category: PlaceCategory
  image: string
  area: 'Lima'
  district: string
  address: string
  hours: string
  source: string
  sourceUrl: string
  priceType: 'free' | 'paid'
}

export interface PlaceRow {
  id: string
  name: string
  description: string
  category: PlaceCategory
  image_url: string | null
  area: 'Lima'
  district: string
  address: string
  hours: string
  source: string
  source_url: string
  price_type: 'free' | 'paid'
  status: 'draft' | 'published' | 'inactive'
  sort_order: number
}
