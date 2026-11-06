import { parseArgs } from 'node:util'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateEvent, RunCounters, SourceAdapter } from './types'
import { closeBrowser } from './core/browser'
import { publicationDecision } from './core/publication'
import { fingerprint } from './core/text'
import {
  createAdminClient,
  existingFingerprints,
  insertEvents,
  recordSyncRun,
  toEventInsert,
  type EventInsert,
} from './db'
import { barrancoSource } from './sources/barranco'
import { eventbriteSource } from './sources/eventbrite'
import { gobpeAgendaSource } from './sources/gobpe-agenda'
import { ipdAcademiaSource } from './sources/ipd-academia'
import { lumSource } from './sources/lum'
import { mirafloresSource } from './sources/miraflores'
import { municipalSources } from './sources/gobpe-municipal'
import { sanIsidroSource } from './sources/san-isidro'
import { granTeatroNacionalSource } from './sources/gran-teatro-nacional'
import { entradaLibreSource } from './sources/entrada-libre'
import { mallDelSurSource } from './sources/mall-del-sur'
import { plazaNorteSource } from './sources/plaza-norte'
import { running4PeruSource } from './sources/running4peru'
import { vamosEventosSource } from './sources/vamos-eventos'

const ALL_SOURCES: SourceAdapter[] = [gobpeAgendaSource, ipdAcademiaSource, sanIsidroSource, barrancoSource, mirafloresSource, ...municipalSources, eventbriteSource, lumSource,
  granTeatroNacionalSource, entradaLibreSource, mallDelSurSource, plazaNorteSource, running4PeruSource, vamosEventosSource]

// Fuentes con caída permanente conocida: sus errores se reportan como
// "degradada" sin fallar el workflow (evita avisos diarios repetidos).
const KNOWN_OUTAGE_SOURCES = new Set(['eventbrite'])

function emptyCounters(): RunCounters {
  return { fetched: 0, insertable: 0, published: 0, drafted: 0, skippedDupes: 0, rejected: 0, errors: [] }
}

async function runSource(
  adapter: SourceAdapter,
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
      const decision = publicationDecision(candidate)
      if (decision.status === 'rejected') {
        counters.rejected += 1
        console.log(`  descartado: ${candidate.title.slice(0, 60)} → ${decision.reasons.join(', ')}`)
        continue
      }

      const row = toEventInsert(candidate, adapter.key, 'published')
      if (known.has(row.fingerprint)) {
        counters.skippedDupes += 1
        continue
      }
      known.add(row.fingerprint)
      rows.push(row)
      counters.published += 1
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

  console.log(`Publicación automática de todos los candidatos válidos${dryRun ? ' (dry-run: sin escritura)' : ''}`)

  const known = client ? await existingFingerprints(client) : new Set<string>()
  const totals = emptyCounters()
  const results: Array<{ source: SourceAdapter; counters: RunCounters }> = []

  for (const adapter of sources) {
    const counters = await runSource(adapter, known, client, dryRun)
    results.push({ source: adapter, counters })
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

  const unexpected = results.filter((result) => result.counters.errors.length > 0 && !KNOWN_OUTAGE_SOURCES.has(result.source.key))
  const degraded = results.filter((result) => result.counters.errors.length > 0 && KNOWN_OUTAGE_SOURCES.has(result.source.key))

  const summaryLines = [
    `## Ingesta de eventos — ${new Date().toISOString()}`,
    '',
    `| Fuente | Obtenidos | Publicados | Borradores | Duplicados | Descartados | Errores |`,
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: |`,
    ...results.map(({ source, counters }) =>
      `| ${source.key} | ${counters.fetched} | ${counters.published} | ${counters.drafted} | ${counters.skippedDupes} | ${counters.rejected} | ${counters.errors.length} |`),
    '',
  ]
  if (unexpected.length > 0) {
    summaryLines.push('### Errores que requieren atención', '')
    for (const { source, counters } of unexpected) {
      for (const message of counters.errors) summaryLines.push(`- \`${source.key}\`: ${message}`)
    }
    summaryLines.push('')
  }
  if (degraded.length > 0) {
    summaryLines.push('### Fuentes degradadas conocidas (sin aviso)', '')
    for (const { source, counters } of degraded) {
      for (const message of counters.errors) summaryLines.push(`- \`${source.key}\`: ${message}`)
    }
    summaryLines.push('')
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const { appendFileSync } = await import('node:fs')
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryLines.join('\n')}\n`)
    } catch (error) {
      console.warn('[report] No se pudo escribir el resumen de GitHub:', error instanceof Error ? error.message : error)
    }
  }

  if (unexpected.length > 0) {
    console.error(`Fuentes con errores inesperados: ${unexpected.map((result) => result.source.key).join(', ')}`)
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
