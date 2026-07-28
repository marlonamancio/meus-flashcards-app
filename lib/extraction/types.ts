export type MaterialTipo = 'pdf' | 'image' | 'docx' | 'pptx'

export type ExtractionMethod = 'text' | 'vision'

export type ExtractedContent = {
  fullText: string
  chunks: string[]
  method: ExtractionMethod
}
