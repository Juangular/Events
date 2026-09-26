import { supabase } from './supabase'
import { events as fallbackEvents } from '../data'
import type { EventItem, EventRow } from '../types'
import { isValidDateKey, isValidHttpsUrl, isValidImageUrl, isValidTimestamp } from './validation'

const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85'
const categories = new Set(['Cultura', 'Música', 'Deportes', 'Educación', 'Tecnología', 'Gastronomía', 'Familiar', 'Otros'])
const modalities = new Set(['Presencial', 'Virtual'])
const prices = new Set(['free', 'paid'])
const statuses = new Set(['draft', 'published', 'cancelled', 'finished', 'inactive'])

function isEventRow(value: unknown): value is EventRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<EventRow>
  return typeof row.id === 'string'
    && typeof row.title === 'string' && row.title.trim().length > 0
    && typeof row.description === 'string' && row.description.trim().length > 0
    && typeof row.category === 'string' && categories.has(row.category)
    && typeof row.modality === 'string' && modalities.has(row.modality)
    && (row.image_url === null || (typeof row.image_url === 'string' && isValidImageUrl(row.image_url)))
    && typeof row.start_date === 'string' && isValidDateKey(row.start_date)
    && (row.end_date === null || (typeof row.end_date === 'string' && isValidDateKey(row.end_date) && row.end_date >= row.start_date))
    && typeof row.time === 'string' && row.time.trim().length > 0
    && typeof row.place === 'string' && row.place.trim().length > 0
    && row.department === 'Lima'
    && typeof row.organizer === 'string' && row.organizer.trim().length > 0
    && typeof row.source === 'string' && row.source.trim().length > 0
    && typeof row.source_url === 'string' && isValidHttpsUrl(row.source_url)
    && (row.registration_url === null || (typeof row.registration_url === 'string' && isValidHttpsUrl(row.registration_url)))
    && typeof row.requires_registration === 'boolean'
    && (!row.requires_registration || row.registration_url !== null)
    && typeof row.price_type === 'string' && prices.has(row.price_type)
    && typeof row.status === 'string' && statuses.has(row.status)
    && (row.tags === null || (Array.isArray(row.tags) && row.tags.every((tag) => typeof tag === 'string')))
    && typeof row.updated_at === 'string' && isValidTimestamp(row.updated_at)
}

function mapRow(row: EventRow): EventItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    modality: row.modality,
    image: row.image_url || fallbackImage,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    time: row.time,
    place: row.place,
    district: row.district || undefined,
    organizer: row.organizer,
    source: row.source,
    sourceUrl: row.source_url,
    registrationUrl: row.registration_url || undefined,
    requiresRegistration: row.requires_registration,
    tags: row.tags || [],
    updatedAt: row.updated_at,
  }
}

export async function getPublicEvents(): Promise<EventItem[]> {
  if (!supabase) {
    if (import.meta.env.DEV) return fallbackEvents
    throw new Error('Supabase no está configurado')
  }

  const { data, error } = await supabase
    .from('events')
    .select('id,title,description,category,modality,image_url,start_date,end_date,time,place,district,department,organizer,source,source_url,registration_url,requires_registration,price_type,status,tags,updated_at')
    .eq('status', 'published')
    .eq('price_type', 'free')
    .eq('department', 'Lima')
    .order('start_date', { ascending: true })

  if (error) {
    console.error('[events] Supabase query failed:', error)
    throw new Error(error.message)
  }

  if (!data || !data.every(isEventRow)) {
    console.error('[events] Supabase returned an invalid event payload')
    throw new Error('La agenda tiene datos inválidos')
  }

  return data.map(mapRow)
}
