// Testes de navegador (E2E). Rodar: npm run test:e2e
// Local: usa o Edge/Chrome já instalado (sem baixar nada). No CI: instala o Chromium do Playwright.
const { defineConfig } = require('@playwright/test');

const canal = process.env.CI ? undefined : (process.env.PW_CHANNEL || 'msedge');
const celular = (largura, altura) => ({ viewport: { width: largura, height: altura }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

module.exports = defineConfig({
  testDir: 'tests/e2e',
  testMatch: '*.spec.cjs',
  timeout: 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5190', channel: canal, serviceWorkers: 'block', trace: 'retain-on-failure' },
  webServer: { command: 'node tests/e2e/servidor.cjs', url: 'http://127.0.0.1:5190', reuseExistingServer: true, timeout: 15_000 },
  projects: [
    { name: 'celular-320', use: celular(320, 640) },
    { name: 'celular-360', use: celular(360, 740) },
    { name: 'celular-390', use: celular(390, 844) },
    { name: 'celular-412', use: celular(412, 915) },
    { name: 'computador-1280', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'computador-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
