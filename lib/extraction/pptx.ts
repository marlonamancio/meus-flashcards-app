import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import type { ExtractionMethod } from './types'

const parser = new XMLParser({ ignoreAttributes: true, textNodeName: '#text' })

export async function extractPptx(buffer: Buffer): Promise<{ text: string; method: ExtractionMethod }> {
  const zip = await JSZip.loadAsync(buffer)

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b))

  const slideBlocks: string[] = []
  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async('text')
    const parsed: unknown = parser.parse(xml)
    const runs = collectTextRuns(parsed)
    if (runs.length > 0) {
      slideBlocks.push(`--- Slide ${slideNumber(fileName)} ---\n${runs.join('\n')}`)
    }
  }

  return { text: slideBlocks.join('\n\n'), method: 'text' }
}

function slideNumber(fileName: string): number {
  const match = fileName.match(/slide(\d+)\.xml$/)
  return match ? parseInt(match[1], 10) : 0
}

// PowerPoint's XML nests text under "a:t" elements at arbitrary depth (inside shapes, tables,
// grouped objects). A generic depth-first walk collecting every "a:t" value is simpler and more
// robust across slide layouts than modeling the full drawingml schema.
function collectTextRuns(node: unknown, runs: string[] = []): string[] {
  if (node == null) return runs

  if (typeof node === 'string') {
    if (node.trim()) runs.push(node)
    return runs
  }

  if (Array.isArray(node)) {
    for (const item of node) collectTextRuns(item, runs)
    return runs
  }

  if (typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'a:t') {
        const text = typeof value === 'string' ? value : (value as { '#text'?: string } | null)?.['#text']
        if (typeof text === 'string' && text.trim()) runs.push(text)
      } else {
        collectTextRuns(value, runs)
      }
    }
  }

  return runs
}
