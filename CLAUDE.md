# CLAUDE.md — Meus Flashcards AI

## Nome do app

**Meus Flashcards AI** (nome provisório, ajustado para diferenciar de registros/domínios semelhantes — sem intenção comercial agora).

## Contexto do projeto

App pessoal de flashcards para estudo, criado como projeto de aprendizado (pair programming com Claude / Claude Code) e para uso real no dia a dia da usuária, que estuda para concurso público.

**Não é um produto comercial.** Sem intenção de divulgação ou monetização neste momento. Escopo intencionalmente simples e enxuto, focado em resolver o problema real: gerar flashcards automaticamente a partir de material de estudo, sem exigir digitação manual.

## Persona

Estudante de concurso público. Não tem tempo nem paciência para preencher flashcards manualmente em apps existentes (Anki, Quizlet, etc). Precisa de um fluxo rápido: sobe o material, recebe os cards prontos, organiza e estuda.

## Problema a resolver

Criar flashcards manualmente é o principal atrito que impede o uso consistente de repetição/prática ativa como técnica de estudo. O app resolve isso automatizando a geração a partir de material já existente (PDFs de aula, leis, apostilas, fotos de anotações, slides).

## Escopo funcional (v1)

1. **Upload de material**
   - Formatos aceitos: PDF, imagem, Word (.docx), PowerPoint (.pptx)
   - Suporte a múltiplos arquivos por geração

2. **Geração de flashcards via IA**
   - Formato: pergunta/resposta simples (sem cloze, sem múltipla escolha por enquanto)
   - Quantidade de cards: escolha manual (usuária define um número) OU automática (IA decide com base na densidade do material)

3. **Revisão antes de salvar**
   - Editar frente/verso de qualquer card gerado antes de confirmar

4. **Coleções**
   - Relação many-to-many entre flashcards e coleções (um card pode pertencer a mais de uma coleção)
   - Criar, renomear, agrupar e desagrupar flashcards entre coleções livremente

5. **Destino dos cards gerados** (decisão no momento do upload)
   - Adicionar a uma coleção existente
   - Criar uma coleção nova
   - Deixar sem coleção (área "não organizados") para decidir depois

6. **Modo de estudo**
   - Virar o card (pergunta → resposta)
   - Marcar resposta como "sabia" / "não sabia"

7. **Acompanhamento de desempenho**
   - Registro histórico de cada resposta (acertou/errou, com data)
   - Taxa de acerto agregada por coleção
   - Destaque para os cards com maior taxa de erro

8. **Importação de flashcards existentes (CSV)**
   - Usuária pode importar flashcards já criados em outro app/meio via upload de arquivo CSV
   - Formato esperado: duas colunas (frente, verso), com cabeçalho — delimitador vírgula ou ponto-e-vírgula, codificação UTF-8
   - Mesmo fluxo de destino do upload com IA: adicionar a coleção existente, criar coleção nova, ou deixar sem coleção
   - Validação básica: linhas malformadas (faltando frente ou verso) são ignoradas na importação, não travam o processo inteiro
   - Ao final, mostrar resumo: quantos cards foram importados com sucesso e quantos foram ignorados (com o motivo, se possível)

## Fora de escopo (v1) — decisões conscientes

- **Repetição espaçada (SM-2/FSRS) — algoritmo de agendamento de revisão.** Ideias já capturadas para quando essa etapa chegar:
  - **Rating de 4 níveis** no modo de estudo, substituindo o binário atual "sabia/não sabia": **Não lembrei / Foi difícil / Fui bem / Fácil demais** (equivalente ao padrão Again/Hard/Good/Easy usado por Anki e FSRS). Isso não é só mudança de UI — é o dado de entrada que o algoritmo de repetição espaçada precisa para decidir o próximo intervalo de revisão com mais precisão do que um sim/não. Implica migrar `flashcard_responses.acertou` (boolean) para um campo de rating com 4 níveis quando essa v2 chegar — **manter boolean na v1**, essa migração de schema é trabalho de v2.
  - **Ordem de apresentação dos cards no modo de estudo**: duas opções a decidir na v2 — embaralhar aleatoriamente os cards da coleção, ou deixar o algoritmo de repetição espaçada decidir a ordem/prioridade com base no progresso registrado (cards com mais erro ou mais próximos do vencimento aparecem primeiro). Provavelmente a segunda opção é a mais valiosa uma vez que a repetição espaçada existir, mas embaralhar pode ser um "modo simples" complementar mesmo sem o algoritmo completo.
- YouTube ou áudio como fonte de material
- Exportação para Anki, Quizlet, etc, ou importação de formatos nativos desses apps (ex: .apkg) — a importação via CSV genérico já cobre o caso de uso real (trazer cards já criados), sem precisar suportar formato proprietário de terceiros
- **Tela de cadastro pública** — conta criada manualmente via Supabase Dashboard na v1 (ver seção "Autenticação"). Cadastro self-service fica para v2.
- **Notificações de estudo (push)** — apareceu no protótipo do Claude Design (toggle na tela de Perfil), mas fica para v2: exige permissão do navegador, service worker dedicado e gatilho de backend para disparo, complexidade real além do resto do MVP. Manter o toggle fora do Perfil na v1, ou deixá-lo desabilitado/"em breve" se já estiver no design
- **Exportar meus cards (CSV)** — também apareceu no protótipo (Perfil), fica para v2. Seria o espelho simples da importação CSV, mas não é essencial para o problema original (ela quer gerar cards, não exportá-los)
- Imagens geradas por IA nos cards
- Dashboard de estatísticas avançado
- Suporte multilíngue (só português)
- Cards em formato cloze ou múltipla escolha

Essas features podem entrar em versões futuras, mas não são necessárias para resolver o problema original.

## Design e estilo visual

Estilo não é prioridade de esforço agora, mas há uma direção clara a seguir:

- **Moderno, minimalista, foco em legibilidade e simplicidade** — evitar excesso de elementos visuais, priorizar espaço em branco e hierarquia tipográfica clara.
- **Toque de gamificação** — leve, não invasivo. Pensar em elementos como: streak de dias estudando, pequena animação/feedback ao acertar um card, badge simples por marco atingido (ex: "50 cards revisados"). Não é para virar um app "gameificado" no sentido pesado, é um tempero para engajamento.
- **Dark mode / light mode** — switch manual pelo usuário (não só seguir o sistema operacional, embora isso possa ser o padrão inicial). Persistir a preferência escolhida (localStorage ou preferência do usuário no banco), aplicada via CSS variables para troca instantânea sem reload.
- **Tipografia**: apenas **Inter** (Google Fonts) em todo o app. ~~Alternância serifada/sem serifa (Inter/Lora)~~ foi descartada — decisão consciente de simplificar, um switch a menos para manter e testar.

## Telas de referência (protótipo Claude Design)

Protótipo final iterado no Claude Design. Cada tela aprovada deve virar referência de implementação para o Claude Code — a IA deve seguir fielmente o padrão visual e os componentes já validados, não reinterpretar do zero.

### Home

Estrutura de cima para baixo (ordem de prioridade visual):

1. **Cabeçalho**: saudação personalizada ("Olá, [nome]") + data + switch de dark/light mode (ícone de lua/sol) + avatar/inicial da usuária no canto superior direito
2. **Card de ofensiva (streak)** — componente principal da home, reforça o hábito diário:
   - Número de dias consecutivos + recorde pessoal ("Seu recorde é X dias")
   - Calendário semanal (S T Q Q S S D) com indicador visual de dias concluídos (check preenchido), dia atual em destaque (contorno), dias futuros neutros
3. **Meta de hoje**: barra de progresso com contagem "X / Y cards", meta diária configurável
4. **Badges/conquistas**: linha de 3 cards compactos (ex: "cards revisados", "dias de ofensiva", "acertos" — cada um com ícone, número e legenda). Badges bloqueados/não atingidos ficam com estado visual "desativado" (ex: "faltam 12")
5. **Lista de coleções**: cada item com sigla/inicial da coleção (avatar tipo iniciais, ex: "DC" para Direito Constitucional), nome, barra de progresso e percentual de acerto, contador de cards, seta de navegação (`>`)
6. **Navegação inferior fixa**: Início, Coleções, botão central de destaque (+) para upload/criação rápida, Progresso, Perfil

### Padrão de gamificação validado

O card de ofensiva + badges + barra de meta diária são os três elementos de gamificação da v1 — não adicionar mais que isso sem alinhar antes (o objetivo é reforço leve de hábito, não um sistema de pontos/níveis complexo).

### Padrão de cores por estado

- Progresso/conquista: laranja (cor primária, usada em streak, meta, barra de progresso ativa)
- Coleções distintas usam cores de destaque diferentes no avatar de iniciais para diferenciação visual rápida (ex: laranja para uma coleção, verde para outra)
- Estados neutros/não atingidos: tons de cinza/bege claro, sem cor de destaque

**Atenção ao implementar**: validar se esse mesmo contraste (laranja sobre bege/off-white) se sustenta no dark mode — é o ponto mais comum de quebra visual nessa tradução.

### Modo de estudo — estilo do card de pergunta/resposta

Padrão intencional (não é bug nem tema geral do app): o card de **pergunta** usa fundo claro (mesmo em light mode) e o card de **resposta**, ao virar, usa fundo escuro/invertido — reforça visualmente a transição de "pergunta → resposta". No **dark mode geral do app**, essa lógica se inverte: pergunta em card escuro, resposta em card claro/invertido. Ou seja, o card de resposta é sempre visualmente invertido em relação ao card de pergunta, independente do tema ativo — não é para os dois seguirem exatamente a mesma cor de fundo do tema.

### Padrão de header — decisão final (revisado)

Três variantes de header, não uma estrutura única compartilhada:

1. **Home**: header próprio — saudação personalizada ("Olá, [nome]") + data, toggle de tema, avatar. Tudo numa única faixa, como já implementado.
2. **Upload ("Novo material")**: header próprio, seguindo o protótipo original — botão de voltar (←) + título "Novo material". Não usa o header comum nem toggle/avatar aqui.
3. **Coleções / Progresso / Perfil**: estrutura em **duas camadas**, não uma linha só:
   - **Camada comum (topo)**: ícone/logo + nome do app ("Meus Flashcards"), toggle de tema, avatar — igual nas três telas
   - **Camada de página (abaixo da comum)**: nome da página (ex: "Coleções") + os componentes específicos daquela tela conforme o protótipo (ex: botão "+" em Coleções, subtítulo em Progresso) — **não** vai na mesma linha do toggle/avatar, fica visualmente abaixo, como um bloco separado

Implementação: a camada comum (item 3) é o único elemento realmente compartilhado entre Coleções/Progresso/Perfil — cada página então renderiza seu próprio bloco de título/componentes logo abaixo, dentro da própria página (não dentro do componente de header comum). **Exceção: Perfil não usa `HeaderTitle`** — o bloco de perfil (avatar, nome, stats) já funciona como identificação visual da página, um título repetido ali ficou redundante/estranho. Coleções e Progresso mantêm o `HeaderTitle`.

### Demais telas revisadas (protótipo Claude Design)

Telas de Login, Coleção individual, Coleções, Progresso e Perfil revisadas e aprovadas — estrutura consistente com o escopo e modelo de dados já definidos (taxa de acerto/erro, "onde você mais erra", atividade semanal, evolução por coleção são todos deriváveis de `flashcard_responses` + `daily_activity`, sem necessidade de tabelas novas).

**Ajuste para a v1 na tela de Perfil**: os toggles de "Notificações de estudo" e o item "Exportar meus cards" aparecem no protótipo, mas ambos ficam para v2 (ver seção "Fora de escopo"). Remover da v1 ou manter visualmente desabilitados/"em breve", a critério da implementação — não bloquear a v1 por causa deles.

### Novo material (upload) — duas abas no mesmo fluxo

- Aba "Gerar com IA": upload de material (PDF/imagem/Word/PowerPoint, até 20 MB) → quantidade automática ou manual → destino (coleção existente/nova/sem coleção)
- Aba "Importar CSV": upload de CSV (até 5 MB) → formato esperado exibido na tela + botão "baixar modelo" → mesmo destino (coleção existente/nova/sem coleção)
- As duas abas reaproveitam o mesmo componente de "onde salvar os cards" — importante manter isso como um componente único reutilizado no código, não duplicado entre os dois fluxos

## PWA e mobile-first

- Uso principal esperado: celular, nos intervalos de estudo. **Mobile-first no design e no CSS desde o início**, desktop é a adaptação, não o contrário.
- Responsividade completa (mobile, tablet, desktop).
- Implementar como PWA de verdade, não só "atalho na tela":
  - Web App Manifest (ícones, nome, cor de tema, `display: standalone`)
  - Service Worker com estratégia de cache (ex: cache-first para assets estáticos, network-first para dados dinâmicos)
  - Funcionalidade offline básica: pelo menos permitir revisar flashcards já sincronizados sem internet (a geração via IA obviamente exige conexão)
  - Instalável (prompt de "adicionar à tela inicial")

**Cuidado conhecido — Service Worker em dev**: o registro do service worker deve rodar apenas em produção (`process.env.NODE_ENV === 'production'`). Em dev com Turbopack, hot reload reescreve o mesmo chunk CSS/JS sob a mesma URL — uma estratégia cache-first (segura em produção, onde assets são content-hashed) serve uma versão desatualizada indefinidamente em dev, causando sintomas enganosos (estilo "sumindo", layout quebrado) que parecem bug de Tailwind/CSS mas são cache do service worker. Se isso acontecer: DevTools → Application → Service Workers → Unregister, depois hard refresh.

## Performance e segurança (desde o início, não como retrofit)

**Performance:**
- Lazy loading de rotas/componentes pesados
- Otimização de imagens (Next.js Image ou equivalente)
- Paginação/scroll infinito nas listas de flashcards e coleções (evitar carregar tudo de uma vez)
- Processamento de IA sempre assíncrono, nunca bloqueando a UI

**Segurança:**
- Autenticação desde a v1, mesmo com usuária única — trata-se de dados privados (material de estudo, desempenho). Ver seção "Autenticação" abaixo.
- Row Level Security (RLS) no Supabase — cada usuária só acessa seus próprios dados a nível de banco, não só de aplicação
- **Grant explícito por tabela**: no setup do projeto, "Automatically expose new tables" fica desativado (recomendação de segurança). Isso significa que toda tabela nova precisa de um `GRANT` explícito no Postgres antes de ficar acessível via Data API/`supabase-js` — RLS e Grant são camadas diferentes (Grant controla se a role acessa a tabela; RLS controla quais linhas ela vê). Ao criar cada tabela, incluir na mesma migration: `ENABLE ROW LEVEL SECURITY`, as policies de RLS, e o `GRANT` correspondente (ex: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabela TO authenticated;`). Sem o Grant, chamadas retornam erro `42501` (permission denied) mesmo com RLS configurado corretamente.
- Validação de tipo e tamanho de arquivo no upload (evitar upload de arquivos maliciosos ou excessivamente grandes)
- Nunca expor a chave da API de IA no client — todas as chamadas à IA passam pelo backend/Edge Function
- HTTPS obrigatório (padrão em Vercel/Supabase, mas deixar explícito)
- Sanitização de conteúdo extraído de arquivos antes de renderizar (evitar XSS via conteúdo de PDF/imagem malformado)

## Autenticação

Mesmo sendo uso restrito a uma única usuária por enquanto, a autenticação entra desde a v1 por questões de privacidade e segurança dos dados (material de estudo pode incluir conteúdo sensível/pessoal).

- Supabase Auth cobre isso nativamente (email/senha é suficiente para o caso de uso; não há necessidade de OAuth social por agora)
- Sessão persistente no PWA (não pedir login toda hora)
- RLS já citado acima garante isolamento de dados a nível de banco, preparando o terreno caso o app ganhe mais usuários no futuro

**Cadastro de usuária (decisão v1):** não há tela de cadastro pública na v1. A(s) conta(s) são criadas manualmente pelo desenvolvedor via Supabase Dashboard → Authentication → Users → Add user. Isso é suficiente para uso de usuária única e reduz superfície de exposição (sem endpoint público de criação de conta). Tela de cadastro simples fica para v2 (ver "Fora de escopo").

**Política de senha:**
- Configurar em Supabase Dashboard → Auth → Policies (não é validação implementada no código do app, é configuração da plataforma):
  - Comprimento mínimo: 10-12 caracteres
  - Exigir combinação de maiúscula, minúscula, número e símbolo
  - Bloqueio de senhas vazadas (HaveIBeenPwned) — recurso do plano Pro do Supabase, deixar como melhoria futura caso o projeto migre de plano
- Hash de senha (bcrypt + salt) já é nativo do Supabase Auth, não requer implementação
- Validação client-side deve espelhar a mesma regra apenas para dar feedback imediato na UI (ex: "faltam X caracteres", "adicione um número") — a validação que efetivamente protege é a do servidor
- Reset de senha via serviço de e-mail padrão do Supabase (suficiente para o volume de uso atual; SMTP customizado fica para se o projeto crescer)
- Fora de escopo por agora: MFA (dois fatores) e OAuth social — sobre-engenharia para o volume de uso atual

## Stack técnica sugerida

- **Frontend**: Next.js + Tailwind, mobile-first, PWA (manifest + service worker)
- **Fontes**: apenas Inter (Google Fonts) — sem switch de fonte
- **Tema**: dark/light mode via CSS variables, switch persistido
- **Backend/DB**: Supabase (Postgres + Auth + Storage) com Row Level Security habilitado desde a primeira tabela
- **Autenticação**: Supabase Auth (email/senha)
- **IA**: API da Anthropic (Claude) — extração de conteúdo de imagem/PDF via visão nativa do modelo + geração de flashcards via prompt estruturado (output em JSON). Chamadas sempre via backend/Edge Function, nunca do client
- **Processamento assíncrono**: necessário desde o início (Supabase Edge Functions ou fila simples) para não travar a UI durante geração

## Notas técnicas por tipo de arquivo

| Formato | Extração | Observação |
|---|---|---|
| PDF (texto) | Extração direta de texto | Caso mais simples |
| PDF escaneado / imagem | Visão da IA (Claude lê a imagem diretamente) | Sem necessidade de OCR tradicional |
| Word (.docx) | Biblioteca de extração de texto (ex: mammoth) | Simples |
| PowerPoint (.pptx) | Extração de texto por slide | Cada slide como bloco de conteúdo ajuda a IA a entender a estrutura |

Necessário um dispatcher simples que identifica o tipo de arquivo e chama o extrator correspondente antes de enviar o conteúdo para geração de flashcards.

Para PDFs/materiais grandes: aplicar chunking (dividir em pedaços) antes de enviar para a IA, já que não cabem em uma única chamada.

## Importação via CSV (fluxo separado da geração por IA)

Diferente do upload de material (PDF/imagem/Word/PowerPoint), que passa pelo pipeline de extração + geração via IA, a importação de CSV é um fluxo mais direto — não envolve chamada à API da Anthropic:

1. Parse do CSV (biblioteca leve, ex: `papaparse` no client ou `csv-parse` no server)
2. Validação de estrutura: exige as duas colunas (frente, verso); linha de cabeçalho reconhecida por nome (`frente`/`verso` ou `front`/`back`, para aceitar CSVs exportados de outros apps em inglês). Separador aceito: vírgula ou ponto-e-vírgula
3. Linhas incompletas são puladas e contabilizadas para o resumo final, não interrompem a importação
4. Cards importados seguem a mesma lógica de destino (coleção existente/nova/sem coleção) e o mesmo modelo de dados dos demais flashcards — na tabela `flashcards`, o campo de origem pode indicar `material_id = null` e um campo `origem: "csv" | "ia" | "manual"` para rastreabilidade
5. Processamento pode ser síncrono (sem fila), já que não depende de IA e CSVs de flashcards tendem a ser pequenos (algumas centenas de linhas no máximo)
6. **Botão "Baixar modelo"**: disponibilizar um CSV de exemplo para download na própria tela de importação (cabeçalho `frente,verso` + 1-2 linhas de exemplo), para reduzir erro de formatação por parte da usuária

## Limites de arquivo (upload)

- Material para geração via IA (PDF, imagem, Word, PowerPoint): **até 20 MB** por arquivo
- CSV para importação: **até 5 MB**
- Validação de tamanho no client (feedback imediato) e no server (proteção real) — consistente com o item de segurança já registrado sobre validação de tipo/tamanho de upload

## Modelo de dados (simplificado)

```
users
  └── materials (arquivo original, tipo, status: processando/pronto)
        └── flashcards (frente, verso, material_id de origem, origem: "ia" | "csv" | "manual")
  └── collections (nome, criada pelo usuário)
        └── collection_flashcards (tabela de junção — many-to-many)
  └── flashcard_responses (flashcard_id, acertou: boolean, respondido_em)
  └── user_stats (streak_atual, streak_recorde, meta_diaria_cards, cards_estudados_hoje, ultima_atividade_em)
  └── daily_activity (data, cards_revisados, meta_atingida: boolean) — usado para montar o calendário semanal da home
  └── badges (tipo, atingido_em, meta_alvo) — ex: "50 cards revisados", "7 dias de ofensiva"
```

**Thresholds confirmados dos badges (v1)**: 50 cards revisados / 7 dias de ofensiva / 100 acertos — valores fixos vindos do protótipo original do Claude Design, confirmados como definitivos (não são placeholder).

Observação: `streak_atual` e `streak_recorde` podem ser calculados a partir de `daily_activity` (derivado) ou mantidos como campos denormalizados em `user_stats` para leitura rápida na home — decisão de implementação, não afeta o escopo funcional.

## Princípios de trabalho (padrão do Marlon)

- Simplicidade e sem overengineering — este é um projeto de aprendizado, não um MVP para escalar
- Planejamento e alinhamento em conversa antes de implementar
- Preferência por entender fundamentos antes de aplicar
- Performance e segurança tratadas desde o início, não como retrofit — mesmo em escopo simples e uso pessoal