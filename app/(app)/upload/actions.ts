'use server'

import { parse } from 'csv-parse/sync'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'

const MAX_CSV_BYTES = 5 * 1024 * 1024

export type ImportSummary = {
  importedCount: number
  skippedCount: number
  skippedReasons: string[]
  collectionId: string | null
  collectionName: string | null
  warning: string | null
}

export type ImportCsvResult = { ok: true; summary: ImportSummary } | { ok: false; error: string }

function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const commaCount = (firstLine.match(/,/g) ?? []).length
  const semicolonCount = (firstLine.match(/;/g) ?? []).length
  return semicolonCount > commaCount ? ';' : ','
}

export async function importCsvAction(formData: FormData): Promise<ImportCsvResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false, error: 'Nenhum arquivo enviado.' }
  }
  if (file.size > MAX_CSV_BYTES) {
    return { ok: false, error: 'O arquivo excede o limite de 5 MB.' }
  }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { ok: false, error: 'Envie um arquivo .csv.' }
  }

  const destinationType = formData.get('destinationType')
  const destinationCollectionId = formData.get('destinationCollectionId')
  const destinationName = formData.get('destinationName')

  const rawText = await file.text()
  const cleanedText = rawText.startsWith('﻿') ? rawText.slice(1) : rawText
  const delimiter = detectDelimiter(cleanedText)

  let records: string[][]
  try {
    records = parse(cleanedText, {
      delimiter,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
    })
  } catch {
    return { ok: false, error: 'Não foi possível ler o CSV. Verifique o formato do arquivo.' }
  }

  if (records.length === 0) {
    return { ok: false, error: 'O arquivo está vazio.' }
  }

  const header = records[0].map((h) => h.trim().toLowerCase())
  const frenteIdx = header.findIndex((h) => h === 'frente' || h === 'front')
  const versoIdx = header.findIndex((h) => h === 'verso' || h === 'back')

  if (frenteIdx === -1 || versoIdx === -1) {
    return { ok: false, error: 'Cabeçalho não reconhecido. Use "frente,verso" ou "front,back".' }
  }

  const validCards: { frente: string; verso: string }[] = []
  const skippedReasons: string[] = []

  records.slice(1).forEach((row, i) => {
    const lineNumber = i + 2 // +1 for header row, +1 for 1-based line numbering
    const frente = (row[frenteIdx] ?? '').trim()
    const verso = (row[versoIdx] ?? '').trim()

    if (!frente && !verso) {
      skippedReasons.push(`linha ${lineNumber}: vazia`)
    } else if (!frente) {
      skippedReasons.push(`linha ${lineNumber}: frente vazia`)
    } else if (!verso) {
      skippedReasons.push(`linha ${lineNumber}: verso vazio`)
    } else {
      validCards.push({ frente, verso })
    }
  })

  if (validCards.length === 0) {
    return { ok: false, error: 'Nenhuma linha válida encontrada no CSV.' }
  }

  // Cards are inserted before the destination collection is resolved/created, so a later
  // failure (e.g. creating the new collection) never loses the cards — worst case they land
  // in "não organizados" instead of the chosen collection, never silently discarded.
  const { data: inserted, error: insertError } = await supabase
    .from('flashcards')
    .insert(validCards.map((c) => ({ user_id: user.id, frente: c.frente, verso: c.verso, origem: 'csv', material_id: null })))
    .select('id')

  if (insertError || !inserted) {
    return { ok: false, error: 'Não foi possível salvar os flashcards.' }
  }

  // From here on the cards are already saved — any destination failure becomes a warning on
  // the summary, never an `ok:false`, so the UI can't mistake "linking failed" for "import
  // failed" and prompt a retry that would insert the same rows twice.
  let collectionId: string | null = null
  let collectionName: string | null = null
  let warning: string | null = null

  if (destinationType === 'existing' && typeof destinationCollectionId === 'string' && destinationCollectionId) {
    const { data: col, error } = await supabase
      .from('collections')
      .select('id, nome')
      .eq('id', destinationCollectionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !col) {
      warning = 'Não foi possível encontrar a coleção selecionada. Os cards ficaram sem coleção.'
    } else {
      collectionId = col.id
      collectionName = col.nome
    }
  } else if (destinationType === 'new' && typeof destinationName === 'string' && destinationName.trim()) {
    const { data: newCol, error } = await supabase
      .from('collections')
      .insert({ user_id: user.id, nome: destinationName.trim() })
      .select('id, nome')
      .single()

    if (error || !newCol) {
      warning = 'Não foi possível criar a coleção. Os cards ficaram sem coleção.'
    } else {
      collectionId = newCol.id
      collectionName = newCol.nome
    }
  }

  if (collectionId) {
    const links = inserted.map((f) => ({ collection_id: collectionId as string, flashcard_id: f.id as string }))
    const { error: linkError } = await supabase.from('collection_flashcards').insert(links)

    if (linkError) {
      warning = `Não foi possível vincular os cards à coleção "${collectionName}". Eles ficaram sem coleção.`
      collectionId = null
      collectionName = null
    }
  }

  return {
    ok: true,
    summary: {
      importedCount: validCards.length,
      skippedCount: skippedReasons.length,
      skippedReasons,
      collectionId,
      collectionName,
      warning,
    },
  }
}
