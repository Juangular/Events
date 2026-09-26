import { places as fallbackPlaces } from '../data'
import type { PlaceItem, PlaceRow } from '../types'
import { supabase } from './supabase'
import { isValidImageUrl, isValidTimestamp } from './validation'

const categories = new Set(['Historia y patrimonio', 'Cultura y museos', 'Parques y naturaleza', 'Miradores y paseos', 'Playas', 'Barrios y arquitectura'])
const areas = new Set(['Lima'])
const prices = new Set(['free', 'paid'])
const statuses = new Set(['draft', 'published', 'inactive'])
const fallbackImage = 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=85'

function isValidGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    return url.protocol === 'https:'
      && ((hostname === 'www.google.com' && url.pathname.startsWith('/maps/'))
        || hostname === 'maps.google.com'
        || hostname === 'maps.app.goo.gl'
        || (hostname === 'goo.gl' && url.pathname.startsWith('/maps/')))
  } catch {
    return false
  }
}

function isPlaceRow(value: unknown): value is PlaceRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<PlaceRow>
  return typeof row.id === 'string'
    && typeof row.name === 'string' && row.name.trim().length > 0
    && typeof row.description === 'string' && row.description.trim().length > 0
    && typeof row.category === 'string' && categories.has(row.category)
    && (row.image_url === null || (typeof row.image_url === 'string' && isValidImageUrl(row.image_url)))
    && typeof row.area === 'string' && areas.has(row.area)
    && typeof row.district === 'string' && row.district.trim().length > 0
    && typeof row.address === 'string' && row.address.trim().length > 0
    && typeof row.hours === 'string'
    && typeof row.source === 'string'
    && typeof row.source_url === 'string' && isValidGoogleMapsUrl(row.source_url)
    && typeof row.price_type === 'string' && prices.has(row.price_type)
    && typeof row.status === 'string' && statuses.has(row.status)
    && typeof row.sort_order === 'number'
    && typeof row.updated_at === 'string' && isValidTimestamp(row.updated_at)
}

function mapRow(row: PlaceRow): PlaceItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    image: row.image_url || fallbackImage,
    area: row.area,
    district: row.district,
    address: row.address,
    hours: row.hours,
    source: row.source,
    sourceUrl: row.source_url,
    priceType: row.price_type,
    updatedAt: row.updated_at,
  }
}

export async function getPublicPlaces(): Promise<PlaceItem[]> {
  if (!supabase) {
    if (import.meta.env.DEV) return fallbackPlaces
    throw new Error('Supabase no está configurado')
  }

  const { data, error } = await supabase
    .from('places')
    .select('id,name,description,category,image_url,area,district,address,hours,source,source_url,price_type,status,sort_order,updated_at')
    .eq('status', 'published')
    .eq('price_type', 'free')
    .eq('area', 'Lima')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[places] Supabase query failed:', error)
    throw new Error(error.message)
  }

  if (!data || !data.every(isPlaceRow)) {
    console.error('[places] Supabase returned an invalid place payload')
    throw new Error('La guía de lugares tiene datos inválidos')
  }

  return data.map(mapRow)
}
