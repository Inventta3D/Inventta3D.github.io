// Raiz do domínio: a página de apresentação foi desativada. A raiz só repassa para /app/, preservando
// código de login (?code=) ou token (#access_token=) do Google, caso o Supabase ainda aponte para a raiz.
const { test, expect } = require('@playwright/test');

test.describe('raiz do domínio', () => {
  test('redireciona para /app/', async ({ page }) => {
    await page.route('**/app/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>app</title>' }));
    await page.goto('/');
    await page.waitForURL(/\/app\/$/);
  });

  test('retorno do login Google que caia na raiz é repassado ao app, com o código', async ({ page }) => {
    await page.route('**/app/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>app</title>' }));
    await page.goto('/?code=abc123');
    await page.waitForURL(/\/app\/\?code=abc123/);
  });

  test('/app/ abre o aplicativo (login)', async ({ page }) => {
    await page.goto('/app/');
    await expect(page.locator('#googleLogin')).toBeVisible();
  });
});
