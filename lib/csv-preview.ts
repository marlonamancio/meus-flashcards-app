export type CsvPreviewRow = { front: string; back: string }

// Client-side only, for the "N cards prontos" chip + first-rows preview before submit.
// Not authoritative — the server action re-parses with csv-parse and is what actually
// decides what gets imported vs skipped.

function detectDelimiter(line: string): ',' | ';' {
  const commaCount = (line.match(/,/g) ?? []).length
  const semicolonCount = (line.match(/;/g) ?? []).length
  return semicolonCount > commaCount ? ';' : ','
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

export function parseCsvPreview(text: string): { rows: CsvPreviewRow[] } {
  const cleaned = text.startsWith('﻿') ? text.slice(1) : text
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { rows: [] }

  const delimiter = detectDelimiter(lines[0])
  const header = splitCsvLine(lines[0], delimiter).map((h) => h.trim().toLowerCase())
  const frenteIdx = header.findIndex((h) => h === 'frente' || h === 'front')
  const versoIdx = header.findIndex((h) => h === 'verso' || h === 'back')
  if (frenteIdx === -1 || versoIdx === -1) return { rows: [] }

  const rows: CsvPreviewRow[] = []
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line, delimiter)
    const front = (cols[frenteIdx] ?? '').trim()
    const back = (cols[versoIdx] ?? '').trim()
    if (front && back) rows.push({ front, back })
  }

  return { rows }
}
