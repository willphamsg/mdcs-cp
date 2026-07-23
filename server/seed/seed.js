/**
 * Seed MongoDB from the JSON files in server/data.
 *
 * Each file becomes a collection named after the file (without `.json`):
 *   - if the JSON root is an array  -> one document per element
 *   - if the JSON root is an object -> a single document
 *
 * Existing collections are dropped and recreated so seeding is idempotent.
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connect, getDb, close } = require('../config/db');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function seed() {
  await connect();
  const db = getDb();

  const files = fs
    .readdirSync(DATA_DIR)
    .filter(file => file.endsWith('.json'));

  let collections = 0;
  let documents = 0;

  for (const file of files) {
    const name = path.basename(file, '.json');
    const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8').trim();

    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn(`⚠️  Skipping ${file}: invalid JSON (${err.message})`);
      continue;
    }
    if (parsed == null) {
      console.warn(`⚠️  Skipping ${file}: empty file`);
      continue;
    }

    const col = db.collection(name);
    await col.deleteMany({});

    if (Array.isArray(parsed)) {
      if (parsed.length) {
        await col.insertMany(parsed.map(item => ({ ...item })));
        documents += parsed.length;
      }
    } else {
      await col.insertOne({ ...parsed });
      documents += 1;
    }

    collections += 1;
    console.log(`  ✓ ${name} (${Array.isArray(parsed) ? parsed.length + ' docs' : '1 doc'})`);
  }

  console.log(`\n✅ Seeded ${collections} collections, ${documents} documents.`);
  await close();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
