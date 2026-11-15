# Decisões

| Id | Decisão | Motivo |
|---|---|---|
| D1 | O repositório se chama `<usuário>.github.io` e é público | O `assetlinks.json` precisa estar na raiz do domínio para o app Android abrir sem barra de endereço; Pages gratuito exige repositório público. Site e `config.js` (chave pública do Supabase) ficam visíveis por desenho |
| D2 | Pages publicado por GitHub Actions (`build_type=workflow`) | O workflow roda os testes antes de publicar |
| D3 | App Android é um TWA, assinado no GitHub Actions com segredos | Mesmo código do site, sem manter app nativo; chave nunca entra no repositório |
| D4 | Bordas por papel: superfície 28 px, aninhado 16 px, campo/aviso 8 px, controle em pílula (inclui campos de texto) | Parar de misturar raios; tokens `--shape-*` em `tokens.css` |
| D5 | "Valor final" do desconto é gravado como `fixed` com o desconto calculado | A coluna `discount_mode` só aceita `percent` e `fixed` |
| D6 | Clientes em tabela própria, mesma política de acesso dos orçamentos; ao salvar do orçamento, atualiza se o e-mail ou telefone já existir | Evita duplicados; segue o guia de módulos |
| D7 | Tempo de impressão aceita horas decimais (3,7) e converte para HH:MM | Fatiadores mostram decimal; o cálculo continua em HH:MM |
| D8 | Mudança em cálculo ou resultado do orçamento só é publicada depois de testar o fluxo completo | O bug do "Gerar orçamento" chegou ao ar por falta desse teste |
| D9 | Toda publicação (push, tag, banco) exige confirmação explícita do usuário | Regra de segurança; o site é público |
| D11 | Histórico de impressões: uma linha por peça e material (único por usuário) e uma linha por pedido (cliente, data, quantidade, custo de impressão da época). Valores guardados são só de impressão, por peça: material, energia e máquina. Ficam de fora mão de obra, embalagem, taxas e lucro | Pedido do usuário ("valores somente voltados à impressão"); a falha depende da mão de obra, por isso não entra |
| D12 | Arquivos STL/3MF em bucket privado `inventta3d-models`, até 50 MB, pasta por usuário, baixados por link temporário de 60 s; o app pergunta no diálogo de salvar se quer anexar | Arquivo de modelo é do usuário; nada público |
| D13 | Pedidos do histórico usam chaves estrangeiras compostas com `owner_id` (peça, cliente e orçamento só do mesmo dono); políticas de acesso usam `(select auth.uid())`; `updated_at` por gatilho; índices das chaves compostas começam por `owner_id` | Integridade garantida pelo banco, não só pelo aplicativo; desempenho das políticas |
| D14 | Dois níveis de teste: estrutura sem dependências (`tests/estrutura.test.cjs`, bloqueia o deploy) e navegador com Playwright e Supabase falso em memória (`tests/e2e/`, não bloqueia) | O primeiro é rápido e estável; o segundo pega layout e fluxos, mas é mais lento e pode oscilar |
| D15 | E-mail do orçamento pelo e-mail do próprio usuário (compartilhar PDF no celular; mailto + download no computador), sem servidor | Sem custo, sem domínio e sem passar dados do cliente por terceiros; envio automático por servidor fica como opção B, que exige domínio próprio |
| D16 | Envio do orçamento num botão dividido: principal = último envio usado; menu com as outras formas | Reduz 5 botões a 1 e mantém o WhatsApp a um toque; opção B (botão só de menu) descartada |
| D17 | O lucro nunca é compartilhado com o cliente (texto, imagem e PDF); aparece só na visão interna do orçamento | Pedido do usuário: não faz sentido o cliente ver a margem |
| D10 | Operações do GitHub usam o terminal do usuário | O shell do agente enxerga outra conta do `gh` |
