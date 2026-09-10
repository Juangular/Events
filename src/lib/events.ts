import { supabase } from './supabase'
import { events as fallbackEvents } from '../data'
import type { EventItem, EventRow } from '../types'

const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85'

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
  }
}

export async function getPublicEvents(): Promise<EventItem[]> {
  if (!supabase) {
    if (import.meta.env.DEV) return fallbackEvents
    throw new Error('Supabase no está configurado')
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .eq('price_type', 'free')
    .eq('department', 'Lima')
    .order('start_date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as EventRow[]).map(mapRow)
}
