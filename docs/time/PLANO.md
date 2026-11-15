# Plano

Situação: pendente · em andamento · aguardando usuário · concluída. Toda tarefa nova entra aqui com "pronto quando" verificável antes de ser feita.

## Em aberto
| Id | Tarefa | Pronto quando | Situação |
|---|---|---|---|
| P1 | APK v1.0.1 não abre no celular (causa não confirmada; cores do TWA já corrigidas) | Usuário informa o que acontece ao tocar no ícone, modelo e Android; com o log (`adb logcat`) achar a causa e instalar uma versão que abre em tela cheia | aguardando usuário |
| P2 | Supabase: "Site URL" e "Redirect URLs" apontando para `https://inventta3d.github.io` | Login com Google volta para o site novo, não para o endereço antigo | aguardando usuário (só ele faz no painel) |
| P3 | Testar com login real: clientes, "Valor final", sair da conta, foto do Google, "Gerar orçamento" | Cada item confirmado pelo usuário, ou erro reportado com print | aguardando usuário |
| P4 | Decidir o destino do site antigo no Cloudflare (manter, atualizar com a versão nova ou desativar) | Decisão registrada em DECISOES.md | aguardando usuário |
| P5 | Aplicar no site o rascunho do login feito no canvas de design, se o usuário aprovar alterações | Usuário aprova o desenho; mudança testada e publicada | aguardando usuário |
| P6 | Teste de ponta a ponta automatizado | `npm run test:e2e` cobre login, 5 etapas, resultado, desconto, salvar, clientes, histórico, sair e o layout das telas em 6 tamanhos | concluído (falta rodar no GitHub) |
| P7 | Backup da chave de assinatura (`.jks`) em local seguro fora do GitHub | Usuário confirma que guardou | aguardando usuário |
| P8 | Atualizar ações do GitHub (aviso de Node 20 e setup-java v4) | Workflows sem avisos de descontinuação | baixa prioridade |
| P10 | Banco: confirmar no painel do Supabase o plano e os backups (diário ou recuperação pontual) e ativar a proteção contra senhas vazadas, se o plano permitir | Usuário confirma os dois | aguardando usuário |
| P9 | Histórico de impressões (tela, "Salvar no histórico" com anexo STL/3MF, tabelas e bucket privado) | Migração aplicada no Supabase, site publicado, e o usuário salva uma peça com e sem arquivo, vê na tela Impressões, baixa o arquivo e exclui | construído e testado com banco simulado; aguardando migração e publicação |

## Concluídas
- Site publicado no Cloudflare e depois no GitHub Pages; APK assinado v1.0.0 e v1.0.1 em Releases.
- Orçamento: layouts de imagem e PDF refeitos, Pix e Instagram separados com QR do mesmo tamanho, fundo branco no PDF.
- Horas decimais do fatiador (3,7 vira 03:42) no tempo de impressão.
- Desconto por "Valor final".
- Stepper circular com check verde; padrão de bordas por papel; campos de texto em pílula.
- Layout compacto: cada etapa cabe numa tela sem rolagem.
- Módulo Clientes (tabela com RLS, tela, seletor e "Salvar cliente" no orçamento).
- Login: tema no canto superior direito, logo maior e centralizada, textos de sistema de gestão, espaçamento padronizado.
- Correções: botão "Gerar orçamento" (bug do Valor final) e erro ao sair da conta (constante reatribuída).
