# LTA BTDS Mock Server (MongoDB)

A MongoDB-backed mock API server for the BTDS GUI (MDCS), ported from the
file-based mock in [`node/mdcs`](../node/mdcs). It exposes the same endpoints and
response envelopes, but reads/writes data from MongoDB collections instead of
JSON files.

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local `mongodb://localhost:27017` by default)

## Setup

```bash
cd server
npm install
cp .env.example .env      # adjust MONGODB_URI / MONGODB_DB / PORT if needed
npm run seed              # load server/data/*.json into MongoDB
npm start                 # or: npm run dev  (nodemon)
```

The server listens on **http://localhost:3000** (same port as the original mock),
so the app's `environment.dummy.ts` gateway (`http://localhost:3000/api/`) works
unchanged. Run only one mock server (this one or `node/mdcs`) at a time.

## How it maps to MongoDB

- **One collection per seed file.** `server/data/<name>.json` becomes the
  collection `<name>` (e.g. `depot-list.json` → `depot-list`).
- **Array files** (e.g. `depot-list.json`) seed one document per element.
- **Object files** (e.g. `settings.json`, `card-key-version.json`) seed a single
  document.
- Reads strip Mongo's `_id`, so responses are byte-for-byte the same shape as the
  original JSON mock.

Seeding is idempotent — `npm run seed` drops and reloads every collection.

## Layout

```
server/
  index.js               # Express app: connects to Mongo, mounts routes
  config/db.js           # MongoDB connection + getCollection(name)
  utils/data-store.js    # readCollection / readDoc / replaceCollection / replaceDoc
  seed/seed.js           # loads data/*.json into collections
  data/                  # default seed data (JSON)
  routes/                # MongoDB-backed route handlers (same paths as node/mdcs)
```

## Editing default data

Change the JSON in `server/data/` and re-run `npm run seed`, or edit collections
directly in MongoDB. Routes that write (e.g. parameter import/export progress)
persist changes back to their collection.
