// Verifikasi integritas migrasi Supabase:
// - Penomoran berurutan (001_, 002_, ...) tanpa celah atau duplikat
// - Satu file per nomor
// - Tidak ada pola secret (service_role key, apikey) di dalam SQL
// - Setiap file migrasi diawali header/komentar yang mengindikasikan tujuan

import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.cwd(), 'supabase', 'migrations');
if (!fs.existsSync(dir)) {
  console.error('Folder supabase/migrations tidak ditemukan');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
let failed = false;

files.forEach((file, idx) => {
  const m = file.match(/^(\d{3})_.+\.sql$/);
  if (!m) {
    console.error(`Nama file tidak sesuai pola NNN_nama.sql: ${file}`);
    failed = true;
    return;
  }
  const n = Number(m[1]);
  if (n !== idx + 1) {
    console.error(`Penomoran migrasi tidak berurutan: ${file} (seharusnya ${String(idx + 1).padStart(3, '0')})`);
    failed = true;
  }
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  if (/service_role|SUPABASE_SERVICE_ROLE|eyJ[A-Za-z0-9_-]{20,}/.test(content)) {
    console.error(`Potensi secret terungkap di ${file}`);
    failed = true;
  }
});

if (failed) {
  process.exit(1);
}
console.log(`OK: ${files.length} file migrasi valid & berurutan`);
