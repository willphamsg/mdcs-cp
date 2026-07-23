const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const dataPath = path.join(__dirname, '../data/depot-list.json');
// const depotListPath = path.join(__dirname, '../data/depot-list.json');

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

  const { depot_id_list, update_type, user_id, date_from, date_till } = filter;

  const from = new Date(date_from);
  const till = new Date(date_till);

  return items.filter(item => {
    // ✅ Depot filter
    const depotMatch =
      !depot_id_list.length || depot_id_list.includes(item.depot_id);

    // ✅ User filter (case-insensitive, partial match)
    const userMatch =
      !user_id.length ||
      user_id.some(u => item.userId.toLowerCase().includes(u.toLowerCase()));

    // ✅ Update type filter (case-insensitive exact match)
    const updateMatch =
      !update_type.length ||
      update_type.some(
        type => item.updateType.toLowerCase() === type.toLowerCase()
      );

    // ✅ Date filter (inclusive range)
    const itemDate = new Date(item.dateTime);
    const dateMatch =
      !date_from || !date_till || (itemDate >= from && itemDate <= till);

    return depotMatch && userMatch && updateMatch && dateMatch;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name];
    let vb = b[name];

    if (name === 'dateTime') {
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

// POST get items
router.get('/search', async (req, res) => {
  try {
    const items = await readData();
    // let data = [...items];
    // const params = req.body;
    // const {
    //   page_size = 10,
    //   page_index = 0,
    //   sort_order = [],
    //   search_text = '',
    //   search_select_filter = {},
    // } = params;
    // const depot_id = search_select_filter.depot_id;

    // const { types = [] } = search_select_filter;

    // if (types.length === 1) {
    //   if (types[0] === 'regular') {
    //     data.length = 4;
    //   } else {
    //     data.length = data.length - 4;
    //   }
    // }

    // // 🚧 Simulate different data based on depot_id

    // if (depot_id === '2') {
    //   items.pop();
    // }

    // if (depot_id === '3') {
    //   items.pop();
    //   items.shift();
    // }

    // // 🔍 1. Search
    // data = applySearch(data, search_text);
    // // 🎛️ 2. Filters
    // data = applyFilters(data, search_select_filter);
    // const total = data.length;

    // data = applySort(data, sort_order);
    // data = applyPagination(data, parseInt(page_index), parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 3020',
      timestamp: Date.now(),
      message: 'Depot list fetched successfully',
      payload: {
        depot_list: items,
        records_count: items.length,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
