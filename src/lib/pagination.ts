export function getPagination(total: number, page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const start = (currentPage - 1) * pageSize
  const end = Math.min(start + pageSize, total)
  return { page: currentPage, pageCount, start, end }
}
