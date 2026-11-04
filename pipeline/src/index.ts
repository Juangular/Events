import { parseArgs } from 'node:util'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateEvent, RunCounters, SourceAdapter } from './types'
import { closeBrowser } from './core/browser'
import { runGates } from './core/gates'
import { fingerprint } from './core/text'
import {
  createAdminClient,
  existingFingerprints,
  getPublishMode,
  insertEvents,
  recordSyncRun,
  toEventInsert,
  type EventInsert,
  type PublishMode,
} from './db'
import { eventbriteSource } from './sources/eventbrite'
import { gobpeAgendaSource } from './sources/gobpe-agenda'
import { lumSource } from './sources/lum'

const ALL_SOURCES: SourceAdapter[] = [gobpeAgendaSource, eventbriteSource, lumSource]

function emptyCounters(): RunCounters {
  return { fetched: 0, insertable: 0, published: 0, drafted: 0, skippedDupes: 0, rejected: 0, errors: [] }
}

async function runSource(
  adapter: SourceAdapter,
  publishMode: PublishMode,
  known: Set<string>,
  client: SupabaseClient | null,
  dryRun: boolean,
): Promise<RunCounters> {
  const counters = emptyCounters()
  const startedAt = new Date().toISOString()
  console.log(`\n[${adapter.key}] ${adapter.label}`)

  try {
    const candidates: CandidateEvent[] = await adapter.collect()
    counters.fetched = candidates.length

    const rows: EventInsert[] = []
    for (const candidate of candidates) {
      const gates = runGates(candidate)
      if (gates.reject.length > 0) {
        counters.rejected += 1
        if (dryRun) console.log(`  descartado: ${candidate.title.slice(0, 60)} → ${gates.reject.join(', ')}`)
        continue
      }

      const status = publishMode === 'auto' && gates.demote.length === 0 ? 'published' : 'draft'
      const row = toEventInsert(candidate, adapter.key, status)
      if (known.has(row.fingerprint)) {
        counters.skippedDupes += 1
        continue
      }
      known.add(row.fingerprint)
      rows.push(row)
      if (status === 'published') counters.published += 1
      else counters.drafted += 1
    }
    counters.insertable = rows.length

    if (dryRun) {
      for (const row of rows) {
        console.log(`  [${row.status}] ${row.start_date} · ${row.title.slice(0, 70)} · ${row.place}`)
      }
    } else if (client) {
      for (const row of rows) {
        try {
          await insertEvents(client, [row])
        } catch (error) {
          counters.published = Math.max(0, counters.published - (row.status === 'published' ? 1 : 0))
          counters.drafted = Math.max(0, counters.drafted - (row.status === 'draft' ? 1 : 0))
          if (counters.errors.length < 10) {
            counters.errors.push(`insert:${row.fingerprint.slice(0, 8)} → ${error instanceof Error ? error.message : String(error)}`)
          }
        }
      }
    }

    console.log(
      `[${adapter.key}] obtenidos=${counters.fetched} publicados=${counters.published} borradores=${counters.drafted} duplicados=${counters.skippedDupes} descartados=${counters.rejected}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    counters.errors.push(message)
    console.error(`[${adapter.key}] ERROR: ${message}`)
  } finally {
    if (client && !dryRun) await recordSyncRun(client, adapter.key, startedAt, counters)
  }

  return counters
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      source: { type: 'string' },
    },
  })
  const dryRun = values['dry-run'] === true
  const sources = values.source
    ? ALL_SOURCES.filter((adapter) => adapter.key === values.source)
    : ALL_SOURCES

  if (sources.length === 0) {
    console.error(`Fuente desconocida: ${values.source}. Disponibles: ${ALL_SOURCES.map((s) => s.key).join(', ')}`)
    process.exitCode = 1
    return
  }

  let client: SupabaseClient | null = null
  if (!dryRun) client = createAdminClient()

  const publishMode: PublishMode = client
    ? await getPublishMode(client)
    : ((process.env.PUBLISH_MODE as PublishMode | undefined) === 'review' ? 'review' : 'auto')

  console.log(`Modo de publicación: ${publishMode}${dryRun ? ' (dry-run: sin escritura)' : ''}`)

  const known = client ? await existingFingerprints(client) : new Set<string>()
  const totals = emptyCounters()
  let failedSources = 0

  for (const adapter of sources) {
    const counters = await runSource(adapter, publishMode, known, client, dryRun)
    if (counters.errors.length > 0 && counters.fetched === 0) failedSources += 1
    totals.fetched += counters.fetched
    totals.published += counters.published
    totals.drafted += counters.drafted
    totals.skippedDupes += counters.skippedDupes
    totals.rejected += counters.rejected
    totals.errors.push(...counters.errors)
  }

  console.log(
    `\nResumen: obtenidos=${totals.fetched} publicados=${totals.published} borradores=${totals.drafted} duplicados=${totals.skippedDupes} descartados=${totals.rejected} errores=${totals.errors.length}`,
  )

  if (failedSources === sources.length) {
    console.error('Todas las fuentes fallaron.')
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error('Fallo general del pipeline:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeBrowser()
  })
