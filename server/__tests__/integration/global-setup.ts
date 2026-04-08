import {
  bootstrapLocalTestDatabase,
  buildAdminDatabaseUrl,
  dropLocalTestDatabase,
} from '../../src/db/bootstrap';

const DEFAULT_TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/memoraid_test';

function getTestDatabaseUrl(): string {
  return process.env.MEMORAID_TEST_DB_URL ?? process.env.DATABASE_URL ?? DEFAULT_TEST_DB_URL;
}

export async function setup() {
  const testDbUrl = getTestDatabaseUrl();

  process.env.MEMORAID_ALLOW_TEST_DB_BOOTSTRAP = process.env.MEMORAID_ALLOW_TEST_DB_BOOTSTRAP ?? '1';
  process.env.MEMORAID_TEST_DB_URL = testDbUrl;
  process.env.DATABASE_URL = testDbUrl;

  await bootstrapLocalTestDatabase({
    testDbUrl,
    adminDbUrl: buildAdminDatabaseUrl(testDbUrl),
  });
}

export async function teardown() {
  const testDbUrl = getTestDatabaseUrl();

  process.env.MEMORAID_ALLOW_TEST_DB_BOOTSTRAP = process.env.MEMORAID_ALLOW_TEST_DB_BOOTSTRAP ?? '1';
  process.env.MEMORAID_TEST_DB_URL = testDbUrl;
  process.env.DATABASE_URL = testDbUrl;

  await dropLocalTestDatabase({
    testDbUrl,
    adminDbUrl: buildAdminDatabaseUrl(testDbUrl),
  });
}
