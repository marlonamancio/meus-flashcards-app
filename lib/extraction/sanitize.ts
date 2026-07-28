// Extensible noise-removal pipeline applied to extracted text before chunking/persisting, for
// every file type (PDF, docx, pptx, image) — see CLAUDE.md "Pipeline de sanitização do conteúdo
// extraído". Materials from different sources carry source-specific noise (anti-piracy
// watermarks, repeated headers/footers, page numbering, platform branding); treating each as a
// one-off fix doesn't scale, so this is a plain array of rules run in sequence instead.
export type SanitizeRule = {
  /** Short kebab-case slug, shows up in logs/debugging. */
  name: string
  /** What this rule removes and why — the next person reading this should not need to guess. */
  description: string
  apply: (text: string) => string
}

// --- Regra: CPF + nome (marca d'água anti-pirataria) ---------------------------------------
// Padrão estrutural, não hardcoded para nenhum CPF/nome específico: detecta linhas inteiras no
// formato "{CPF}-{Nome Próprio}" (CPF formatado ou não, separador comum) e remove a linha
// inteira. Esse dado pessoal de terceiro não deve ser persistido nem enviado para a API de
// geração — além disso é ruído puro para a qualidade dos flashcards gerados.
const CPF_PATTERN = String.raw`(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})`
// Uma "palavra de nome": começa com maiúscula (inclui acentuadas via \p{Lu}), resto letras.
const NAME_WORD_PATTERN = String.raw`\p{Lu}[\p{L}'-]*`
// Conectores minúsculos comuns em nomes compostos em português (ex: "José da Silva Ínácio") —
// sem isso, "da"/"dos" quebrariam a sequência de palavras maiúsculas e o nome inteiro escaparia.
const NAME_CONNECTOR_PATTERN = String.raw`(?:de|da|do|dos|das|e)`
// Nome = palavra maiúscula, seguida de 1 a 5 palavras maiúsculas adicionais, cada uma com um
// conector minúsculo opcional na frente.
const NAME_PATTERN = String.raw`${NAME_WORD_PATTERN}(?:\s+(?:${NAME_CONNECTOR_PATTERN}\s+)?${NAME_WORD_PATTERN}){1,5}`
// A linha inteira (após trim) precisa ser CPF + separador opcional + nome — evita falso positivo
// em texto legítimo que só por acaso contenha 11 dígitos em sequência.
const CPF_NAME_WATERMARK_LINE = new RegExp(`^\\s*${CPF_PATTERN}\\s*[-–—:]?\\s*${NAME_PATTERN}\\s*$`, 'u')

const removeCpfNameWatermark: SanitizeRule = {
  name: 'cpf-nome-watermark',
  description:
    'Remove linhas no formato "{CPF}-{Nome Próprio}" — marca d\'água anti-pirataria com dado pessoal de terceiro, comum em cursos/apostilas de plataformas de terceiros.',
  apply: (text) =>
    text
      .split('\n')
      .filter((line) => !CPF_NAME_WATERMARK_LINE.test(line))
      .join('\n'),
}

// -------------------------------------------------------------------------------------------
// Como adicionar uma nova regra (ex: numeração de página repetida, cabeçalho/rodapé fixo,
// branding da plataforma de origem — ver "Regras candidatas" no CLAUDE.md):
//   1. Escreva uma função (ou regex) que recebe o texto inteiro e devolve o texto sem o ruído.
//   2. Empacote como um SanitizeRule: `name` (slug curto) + `description` (o que remove e por
//      quê — inclua um exemplo real do padrão, como acima) + `apply`.
//   3. Acrescente ao array SANITIZE_RULES logo abaixo, na ordem em que deve rodar.
// Nenhuma outra mudança é necessária — sanitizeExtractedText já aplica o array inteiro em
// sequência para todo tipo de arquivo.
// -------------------------------------------------------------------------------------------
const SANITIZE_RULES: SanitizeRule[] = [removeCpfNameWatermark]

export function sanitizeExtractedText(text: string): string {
  return SANITIZE_RULES.reduce((current, rule) => rule.apply(current), text)
}
