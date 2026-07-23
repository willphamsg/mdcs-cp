const express = require('express');
const fs = require('node:fs').promises;
const path = require('node:path');

const router = express.Router();
const busTransferDataPath = path.join(
  __dirname,
  '../data/bus-transfer-list.json'
);
const depotListPath = path.join(__dirname, '../data/depot-list.json');
const connectedBusesDataPath = path.join(
  __dirname,
  '../data/connected-buses.json'
);

// Read JSON file
async function readData(path) {
  try {
    const json = await fs.readFile(path, 'utf-8');
    return JSON.parse(json);
  } catch (err) {
    console.error('❌ JSON read error:', err);
    return [];
  }
}

// Save JSON file
async function saveData(data, dataPath = busTransferDataPath) {
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

  const {
    current_depot = [],
    current_operator = [],
    future_operator = [],
    status = [],
    last_updated_end,
    last_updated_start
  } = filter;

  return items.filter(item => {
    const matchCurrentDepot =
      !current_depot?.length ||
      current_depot.some(_co => item.current_depot?.includes(_co));

    const matCurrentOperator =
      !current_operator?.length ||
      current_operator.includes(item.current_operator);

    const matFutureOperator =
      !future_operator?.length ||
      future_operator.includes(item.future_operator);

    const matchStatus = !status?.length || status.includes(item.status);

    // Date range filtering for last_updated
    let matchDateRange = true;
    if (last_updated_start || last_updated_end) {
      const itemDate = new Date(item.last_update).getTime();
      const startDate = last_updated_start ? new Date(last_updated_start).getTime() : 0;
      const endDate = last_updated_end ? new Date(last_updated_end).getTime() : Infinity;
      matchDateRange = itemDate >= startDate && itemDate <= endDate;
    }

    return (
      matchCurrentDepot &&
      matCurrentOperator &&
      matFutureOperator &&
      matchStatus &&
      matchDateRange
    );
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name];
    let vb = b[name];

    if (name === 'last_update') {
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
router.post('/bus-transfer/search', async (req, res) => {
  try {
    const items = await readData(busTransferDataPath);

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
      status_code: 'INFO 5020',
      timestamp: Date.now(),
      payload: {
        bus_transfer_list: data,
        records_count: total,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST get items
router.post('/bus-transfer/update', async (req, res) => {
  try {
    const items = await readData(busTransferDataPath);

    const updateItems = req.body;
    console.log('🚀 updateItems:', updateItems);
    const merged = items.map(item => {
      const updated = updateItems.find(u => u.bus_num?.toString() === item.bus_num?.toString());
      console.log('🚀 updated:', updated);
      item['target_effective_time'] =
        updated?.target_effective_time || item.target_effective_time;
      item['target_effective_date'] = updated?.target_effective_date || item.target_effective_date;
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
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/bus-transfer/approved', async (req, res) => {
  try {
    const items = await readData(busTransferDataPath);

    const updateItems = req.body;
    const merged = items.map(item => {
      const updated = updateItems.find(u => u.bus_num?.toString() === item.bus_num?.toString());
      if (updated) {
        item['status'] = 3;
      }
      return item;
    });

    console.log('🚀 merged:', merged);
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
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/bus-transfer/reject', async (req, res) => {
  try {
    const items = await readData(busTransferDataPath);

    const updateItems = req.body;
    const merged = items.map(item => {
      const updated = updateItems.find(u => u.bus_num?.toString() === item.bus_num?.toString());
      if (updated) {
        item['status'] = 2;
      }
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
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// POST create items
router.post('/add', async (req, res) => {
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
        day_type: item.day_type[0],
        bus_num: item.bus_num,
        est_arrival_time: item.est_arrival_time,
        est_arrival_count: item.est_arrival_count,
        updated_on: item.updated_on,
      };
      data.push(newItem);
    });

    await saveData(data);

    const result = {
      status: 404,
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
    const ids = new Set(deleteItems.map(x => x.id));
    // Delete items
    const filtered = items.filter(item => !ids.has(item.id));

    await saveData(filtered);
    // await new Promise(resolve => setTimeout(resolve, 2000));
    const result = {
      status: 200,
      status_code: 'INFO 3040',
      timestamp: Date.now(),
      message: 'Selected records have been successfully deleted!',
      payload: deleteItems,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /delete error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// dashboard connected buses
router.post('/bus-operation-status/connected-buses', async (req, res) => {
  try {
    const { depot_ids = [], hours = 0 } = req.body;

    // Mock logic to calculate connected buses based on depot_ids and hours
    const allData = await readData(connectedBusesDataPath);
    const filteredData = allData.filter(item =>
      depot_ids.length > 0 ? depot_ids.includes(item.depot_id) : true
    );

    //group by depot_id and return list of depot, no need to sum
    const depotBusCount = {};
    filteredData.forEach(item => {
      if (!depotBusCount[item.depot_id]) {
        depotBusCount[item.depot_id] = [];
      }
      depotBusCount[item.depot_id].push(item);
    });

    // console.log('🚀 depotBusCount:', depotBusCount);

    const busResults = [];
    Object.values(depotBusCount).forEach(buses => {
      buses.sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at)); // Sort by time desc
      console.log('🚀 sorted buses:', buses);
      if (hours) {
        const nextBuses = buses.slice(0, hours * 7 - (hours - 1));
        busResults.push(...nextBuses);
      }
    });

    const result = {
      status: 200,
      status_code: 'INFO 4505',
      message: 'Nos of buses connected to depot list',
      timestamp: Date.now(),
      payload: {
        depot_bus_count: busResults, // Mocked count based on filter
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /bus-operation-status/connected-buses error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/bus-transfer/count-in-progress', async (req, res) => {
  try {
    const result = {
      status: 200,
      status_code: 'INFO 5507',
      timestamp: 1773143889517,
      message: 'Bus transfer in progress count',
      payload: {
        bus_transfer_count: 4,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /bus-transfer/count-in-progress error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
