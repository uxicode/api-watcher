export function escapeShellSingleQuotes(value: string): string {
  return value.replace(/'/g, `'\\''`)
}

export function buildCurlCommand(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown
): string {
  const upperMethod = method.toUpperCase()
  const lines = [`curl -X '${upperMethod}'`, `  '${url}'`]

  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  -H '${escapeShellSingleQuotes(key)}: ${escapeShellSingleQuotes(value)}'`)
  }

  const hasBody = body !== undefined && body !== null && body !== ''
  if (hasBody && !['GET', 'HEAD'].includes(upperMethod)) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
    lines.push(`  -d '${escapeShellSingleQuotes(bodyStr)}'`)
  }

  return lines.join(' \\\n')
}
