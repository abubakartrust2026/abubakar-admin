// Full logical backup of every collection to gzipped NDJSON (Extended JSON, so ObjectIds,
// Dates and Decimals round-trip exactly). No mongodump binary needed.
//
//   npm run backup                      -> backend/backups/<timestamp>/
//   BACKUP_DIR=/path RETENTION_DAYS=14 npm run backup
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

dotenv.config();
const { EJSON } = mongoose.mongo.BSON;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseDir = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const retentionDays = Number(process.env.RETENTION_DAYS || 14);

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(baseDir, stamp);
fs.mkdirSync(outDir, { recursive: true });

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
  .map((c) => c.name)
  .filter((n) => !n.startsWith('system.'));

const manifest = { createdAt: new Date().toISOString(), database: db.databaseName, collections: {} };

for (const name of collections) {
  const file = path.join(outDir, `${name}.ndjson.gz`);
  const gz = zlib.createGzip();
  const out = fs.createWriteStream(file);
  gz.pipe(out);

  let count = 0;
  for await (const doc of db.collection(name).find({})) {
    gz.write(EJSON.stringify(doc, { relaxed: false }) + '\n');
    count++;
  }
  gz.end();
  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });

  // Indexes are saved too so a restore reproduces unique constraints
  const indexes = await db.collection(name).indexes();
  fs.writeFileSync(path.join(outDir, `${name}.indexes.json`), JSON.stringify(indexes, null, 2));

  manifest.collections[name] = count;
  console.log(`  ${name}: ${count} documents`);
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
await mongoose.disconnect();
console.log(`Backup written to ${outDir}`);

// Retention: drop timestamped folders older than N days
const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
for (const entry of fs.readdirSync(baseDir)) {
  const full = path.join(baseDir, entry);
  if (full !== outDir && /^\d{4}-\d{2}-\d{2}T/.test(entry) && fs.statSync(full).mtimeMs < cutoff) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`Removed old backup ${entry}`);
  }
}
