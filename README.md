# Meus Flashcards AI

App pessoal de flashcards para estudo, com geração automática via IA a partir de material já existente (PDF, imagem, Word, PowerPoint) ou importação de flashcards prontos via CSV.

> Projeto pessoal de aprendizado (pair programming com Claude / Claude Code). Sem intenção comercial no momento.

## O problema

Criar flashcards manualmente é o principal atrito que impede o uso consistente de repetição/prática ativa como técnica de estudo. Este app resolve isso automatizando a geração a partir de material já existente — a usuária sobe o conteúdo, revisa os cards gerados, organiza em coleções e estuda.

## Funcionalidades (v1)

- **Upload de material** (PDF, imagem, Word, PowerPoint — até 20 MB) com geração automática de flashcards via IA
- **Importação via CSV** (até 5 MB) para trazer flashcards já criados em outro app
- **Revisão e edição** dos cards antes de salvar
- **Coleções** com relação many-to-many entre flashcards (agrupar/desagrupar livremente)
- **Modo de estudo** com virada de card e marcação de acerto/erro
- **Acompanhamento de desempenho**: taxa de acerto por coleção, cards com mais erro, streak de dias de estudo, meta diária
- **PWA** instalável, mobile-first, com suporte offline para revisão de cards
- **Dark/light mode**
- Autenticação via email/senha (Supabase Auth)

Escopo completo e decisões de produto documentados em [`CLAUDE.md`](./CLAUDE.md) e [`USER_STORIES.md`](./USER_STORIES.md).

## Stack técnica

- **Frontend**: Next.js + Tailwind CSS (PWA, mobile-first)
- **Backend/DB**: Supabase (Postgres + Auth + Storage), com Row Level Security em todas as tabelas
- **IA**: API da Anthropic (Claude) — extração de conteúdo via visão nativa + geração de flashcards estruturada
- **Deploy**: Vercel

## Rodando localmente

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) com um projeto criado
- Chave de API da [Anthropic Console](https://console.anthropic.com)

### Setup

```bash
# Clonar o repositório
git clone https://github.com/marlonamancio/meus-flashcards-app.git
cd meus-flashcards-ai

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# preencher .env.local com suas chaves reais (ver seção abaixo)

# Rodar em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

Ver [`.env.local.example`](./.env.local.example) para a lista completa. Resumo:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Connect (ou Project Settings → Data API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API Keys |
| `SUPABASE_SECRET_KEY` | Supabase Dashboard → Project Settings → API Keys (nunca expor no client) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys (nunca expor no client) |

## Estrutura de documentação do projeto

- [`CLAUDE.md`](./CLAUDE.md) — contexto completo do projeto, escopo funcional, decisões técnicas e de design, para uso com Claude Code
- [`USER_STORIES.md`](./USER_STORIES.md) — histórias de usuário detalhadas por funcionalidade

## Status

🚧 Em desenvolvimento — v1 (MVP) em construção.
