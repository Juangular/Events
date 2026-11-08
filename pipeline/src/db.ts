import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CandidateEvent, RunCounters } from './types'
import { fingerprint } from './core/text'
import { eventDepartment } from './core/gates'
import { EventDuplicates } from './core/duplicates'

export interface EventInsert {
  title: string
  description: string
  category: string
  modality: string
  image_url: string | null
  start_date: string
  end_date: string | null
  time: string
  place: string
  district: string | null
  department: 'Lima' | 'Callao'
  organizer: string
  source: string
  source_url: string
  registration_url: string | null
  requires_registration: boolean
  price_type: 'free'
  status: 'draft' | 'published'
  tags: string[]
  origin: 'auto'
  source_key: string
  fingerprint: string
  raw: unknown
  synced_at: string
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

export function createAdminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function existingFingerprints(client: SupabaseClient): Promise<EventDuplicates> {
  const known = new EventDuplicates()
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from('events').select('fingerprint,title,place,source_url,start_date,end_date').not('fingerprint', 'is', null)
      .order('id', { ascending: true }).range(offset, offset + pageSize - 1)
    if (error) throw new Error(`No se pudieron leer fingerprints: ${error.message}`)
    for (const row of data ?? []) known.add(row)
    if (!data || data.length < pageSize) return known
  }
}

export function toEventInsert(
  candidate: CandidateEvent,
  sourceKey: string,
  status: 'draft' | 'published',
): EventInsert {
  return {
    title: candidate.title.trim(),
    description: candidate.description.trim(),
    category: candidate.category,
    modality: candidate.modality,
    image_url: candidate.imageUrl ?? null,
    start_date: candidate.startDate,
    end_date: candidate.endDate ?? null,
    time: candidate.time.trim(),
    place: candidate.place.trim(),
    district: candidate.district?.trim() || null,
    department: eventDepartment(candidate.district),
    organizer: candidate.organizer.trim(),
    source: candidate.source.trim(),
    source_url: candidate.sourceUrl,
    registration_url: candidate.registrationUrl ?? null,
    requires_registration: candidate.requiresRegistration,
    price_type: 'free',
    status,
    tags: candidate.tags,
    origin: 'auto',
    source_key: sourceKey,
    fingerprint: fingerprint(candidate.title, candidate.startDate, candidate.place),
    raw: candidate.raw,
    synced_at: new Date().toISOString(),
  }
}

export async function insertEvents(client: SupabaseClient, rows: EventInsert[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await client.from('events').insert(rows)
  if (error) throw new Error(`No se pudieron insertar eventos: ${error.message}`)
}

export async function recordSyncRun(
  client: SupabaseClient,
  sourceKey: string,
  startedAt: string,
  counters: RunCounters,
): Promise<void> {
  const { error } = await client.from('sync_runs').insert({
    source_key: sourceKey,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    fetched: counters.fetched,
    inserted: counters.published + counters.drafted,
    published: counters.published,
    drafted: counters.drafted,
    skipped_dupes: counters.skippedDupes,
    rejected: counters.rejected,
    errors: counters.errors,
  })
  if (error) console.error('[db] No se pudo registrar sync_run:', error.message)
}
