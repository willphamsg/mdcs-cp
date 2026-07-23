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

  const { depot_id_list, effective_date_from, effective_date_till } = filter;

  const from = new Date(effective_date_from);
  const till = new Date(effective_date_till);

  return items.filter(item => {
    // ✅ Depot filter
    const depotMatch =
      !depot_id_list.length || depot_id_list.includes(item.depot_id);

    // ✅ Date filter (inclusive range)
    const itemDate = new Date(item.update_time);
    const dateMatch =
      !effective_date_from ||
      !effective_date_till ||
      (itemDate >= from && itemDate <= till);

    return depotMatch && dateMatch;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name];
    let vb = b[name];

    if (name === 'update_time') {
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

router.get('/profile/fetch', async (req, res) => {
  try {
    const db = await readDoc('user');
    const result = {
      status: 200,
      status_code: 'INFO 2300',
      timestamp: Date.now(),
      payload: db['profile'] || {},
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/svc-provider/search', async (req, res) => {
  try {
    const data = await readCollection('service-provider-list');
    const result = {
      status: 200,
      status_code: 'INFO 2020',
      timestamp: Date.now(),
      payload: {
        records_count: data.length,
        svc_prov_info: [...data],
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/depot/search', async (req, res) => {
  try {
    const data = await readCollection('depot-list');
    const result = {
      status: 200,
      status_code: 'INFO 2060',
      timestamp: Date.now(),
      message: 'Depot info list with pagination details',
      payload: {
        records_count: data.length,
        depot_info: [...data],
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/eod-process/eod-dates', async (req, res) => {
  try {
    const result = {
      status: 200,
      status_code: 'INFO 4502',
      timestamp: Date.now(),
      message: 'Eod Dates',
      payload: {
        'eod-dates': {
          current_business_day: '08/12/2025',
          last_eod: '15/10/2025',
        },
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/eod-process/check-eod-status', async (req, res) => {
  try {
    const data = await readCollection('eod-process');
    const result = {
      status: 200,
      status_code: 'INFO 4505',
      timestamp: Date.now(),
      message: 'Check EOD Status',
      payload: {
        'check-eod-status': {
          eodProcessDtoList: [...data],
        },
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/eod-process/force-eod', async (req, res) => {
  try {
    const result = {
      status: 200,
      status_code: 'INFO 4504',
      timestamp: Date.now(),
      message: 'Eod EOD',
      payload: { 'force-eod': 'SUCCESS' },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/event-history/search', async (req, res) => {
  try {
    const items = await readCollection('event-history');
    let data = [...items];

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
    data = applyFilters(data, search_select_filter);
    const total = data.length;
    // ↕️ 3. Sort
    data = applySort(data, sort_order);
    // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 3020',
      timestamp: Date.now(),
      message: 'Event History list with pagination details',
      payload: {
        event_history_list: data,
        records_count: total,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
