import fs from 'fs';
import path from 'path';
import { cloudSync } from './cloudSync';

// Auto-load .env safely for local development and background processes
try {
  const envCandidates = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
  ];
  for (const p of envCandidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
} catch (e) {}

// Re-read config after loading env
cloudSync.reloadConfig();

async function main() {
  console.log('[CloudSync:Prestart] 🔍 Checking database state before server startup...');

  const candidate1 = path.resolve(__dirname, '../../../../local-business-os.db');
  const candidate2 = path.resolve(process.cwd(), 'local-business-os.db');
  const dbPath = process.env.DB_PATH || (fs.existsSync(candidate1) || fs.existsSync(path.dirname(candidate1)) ? candidate1 : candidate2);

  console.log(`[CloudSync:Prestart] Target DB Path: ${dbPath}`);

  if (!cloudSync.isConfigured()) {
    console.log('[CloudSync:Prestart] ℹ️ Cloud sync not configured (SUPABASE_URL or SUPABASE_KEY missing). Skipping restore.');
    process.exit(0);
  }

  const localExists = fs.existsSync(dbPath);
  const localSize = localExists ? fs.statSync(dbPath).size : 0;

  // If local DB doesn't exist or is an empty fresh file (e.g. freshly created container on Render)
  if (!localExists || localSize < 4096) {
    console.log(`[CloudSync:Prestart] 🔄 Local database missing or empty (${localSize} bytes). Restoring from Cloud Storage...`);
    const res = await cloudSync.downloadDatabase(dbPath);
    if (res.success) {
      console.log(`[CloudSync:Prestart] ✅ Database restored successfully from cloud storage (${res.size} bytes).`);
    } else {
      console.warn(`[CloudSync:Prestart] ⚠️ Restore notice: ${res.message}`);
    }
  } else {
    console.log(`[CloudSync:Prestart] ℹ️ Local database exists (${(localSize / 1024).toFixed(1)} KB). Will maintain sync during runtime.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[CloudSync:Prestart] Unexpected error:', err);
  // Never fail startup, always continue
  process.exit(0);
});
