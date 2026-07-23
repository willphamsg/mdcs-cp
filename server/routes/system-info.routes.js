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
router.post('/fetch', async (req, res) => {
  try {
    const db = await readDoc('system-info');

    // Validate data structure
    if (!db || typeof db !== 'object') {
      return res.status(500).json({
        status: 500,
        status_code: 'ERROR 5001',
        message: 'Invalid data structure',
        payload: null,
      });
    }

    const result = {
      status: 200,
      status_code: 'INFO 2471',
      timestamp: Date.now(),
      message: 'System info details',
      payload: { ...db },
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('❌ /fetch error:', err);
    res.status(500).json({
      status: 500,
      status_code: 'ERROR 5000',
      message: 'Internal server error',
      payload: null,
    });
  }
});

router.get('/dagw-system-status', async (req, res) => {
  try {
    const result = {
      status: 200,
      status_code: 'INFO 2475',
      timestamp: Date.now(),
      message: 'DAGW Depots system status summary',
      payload: {
        status_list: [
          {
            id: 4,
            depot_code: 'SLB',
            depot_name: 'Soon Lee Depot',
            status: 'Degraded',
          },
          {
            id: 5,
            depot_code: 'HGA',
            depot_name: 'Hougang Depot',
            status: 'Running',
          },
          {
            id: 5,
            depot_code: 'AMK',
            depot_name: 'SBST Ang Mo Kio Depot',
            status: 'Down',
          },
          {
            id: 6,
            depot_code: 'BND',
            depot_name: 'Bedok North Depot',
            status: 'Running',
          },
          {
            id: 7,
            depot_code: 'BRD',
            depot_name: 'Braddell Depot',
            status: 'Running',
          },
          {
            id: 8,
            depot_code: 'BBT',
            depot_name: 'Bukit Batok Depot',
            status: 'Down',
          },
        ],
      },
    };
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ /depots error:', err);
    res.status(500).json({
      status: 500,
      status_code: 'ERROR 5000',
      message: 'Internal server error',
      payload: null,
    });
  }
});

module.exports = router;
