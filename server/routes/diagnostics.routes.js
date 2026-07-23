const express = require('express');
const {
  readCollection,
  readDoc,
  replaceCollection,
  replaceDoc,
} = require('../utils/data-store');

const router = express.Router();

function applySearch(items, searchText) {
  if (!searchText) return items;

  const lower = searchText.toLowerCase();
  return items.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(lower)
    )
  );
}

function applyFilters(items, filter) {
  if (!filter) return items;

  const { depot_id_list, day_type_list } = filter;

  return items.filter(item => {
    const matchDepot =
      !depot_id_list?.length || depot_id_list.includes(item.depot_id);

    const matchDay =
      !day_type_list?.length || day_type_list.includes(item.day_type);

    return matchDepot && matchDay;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name];
    let vb = b[name];

    if (name === 'updated_on') {
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
router.post('/view', async (req, res) => {
  try {
    const db = await readCollection('diagnostics');
    // const params = req.body;
    // const dagw = params.dagw;
    // const depot_id = params.depot_id;

    // const items = dagw ? db['dagw'] : db['mdcs'];

    // if (depot_id === '2') {
    //   items.pop();
    // }
    // if (depot_id === '3') {
    //   items.pop();
    //   items.shift();
    // }

    const result = {
      status: 200,
      status_code: 'INFO 4502',
      timestamp: Date.now(),
      message: 'View Diagnostics',
      payload: {
        diagnostics_item: [...db],
        // records_count: db.length,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
