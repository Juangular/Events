import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { existingFingerprints } from '../db'

test('duplicate detection reads beyond the default API row limit with stable pages', async () => {
  const rows = Array.from({ length: 1201 }, (_, i) => ({ fingerprint: `event-${i}` }))
  const ranges: number[][] = []
  const query = {
    select: () => query, not: () => query, order: () => query,
    range: async (from: number, to: number) => {
      ranges.push([from, to])
      return { data: rows.slice(from, to + 1), error: null }
    },
  }
  const client = { from: () => query } as unknown as SupabaseClient
  const known = await existingFingerprints(client)
  assert.equal(known.size, 1201)
  assert.ok(known.has('event-1200'))
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]])
})
