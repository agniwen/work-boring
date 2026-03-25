import { mkdirSync } from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'path';

import { drizzle } from 'drizzle-orm/node-sqlite';
import { app } from 'electron';

import * as schema from './schema';

let sqlite: DatabaseSync | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDatabasePath() {
  return join(app.getPath('userData'), 'app.db');
}

export function getSqlite() {
  if (sqlite) {
    return sqlite;
  }

  const databasePath = getDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  const connection = new DatabaseSync(databasePath);
  connection.exec('PRAGMA foreign_keys = ON;');
  connection.exec('PRAGMA journal_mode = WAL;');
  connection.exec('PRAGMA synchronous = NORMAL;');
  connection.exec('PRAGMA busy_timeout = 5000;');

  sqlite = connection;
  return connection;
}

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = drizzle({
    client: getSqlite(),
    schema,
    casing: 'snake_case',
  });
  return dbInstance;
}

export function getDatabaseInfo() {
  return {
    databasePath: getDatabasePath(),
  };
}
