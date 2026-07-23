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

  const { status_list } = filter;

  return items.filter(item => {
    const matchStatus =
      !status_list?.length || status_list.includes(item.status);


    return matchStatus;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name];
    let vb = b[name];

    // Handle nested objects (device_id and time have value property)
    if (va && typeof va === 'object' && va.value !== undefined) {
      va = va.value;
    }
    if (vb && typeof vb === 'object' && vb.value !== undefined) {
      vb = vb.value;
    }

    // Handle date sorting for time field
    if (name === 'time' || name === 'updated_on') {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }

    // Handle string comparison for device_id
    if (typeof va === 'string' && typeof vb === 'string') {
      va = va.toLowerCase();
      vb = vb.toLowerCase();
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
router.post('/search', async (req, res) => {
  try {
    // const params = req.body;
    // const depot_id = params.depot_id;
    // const isDagw = params.dagw;
    const db = await readDoc('card-key-version');
    let data = [...db['card_key_version_list']];

    // const newItem = {
    //   id: Date.now(),
    //   ...req.body,
    // };
    // items.push(newItem);
    // saveData(items);

    // res.status(201).json(newItem);
    const params = req.body;
    const {
      page_size = 10,
      page_index = 0,
      sort_order = [],
      search_text = '',
      search_select_filter = {},
    } = params;

    // 🔍 1. Search
    data = applySearch(data, search_text);
    // 🎛️ 2. Filters
    if (search_select_filter.status && search_select_filter.status.length > 0) {
      // Filter for inconsistent status
      data = data.filter(item => {
        // Check if any device has inconsistent status
        return Object.keys(item).some(key => {
          if (key.startsWith('device_') && item[key]?.status === 'inconsistent') {
            return true;
          }
          if (key === 'device_id' && item[key]?.status === 'inconsistent') {
            return true;
          }
          return false;
        });
      });
    }

    const total = data.length;
    // ↕️ 3. Sort
    data = applySort(data, sort_order);
    // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 3419',
      timestamp: Date.now(),
      message: 'Card key version summary with pagination details',
      payload: { records_count: total, ...db, card_key_version_list: data },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
