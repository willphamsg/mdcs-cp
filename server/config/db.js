const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'lta_btds_mdcs';

let client;
let db;

/**
 * Open a single shared connection for the process. Call once at startup.
 */
async function connect() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB);
  console.log(`🗄️  Connected to MongoDB "${MONGODB_DB}" at ${MONGODB_URI}`);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('MongoDB not connected yet. Call connect() first.');
  }
  return db;
}

/**
 * A collection name is the base name of its seed file, e.g.
 * data/depot-list.json -> collection "depot-list".
 */
function getCollection(name) {
  return getDb().collection(name);
}

async function close() {
  if (client) await client.close();
  client = undefined;
  db = undefined;
}

module.exports = { connect, getDb, getCollection, close, MONGODB_URI, MONGODB_DB };
