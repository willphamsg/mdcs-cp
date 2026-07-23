const express = require('express');
const { version } = require('os');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const dataPath = path.join(__dirname, '../data/master-bus-list.json');
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

  const {
    depot_id_list,
    bus_num,
    effective_date_from,
    effective_date_till,
    status_list,
  } = filter;

  const from = new Date(effective_date_from);
  const till = new Date(effective_date_till);

  return items.filter(item => {
    const matchDepot =
      !depot_id_list?.length || depot_id_list.includes(item.depot_id);

    // const matchBusID =
    //   !bus_num?.length ||
    //   bus_num?.toLowerCase().includes(item.bus_num.toLowerCase());

    const itemDate = new Date(item.effective_date);
    const dateMatch =
      !effective_date_from ||
      !effective_date_till ||
      (itemDate >= from && itemDate <= till);

    const matchStatus =
      !status_list?.length ||
      status_list.includes(item.status);

    return matchDepot && dateMatch && matchStatus;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name];
    let vb = b[name];

    if (['effective_date'].includes(name)) {
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
router.post('/search', async (req, res) => {
  try {
    const items = await readData();
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
    data = applyPagination(data, parseInt(page_index), parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 3020',
      timestamp: Date.now(),
      message: 'Bus Operation list with pagination details',
      payload: {
        master_bus_list: data,
        records_count: total,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/find-info', async (req, res) => {
  try {
    const params = req.body;

    const { bus_num, depot_id, svc_prov_id } = params;

    let result = {};

    if (!depot_id) {
      result = {
        timestamp: 1773324451027,
        status_code: 'WARN 3077',
        errors: [
          {
            name: 'depot_id',
            message: 'Depot info invalid',
          },
        ],
        status: 200,
        error:
          'The master bus list would not be provide details due to missing parameter',
      };
    } else if (depot_id && bus_num) {
      result = {
        status: 200,
        status_code: 'INFO 3079',
        timestamp: Date.now(),
        message:
          'The system already has a master bus list entry with different depot.',
        payload: {
          master_bus_entry: {
            id: 3904,
            version: 0,
            bus_num,
            svc_prov_id,
            depot_id: depot_id,
            effective_date: new Date().toISOString(),
            updated_on: new Date().toISOString(),
            group_num: 1,
          },
        },
      };
    }

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST create items
router.post('/save', async (req, res) => {
  try {
    const items = await readData();
    const depotList = await readDepotListData();
    let data = [...items];
    const newItems = req.body;
    const maxId = Math.max(...data.map(item => item.id));

    newItems.forEach((item, index) => {
      const depot = depotList.find(d => d.depot_id === item.depot_id);
      const newItem = {
        id: maxId + index + 1,
        depot_id: item.depot_id,
        depot,
        bus_num: item.bus_num,
        effective_date: item.effective_date,
        effective_time: new Date().toISOString().slice(11, 16),
        status: 4,
        svc_prov_id: 16,
        master_bus_depot_id: 127,
        group_num: 1,
        version: 1,
      };
      data.push(newItem);
    });

    await saveData(data);

    const result = {
      status: 200,
      status_code: 'INFO 3021',
      timestamp: Date.now(),
      message: 'Create new bus list successful',
      payload: newItems,
    };

    res.status(201).json(result);
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
    const ids = deleteItems.map(x => x.id);
    // Delete items
    const filtered = items.filter(item => !ids.includes(item.id));

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
