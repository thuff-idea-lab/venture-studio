import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../studio/lib/db';

// Supabase JS client doesn't support raw DDL — print SQL to run in the dashboard
const migrations = [
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "frequency" TEXT NOT NULL DEFAULT 'unknown'`,
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "mvp_idea" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "distribution_paths" JSONB NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "founder_fit_reason" JSONB NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "expansion_paths" JSONB NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "why_now" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "source_excerpt" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "founder_fit_score" INTEGER NOT NULL DEFAULT 5`,
];

async function main() {
  console.log('Verifying Supabase connection...');
  const { data, error } = await db.from('ideas').select('id').limit(1);
  if (error) { console.error('Connection failed:', error.message); process.exit(1); }
  console.log('Connected. Run the following SQL in your Supabase SQL editor:\n');
  console.log('-- Scout V3 migration');
  migrations.forEach(m => console.log(m + ';'));
  console.log('\nAll 8 statements above add IF NOT EXISTS so they are safe to re-run.');
}

main().catch(console.error);
