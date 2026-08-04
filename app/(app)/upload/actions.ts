'use server'

import { parse } from 'csv-parse/sync'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { extractContent, materialTipoFromFile, MAX_MATERIAL_BYTES } from '@/lib/extraction'
import {
  generateFlashcardsFromMaterial,
  generateFlashcardsFromTheme,
  MAX_TEMA_LENGTH,
  MIN_MANUAL_QUANTIDADE,
  MAX_MANUAL_QUANTIDADE,
  type Quantidade,
  type GeneratedCard,
} from '@/lib/generation'
import type { DestinationValue } from '@/components/upload/DestinationPicker'

const MAX_CSV_BYTES = 5 * 1024 * 1024
const MATERIALS_BUCKET = 'materiais'

// Sanity ceiling for the reviewed-cards array a client can submit in one call — generous above
// the largest real generation observed (166 cards from a 130-page material, pre prompt-refinement
// — see CLAUDE.md "Formato do prompt de geração de flashcards"), but still bounded against a
// direct call (bypassing the review UI) submitting an artificially huge array.
const MAX_SAVE_CARDS = 500

// Bounds imported from lib/generation/types.ts (MAX_TEMA_LENGTH, MIN/MAX_MANUAL_QUANTIDADE) —
// shared with the client-side picker/textarea (QuantidadePicker.tsx, GenerateWithAI.tsx) so UX
// and server enforcement can't drift apart. The client clamp is UX only; this server-side
// revalidation is what actually protects anything, since a Server Action can be invoked directly
// (DevTools/curl with a valid session cookie), bypassing the picker entirely.
function validateQuantidade(quantidade: Quantidade): { ok: true } | { ok: false; error: string } {
  if (quantidade.type === 'automatico') return { ok: true }

  if (!Number.isInteger(quantidade.count) || quantidade.count < MIN_MANUAL_QUANTIDADE || quantidade.count > MAX_MANUAL_QUANTIDADE) {
    return { ok: false, error: `A quantidade deve ser um número inteiro entre ${MIN_MANUAL_QUANTIDADE} e ${MAX_MANUAL_QUANTIDADE}.` }
  }

  return { ok: true }
}

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

// Cheap structural check before handing the file to csv-parse — catches an obviously non-CSV
// file (ex: an image/PDF renamed to .csv) without needing real MIME sniffing. Binary content
// decoded as text typically contains NUL bytes or a high ratio of non-printable control
// characters; real CSV/text files essentially never do. Only inspects a small sample, so it stays
// cheap even at the 5 MB size ceiling.
function looksLikeCsv(text: string): boolean {
  const sample = text.slice(0, 4000)
  if (sample.length === 0) return false
  if (sample.includes('\u0000')) return false

  let controlCharCount = 0
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i)
    // Tab/newline/carriage-return are normal in text files — anything else below 0x20, plus the
    // 0x7F DEL character, is the kind of byte that shows up when binary content gets decoded as
    // text.
    if ((code < 0x20 && code !== 9 && code !== 10 && code !== 13) || code === 0x7f) {
      controlCharCount++
    }
  }
  if (controlCharCount / sample.length > 0.01) return false

  const firstLine = sample.split(/\r?\n/, 1)[0] ?? ''
  return firstLine.includes(',') || firstLine.includes(';')
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

  if (!looksLikeCsv(cleanedText)) {
    return { ok: false, error: 'O arquivo não parece ser um CSV válido.' }
  }

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

export type UploadMaterialResult = { ok: true; materialId: string } | { ok: false; error: string }

export type RegisterMaterialInput = {
  storagePath: string
  nome: string
  mimeType: string
}

// The file itself never touches this action — it is uploaded client-side straight to Supabase
// Storage first (see GenerateWithAI.tsx), because routing it through a Server Action/Route
// Handler here hits a real Node/undici bug: `request.formData()` throws "Failed to parse body as
// FormData" for multipart bodies as small as ~11 MB, well under the 20 MB this app needs to
// support (reproduced identically in both a Server Action and a plain Route Handler — it is a
// Node-level limitation, not something `experimental.serverActions.bodySizeLimit` controls). This
// action only registers the already-uploaded object and kicks off extraction.
export async function registerMaterialAction(input: RegisterMaterialInput): Promise<UploadMaterialResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { storagePath, nome, mimeType } = input

  // Defense in depth: Storage RLS (013_storage_materiais_policies.sql) already guarantees this,
  // but a mismatched path here would mean we register a material pointing at a file the current
  // user does not actually own.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: 'Caminho de arquivo inválido.' }
  }

  // Defense in depth: the "materiais" bucket is configured (manually, via Dashboard) with a
  // 20 MB size limit and a MIME-type allowlist, but that config isn't verifiable from code and
  // isn't a substitute for the app checking for itself — re-verify against the file Storage
  // actually received instead of just trusting bucket config to have already blocked anything
  // out of bounds. `mimeType` from the action's own input is what the client CLAIMS the file is;
  // `fileInfo.contentType` is what Storage recorded when the file was actually uploaded — using
  // the latter to derive `tipo` means a caller can't just lie about mimeType in a direct call to
  // this action while pointing at a storagePath that holds something else entirely.
  const { data: fileInfo, error: infoError } = await supabase.storage.from(MATERIALS_BUCKET).info(storagePath)

  if (infoError || !fileInfo) {
    return { ok: false, error: 'Não foi possível verificar o arquivo enviado.' }
  }
  if (fileInfo.size !== undefined && fileInfo.size > MAX_MATERIAL_BYTES) {
    await supabase.storage.from(MATERIALS_BUCKET).remove([storagePath])
    return { ok: false, error: `O arquivo excede o limite de ${Math.round(MAX_MATERIAL_BYTES / 1024 / 1024)} MB.` }
  }

  const tipo = materialTipoFromFile(fileInfo.contentType ?? mimeType, nome)
  if (!tipo) {
    await supabase.storage.from(MATERIALS_BUCKET).remove([storagePath])
    return { ok: false, error: 'Formato não suportado. Envie PDF, imagem (JPEG/PNG/WEBP), Word (.docx) ou PowerPoint (.pptx).' }
  }

  const { data: material, error: insertError } = await supabase
    .from('materials')
    .insert({ user_id: user.id, nome, tipo, status: 'processando', storage_path: storagePath })
    .select('id')
    .single()

  if (insertError || !material) {
    await supabase.storage.from(MATERIALS_BUCKET).remove([storagePath])
    return { ok: false, error: 'Não foi possível registrar o material.' }
  }

  const materialId = material.id as string

  // Runs after the response is sent, so the action returns immediately instead of blocking the
  // request on extraction (vision-based extraction in particular can take a while) — see
  // CLAUDE.md "Limite de duração de função serverless" for why this can't be a single blocking
  // call. The client picks up the result by polling the material row's status.
  after(async () => {
    try {
      const { data: fileBlob, error: downloadError } = await supabase.storage.from(MATERIALS_BUCKET).download(storagePath)
      if (downloadError || !fileBlob) {
        await supabase
          .from('materials')
          .update({ status: 'erro', erro_mensagem: 'Não foi possível ler o arquivo enviado.' })
          .eq('id', materialId)
        return
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer())
      const content = await extractContent(buffer, tipo, mimeType)
      const fullText = content.fullText.trim()

      if (!fullText) {
        await supabase
          .from('materials')
          .update({ status: 'erro', erro_mensagem: 'Não foi possível extrair texto do arquivo.' })
          .eq('id', materialId)
        return
      }

      await supabase.from('materials').update({ status: 'pronto', conteudo_extraido: content.chunks }).eq('id', materialId)
    } catch (err) {
      await supabase
        .from('materials')
        .update({ status: 'erro', erro_mensagem: err instanceof Error ? err.message : 'Erro desconhecido na extração.' })
        .eq('id', materialId)
    }
  })

  return { ok: true, materialId }
}

export type GenerateResult = { ok: true; materialId: string } | { ok: false; error: string }

// Kicks off generation for a material Stage 1 already extracted (status 'pronto', with
// conteudo_extraido filled in). Returns immediately and runs the actual generation call in
// after() — same reasoning as registerMaterialAction: an AI call can take a while, and the
// request must not block on it. See CLAUDE.md "Limite de duração de função serverless".
export async function generateFromMaterialAction(materialId: string, quantidade: Quantidade): Promise<GenerateResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { data: material, error: fetchError } = await supabase
    .from('materials')
    .select('id, status, conteudo_extraido')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError || !material) {
    return { ok: false, error: 'Material não encontrado.' }
  }
  if (material.status !== 'pronto') {
    return { ok: false, error: `Material precisa estar com status "pronto" para gerar flashcards (está "${material.status}").` }
  }

  const chunks = material.conteudo_extraido as string[] | null
  if (!chunks || chunks.length === 0) {
    return { ok: false, error: 'Material não tem conteúdo extraído.' }
  }

  const quantidadeCheck = validateQuantidade(quantidade)
  if (!quantidadeCheck.ok) {
    return quantidadeCheck
  }

  const { error: updateError } = await supabase.from('materials').update({ status: 'gerando' }).eq('id', materialId)
  if (updateError) {
    return { ok: false, error: 'Não foi possível iniciar a geração.' }
  }

  after(async () => {
    try {
      const cards = await generateFlashcardsFromMaterial(chunks, quantidade)
      await supabase.from('materials').update({ status: 'aguardando_revisao', cards_gerados: cards }).eq('id', materialId)
    } catch (err) {
      await supabase
        .from('materials')
        .update({ status: 'erro', erro_mensagem: err instanceof Error ? err.message : 'Erro desconhecido na geração.' })
        .eq('id', materialId)
    }
  })

  return { ok: true, materialId }
}

// Theme mode has no upload/extraction step — the material row is created here directly. Status
// starts at 'pronto' (meaning "no extraction needed, ready to generate") before immediately
// moving to 'gerando', reusing the same state machine as file mode instead of a parallel one —
// see CLAUDE.md "Campos novos em materials para o pipeline de geração".
export async function generateFromThemeAction(tema: string, quantidade: Quantidade): Promise<GenerateResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const trimmedTema = tema.trim()
  if (!trimmedTema) {
    return { ok: false, error: 'Descreva um tema.' }
  }
  if (trimmedTema.length > MAX_TEMA_LENGTH) {
    return { ok: false, error: `O tema deve ter no máximo ${MAX_TEMA_LENGTH} caracteres.` }
  }

  const quantidadeCheck = validateQuantidade(quantidade)
  if (!quantidadeCheck.ok) {
    return quantidadeCheck
  }

  const { data: material, error: insertError } = await supabase
    .from('materials')
    .insert({ user_id: user.id, nome: trimmedTema, modo: 'tema', tema: trimmedTema, tipo: null, status: 'pronto' })
    .select('id')
    .single()

  if (insertError || !material) {
    return { ok: false, error: 'Não foi possível registrar o tema.' }
  }

  const materialId = material.id as string

  const { error: updateError } = await supabase.from('materials').update({ status: 'gerando' }).eq('id', materialId)
  if (updateError) {
    return { ok: false, error: 'Não foi possível iniciar a geração.' }
  }

  after(async () => {
    try {
      const cards = await generateFlashcardsFromTheme(trimmedTema, quantidade)
      await supabase.from('materials').update({ status: 'aguardando_revisao', cards_gerados: cards }).eq('id', materialId)
    } catch (err) {
      await supabase
        .from('materials')
        .update({ status: 'erro', erro_mensagem: err instanceof Error ? err.message : 'Erro desconhecido na geração.' })
        .eq('id', materialId)
    }
  })

  return { ok: true, materialId }
}

export type SaveReviewSummary = {
  savedCount: number
  collectionId: string | null
  collectionName: string | null
  warning: string | null
}

export type SaveReviewResult = { ok: true; summary: SaveReviewSummary } | { ok: false; error: string }

// Stage 3: persists the cards the user reviewed (edited/discarded client-side) from a material's
// cards_gerados draft into real flashcards rows, with the same destination logic/reasoning as
// importCsvAction (cards are inserted first, so a destination failure never loses them — it only
// downgrades to a `warning` on an otherwise-successful summary).
export async function saveReviewedCardsAction(
  materialId: string,
  cards: GeneratedCard[],
  destination: DestinationValue
): Promise<SaveReviewResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  if (cards.length > MAX_SAVE_CARDS) {
    return { ok: false, error: `Muitos cards de uma vez (máximo ${MAX_SAVE_CARDS}).` }
  }

  const cleaned = cards.map((c) => ({ frente: c.frente.trim(), verso: c.verso.trim() }))
  if (cleaned.length === 0) {
    return { ok: false, error: 'Nenhum card para salvar.' }
  }
  if (cleaned.some((c) => !c.frente || !c.verso)) {
    return { ok: false, error: 'Preencha a frente e o verso de todos os cards antes de salvar.' }
  }

  const { data: material, error: fetchError } = await supabase
    .from('materials')
    .select('id, status')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError || !material) {
    return { ok: false, error: 'Material não encontrado.' }
  }
  if (material.status !== 'aguardando_revisao') {
    return { ok: false, error: `Material não está aguardando revisão (está "${material.status}").` }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('flashcards')
    .insert(cleaned.map((c) => ({ user_id: user.id, frente: c.frente, verso: c.verso, origem: 'ia', material_id: materialId })))
    .select('id')

  if (insertError || !inserted) {
    return { ok: false, error: 'Não foi possível salvar os flashcards.' }
  }

  let collectionId: string | null = null
  let collectionName: string | null = null
  let warning: string | null = null

  if (destination.type === 'existing') {
    const { data: col, error } = await supabase
      .from('collections')
      .select('id, nome')
      .eq('id', destination.collectionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !col) {
      warning = 'Não foi possível encontrar a coleção selecionada. Os cards ficaram sem coleção.'
    } else {
      collectionId = col.id
      collectionName = col.nome
    }
  } else if (destination.type === 'new' && destination.name.trim()) {
    const { data: newCol, error } = await supabase
      .from('collections')
      .insert({ user_id: user.id, nome: destination.name.trim() })
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

  // The review cycle ends here regardless of a destination warning — the cards are already
  // safely in `flashcards`, and cards_gerados (the pre-review draft) is now redundant.
  await supabase.from('materials').update({ status: 'concluido', cards_gerados: null }).eq('id', materialId)

  return {
    ok: true,
    summary: { savedCount: cleaned.length, collectionId, collectionName, warning },
  }
}

export type DiscardReviewResult = { ok: true; materialIdToRefresh: string | null } | { ok: false; error: string }

// Discarding everything ends the review without saving. File-mode materials keep their
// conteudo_extraido, so they go back to 'pronto' and can be regenerated from the same extracted
// content. Theme-mode materials have no extraction step to fall back to — there is nothing to
// "regenerate from" — so the simplest correct move is deleting the material row outright, letting
// the client reset to its initial "describe a theme" state, same as if nothing had run yet.
export async function discardGeneratedCardsAction(materialId: string): Promise<DiscardReviewResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { data: material, error: fetchError } = await supabase
    .from('materials')
    .select('id, modo, status')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError || !material) {
    return { ok: false, error: 'Material não encontrado.' }
  }
  if (material.status !== 'aguardando_revisao') {
    return { ok: false, error: `Material não está aguardando revisão (está "${material.status}").` }
  }

  if (material.modo === 'tema') {
    const { error } = await supabase.from('materials').delete().eq('id', materialId)
    if (error) return { ok: false, error: 'Não foi possível descartar os cards.' }
    return { ok: true, materialIdToRefresh: null }
  }

  const { error } = await supabase.from('materials').update({ status: 'pronto', cards_gerados: null }).eq('id', materialId)
  if (error) return { ok: false, error: 'Não foi possível descartar os cards.' }
  return { ok: true, materialIdToRefresh: materialId }
}
