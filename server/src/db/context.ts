import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppDb } from './factory';

export type DbContext = {
  db: AppDb;
};

const dbContextStorage = new AsyncLocalStorage<DbContext>();

export function getDbContext(): DbContext | undefined {
  return dbContextStorage.getStore();
}

export function runWithDbContext<T>(dbContext: DbContext, fn: () => T): T {
  return dbContextStorage.run(dbContext, fn);
}

export function withDbContext<T>(db: AppDb, fn: () => T): T {
  return runWithDbContext({ db }, fn);
}
