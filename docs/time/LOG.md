# Diário

Cada ciclo: o que foi pedido, o que foi feito, como foi verificado, o que ficou pendente. Mais recente em cima.

## Ciclo atual
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
