import * as path from 'path';
import * as dotenv from 'dotenv';

let loaded = false;

export function loadRootEnv() {
  if (loaded) return;

  const rootEnvPath = path.resolve(process.cwd(), '..', '..', '.env');
  dotenv.config({ path: rootEnvPath });
  loaded = true;
}