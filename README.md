# Inventta 3D: orçamentos de impressão 3D

Site (PWA) + app Android (TWA). O app abre o site publicado em tela cheia, então **toda atualização do site chega ao app sem gerar um APK novo**. Só é preciso compilar de novo ao mudar ícone, nome ou endereço.

```
site/        o que vai para o GitHub Pages
  index.html, assets/   site de apresentação (raiz do domínio: botão para o app e contato por WhatsApp)
  app/                  o aplicativo (PWA) em /app/: login, orçamentos, aprovar.html, vitrine.html
  sw.js                 só remove o service worker antigo que controlava a raiz
android/     o app Android (Trusted Web Activity)
tests/       testes do cálculo de orçamento  (npm test)
supabase/    migrações do banco
.github/workflows/
  site.yml     publica site/ no GitHub Pages a cada push na main
  android.yml  gera o APK (e o .aab para a Play Store)
MODULOS.md   como a interface é organizada e como criar módulos
```

## Configuração (uma vez só)

1. **Nome do repositório.** Para o app abrir **sem barra de endereço**, o arquivo `site/.well-known/assetlinks.json` precisa ficar na raiz do domínio. Por isso o repositório deve se chamar `<seu-usuario>.github.io`. Com outro nome, o app funciona, mas mostra uma barra do Chrome no topo. A alternativa é usar um domínio próprio e definir a variável `TWA_HOST`.
2. **GitHub Pages:** em *Settings > Pages > Source*, escolha **GitHub Actions**.
3. **Segredos da assinatura:** em *Settings > Secrets and variables > Actions > New repository secret*, crie:
   | Nome | Valor |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | conteúdo do arquivo `keystore.b64` |
   | `ANDROID_KEYSTORE_PASSWORD` | a senha do arquivo de chaves |
   | `ANDROID_KEY_ALIAS` | `inventta3d` |
   | `ANDROID_KEY_PASSWORD` | a mesma senha |
4. **Supabase:** em *Authentication > URL Configuration*, coloque o endereço do site em **Site URL** e também em **Redirect URLs**. Sem isso, o login com Google, a confirmação de cadastro e a troca de senha voltam para o endereço antigo.
5. **Opcional:** para usar outro domínio, crie as *variables* `TWA_HOST` (ex.: `app.inventta3d.com.br`) e `TWA_PATH` (ex.: `/`).

## Gerar o APK

*Actions > Gerar APK > Run workflow.* Ao terminar, baixe **inventta3d-android** em *Artifacts*. Ele traz o `inventta3d.apk` (para instalar direto) e o `inventta3d.aab` (para a Play Store).

Para criar uma versão com página de download, crie uma tag:
```
git tag v1.0.0 && git push origin v1.0.0
```
O APK aparece em *Releases*.

## Instalar no celular

Abra o `inventta3d.apk` no Android e permita **“instalar apps desconhecidos”** para o navegador ou o gerenciador de arquivos. O aparelho precisa ter o Chrome, ou outro navegador compatível, atualizado.

## Guarde a chave de assinatura

O arquivo `inventta3d-release.jks` e a senha são a identidade do app. **Se forem perdidos, não dá para atualizar o app já instalado**: seria preciso desinstalar e instalar outro. Guarde uma cópia fora do GitHub, por exemplo no gerenciador de senhas.
