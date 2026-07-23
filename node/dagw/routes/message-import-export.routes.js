const express = require('express');
const fs = require('node:fs').promises;
const path = require('node:path');

const router = express.Router();
const dataPath = path.join(__dirname, '../data/message-import-export.json');
const depotListPath = path.join(__dirname, '../data/depot-list.json');

// Read JSON file
async function readData() {
  try {
    const json = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.error('❌ JSON read error:', err);
    return [];
  }
}

// Save JSON file
async function saveData(data) {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ JSON write error:', err);
    throw err;
  }
}

// Read JSON file
async function readDepotListData() {
  try {
    const json = await fs.readFile(depotListPath, 'utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.error('❌ JSON read error:', err);
    return [];
  }
}

function applySearch(items, searchText) {
  if (!searchText) return items;

  const lower = searchText.toLowerCase();
  return items.filter(item => {
    // ✅ Old logic: search across all values
    const generalMatch = Object.values(item).some(
      value => value != null && String(value).toLowerCase().includes(lower)
    );

    // ✅ New logic: explicitly search depot fields
    const depot = item.depot || {};
    const depotName = depot.depot_name ? depot.depot_name.toLowerCase() : '';
    const depotCode = depot.depot_code ? depot.depot_code.toLowerCase() : '';
    const depotMatch = depotName.includes(lower) || depotCode.includes(lower);

    return generalMatch || depotMatch;
  });
}

function applyFilters(items, filter) {
  if (!filter) return items;

  const { type } = filter;
  console.log('Applying type filter:', type);

  return items.filter(item => {
    console.log('item:', item);

    const matchType = !type?.length || type.includes(item.type);

    return matchType;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name]?.value || a[name];
    let vb = b[name]?.value || b[name];

    console.log('Sorting by:', name, 'Values:', va, vb);

    if (['effective_date_live', 'effective_date'].includes(name)) {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }

    if (va < vb) return desc ? 1 : -1;
    if (va > vb) return desc ? -1 : 1;
    return 0;
  });
}

function applyPagination(items, pageIndex, pageSize) {
  const start = pageIndex * pageSize;
  return items.slice(start, start + pageSize);
}

// // GET all items
// router.get('/search', (req, res) => {
//   const items = readData();
//   res.json(items);
// });

// // GET item by ID
// router.get('/:id', (req, res) => {
//   const items = readData();
//   const item = items.find(x => x.id == req.params.id);
//   item ? res.json(item) : res.status(404).json({ message: 'Not found' });
// });

// POST get items
router.post('/import/upload/zip', async (req, res) => {
  try {
    const db = await readData();
    const items = db['message_file_data'];
    let data = [...items];
    const params = req.body;

    // const newItem = {
    //   id: Date.now(),
    //   ...req.body,
    // };
    // items.push(newItem);
    // saveData(items);

    // res.status(201).json(newItem);
    const { itemCount, count } = params;
    // console.log('Received upload request with', itemCount, 'itemCount');

    // // 🔍 1. Search
    // data = applySearch(data, search_text);
    // // 🎛️ 2. Filters
    // data = applyFilters(data, search_select_filter);
    // const total = data.length;
    // // ↕️ 3. Sort
    // data = applySort(data, sort_order);
    // // // 📄 4. Pagination
    // data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    data.length = itemCount || data.length;

    const result = {
      status: 200,
      status_code: 'INFO 3020',
      timestamp: Date.now(),
      message: 'Parameter File Import with pagination details',
      payload: {
        parameter_file_data: data.map(item => ({
          ...item,
          status: count === 3 ? 'Success' : 'Importing',
          description: count === 3 ? 'Import Successfully' : '',
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records_count: itemCount,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST create items
router.post('/export/search', async (req, res) => {
  try {
    const db = await readData();
    const items = db['message_file_export_data'];
    let data = [...items];

    const params = req.body;
    const {
      page_size = 10,
      page_index = 0,
      sort_order = [],
      search_text = '',
      search_select_filter = {},
    } = params;

    data = data.filter(item => !item.status);

    // 🔍 1. Search
    data = applySearch(data, search_text);
    // 🎛️ 2. Filters
    data = applyFilters(data, search_select_filter);
    const total = data.length;
    // ↕️ 3. Sort
    data = applySort(data, sort_order);
    // // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 3021',
      timestamp: Date.now(),
      message: 'Fetch export file successful',
      payload: {
        parameter_file_export_data: data,
        records_count: total,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/export/send-file-request', async (req, res) => {
  try {
    const db = await readData();
    const items = db['message_file_export_data'];
    let data = [...items];

    const params = req.body;
    const { count } = params;

    // console.log('Received export request for IDs:', ids);

    // // 🔍 1. Search
    // data = applySearch(data, search_text);
    // // 🎛️ 2. Filters
    // data = applyFilters(data, search_select_filter);
    // const total = data.length;
    // // ↕️ 3. Sort
    // data = applySort(data, sort_order);
    // // // 📄 4. Pagination
    // data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    // data = data.filter(item => ids.includes(item.id));
    data.length = count || data.length;

    const success_files = [];
    const failed_files = [];
    data.forEach((item, idx) => {
      if (idx % 2 === 0) {
        success_files.push({
          ...item,
          status: 'Completed',
          description: 'Export Successfully',
        });
      } else {
        failed_files.push({
          ...item,
          status: 'Failed',
          description: 'Export Failed',
        });
      }
    });

    const result = {
      status: 200,
      status_code: 'INFO 3021',
      timestamp: Date.now(),
      message: 'Fetch export file successful',
      payload: {
        success_files,
        failed_files,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update items
router.put('/update', async (req, res) => {
  let items = await readData();
  const updateItems = req.body;

  const merged = items.map(item => {
    const updated = updateItems.find(u => u.id === item.id);
    item['est_arrival_time'] =
      updated?.est_arrival_time || item.est_arrival_time;
    item['est_arrival_count'] = ![null, undefined].includes(
      updated?.est_arrival_count
    )
      ? updated?.est_arrival_count
      : item.est_arrival_count;
    return item;
  });
  await saveData(merged);

  const result = {
    status: 200,
    status_code: 'INFO 3041',
    timestamp: Date.now(),
    message: 'Selected records have been successfully updated!',
    payload: updateItems,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  };
  res.json(result);
});

// DELETE items
router.delete('/delete', async (req, res) => {
  try {
    let items = await readData();
    const deleteItems = req.body;

    if (!Array.isArray(deleteItems)) {
      return res.status(400).json({ message: 'The params must be an array' });
    }
    const ids = new Set(deleteItems.map(x => x.id));
    // Delete items
    const filtered = items.filter(item => !ids.has(item.id));

    await saveData(filtered);
    // await new Promise(resolve => setTimeout(resolve, 2000));
    const result = {
      status: 200,
      status_code: 'INFO 3040',
      timestamp: Date.now(),
      message: 'Delete vehicle successful',
      payload: deleteItems,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /delete error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
