# USER_STORIES.md — App de Flashcards com IA

Persona: estudante de concurso público (usuário única, uso pessoal).

## Upload e geração

**US01 — Upload de material**
Como usuário, quero subir um ou mais arquivos (PDF, imagem, Word ou PowerPoint) para que o app extraia o conteúdo e gere flashcards automaticamente.

**US01a — Gerar cards a partir de um tema**
Como usuário, quero descrever um tema em texto livre (sem precisar ter um arquivo) para que a IA gere flashcards a partir do próprio conhecimento dela, sabendo que devo revisar com mais atenção por não ter uma fonte de referência minha por trás.

**US02 — Escolher quantidade de cards**
Como usuário, quero escolher quantos flashcards eu quero gerar, ou deixar o app decidir automaticamente com base no volume do material, para não precisar adivinhar um número.

**US03 — Acompanhar status de geração**
Como usuário, quero ver se meu material está sendo processado ou se os cards já estão prontos, para saber quando posso revisar o resultado.

**US04 — Destino dos cards gerados**
Como usuário, ao gerar novos cards, quero escolher entre: adicionar a uma coleção existente, criar uma coleção nova, ou deixar sem coleção por enquanto, para poder organizar do meu jeito.

## Revisão e edição

**US05 — Revisar cards antes de salvar**
Como usuário, quero ver os flashcards gerados antes de confirmar, para corrigir algo que a IA tenha entendido errado.

**US06 — Editar um card**
Como usuário, quero editar a frente ou o verso de um flashcard já salvo, para ajustar o conteúdo quando necessário.

**US07 — Excluir um card**
Como usuário, quero excluir um flashcard que não faz sentido ou está duplicado.

## Coleções

**US08 — Criar coleção**
Como usuário, quero criar uma coleção com um nome (ex: "Direito Constitucional"), para agrupar cards relacionados.

**US09 — Adicionar card a mais de uma coleção**
Como usuário, quero que um mesmo flashcard possa pertencer a mais de uma coleção, para reaproveitar conteúdo em diferentes agrupamentos.

**US10 — Mover/agrupar cards entre coleções**
Como usuário, quero mover ou copiar flashcards de uma coleção para outra, para reorganizar meus estudos conforme evoluo.

**US11 — Desagrupar cards**
Como usuário, quero remover um flashcard de uma coleção sem excluí-lo, para reorganizar sem perder conteúdo.

**US12 — Expandir coleção existente**
Como usuário, quero subir um novo material e adicionar os cards gerados a uma coleção que já existe, para continuar aprofundando um tema que já estou estudando.

## Estudo

**US13 — Modo de estudo**
Como usuário, quero visualizar os flashcards de uma coleção um de cada vez, virando o card para ver a resposta, para praticar recordação ativa.

**US14 — Avaliar minha recordação (rating de 4 níveis)**
Como usuário, ao responder um flashcard, quero avaliar o quão bem eu lembrei (Não lembrei / Foi difícil / Fui bem / Fácil demais), para que o app calcule quando devo revisar aquele card de novo.

**US14a — Estudar só o que está vencido hoje**
Como usuário, ao clicar "Estudar esta coleção", quero ver apenas os cards que estão programados para revisão hoje (segundo a repetição espaçada), não a coleção inteira de uma vez, para focar meu tempo no que realmente precisa de reforço agora.

**US14b — Ordem intercalada dentro da sessão**
Como usuário, quero que os cards vencidos apareçam em ordem parcialmente aleatória (priorizando os mais atrasados), para não decorar a sequência e continuar de fato exercitando a lembrança.

**US14c — Nada para revisar hoje**
Como usuário, se não houver nenhum card vencido numa coleção, quero ver uma mensagem clara em vez do botão de estudar, para saber que já revisei tudo que precisava por hoje.

## Acompanhamento de desempenho

**US15 — Ver taxa de acerto por coleção**
Como usuário, quero ver quantos cards eu acerto e erro em cada coleção (em número e percentual), para acompanhar minha evolução.

**US16 — Ver cards com mais erro**
Como usuário, quero identificar quais flashcards eu mais erro, para saber onde focar meus estudos.

## Preferências de leitura e tema

**US17 — Alternar tema claro/escuro**
Como usuário, quero alternar entre modo claro e escuro, para estudar confortavelmente em diferentes condições de luz.

**US19 — Preferência de tema persistida**
Como usuário, quero que minha escolha de tema (claro/escuro) seja lembrada entre sessões, para não precisar reconfigurar toda vez.

## Acesso e conta

**US20a — Cadastro**
Como visitante, quero criar uma conta com email e senha, para começar a usar o app (decisão revisada: MVP será compartilhado com amigos para teste, não mais uso restrito a uma única usuário).

**US20 — Login**
Como usuário, quero fazer login com email e senha, para que meus flashcards e meu progresso fiquem privados e protegidos.

**US21 — Sessão persistente**
Como usuário, quero continuar logada entre usos do app no celular, para não precisar fazer login toda vez que abrir.

## Uso mobile e offline

**US22 — Instalar como app**
Como usuário, quero poder adicionar o app à tela inicial do celular, para acessá-lo como um aplicativo nativo.

**US23 — Revisar cards offline**
Como usuário, quero conseguir revisar flashcards já carregados mesmo sem internet, para estudar em qualquer lugar (a geração de novos cards continua exigindo conexão).

## Importação de flashcards existentes

**US24 — Importar flashcards via CSV**
Como usuário, quero fazer upload de um arquivo CSV com flashcards que já criei em outro app, para não precisar recriá-los manualmente.

**US25 — Escolher destino da importação**
Como usuário, ao importar um CSV, quero escolher se os cards vão para uma coleção existente, uma coleção nova, ou ficam sem coleção, assim como já acontece com os cards gerados por IA.

**US26 — Ver resumo da importação**
Como usuário, quero ver quantos cards foram importados com sucesso e quantos foram ignorados (e por quê), para saber se preciso corrigir e reimportar algo.

## Cards sem coleção ("Não organizados")

**US27 — Ver cards sem coleção**
Como usuário, quero acessar uma tela dedicada listando todos os cards que não pertencem a nenhuma coleção, para poder organizá-los.

**US28 — Sugestão automática de coleção**
Como usuário, quero que cada card órfão venha com uma sugestão de coleção baseada no seu conteúdo, para organizar rapidamente sem precisar decidir manualmente toda vez.

**US29 — Mover ou remover card órfão**
Como usuário, quero tocar na coleção sugerida para mover o card pra lá, ou remover o card diretamente se não precisar mais dele.

## Edição de perfil

**US30 — Editar nome de exibição**
Como usuário, quero definir/editar meu nome no Perfil, para ver meu nome real na saudação da Home em vez de um texto genérico.

**US31 — Acessar o Perfil pelo avatar da Home**
Como usuário, quero tocar no meu avatar no cabeçalho da Home para ir direto à tela de Perfil.

**US32 — Escolher cor do avatar**
Como usuário, quero escolher a cor do meu avatar de iniciais entre opções pré-definidas, para personalizar minha conta.

**US33 — Alterar senha**
Como usuário, quero alterar minha senha informando a atual e a nova, para manter minha conta segura sem depender de recuperação por email.

## Modo de navegação (browse)

**US34 — Navegar pelos cards sem estudar**
Como usuário, quero tocar num card da lista da coleção e navegar livremente para frente e para trás entre os cards (vendo frente e verso), sem que isso conte como revisão nem afete meu progresso, para consultar rapidamente o conteúdo sem me comprometer com uma sessão de estudo.

## Fora de escopo (v1)

- FSRS (algoritmo mais preciso que SM-2) — SM-2 já foi puxado para v1 (US14, US14a-c). Interleaving entre coleções diferentes numa mesma sessão também fica para v2 (detalhes técnicos no CLAUDE.md)
- Importação via YouTube ou áudio
- Exportação/importação para Anki, Quizlet, etc em formato proprietário (a importação via CSV genérico já cobre o caso de uso real)
- Imagens geradas por IA nos cards
- Cards em formato cloze ou múltipla escolha
- Suporte a múltiplos idiomas