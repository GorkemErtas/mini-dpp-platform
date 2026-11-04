import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command:
        'dotnet run --no-launch-profile --project ../backend/src/MiniDpp.Api --urls http://localhost:5080',
      url: 'http://localhost:5080/api/products',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__Dpp: `Data Source=${join(tmpdir(), `mini-dpp-e2e-${process.pid}.db`)};Foreign Keys=True`,
        PublicBaseUrl: 'http://127.0.0.1:5173',
        CorsOrigins__0: 'http://127.0.0.1:5173',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
