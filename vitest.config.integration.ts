import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/__tests__/integration/**/*.test.ts'],
    globalSetup: ['server/__tests__/integration/global-setup.ts'],
    setupFiles: ['server/__tests__/integration/test-harness.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    pool: 'forks',          // Each test file in own process — clean module state
    poolOptions: {
      forks: { singleFork: true },  // Sequential — share one DB connection
    },
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/memoraid_test',
      MEMORAID_TEST_DB_URL: 'postgresql://postgres:postgres@localhost:5432/memoraid_test',
      MEMORAID_ALLOW_TEST_DB_BOOTSTRAP: '1',
      NODE_ENV: 'test',
      DEV_SKIP_AUTH: '1',
      NEXUS_RBAC: 'false',
      NEXUS_APPROVAL_GATES: 'true',
      KANBAN_BOT_API_KEY: 'test-bot-key',
      SESSION_SECRET: 'test-session-secret',
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
