import { existsSync } from 'fs';
import { join } from 'path';

import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { app } from 'electron';

import { getDb } from './client';

function resolveMigrationsFolder() {
  const appPath = app.getAppPath();
  const candidates = [join(appPath, 'drizzle'), join(process.cwd(), 'drizzle')];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve Drizzle migrations folder. Checked: ${candidates.join(', ')}`);
}

export function runMigrations() {
  migrate(getDb(), {
    migrationsFolder: resolveMigrationsFolder(),
  });
}
