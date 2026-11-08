import { parseArgs } from 'node:util'
import { createAdminClient } from './db'
import { planRangeDuplicates, type DuplicateEvent } from './core/duplicates'

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false } } })
  const client = createAdminClient()
  const rows: Array<DuplicateEvent & { id: string }> = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('events')
      .select('id,fingerprint,title,place,source_url,start_date,end_date')
      .eq('origin', 'auto').eq('status', 'published').eq('price_type', 'free')
      .order('id').range(offset, offset + 499)
    if (error) throw new Error(`No se pudo auditar duplicados: ${error.message}`)
    rows.push(...data)
    if (data.length < 500) break
  }
  const plan = planRangeDuplicates(rows)
  const ids = plan.flatMap(group => group.archive.map(row => row.id))
  for (const { keep, archive } of plan) {
    console.log(JSON.stringify({ title: keep.title, keep: { id: keep.id, date: keep.start_date, end: keep.end_date },
      archive: archive.map(row => ({ id: row.id, date: row.start_date, end: row.end_date })) }))
  }
  console.log(`Duplicados de actividad continua: grupos=${plan.length} filas=${ids.length} aplicar=${values.apply}`)
  if (!values.apply || !ids.length) return
  const { data, error } = await client.from('events').update({ status: 'inactive' })
    .in('id', ids).eq('origin', 'auto').eq('status', 'published').eq('price_type', 'free').select('id')
  if (error) throw new Error(`No se pudieron archivar duplicados: ${error.message}`)
  if (data.length !== ids.length) throw new Error(`Archivado incompleto: ${data.length}/${ids.length}; revisar antes de reintentar`)
  console.log(`Archivados ${data.length} duplicados; conservados ${plan.length} registros originales. No se borraron filas.`)
}

main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
