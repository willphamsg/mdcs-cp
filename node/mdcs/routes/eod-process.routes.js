const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { start } = require('repl');

const router = express.Router();
const dataPath = path.join(__dirname, '../data/eod-process.json');
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

    if (['endTime', 'startTime'].includes(name)) {
      console.log('Parsing dates for sorting:', va, vb);
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
router.post('/check-eod-status', async (req, res) => {
  try {
    const processCount = req.app.locals.EOD_PROCESS_COUNT || 0;
    const items = await readData();
    let data = [...items];
    const params = req.body;
    const {
      page_size = 10,
      page_index = 0,
      sort_order = [],
      search_text = '',
      search_select_filter = {},
    } = params;
    const depot_id = search_select_filter.depot_id;

    // if (depot_id === '2') {
    //   items.pop();
    // }

    // if (depot_id === '3') {
    //   items.pop();
    //   items.shift();
    // }

    data = applySort(data, sort_order);
    data = applyPagination(data, parseInt(page_index), parseInt(page_size));

    let forceStatus = 0;

    if (processCount === 1) {
      data = data.map((item, index) => {
        return { ...item, status: 'Processing' };
      });
      forceStatus = 1;
    } else if (processCount === 2) {
      data = data.map((item, index) => {
        if (index === 0) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 02:15:30',
          };
        } else if (index === 1) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 01:45:10',
          };
        } else if (index === 2) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:30:00',
            endTime: '2024-06-15 02:00:00',
          };
        } else {
          return { ...item, status: 'Processing' };
        }
      });
      forceStatus = 1;
    } else if (processCount === 3) {
      data = data.map((item, index) => {
        if (index === 0) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 02:15:30',
          };
        } else if (index === 1) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 01:45:10',
          };
        } else if (index === 2) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:30:00',
            endTime: '2024-06-15 02:00:00',
          };
        } else if (index === 3) {
          return {
            ...item,
            status: 'Failed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 02:15:30',
          };
        } else if (index === 4) {
          return {
            ...item,
            status: 'Failed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 01:45:10',
          };
        } else if (index === 5) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:30:00',
            endTime: '2024-06-15 02:00:00',
          };
        } else {
          return { ...item, status: 'Processing' };
        }
      });
      forceStatus = 1;
    } else if (processCount === 4) {
      data = data.map((item, index) => {
        if (index === 0) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 02:15:30',
          };
        } else if (index === 1) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 01:45:10',
          };
        } else if (index === 2) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:30:00',
            endTime: '2024-06-15 02:00:00',
          };
        } else if (index === 3) {
          return {
            ...item,
            status: 'Failed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 02:15:30',
          };
        } else if (index === 4) {
          return {
            ...item,
            status: 'Failed',
            startTime: '2024-06-15 01:00:00',
            endTime: '2024-06-15 01:45:10',
          };
        } else if (index === 5) {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:30:00',
            endTime: '2024-06-15 02:00:00',
          };
        } else {
          return {
            ...item,
            status: 'Completed',
            startTime: '2024-06-15 01:30:00',
            endTime: '2024-06-15 02:00:00',
          };
        }
      });
      forceStatus = 2;
    }

    const result = {
      status: 200,
      status_code: 'INFO 3020',
      timestamp: Date.now(),
      message: 'EOD Process list fetched successfully',
      payload: {
        forceStatus,
        eod_process: data,
        business_date: '2024-06-15',
        last_eod_date: '2024-06-14 23:59:59',
        records_count: items.length,
      },
    };

    if (forceStatus === 2) {
      req.app.locals.EOD_PROCESS_COUNT = 0;
    } else req.app.locals.EOD_PROCESS_COUNT = processCount + 1;

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/force-eod', async (req, res) => {
  try {
    // const items = await readData();

    const result = {
      status: 200,
      status_code: 'INFO 4504',
      timestamp: 1763875860418,
      message: 'Force EOD',
      payload: {
        'force-eod': 'SUCCESS',
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
