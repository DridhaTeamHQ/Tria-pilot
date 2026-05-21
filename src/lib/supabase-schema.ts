type SupabaseLikeError = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

export function isMissingColumnError(
  error: unknown,
  columnName: string,
  tableName?: string
): error is SupabaseLikeError {
  if (!error || typeof error !== 'object') return false

  const candidate = error as SupabaseLikeError
  const haystack = [candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!haystack) return false

  const normalizedColumn = columnName.trim().toLowerCase()
  const normalizedTable = tableName?.trim().toLowerCase()

  if (!haystack.includes(normalizedColumn)) return false
  if (normalizedTable && !haystack.includes(normalizedTable)) return false

  return haystack.includes('schema cache') || haystack.includes('column')
}
