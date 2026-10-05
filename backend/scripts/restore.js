// Restore a backup made by backup.js.
//
//   npm run restore -- <backup-folder> --uri "<target mongodb uri>" [--drop] [--only payments,invoices]
//
// Safety: refuses to touch the database in MONGODB_URI (production) unless --allow-production
// is passed. Without --drop, existing documents with the same _id are skipped, not overwritten.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';

dotenv.config();
const { EJSON } = mongoose.mongo.BSON;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const dir = args.find((a, i) => !a.startsWith('--') && !['--uri', '--only'].includes(args[i - 1]));
const targetUri = opt('uri') || process.env.RESTORE_MONGODB_URI;
const only = opt('only')?.split(',');

if (!dir || !fs.existsSync(path.join(dir, 'manifest.json'))) {
  console.error('Usage: npm run restore -- <backup-folder> --uri <mongodb uri> [--drop] [--only a,b] [--allow-production]');
  process.exit(1);
}
if (!targetUri) {
  console.error('Provide the target with --uri or RESTORE_MONGODB_URI');
  process.exit(1);
}
if (targetUri === process.env.MONGODB_URI && !flag('allow-production')) {
  console.error('Target is the production database (MONGODB_URI). Restore into a scratch DB first, or pass --allow-production.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
await mongoose.connect(targetUri);
const db = mongoose.connection.db;
console.log(`Restoring backup of "${manifest.database}" (${manifest.createdAt}) into "${db.databaseName}"`);

for (const [name, expected] of Object.entries(manifest.collections)) {
  if (only && !only.includes(name)) continue;
  const col = db.collection(name);
  if (flag('drop')) await col.drop().catch(() => {});

  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(dir, `${name}.ndjson.gz`)).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });

  let batch = [];
  let inserted = 0;
  const flush = async () => {
    if (!batch.length) return;
    try {
      const res = await col.insertMany(batch, { ordered: false });
      inserted += res.insertedCount;
    } catch (err) {
      inserted += err.result?.insertedCount ?? err.insertedCount ?? 0; // duplicates are skipped
    }
    batch = [];
  };
  for await (const line of rl) {
    if (!line.trim()) continue;
    batch.push(EJSON.parse(line, { relaxed: false }));
    if (batch.length >= 500) await flush();
  }
  await flush();

  // Re-create indexes (skip the default _id index)
  const idxFile = path.join(dir, `${name}.indexes.json`);
  if (fs.existsSync(idxFile)) {
    for (const { key, name: idxName, v, ns, ...options } of JSON.parse(fs.readFileSync(idxFile, 'utf8'))) {
      if (idxName === '_id_') continue;
      await col.createIndex(key, { name: idxName, ...options }).catch((e) => console.warn(`  index ${idxName}: ${e.message}`));
    }
  }

  const actual = await col.countDocuments();
  console.log(`  ${name}: inserted ${inserted}, now ${actual} (backup had ${expected})${actual === expected ? '' : '  <-- MISMATCH'}`);
}

await mongoose.disconnect();
console.log('Restore finished. Compare the counts above to the backup manifest.');
