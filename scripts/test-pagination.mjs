import assert from 'node:assert/strict'
import test from 'node:test'
import { getPagination } from '../src/lib/pagination.ts'

test('covers every item exactly once, including a partial last page', () => {
  for (const pageSize of [10, 20, 50]) {
    for (const total of [1, 9, 10, 11, 20, 23, 50, 51, 137]) {
      const items = Array.from({ length: total }, (_, index) => index)
      const visited = []
      const { pageCount } = getPagination(total, 1, pageSize)
      for (let page = 1; page <= pageCount; page++) {
        const { start, end } = getPagination(total, page, pageSize)
        const visible = items.slice(start, end)
        assert.ok(visible.length > 0 && visible.length <= pageSize)
        visited.push(...visible)
      }
      assert.deepEqual(visited, items)
    }
  }
})

test('clamps pages when results shrink and handles an empty list', () => {
  assert.deepEqual(getPagination(23, 3, 10), { page: 3, pageCount: 3, start: 20, end: 23 })
  assert.deepEqual(getPagination(4, 3, 10), { page: 1, pageCount: 1, start: 0, end: 4 })
  assert.deepEqual(getPagination(0, 3, 10), { page: 1, pageCount: 1, start: 0, end: 0 })
  assert.deepEqual(getPagination(23, 0, 10), { page: 1, pageCount: 3, start: 0, end: 10 })
})
