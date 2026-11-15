# Diário

Cada ciclo: o que foi pedido, o que foi feito, como foi verificado, o que ficou pendente. Mais recente em cima.

## Ciclo atual
- Botão "Copiar detalhamento" dentro de "Composição do preço" (visão interna): copia para a área de transferência os custos, taxas, preço sugerido e lucro que aparecem na tela, com a marca "USO INTERNO (não enviar ao cliente)". Não entra no que é enviado. Teste de navegador novo; o teste de layout agora abre a seção interna.
- Detalhamento removido do envio: o texto, a imagem e o PDF mostram só itens, desconto e total; a escolha "Resumido/Composição do preço" saiu da tela e `sharedCosts` foi apagada. A visão interna "Composição do preço" continua. Guardas: teste de estrutura (app.js sem `sharedCosts`/`detailed`/`DETALHAMENTO`/`COMPOSIÇÃO DO VALOR`, validado quebrando de propósito) e testes de navegador (texto copiado sem custos nem lucro; visão interna intacta). PDF e pré-visualização conferidos em captura.
- (anterior) Lucro fora do orçamento detalhado: `sharedCosts()` (texto copiado, imagem e PDF) não traz mais "Lucro estimado após taxas"; custos e taxas continuam. O lucro segue só na visão interna "Composição do preço". Guardas: teste de estrutura (sharedCosts sem "lucro", validado quebrando de propósito) e teste de navegador (texto copiado no modo detalhado).
- Botão dividido "Enviar" (Material 3 split button): a ação principal faz o último envio usado (padrão WhatsApp, guardado no aparelho); a seta abre o menu com WhatsApp, E-mail com PDF, Copiar texto, Baixar PDF e Pré-visualizar (esta não muda o principal). Teclado: setas, Home, End, Esc. Novo `js/envio.js`; os handlers de envio continuam em `app.js` nos botões do menu. Testes: estrutura (menu com aria-controls) e navegador (teclado, memória, pré-visualizar).
- Enviar por e-mail (opção A): botão "Enviar por e-mail" no resultado. No celular abre o compartilhamento do Android com o PDF anexado, assunto e texto; no computador baixa o PDF e abre o e-mail (mailto) com o cliente, assunto e resumo preenchidos. Sem servidor. Teste de navegador novo cobre os dois caminhos.
- Testes automáticos: 17 testes de estrutura (`tests/estrutura.test.cjs`, no `npm test`) e suíte de navegador com Playwright (`tests/e2e/`, 14 testes por tamanho de tela, 6 tamanhos). Os testes de estrutura foram validados quebrando de propósito (id removido, cor solta, raio solto, módulo sem página, ícone inexistente, site alterado sem subir o cache): todos falharam como esperado. Achados reais corrigidos: diálogo "Instale no Android" sem título acessível; botões da pré-visualização a 360 px.
- Auditoria de alinhamento no celular: percorridas 13 telas (5 etapas, resultado, salvar no histórico, pré-visualização, clientes, diálogo de cliente, impressões, detalhes, salvos) em 320, 360, 390 e 412 px, medindo itens fora da tela, rolagem horizontal e grupos de botões desalinhados. Corrigido: controle de desconto (3 opções em colunas iguais), botões do resultado (grade), rodapé, detalhes da impressão (botões do arquivo em grade, fatos em 2 colunas), botões do diálogo de pré-visualização (saíam da tela a 360 px). Resultado final: sem problemas nas 13 telas nos 4 tamanhos.
- Avaliação e endurecimento do banco: migrações `20261117000000_harden_inventta3d_schema.sql` e `20261117000100_index_inventta3d_composite_fks.sql` aplicadas no Supabase. Verificado com transação desfeita (nada ficou gravado): usuário B não vê nem referencia dados de A; gatilho de `updated_at`; apagar cliente zera `customer_id` e mantém o pedido; apagar peça remove os pedidos. Alertas de desempenho das políticas resolvidos; sobram só índices "não usados" (tabelas vazias).
- Histórico de impressões: migração `20261116000000_create_inventta3d_prints.sql`, módulo `impressoes.js`, botão "Salvar no histórico" no fim do orçamento. Testado no navegador com banco e armazenamento simulados (salvar com e sem arquivo, mesma peça em novo pedido, aviso de duplicado, trocar, remover e baixar arquivo, extensão inválida, exclusão em cascata). Ainda sem teste com Supabase real.
- Organização do projeto: criados `SPEC`, `PLANO`, `DECISOES`, `CONTEXTO` e este `LOG` em `docs/time/`. Pendências levantadas no PLANO (P1 a P8).

## Ciclos anteriores (resumo)
| Pedido | Resultado | Verificação |
|---|---|---|
| Sair da conta com erro | Causa: constante reatribuída no callback de sessão (`app.js`). Corrigido | Reproduzido com sessão simulada; depois, sem erro |
| Login: tema à direita, espaçamento | Publicado (`v33`) | Medido no navegador, 1440×900 e 390×844 |
| Login: tema, logo, textos | Publicado | Navegador, claro e escuro |
| Módulo Clientes | Tabela criada no Supabase, tela e integração publicadas (`v31`) | Banco simulado no navegador; RLS conferida no banco; sem teste com login real |
| "Gerar orçamento" quebrado, frase "Quase pronto" | Corrigido (era bug do Valor final) | Fluxo completo no navegador |
| Etapas cabendo numa tela | Publicado (`v29`) | Alturas 961 e 860 px, 5 etapas |
| Campos em pílula; stepper; bordas; Valor final | Publicados | Navegador; "Valor final" só com cálculo, sem login real |
| Horas decimais | Publicado | Teste automático novo |
| APK não abre | Cores do TWA corrigidas, v1.0.1 publicada | Não verificado em aparelho (P1) |
| Layouts de orçamento (imagem e PDF), QR codes | Publicados | Render com dados de exemplo; QR não escaneado |
| Publicação no GitHub Pages e APK | Site no ar, APK assinado v1.0.0 | Assinatura conferida com `openssl`; instalação não testada |
| Calculadora nos campos de valor | Pronta, não publicada (`v55`) | 7 testes do núcleo, 5 de navegador e auditoria de layout em 320, 360, 390, 412 e 1440 px; não testada em aparelho |
| Importar do fatiador (G-code e 3MF) | Pronto, não publicado (`v56`) | 8 testes do leitor (inclui 3MF montado no teste), 2 de navegador; não testado com arquivos reais de cada fatiador |
| Fatiamento automático (Kiri + modo rápido) | Pronto, não publicado (`v58`) | 14 testes de unidade do leitor/estimador, 3 de navegador (um fatia de verdade com o Kiri); comparação com o Bambu Studio no projeto real; não testado em celular real |
| Visualizador 3D (etapa 1 e histórico) | Pronto, não publicado | 2 testes de navegador (canvas na etapa 1; "Ver em 3D" no histórico, com o simulador de armazenamento devolvendo o arquivo real) |
| Painel do mês | Pronto, não publicado | 3 testes de unidade (resumo, pedidos, série com virada de ano) e 1 de navegador; auditoria de layout em 360 e 1280 |
| Preço para marketplace | Pronto, não publicado | 3 testes de unidade (conta inversa, faixas da Shopee, taxas impossíveis) e 1 de navegador |
| Biblioteca: "Orçar de novo" no histórico | Pronto, não publicado | 1 teste de navegador |
| Estoque de filamento | Pronto, não publicado; migração escrita, não aplicada | 3 testes de unidade, 2 de navegador (cadastro, validação, desconto ao salvar, aviso na etapa 2) |
| Pedidos com status, entrega, lembrete e etiqueta | Pronto, não publicado; migração escrita, não aplicada | 4 testes de unidade, 3 de navegador; Painel com valor fechado |
| Impressoras e manutenção | Pronto, não publicado; migração escrita, não aplicada | 3 testes de unidade, 1 de navegador |
| Link de aprovação (aprovar.html) | Pronto, não publicado; migração com funções públicas escrita, não aplicada; SQL das funções não executado em banco real | 1 teste de unidade, 2 de navegador (dono gera link, cliente aprova; cliente pede ajuste; link inválido) com simulador das funções; corrigida sobreposição de botões nos pedidos em 360 px e uma condição de corrida na lista |
| Vitrine pública (vitrine.html) | Pronto, não publicado; migração com bucket público e função escrita, não aplicada | 3 testes de unidade, 2 de navegador (configurar loja, publicar peça com foto, visitante vê e pede pelo WhatsApp; vitrine fechada) |
| Status ao vivo da impressora | Não feito (D30) | — |
## 2026-11-15 — migrações das features aplicadas no Supabase (com "sim" do usuário)
- Aplicadas 20261118000000…0400 (spools, status em quotes, printers, aprovação, vitrine).
- Acrescentada antes de aplicar: política `inventta3d_vitrine_select_own` (Storage exige select para remover a foto antiga).
- Verificado no banco real (bloco com rollback, papel anon): link de aprovação devolve só campos públicos, token errado = nulo, anon não lê tabelas, ajuste/aprovação/repetição/decisão inválida corretos; vitrine ativa lista itens sem custo, desativada = nulo. Nada ficou gravado.
- Advisors: 3 avisos esperados (funções públicas por desenho, D17), índices novos ainda sem uso, proteção de senha vazada desligada (pré-existente).
- Site ainda NÃO publicado.

- 2026-11-15: site publicado (commit d6a873d, CACHE v66); arquivos novos servindo 200, módulos carregam sem erro no console.

## 2026-11-15 — ajustes pós-publicação (ainda não publicados, CACHE v67)
- Etapa 1: botões "Salvar cliente" (esquerda) e "Continuar" (direita) alinhados às bordas dos campos no computador (clientes.css; o "Voltar" desabilitado não ocupa espaço).
- Etapas: com o preço na tela, clicar nos números do topo reabria só o número, não a tela. Agora reabre o formulário na etapa clicada (edita o último item, sem duplicar). Teste novo tests/e2e/etapas.spec.cjs; confirmado por mutação que falha sem a correção.

## 2026-11-15 — fatiamento removido; cores no 3D (local, CACHE v69, não publicado)
- Removidos da tela: estimativa rápida, fatiamento preciso (Kiri), Preenchimento, Suporte e "Calcular com precisão". Motivo: lento em aparelhos fracos e a rápida erra o tempo em 33–49% em peças orgânicas (medido em 4 arquivos do usuário).
- Mantido: ler peso/tempo de G-code e 3MF já fatiado; STL e 3MF agora só mostram a peça em 3D.
- Novo: paleta de 15 cores sobre o 3D (etapa 1 e histórico); na etapa 1, trocar a cor preenche "Cor do filamento".
- Funções puras do fatiador (estimarRapido, processoKiri, tempoGcode) e site/lib/kiri ficaram no repositório, sem uso, para voltar depois.
- Novo (CACHE v70, não publicado): botão "Compartilhar imagem" no 3D (etapa 1 e histórico). PNG 1200×900 com fundo claro na cor escolhida; no celular abre o compartilhamento do sistema (WhatsApp), no computador baixa o arquivo. Vídeo giratório e link interativo ficam para depois.
- Novo (CACHE v71, não publicado): botão "Compartilhar GIF" — peça girando uma volta (48 quadros 400×300, ~3 s, ~240 KB), gerada no navegador sem biblioteca (paleta única + LZW). Conferido decodificando os 48 quadros com ImageDecoder (erro médio 0,16/pixel). Mesmo caminho do PNG: celular compartilha, computador baixa.

## 2026-11-15 — login só com Google (local, CACHE v73, não publicado)
- Removidos da tela e do código: e-mail, senha, "Criar conta", "Esqueci minha senha", confirmação de senha, fluxo de recuperação (PASSWORD_RECOVERY) e o olho de senha (password-toggle.js apagado). Sobra "Continuar com Google".
- Motivo: e-mail de confirmação do Supabase (SMTP padrão) só entrega à equipe do projeto e tem limite baixo; clientes novos não receberiam.
- PENDENTE no painel do Supabase (Authentication → Sign In / Providers → Email): desligar "Enable email signups", senão a API ainda aceita cadastro por e-mail.
- Quem já tinha conta por senha deve entrar com o Google do mesmo e-mail (o Supabase costuma vincular pela mesma conta; não verificado).
- GIF mais lento (local, CACHE v74, não publicado): de 48 quadros a 6 cs (~3 s por volta) para 72 quadros a 10 cs (~7 s por volta).
