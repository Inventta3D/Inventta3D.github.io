# Contexto do projeto (leia antes de qualquer tarefa)

**Inventta 3D**: sistema de gestão para impressão 3D (orçamentos, clientes). Web app instalável (PWA) + app Android (TWA) que abre o mesmo site.

## Endereços e contas
- Site: https://inventta3d.github.io (repositório público `Inventta3D/Inventta3D.github.io`, GitHub Pages via Actions)
- Releases do APK: https://github.com/Inventta3D/Inventta3D.github.io/releases
- Supabase (banco e login): projeto `exmfmtgaqmawcnqkgmri`
- Site antigo no Cloudflare: https://inventta3d.pages.dev (versão anterior, em arquivo único; não recebe as mudanças deste repositório)
- Pasta local: `C:\Users\Lacerda\Projetos\inventta3d`

## Stack
- `site/`: HTML, CSS e JS puros, sem build. Material 3 via tokens em `site/css/tokens.css`.
- Módulos de tela: `site/js/modules.js` (registro) + uma `<main data-page>` no `index.html`. Guia em `MODULOS.md`.
- `site/js/app.js` guarda o app dentro de uma função anônima (IIFE): funções e estado não ficam acessíveis no console. O que precisa ser compartilhado sai por `window.InventtaApp`.
- Banco: tabelas `inventta3d_quotes` e `inventta3d_customers`, ambas com RLS por dono. Migrações em `supabase/migrations/`.
- `android/`: app TWA (Gradle). Assinatura por segredos do GitHub.

## Comandos
- Testes: `npm test` (cálculo e **estrutura**: ids, módulos, ícones, service worker, CSS só com tokens, bordas, RLS, segredos; roda no deploy e bloqueia se falhar)
- Testes de navegador: `npm run test:e2e` (Playwright em 6 tamanhos: celular 320/360/390/412 e computador 1280/1440; usa o Edge instalado; no GitHub roda o workflow "Testes de interface", que não bloqueia a publicação). Os módulos vêm de `js/modules.js`: tela nova entra sozinha nos testes de navegação e de layout
- Rodar local: `npx serve site -l 5174`
- Publicar o site: `git push origin main` (workflow "Publicar site", ~1 min)
- Gerar APK: workflow "Gerar APK"; release com tag `vX.Y.Z`

## Regras fixas
1. **Publicar só com confirmação explícita do usuário** (commit/push, tag, mudança no banco).
2. Nunca colocar no repositório: `.jks`, `keystore.b64`, `LEIA-ME.txt` das chaves, senhas, tokens. Segredos do Android ficam em Settings > Secrets do GitHub: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`. A chave original fica em `Documentos\inventta3d-chaves` (fora do repo; manter backup fora do GitHub).
3. Mudança que mexa no cálculo ou no resultado do orçamento: testar o fluxo completo (preencher etapas até "Gerar orçamento") antes de publicar.
4. A cada publicação do site, subir `CACHE_NAME` em `site/sw.js` (senão o app instalado mostra a versão antiga).
5. Usar só tokens e componentes (nada de cor ou tamanho solto nos módulos). Bordas por papel: superfície `--shape-surface`, aninhado `--shape-nested`, campo/aviso `--shape-field`, controle `--shape-control`.
6. Textos em português, frase curta, verbo no começo, sem enfeite.

## Armadilhas conhecidas
- O `gh` do shell do agente enxerga outra conta; para operações do GitHub, usar o terminal do usuário (logado como `Inventta3D`).
- Testar localmente: desregistrar o service worker e limpar caches, senão o navegador serve CSS/JS antigos.
- Sem login real, dá para testar com uma sessão simulada no `localStorage` (chave `sb-<ref>-auth-token`) e, para clientes, um Supabase falso em memória.
- O texto de dica dos campos (`.hint`) é removido da página pelo `context-help.js`: não depender do elemento.
- A senha do Google/Supabase nunca passa pelo agente.
