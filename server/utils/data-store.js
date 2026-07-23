const { getCollection } = require('../config/db');

/**
 * Data-access helpers that replace the old file-based `readData()` / `saveData()`
 * used by the JSON mock server. Each seed file maps 1:1 to a MongoDB collection
 * named after the file (without `.json`).
 *
 * - Array-shaped seed files (e.g. depot-list.json) -> use readCollection / replaceCollection.
 * - Object-shaped seed files (e.g. settings.json)  -> use readDoc / replaceDoc.
 *
 * Reads always strip Mongo's `_id` so responses match the original JSON exactly.
 */

// Read an array-backed collection -> array of plain objects (no _id).
async function readCollection(name) {
  return getCollection(name).find({}, { projection: { _id: 0 } }).toArray();
}

// Read an object-backed collection -> the single stored document (no _id), or null.
async function readDoc(name) {
  return getCollection(name).findOne({}, { projection: { _id: 0 } });
}

// Replace the entire contents of an array-backed collection.
async function replaceCollection(name, items) {
  const col = getCollection(name);
  await col.deleteMany({});
  const arr = Array.isArray(items) ? items : [];
  if (arr.length) {
    // Spread so we never persist the caller's _id and never mutate the input.
    await col.insertMany(arr.map(item => ({ ...item })));
  }
}

// Replace the single document in an object-backed collection.
async function replaceDoc(name, doc) {
  const col = getCollection(name);
  await col.deleteMany({});
  await col.insertOne({ ...doc });
}

module.exports = { readCollection, readDoc, replaceCollection, replaceDoc };
