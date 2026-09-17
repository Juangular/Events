import { places as fallbackPlaces } from '../data'
import type { PlaceItem, PlaceRow } from '../types'
import { supabase } from './supabase'

const categories = new Set(['Historia y patrimonio', 'Cultura y museos', 'Parques y naturaleza', 'Miradores y paseos', 'Playas', 'Barrios y arquitectura'])
const areas = new Set(['Lima'])
const prices = new Set(['free', 'paid'])
const statuses = new Set(['draft', 'published', 'inactive'])
const fallbackImage = 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=85'

function isPlaceRow(value: unknown): value is PlaceRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<PlaceRow>
  return typeof row.id === 'string'
    && typeof row.name === 'string'
    && typeof row.description === 'string'
    && typeof row.category === 'string' && categories.has(row.category)
    && (row.image_url === null || typeof row.image_url === 'string')
    && typeof row.area === 'string' && areas.has(row.area)
    && typeof row.district === 'string'
    && typeof row.address === 'string'
    && typeof row.hours === 'string'
    && typeof row.source === 'string'
    && typeof row.source_url === 'string'
    && typeof row.price_type === 'string' && prices.has(row.price_type)
    && typeof row.status === 'string' && statuses.has(row.status)
    && typeof row.sort_order === 'number'
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
  }
}

export async function getPublicPlaces(): Promise<PlaceItem[]> {
  if (!supabase) {
    if (import.meta.env.DEV) return fallbackPlaces
    throw new Error('Supabase no está configurado')
  }

  const { data, error } = await supabase
    .from('places')
    .select('id,name,description,category,image_url,area,district,address,hours,source,source_url,price_type,status,sort_order')
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
