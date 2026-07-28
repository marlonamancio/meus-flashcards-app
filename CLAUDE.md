# CLAUDE.md — Meus Flashcards AI

## Nome do app

**Meus Flashcards AI** (nome provisório, ajustado para diferenciar de registros/domínios semelhantes — sem intenção comercial agora).

## Contexto do projeto

App pessoal de flashcards para estudo, criado como projeto de aprendizado (pair programming com Claude / Claude Code) e para uso real no dia a dia do usuário, que estuda para concurso público.

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
   - Quantidade de cards: escolha manual (usuário define um número) OU automática (IA decide com base na densidade do material)

3. **Revisão antes de salvar**
   - Editar frente/verso de qualquer card gerado antes de confirmar

4. **Coleções**
   - Relação many-to-many entre flashcards e coleções (um card pode pertencer a mais de uma coleção)
   - Criar, renomear, agrupar e desagrupar flashcards entre coleções livremente

5. **Destino dos cards gerados** (decisão no momento do upload)
   - Adicionar a uma coleção existente
   - Criar uma coleção nova
   - Deixar sem coleção (área "não organizados") para decidir depois

6. **Modo de estudo — repetição espaçada (SM-2), puxada para v1**
   Decisão tomada após reflexão sobre a ciência por trás de flashcards: repetição espaçada é o core do produto, não uma feature de v2. Isso **substitui inteiramente** o modelo anterior de "passagem completa" (que exigia responder todos os cards da coleção numa sessão/série de sessões) por um modelo de **cards vencidos** — o padrão real de qualquer app sério de repetição espaçada.

   - **Rating de 4 níveis**, substituindo definitivamente o binário "sabia/não sabia": **Não lembrei / Foi difícil / Fui bem / Fácil demais** (equivalente a Again/Hard/Good/Easy do Anki/SM-2 moderno). Mapeamento para quality score do SM-2 (escala original 0-5): Não lembrei→0, Foi difícil→3, Fui bem→4, Fácil demais→5.
   - **Ícones dos 4 botões**: expressões faciais via lucide-react (já usado no projeto, sem nova dependência) — `Frown` (Não lembrei) / `Meh` (Foi difícil) / `Smile` (Fui bem) / `Laugh` (Fácil demais). Não são emojis Unicode, são ícones da biblioteca, mantendo consistência visual com o resto do app.
   - **Algoritmo**: SM-2 clássico (1987). Por card+usuário, mantém: `repetitions` (contagem de acertos consecutivos), `interval_days` (intervalo atual), `ease_factor` (fator de facilidade, começa em 2.5), `due_date` (próxima data de revisão). A cada resposta: se quality < 3 (Não lembrei), reseta `repetitions` e `interval_days` para 1, `due_date` = amanhã. Se quality ≥ 3: `repetitions` incrementa; `interval_days` = 1 (primeira repetição), 6 (segunda), ou `interval_anterior × ease_factor` (demais); `ease_factor` se ajusta pela fórmula padrão do SM-2 conforme o quality score; `due_date` = hoje + `interval_days`.
   - **Card nunca revisado**: tratado como vencido imediatamente (sem `due_date` = elegível agora), mesmo padrão de qualquer app de repetição espaçada — todo card novo entra na fila de hoje.
   - **"Estudar esta coleção" mostra só os cards vencidos hoje** daquela coleção (`due_date <= hoje` OU nunca revisado), não a coleção inteira. Se não houver nenhum vencido, o usuário vê uma mensagem tipo "Nenhum card para revisar hoje, volte amanhã!" em vez do botão de estudar.
   - **"Retomar de onde parou" fica automático, sem tabela dedicada**: como cada resposta já atualiza a `due_date` daquele card individualmente (empurrando pra frente), fechar a sessão no meio e reabrir naturalmente já mostra só o que ainda não foi respondido hoje — a tabela `study_progress` e toda a lógica de "passagem"/dialog de continuar-recomeçar ficam **obsoletas e devem ser removidas** (não adaptadas). O agendamento do SM-2 já resolve isso de graça.
   - **Interleaving dentro da sessão**: os cards vencidos de uma mesma coleção continuam sendo exibidos com embaralhamento (reaproveitar o mecanismo já existente de prioridade + jitter de `lib/study-order.ts`, adaptando a métrica de prioridade de "menor taxa de acerto" para "mais atrasado" — quanto mais dias vencido, maior prioridade, com a mesma margem de aleatoriedade). Interleaving **entre coleções diferentes** (misturar cards de matérias diferentes numa sessão só) fica para v2 — v1 continua com sessão por coleção.
   - **Fechar no meio da sessão (botão X)**: mantém o resumo parcial (contagem por nível de rating respondido até ali) — esse comportamento não muda, só o rating vira 4 níveis em vez de 2.
   - **Compatibilidade com dado histórico**: decisão explícita — respostas antigas (formato boolean `acertou`) **não** são convertidas nem usadas como estado inicial do SM-2. Todo card começa o SM-2 do zero a partir de agora, independente de já ter sido estudado antes. O campo `acertou` continua existindo em `flashcard_responses` (não migrado), preservando os cálculos de taxa de acerto/progresso já validados — um novo campo `rating` (0-3, nullable para linhas antigas) é adicionado só para respostas novas, alimentando exclusivamente o SM-2.
   - FSRS (mais preciso que SM-2, mas mais complexo) permanece v2 — ver "Fora de escopo".


   - Registro histórico de cada resposta (acertou/errou, com data)
   - Taxa de acerto agregada por coleção
   - Destaque para os cards com maior taxa de erro

8. **Importação de flashcards existentes (CSV)**
   - Usuário pode importar flashcards já criados em outro app/meio via upload de arquivo CSV
   - Formato esperado: duas colunas (frente, verso), com cabeçalho — delimitador vírgula ou ponto-e-vírgula, codificação UTF-8
   - Mesmo fluxo de destino do upload com IA: adicionar a coleção existente, criar coleção nova, ou deixar sem coleção
   - Validação básica: linhas malformadas (faltando frente ou verso) são ignoradas na importação, não travam o processo inteiro
   - Ao final, mostrar resumo: quantos cards foram importados com sucesso e quantos foram ignorados (com o motivo, se possível)

9. **Tela "Não organizados"** (v1, sequenciada após o pipeline de IA estar pronto)
   - Cards sem coleção (órfãos por nunca terem sido categorizados, ou por terem sobrado após uma coleção ser apagada) ficam listados nessa tela dedicada — hoje é só um item visual na lista de Coleções, sem rota/tela real por trás
   - Para cada card: **sugestão automática de coleção via IA**, com base no conteúdo do card comparado às coleções existentes do usuário (reaproveita a mesma infraestrutura de chamada à API da Anthropic do pipeline de geração — não é uma integração de IA nova e isolada)
   - Usuário toca na coleção sugerida para mover o card, ou remove o card diretamente (protótipo original: "Toque na coleção sugerida para mover cada card, ou remova o que não precisa")
   - Depende do pipeline de upload+geração via IA já estar implementado (item 3) — não faz sentido implementar isolado antes disso, seria uma segunda integração de IA solta no código

10. **Edição de perfil**
    - **Nome de exibição**: campo editável no Perfil, salvo em `user_metadata.name` do Supabase Auth. Usado no "Olá, [nome]" da Home e em qualquer outro lugar que hoje usa o fallback genérico
    - **Avatar do header (Home)**: vira link clicável levando para `/perfil`
    - **Cor/estilo do avatar de iniciais**: usuário escolhe entre um conjunto pré-definido de cores (mesma paleta já usada nos avatares de coleção — `COLLECTION_PALETTE`), sem upload de imagem na v1. Upload de foto real fica para v2 (exige Supabase Storage, bucket dedicado, mais complexidade — ver "Fora de escopo")
    - **Alterar senha**: formulário no Perfil (senha atual + nova senha + confirmar nova senha), respeitando a mesma política de senha forte já configurada no Supabase (mínimo 6 caracteres, maiúscula/minúscula/número/símbolo — ver seção "Autenticação" para o valor exato confirmado)
    - **"Sobre o Meus Flashcards"**: conteúdo real (hoje é botão sem função). Deve incluir: nome/descrição curta do app, link para o repositório GitHub público (`https://github.com/marlonamancio/meus-flashcards-app`), indicação de que é um projeto pessoal/MVP em desenvolvimento

11. **Modo de navegação (browse) — ver cards sem estudar** (feedback real de uso)
    - Ponto de entrada: tocar num card na lista de `/collection/[id]` (hoje não faz nada ao tocar)
    - Abre uma visualização de card com virar (toque pra ver a resposta, mesmo padrão visual do modo de estudo: pergunta clara / resposta escura invertida) + navegação para frente/trás entre os cards da coleção (botões, mesmo padrão do resto do app — sem gesto/swipe, por consistência)
    - Ordem de navegação: a mesma ordem já exibida na lista da tela (não precisa seguir a lógica de prioridade/vencimento do SM-2 — isso é exclusivo do modo de estudo)
    - **Isolamento total do SM-2 (crítico)**: este modo é puramente leitura — nunca grava em `flashcard_responses` nem em `flashcard_schedule`. Não conta como revisão, não altera `due_date`, não afeta streak, meta diária, taxa de acerto ou badges. Sem botões de rating nenhum, só navegação + virar o card.
    - Propósito: consulta rápida antes de uma prova, conferir se um card está correto, revisar sem "gastar" uma revisão do sistema de repetição espaçada — não substitui o modo de estudo, é complementar

## Fora de escopo (v1) — decisões conscientes

- **Timezone configurável por usuário** — v1 usa timezone fixo em código (`America/Sao_Paulo`) para toda lógica de "dia" (streak, meta diária, daily_activity), já que é usuário única no Brasil. Um campo de timezone no Perfil, lido dinamicamente em vez de fixo, fica para v2 (relevante se o app escalar para mais usuários em fusos diferentes). Fixar agora não bloqueia essa evolução depois — troca uma constante por uma leitura de configuração, a lógica de cálculo de "dia" em si permanece a mesma.
- **Upload de foto real como avatar** — v1 permite só escolher cor/estilo do avatar de iniciais (sem imagem). Upload de foto de verdade fica para v2, quando fizer sentido configurar um bucket dedicado no Supabase Storage para isso.
- **FSRS — algoritmo mais preciso que SM-2, evolução futura.** SM-2 já foi puxado para v1 (ver item 6 "Modo de estudo"). FSRS fica para v2: modela dificuldade/estabilidade/retrievability por card de forma mais precisa que a fórmula fixa do SM-2, tipicamente exigindo menos revisões para o mesmo nível de retenção. Existe biblioteca de referência oficial em TypeScript (`ts-fsrs`) que evita reimplementar a matemática do zero — trocar a "engine" de cálculo sem precisar mudar o resto da arquitetura (schema de agendamento já criado para SM-2 é compatível em espírito).
- **Interleaving entre coleções diferentes** — v1 embaralha os cards vencidos dentro de uma mesma coleção (uma sessão de estudo é sempre de uma coleção só). Misturar cards de coleções diferentes numa sessão única (ex: revisar Direito Constitucional e Português juntos, intercalados) tem respaldo científico (reduz ainda mais decoreba por contexto/tópico), mas fica para v2 — exige repensar o que significa "sessão" (não mais por coleção) e provavelmente uma tela de "revisão geral do dia" separada de "estudar uma coleção específica".
- **Sub-coleções / decks**: matérias grandes (muitos cards numa coleção só) ficam difíceis de navegar — feedback real de uso. Duas abordagens a avaliar quando chegar a hora: (a) hierarquia real pai/filho (`collections.parent_id`, navegação em árvore, decidir se estudar a coleção-pai inclui os filhos) — mais poderosa, mais mudança de schema; (b) tags/filtro dentro da coleção existente (campo de tag no flashcard, sem mudar estrutura de coleções) — mais simples, resolve "achar uma parte específica" sem virar hierarquia completa. Nenhuma decisão tomada ainda, avaliar as duas na hora.
- YouTube ou áudio como fonte de material
- Exportação para Anki, Quizlet, etc, ou importação de formatos nativos desses apps (ex: .apkg) — a importação via CSV genérico já cobre o caso de uso real (trazer cards já criados), sem precisar suportar formato proprietário de terceiros
- **Coluna "Coleção" no CSV de importação** — permitiria importar cards de várias coleções num único arquivo (uma coluna extra com o nome da coleção de destino por linha). Se a coluna estiver toda vazia, mantém o comportamento atual (pergunta destino único); se parcialmente preenchida, linhas com valor vão para a coleção nomeada (criando se não existir, com normalização de nome — trim + case-insensitive, pra evitar duplicata por erro de digitação) e linhas vazias caem em "sem coleção". Não implementado na v1 porque muda a natureza do `DestinationPicker` (de "um destino por arquivo" para "destino por linha") e complexifica o resumo da importação (quebra por coleção, não só total importado/ignorado). Por enquanto, múltiplas coleções em um envio = múltiplos CSVs, um por coleção — já suportado sem trabalho adicional.
- **Notificações de estudo (push)** — apareceu no protótipo do Claude Design (toggle na tela de Perfil), mas fica para v2: exige permissão do navegador, service worker dedicado e gatilho de backend para disparo, complexidade real além do resto do MVP. Manter o toggle fora do Perfil na v1, ou deixá-lo desabilitado/"em breve" se já estiver no design
- **Exportar meus cards (CSV)** — também apareceu no protótipo (Perfil), fica para v2. Seria o espelho simples da importação CSV, mas não é essencial para o problema original (o usuário quer gerar cards, não exportá-los)
- Imagens geradas por IA nos cards
- Dashboard de estatísticas avançado
- Suporte multilíngue (só português)
- Cards em formato cloze ou múltipla escolha

Essas features podem entrar em versões futuras, mas não são necessárias para resolver o problema original.

## Design e estilo visual

**Referência do protótipo (Claude Design MCP)**: sempre que precisar consultar ou sincronizar o design original, use o MCP `claude_design` (`https://api.anthropic.com/v1/design/mcp`, autenticação via `/design-login`) para importar este projeto:
`https://claude.ai/design/p/53a89d98-9714-4cfe-9cfe-0e0ab53c3e29?file=Meus+Flashcards.dc.html`
Rodar `/design-sync` antes de implementar qualquer tela nova ou revisar uma existente — não implementar por suposição visual sem sincronizar primeiro (ver histórico de bug de estilo divergente registrado neste projeto).

Estilo não é prioridade de esforço agora, mas há uma direção clara a seguir:

- **Moderno, minimalista, foco em legibilidade e simplicidade** — evitar excesso de elementos visuais, priorizar espaço em branco e hierarquia tipográfica clara.
- **Toque de gamificação** — leve, não invasivo. Pensar em elementos como: streak de dias estudando, pequena animação/feedback ao acertar um card, badge simples por marco atingido (ex: "50 cards revisados"). Não é para virar um app "gameificado" no sentido pesado, é um tempero para engajamento.
- **Dark mode / light mode** — switch manual pelo usuário (não só seguir o sistema operacional, embora isso possa ser o padrão inicial). Persistir a preferência escolhida (localStorage ou preferência do usuário no banco), aplicada via CSS variables para troca instantânea sem reload.
- **Tipografia**: apenas **Inter** (Google Fonts) em todo o app. ~~Alternância serifada/sem serifa (Inter/Lora)~~ foi descartada — decisão consciente de simplificar, um switch a menos para manter e testar.

## Telas de referência (protótipo Claude Design)

Protótipo final iterado no Claude Design. Cada tela aprovada deve virar referência de implementação para o Claude Code — a IA deve seguir fielmente o padrão visual e os componentes já validados, não reinterpretar do zero.

### Home

Estrutura de cima para baixo (ordem de prioridade visual):

1. **Cabeçalho**: saudação personalizada ("Olá, [nome]") + data + switch de dark/light mode (ícone de lua/sol) + avatar/inicial do usuário no canto superior direito
2. **Card de ofensiva (streak)** — componente principal da home, reforça o hábito diário. **Regra de contagem (decisão final)**: o streak só incrementa no dia se a **meta diária de cards for atingida naquele dia** — responder cards sem bater a meta não conta para a ofensiva. Decisão consciente de ser mais exigente (força disciplina real), com o usuário tendo controle total sobre o quão fácil/difícil isso é, já que a meta diária é ajustável por ele mesmo na tela de Perfil (stepper "Meta diária"). Se pular um dia (sem bater a meta), o streak reseta para 0 no próximo dia com meta batida, seguindo a mesma lógica de reset já implementada:
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

### Novo material (upload) — duas abas, três formas de gerar

**Nota de implementação — tela de debug temporária**: `/upload/debug` foi criada durante o desenvolvimento do pipeline de extração (Estágio 1) para testar upload + polling de status + preview do conteúdo extraído, sem depender da UI final. É **ferramenta de desenvolvimento, não parte do produto** — precisa ser removida ou ocultada antes do app ser usado por outras pessoas além do desenvolvedor (antes de divulgar novas funcionalidades para os amigos testando), senão vira uma porta lateral estranha na experiência final e uma forma de gastar a API key sem os controles da UI de verdade. Não esquecer de remover ao final do Estágio 3.

- **Aba "Gerar com IA"**: dentro dela, o usuário escolhe entre duas origens de conteúdo (não são abas novas, é uma escolha dentro da mesma aba):
  - **Enviar arquivo**: upload de material (PDF/imagem/Word/PowerPoint, até 20 MB) → extração de conteúdo → geração
  - **Descrever um tema** (novo): campo de texto livre (ex: "Princípios do Direito Administrativo") → a IA gera cards a partir do próprio conhecimento dela, sem material de referência do usuário. **Aviso obrigatório na UI** sempre que essa opção for usada: cards gerados por tema livre não têm fonte de referência do usuário e podem conter imprecisões da IA — merecem revisão mais atenta que os gerados a partir de material enviado. Mostrar isso de forma visível antes ou durante a geração, não só como texto pequeno ignorável.
  - As duas origens convergem no mesmo fluxo depois: quantidade automática ou manual → revisão antes de salvar → destino (coleção existente/nova/sem coleção)
- **Aba "Importar CSV"**: upload de CSV (até 5 MB) → formato esperado exibido na tela + botão "baixar modelo" → mesmo destino (coleção existente/nova/sem coleção)
- Todas as origens reaproveitam o mesmo componente de "onde salvar os cards" (`DestinationPicker`) — não duplicar entre os fluxos

### Formato do prompt de geração de flashcards (IA)

**Recomendação técnica**: usar **tool use** (function calling) da API da Anthropic em vez de pedir JSON em texto livre — mais confiável, evita parsing frágil de markdown/texto solto ao redor do JSON.

```javascript
tools: [{
  name: "criar_flashcards",
  description: "Cria uma lista de flashcards de estudo",
  input_schema: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: { frente: { type: "string" }, verso: { type: "string" } },
          required: ["frente", "verso"]
        }
      }
    },
    required: ["cards"]
  }
}],
tool_choice: { type: "tool", name: "criar_flashcards" }
```

**Prompt base (instrução do sistema)**:
```
Você é um assistente especializado em criar flashcards de estudo eficazes 
para concursos públicos brasileiros.

Diretrizes:
- Cada flashcard testa um único conceito ou fato (atomicidade)
- Perguntas claras e diretas, sem ambiguidade
- Respostas concisas mas completas
- Evite perguntas triviais demais ou fáceis demais a ponto de não exigir 
  recordação real
- Evite duplicar o mesmo conceito em cards diferentes
- Preserve com precisão números de artigo de lei, datas e nomes próprios 
  quando mencionados no conteúdo de origem
- Responda chamando a ferramenta criar_flashcards, sem texto adicional
```

**Diferença crítica entre os dois modos de entrada** (não é cosmética, define o comportamento de precisão):

- **Modo arquivo**: `"Gere flashcards EXCLUSIVAMENTE a partir do conteúdo abaixo. Não adicione informação externa ao que está no texto, mesmo que você 'saiba' mais sobre o assunto — a fonte de verdade é o material fornecido pelo usuário."` + conteúdo extraído
- **Modo tema livre**: `"Gere flashcards sobre o tema abaixo, usando seu conhecimento. Priorize precisão factual: se não tiver certeza absoluta de um número de artigo de lei, data específica ou dado exato, prefira formular a pergunta de forma mais conceitual em vez de arriscar um número impreciso."` + tema informado

**Quantidade**: `"Gere quantos flashcards forem necessários para cobrir os conceitos-chave, evitando repetição e trivialidade — normalmente entre 5 e 40, dependendo da densidade"` (automático) ou `"Gere exatamente {N} flashcards cobrindo os conceitos mais importantes"` (manual).

**Limitação aceita para v1**: chunking de materiais grandes pode gerar cards levemente repetidos entre pedaços diferentes — não implementar deduplicação automática agora, a etapa de revisão antes de salvar já cobre isso.

### Pipeline de sanitização do conteúdo extraído (extensível)

Materiais de fontes diferentes (cursos, apostilas, PDFs de diferentes plataformas) trazem ruído específico da fonte — marcas d'água anti-pirataria, cabeçalhos/rodapés repetidos, numeração de página, branding da plataforma. Em vez de tratar cada caso como correção pontual, desenhar como um **pipeline de regras**, aplicado depois da extração e antes de persistir/chunkar/enviar para geração:

```
lib/extraction/sanitize.ts — array de regras, cada uma um padrão (regex ou 
função) + descrição do que remove. Aplicadas em sequência sobre o texto 
extraído, antes de qualquer outra etapa.
```

**Regras já identificadas**:
- **CPF + nome (marca d'água anti-pirataria)**: padrão `{11 dígitos, com ou sem formatação}-{nome próprio}` repetido em várias páginas — dado pessoal sensível de terceiro, não deve ser persistido nem enviado para a API de geração, além de ser ruído puro para a qualidade dos cards gerados. Regra geral (detecção de padrão de CPF), não hardcoded para um CPF específico.

**Regras candidatas para adicionar conforme aparecerem** (não implementar preventivamente, só quando um material real expuser a necessidade): numeração de página repetida ("Página X de Y"), cabeçalho/rodapé idêntico em todo chunk, outros formatos de marca d'água (email, telefone), branding/propaganda da plataforma de origem.

Aplicar a todos os tipos de arquivo (PDF, Word, PowerPoint), não só PDF — proteções parecidas podem aparecer em qualquer formato.



Sem limite de geração por usuário/dia na v1, mesmo com cadastro público (amigos testando) — volume esperado é baixo o suficiente para não justificar a complexidade agora. Monitorar manualmente o uso/custo no console da Anthropic durante o período de teste com amigos; se o volume crescer ou surgir uso abusivo, implementar limite (ex: N gerações/dia por usuário) como ajuste reativo, não preventivo.

## PWA e mobile-first

- Uso principal esperado: celular, nos intervalos de estudo. **Mobile-first no design e no CSS desde o início**, desktop é a adaptação, não o contrário.
- Responsividade completa (mobile, tablet, desktop).
- Implementar como PWA de verdade, não só "atalho na tela":
  - Web App Manifest (ícones, nome, cor de tema, `display: standalone`)
  - Service Worker com estratégia de cache (ex: cache-first para assets estáticos, network-first para dados dinâmicos)
  - Funcionalidade offline básica: pelo menos permitir revisar flashcards já sincronizados sem internet (a geração via IA obviamente exige conexão)
  - Instalável (prompt de "adicionar à tela inicial")

**Cuidado conhecido — Service Worker em dev**: o registro do service worker deve rodar apenas em produção (`process.env.NODE_ENV === 'production'`). Em dev com Turbopack, hot reload reescreve o mesmo chunk CSS/JS sob a mesma URL — uma estratégia cache-first (segura em produção, onde assets são content-hashed) serve uma versão desatualizada indefinidamente em dev, causando sintomas enganosos (estilo "sumindo", layout quebrado) que parecem bug de Tailwind/CSS mas são cache do service worker. Se isso acontecer: DevTools → Application → Service Workers → Unregister, depois hard refresh.

**Ícones do PWA (correção pendente)**: os ícones de instalação (192x192, 512x512) ainda são placeholders genéricos (quadrado laranja liso), não a logo real do app. Devem ser gerados a partir do mesmo `LogoMark` (as duas quadrados rotacionados sobrepostos) já usado no header/login, não um ícone novo desenhado à parte — manter consistência visual entre o ícone instalado e a marca usada dentro do app. Incluir também uma versão "maskable" (com área de segurança/padding, já que Android recorta o ícone em formas variadas).

**Performance:**
- Lazy loading de rotas/componentes pesados
- Otimização de imagens (Next.js Image ou equivalente)
- Paginação/scroll infinito nas listas de flashcards e coleções (evitar carregar tudo de uma vez)
- Processamento de IA sempre assíncrono, nunca bloqueando a UI

**Segurança:**
- Autenticação desde a v1, mesmo com usuário única — trata-se de dados privados (material de estudo, desempenho). Ver seção "Autenticação" abaixo.
- Row Level Security (RLS) no Supabase — cada usuário só acessa seus próprios dados a nível de banco, não só de aplicação
- **Grant explícito por tabela**: no setup do projeto, "Automatically expose new tables" fica desativado (recomendação de segurança). Isso significa que toda tabela nova precisa de um `GRANT` explícito no Postgres antes de ficar acessível via Data API/`supabase-js` — RLS e Grant são camadas diferentes (Grant controla se a role acessa a tabela; RLS controla quais linhas ela vê). Ao criar cada tabela, incluir na mesma migration: `ENABLE ROW LEVEL SECURITY`, as policies de RLS, e o `GRANT` correspondente (ex: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabela TO authenticated;`). Sem o Grant, chamadas retornam erro `42501` (permission denied) mesmo com RLS configurado corretamente.
- Validação de tipo e tamanho de arquivo no upload (evitar upload de arquivos maliciosos ou excessivamente grandes)
- Nunca expor a chave da API de IA no client — todas as chamadas à IA passam pelo backend/Edge Function
- HTTPS obrigatório (padrão em Vercel/Supabase, mas deixar explícito)
- Sanitização de conteúdo extraído de arquivos antes de renderizar (evitar XSS via conteúdo de PDF/imagem malformado)

## Autenticação

Mesmo sendo uso restrito a uma única usuário por enquanto, a autenticação entra desde a v1 por questões de privacidade e segurança dos dados (material de estudo pode incluir conteúdo sensível/pessoal).

- Supabase Auth cobre isso nativamente (email/senha é suficiente para o caso de uso; não há necessidade de OAuth social por agora)
- Sessão persistente no PWA (não pedir login toda hora)
- RLS já citado acima garante isolamento de dados a nível de banco, preparando o terreno caso o app ganhe mais usuários no futuro

**Cadastro de usuário (decisão revisada):** inicialmente decidimos não ter cadastro público (conta única, criada manualmente via Dashboard). Isso mudou — o MVP vai ser aberto para amigos testarem, então cadastro público (email + senha) entra no escopo agora. Detalhes:
- Tela de cadastro simples: email, senha, confirmar senha — mesma política de senha forte já configurada no Supabase
- Confirmação de email: usar o fluxo padrão do Supabase Auth (email de confirmação antes do primeiro login) — mais seguro contra cadastro com email inválido/de terceiros, aceitável mesmo sendo um passo a mais para quem testar
- RLS já isola dados por usuário desde o início — abrir para múltiplas contas não exige mudança de schema ou política, já estava preparado para isso
- Sem captcha/proteção anti-bot dedicada por enquanto — volume esperado é baixo (grupo de amigos, não público aberto), o rate-limiting nativo do Supabase Auth contra abuso é suficiente por ora

**Excluir conta (v1):** botão "Excluir conta" no Perfil, logo após "Sair da conta" — vermelho, com ícone de atenção, visualmente distinto como ação destrutiva. Ao clicar, modal de confirmação exige que o usuário digite o próprio email para confirmar (não é só um "tem certeza?" com botão sim/não, reduz clique acidental numa ação irreversível).

Implementação — pontos de segurança importantes:
- Exclusão de usuário do Supabase Auth (`auth.admin.deleteUser`) exige a **secret key**, nunca pode rodar no client — precisa ser uma Server Action/API route no backend
- Confirmar que todas as tabelas do app (`materials`, `flashcards`, `collections`, `collection_flashcards`, `flashcard_responses`, `user_stats`, `daily_activity`, `badges`) têm `user_id` referenciando `auth.users(id)` com `ON DELETE CASCADE` — se sim, apagar o usuário no Auth já apaga todos os dados dele automaticamente; se as migrations originais não configuraram isso, corrigir antes de expor essa funcionalidade (testar em ambiente de dev com uma conta descartável antes de confiar nisso em produção)
- Após exclusão bem-sucedida, encerrar a sessão e redirecionar para uma tela de confirmação (não para o login, para não sugerir "faça login de novo" logo após apagar a conta)
- Ação sem possibilidade de desfazer — deixar isso explícito no texto do modal de confirmação

**Política de senha (configurada e confirmada no Supabase Dashboard → Authentication → Sign In / Providers → Email):**
- Comprimento mínimo: **6 caracteres** (reduzido de 10-12 originalmente planejado, decisão consciente para não tornar o cadastro cansativo — trade-off aceito para o contexto de MVP entre amigos, não recomendado para produto com dado sensível real)
- Requisitos de caractere: **minúscula + maiúscula + dígito + símbolo obrigatórios** (opção "recommended" do Supabase)
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
- **IA**: API da Anthropic (Claude) — extração de conteúdo de imagem/PDF via visão nativa do modelo + geração de flashcards via **tool use** (function calling, não parsing de JSON em texto livre — ver "Formato do prompt de geração"). Chamadas sempre via backend/Server Action, nunca do client. Usa `ANTHROPIC_API_KEY` já configurada — mesma chave do projeto, sem chave nova necessária
- **Processamento assíncrono**: necessário desde o início (Supabase Edge Functions ou fila simples) para não travar a UI durante geração — ver nota sobre limite de duração da Vercel abaixo

### Dependências novas para o pipeline de IA

| Pacote | Uso |
|---|---|
| `@anthropic-ai/sdk` | Cliente oficial da Anthropic — primeira integração de IA de verdade no código (tudo antes disso foi CSV) |
| `pdf-parse` | Extração de texto de PDF nativo (não escaneado) |
| `mammoth` | Extração de texto de `.docx` (já era decisão prévia) |
| `jszip` + `fast-xml-parser` | Extração de texto de `.pptx` (PowerPoint é um zip de XMLs por slide) — preferido a um pacote específico de PowerPoint, mais controle e menos risco de dependência mal mantida |

### Supabase Storage — bucket pendente de criação

Os arquivos de material (PDF/imagem/Word/PPT) enviados precisam de um bucket dedicado no Supabase Storage — ainda não criado. Necessário: criar bucket (ex: `materiais`) via Dashboard → Storage, configurar políticas de acesso (RLS de Storage — diferente de RLS de tabela) para cada usuário só acessar os próprios arquivos.

### Limite de duração de função serverless (Vercel Hobby) — afeta a arquitetura

**Confirmado (não é mais estimativa)**: o plano Hobby da Vercel rejeita o build se `maxDuration` declarado exceder **300s** — mensagem exata do erro: `"Serverless Functions must have a maxDuration between 1 and 300 for plan hobby"`. Isso já causou uma falha de build real neste projeto (`maxDuration = 600` em `app/(app)/upload/debug/page.tsx`, corrigido para `300`, o teto real do plano). 300 é hoje o teto rígido, não um valor configurável mais alto — só sobe migrando de plano (Pro permite mais).

Extração de PDF grande + chamada de geração via IA pode facilmente ultrapassar isso numa chamada única. Isso não é só "não travar a UI" (requisito de UX) — é um requisito de arquitetura real: processar em pedaços pequenos o suficiente para caber no limite (ver "Processamento de PDF de imagem em lotes de páginas" abaixo), ou usar padrão de job assíncrono (inicia o processamento, retorna na hora, cliente consulta status depois) em vez de uma chamada única que faz tudo.

**Risco residual resolvido — lotes rodam em paralelo, não mais sequenciais** (ver "Processamento de PDF de imagem em lotes de páginas" abaixo): com lotes sequenciais, um material de 100 páginas no pior caso (4 lotes × até 90s) somava até 360s — já estourava os 300s do Hobby, mesmo com o batching. Trocado para execução em paralelo com no máximo 3 chamadas simultâneas (`runWithConcurrencyLimit` em `lib/extraction/pdf.ts`): o tempo total deixa de ser a *soma* dos lotes e passa a ser aproximadamente o tempo do lote mais lento (mais uma "onda" extra no pior caso, já que 4 lotes com limite de 3 significa que o 4º só começa quando um dos 3 primeiros termina). Pior caso reestimado: ~2 lotes densos em sequência (~180s no cenário mais pessimista de 90s/lote), contra o teto de 300s — folga real de ~120s, não mais um estouro garantido. Medição real (83 páginas, densidade moderada): caiu de ~51-55s (sequencial) para ~23s (paralelo).

## Notas técnicas por tipo de arquivo

| Formato | Extração | Observação |
|---|---|---|
| PDF (texto) | Extração direta de texto | Caso mais simples |
| PDF escaneado / imagem | Visão da IA (Claude lê o PDF nativamente como documento, sem precisar converter página por página em imagem) | Sem necessidade de OCR tradicional |
| Word (.docx) | Biblioteca de extração de texto (ex: mammoth) | Simples |
| PowerPoint (.pptx) | Extração de texto por slide | Cada slide como bloco de conteúdo ajuda a IA a entender a estrutura |

**Limite da API do Claude para PDF**: 100 páginas e 32 MB por requisição (visão nativa de documento). Materiais que excedam isso precisam ser divididos em múltiplas requisições antes de enviar — não implementar isso preventivamente, só quando um material real expuser a necessidade (a maioria dos materiais de estudo fica bem abaixo desse limite).

**Detecção de fallback texto→visão (correção de bug real)**: a checagem de "texto vazio/curto demais" (que decide se cai pro fallback de visão) precisa considerar a **densidade média de caracteres por página**, não o tamanho total do documento. Um PDF de 83 páginas todo em imagem, sem camada de texto, ainda gera ~1300 caracteres de marcadores de página quando extraído via `pdf-parse` — total "não vazio" o suficiente pra escapar de uma checagem ingênua de tamanho total, mas a média (~16 caracteres/página) deixa claro que não há texto real. Calcular `caracteres_totais / número_de_páginas` e comparar contra um limiar razoável (ex: menos de 100 caracteres/página é sinal de PDF escaneado sem texto).

Necessário um dispatcher simples que identifica o tipo de arquivo e chama o extrator correspondente antes de enviar o conteúdo para geração de flashcards.

Para PDFs/materiais grandes: aplicar chunking (dividir em pedaços) antes de enviar para a IA, já que não cabem em uma única chamada.

## Importação via CSV (fluxo separado da geração por IA)

Diferente do upload de material (PDF/imagem/Word/PowerPoint), que passa pelo pipeline de extração + geração via IA, a importação de CSV é um fluxo mais direto — não envolve chamada à API da Anthropic:

1. Parse do CSV (biblioteca leve, ex: `papaparse` no client ou `csv-parse` no server)
2. Validação de estrutura: exige as duas colunas (frente, verso); linha de cabeçalho reconhecida por nome (`frente`/`verso` ou `front`/`back`, para aceitar CSVs exportados de outros apps em inglês). Separador aceito: vírgula ou ponto-e-vírgula
3. Linhas incompletas são puladas e contabilizadas para o resumo final, não interrompem a importação
4. Cards importados seguem a mesma lógica de destino (coleção existente/nova/sem coleção) e o mesmo modelo de dados dos demais flashcards — na tabela `flashcards`, o campo de origem pode indicar `material_id = null` e um campo `origem: "csv" | "ia" | "manual"` para rastreabilidade
5. Processamento pode ser síncrono (sem fila), já que não depende de IA e CSVs de flashcards tendem a ser pequenos (algumas centenas de linhas no máximo)
6. **Botão "Baixar modelo"**: disponibilizar um CSV de exemplo para download na própria tela de importação (cabeçalho `frente,verso` + 1-2 linhas de exemplo), para reduzir erro de formatação por parte do usuário

## Limites de arquivo (upload)

- Material para geração via IA (PDF, imagem, Word, PowerPoint): **até 20 MB** por arquivo
- CSV para importação: **até 5 MB**
- Validação de tamanho no client (feedback imediato) e no server (proteção real) — consistente com o item de segurança já registrado sobre validação de tipo/tamanho de upload
- **Arquitetura de upload (decisão final, após investigação)**: `bodySizeLimit` sozinho não resolve — investigação encontrou um problema mais fundamental: arquivos acima de ~10MB quebram o parser nativo de `FormData` do Node/undici usado por Server Actions e por API Routes igualmente (`TypeError: Failed to parse body as FormData`), não é limitação configurável, é do runtime. **Upload de arquivo nunca deve passar pelo servidor Next.js.** Arquitetura correta: **upload direto do client para o Supabase Storage** (browser autenticado sobe o arquivo direto no bucket `materiais`, respeitando as políticas de RLS de Storage já configuradas via `auth.uid()`). O servidor só recebe `storage_path` + metadados (nome, tipo, tamanho) depois do upload concluído — payload pequeno, nunca esbarra em limite de body. A extração é disparada a partir desse `storage_path`, buscando o arquivo do Storage, não recebendo bytes na requisição. `bodySizeLimit: '25mb'` continua configurado (não faz mal deixar), mas não é mais a peça central da solução.
- **Status "processando" preso indefinidamente (risco real do limite de duração)**: se a extração ultrapassar o limite de duração de função da Vercel, a execução é encerrada à força pela plataforma — não é uma exceção capturável pelo código, então o material nunca recebe status "erro", fica preso em "processando" para sempre. **Correção de premissa importante**: `after()` não estende o limite de duração — só adia o processamento para depois da resposta HTTP ser enviada, mas a invocação da função continua consumindo do mesmo orçamento de tempo até o `after()` terminar, não é um mecanismo de "escapar" do limite.
- **Processamento de PDF de imagem em lotes de páginas, em PARALELO (decisão: implementar, não adiar)**: diagnóstico real mostrou que uma chamada de visão para um PDF denso de até 100 páginas pode facilmente passar de 200-300s, risco genuíno de estourar o limite de duração da função — que hoje é **300s confirmado no Hobby** (não uma estimativa, ver "Limite de duração de função serverless" acima), então esse risco é concreto, não hipotético. Solução: processar em lotes menores por chamada de visão (ex: 20-25 páginas por requisição), **disparados em paralelo** (não sequenciais — os lotes são independentes, sem motivo pra serializar), concatenando os resultados na ordem correta de página ao final. Concorrência limitada a no máximo 3 chamadas simultâneas (`runWithConcurrencyLimit` em `lib/extraction/pdf.ts`), não ilimitada — proteção contra rate limit da conta Anthropic ao disparar vários lotes de uma vez; o SDK já reexecuta 429/5xx automaticamente com backoff (`maxRetries` padrão 2), então isso só precisa limitar quantas requisições ficam em voo ao mesmo tempo, não reimplementar retry. Falha de um lote (via `Promise.allSettled`, não `Promise.all`) não derruba silenciosamente os outros nem trava a concorrência — todos os lotes ainda em andamento terminam normalmente, e o material só falha por completo ao final se qualquer lote tiver falhado, com a mensagem citando exatamente qual(is). Como efeito colateral positivo, o mecanismo de lote já deixa o código preparado para eventualmente suportar material acima de 100 páginas. Declarar `export const maxDuration` explicitamente na rota/action responsável (teto real: 300 no Hobby), em vez de depender do default implícito da plataforma. **Pior caso reestimado após paralelização**: ~180s (2 "ondas" de lotes densos no cenário mais pessimista, já que 4 lotes com limite de concorrência 3 pode exigir uma leva extra) — bem dentro dos 300s, folga real de ~120s. Medição real (83 páginas): caiu de ~51-55s sequencial para ~23s paralelo.
- Mensagens de erro claras e específicas por tipo de falha (limite de páginas excedido, timeout, erro de API, arquivo corrompido) devem sempre ser persistidas em `materials.erro_mensagem` e exibidas de forma legível na UI, nunca um "erro genérico" sem contexto.

## Modelo de dados (simplificado)

```
users
  └── materials (arquivo original, tipo, status: processando/pronto/gerando/aguardando_revisao/erro, conteudo_extraido, erro_mensagem, tema, modo: "arquivo" | "tema", cards_gerados)
        └── flashcards (frente, verso, material_id de origem, origem: "ia" | "csv" | "manual")
  └── collections (nome, criada pelo usuário)
        └── collection_flashcards (tabela de junção — many-to-many)
  └── flashcard_responses (flashcard_id, acertou: boolean, rating: 0-3 | null, respondido_em)
  └── flashcard_schedule (flashcard_id, repetitions, interval_days, ease_factor, due_date, atualizado_em) — estado do SM-2 por card+usuário, 1 linha por par
  └── user_stats (streak_atual, streak_recorde, meta_diaria_cards, cards_estudados_hoje, ultima_atividade_em)
  └── daily_activity (data, cards_revisados, meta_atingida: boolean) — usado para montar o calendário semanal da home
  └── badges (tipo, atingido_em, meta_alvo) — ex: "50 cards revisados", "7 dias de ofensiva"
```

**Campos novos em `materials` para o pipeline de geração (Estágio 2)**:
- `modo` ("arquivo" | "tema"): distingue as duas origens de geração. Modo "tema" cria uma linha em `materials` mesmo sem arquivo (reaproveita a mesma máquina de estado/status em vez de um sistema paralelo) — `arquivo_path`/`storage_path` fica null nesse caso.
- `tema` (text, nullable): texto livre informado pela usuária, preenchido só quando `modo = "tema"`.
- `cards_gerados` (JSONB, nullable): array de `{frente, verso}` gerados pela IA, **antes** da revisão/edição da usuária — é o resultado bruto da geração, ainda não persistido em `flashcards`. Só migra para a tabela `flashcards` de verdade depois que a usuária revisar e confirmar salvar (Estágio 3).
- `status` ganha dois valores novos: `gerando` (chamada à IA em andamento) e `aguardando_revisao` (cards gerados, esperando a usuária revisar antes de salvar). Fluxo completo: `processando` (extração) → `pronto` (extração ok, ou direto pra "tema" sem extração) → `gerando` (chamando IA) → `aguardando_revisao` (pronta pra tela de revisão) → depois de salvar, os cards migram pra `flashcards` de verdade (o material em si pode ficar como está, já cumpriu o papel).

**`flashcard_responses.rating`**: novo campo (0-3, nullable), preenchido só a partir da introdução do SM-2 — respostas antigas (antes dessa mudança) ficam com `rating = null`, mantendo `acertou` (boolean) como estava, sem migração retroativa (decisão explícita, ver item 6). `rating` alimenta exclusivamente o cálculo do SM-2 em `flashcard_schedule`; `acertou` continua alimentando os cálculos de taxa de acerto/progresso já validados, sem mudança.

**`flashcard_schedule`**: tabela nova, obsoleta a necessidade de `study_progress` (que deve ser removida, não mantida em paralelo — ver item 6). RLS + policy + Grant explícito como todas as outras.

**Thresholds confirmados dos badges (v1)**: 50 cards revisados / 7 dias de ofensiva / 100 acertos — valores fixos vindos do protótipo original do Claude Design, confirmados como definitivos (não são placeholder).

Observação: `streak_atual` e `streak_recorde` podem ser calculados a partir de `daily_activity` (derivado) ou mantidos como campos denormalizados em `user_stats` para leitura rápida na home — decisão de implementação, não afeta o escopo funcional.

## Princípios de trabalho (padrão do Marlon)

- Simplicidade e sem overengineering — este é um projeto de aprendizado, não um MVP para escalar
- Planejamento e alinhamento em conversa antes de implementar
- Preferência por entender fundamentos antes de aplicar
- Performance e segurança tratadas desde o início, não como retrofit — mesmo em escopo simples e uso pessoal

## Cuidado conhecido — API admin vs. API pública em testes

A **API admin** do Supabase (`auth.admin.createUser`, `auth.admin.updateUserById`, etc., usando a secret key) **ignora intencionalmente** políticas de senha e algumas outras validações do Dashboard — ela existe para acesso privilegiado/backend, não para simular o que um usuário real experimenta. Ao testar qualquer comportamento de autenticação (política de senha, validação de email, etc.) contra o banco real, usar sempre o caminho público (`auth.signUp()`, `auth.updateUser()` com a publishable key) — o mesmo que a UI do app realmente chama —, nunca a API admin, ou o teste pode reportar um "bug" que na verdade é só o comportamento esperado e diferente das duas APIs. Isso já gerou uma investigação de falso positivo neste projeto (política de senha "não aplicada" — na verdade estava, só o teste usou o caminho errado).

## Idioma

Responda sempre em português do Brasil, com acentuação e cedilha corretas em todo texto (comentários, mensagens de commit, explicações). Não omita acentos mesmo em respostas longas ou após compactação de contexto.