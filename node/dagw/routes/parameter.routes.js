const e = require('cors');
const express = require('express');
const fs = require('node:fs').promises;
const path = require('node:path');
const { of } = require('rxjs');

const router = express.Router();
const newParameterApprovePath = path.join(
  __dirname,
  '../data/new-parameter-approve.json'
);
const trialDeviceSelectionPath = path.join(
  __dirname,
  '../data/trial-device-selection.json'
);
const parameterVersionSummaryLivePath = path.join(
  __dirname,
  '../data/parameter-version-summary-live.json'
);
const parameterVersionSummaryTrialPath = path.join(
  __dirname,
  '../data/parameter-version-summary-trial.json'
);
const dagwParameterVersionSummaryTrialPath = path.join(
  __dirname,
  '../data/dagw-param-version-summary.json'
);
const trialRateSecondsPath = path.join(
  __dirname,
  '../data/trialRateSeconds.json'
);
const depotListPath = path.join(__dirname, '../data/depot-list.json');

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
async function saveData(data, path = trialDeviceSelectionPath) {
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


function hasNonEmptyArray(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

function matchesArrayFilter(arr, value) {
  return !hasNonEmptyArray(arr) || arr.includes(value);
}

function matchesGroupFlag(filterValue, itemValue) {
  if (filterValue == null || filterValue === '') return true;
  if (filterValue === 'trial') return itemValue === true;
  if (filterValue === 'non-trial') return itemValue === false;
  return true;
}

function matchesBusNumFilter(filterBusNum, itemBusNum) {
  if (!filterBusNum) return true;
  return Boolean(
    itemBusNum?.toLowerCase().includes(filterBusNum.toLowerCase())
  );
}

function compareSortValues(va, vb, desc) {
  if (va < vb) return desc ? 1 : -1;
  if (va > vb) return desc ? -1 : 1;
  return 0;
}

function applyFilters(items, filter) {
  if (!filter || Object.keys(filter).length === 0) return items;

  const {
    depot_id,
    depot_id_list,
    effective_date_from,
    effective_date_till,
    status,
    svc_prov_id,
    svc_provider_id,
    consistency_list,
    bus_num,
    trial_group,
    service_group,
    parameter_group,
  } = filter;

  const effDateFrom = effective_date_from
    ? new Date(effective_date_from)
    : null;
  const effDateTill = effective_date_till
    ? new Date(effective_date_till)
    : null;

  return items.filter(item => {
    const matchDepot = matchesArrayFilter(depot_id, item.depot_id);
    const matchDepot2 = matchesArrayFilter(depot_id_list, item.depot_id);

    let effDateMatch = true;
    if (effDateFrom && effDateTill && item.effective_date_time) {
      const effDate = new Date(item.effective_date_time);
      effDateMatch = effDate >= effDateFrom && effDate <= effDateTill;
    }

    const matchStatus = matchesArrayFilter(status, item.status_code);

    const hasSvcProvFilter = svc_prov_id || svc_provider_id;
    const matchSvcProv =
      !hasSvcProvFilter ||
      (svc_prov_id && [16].includes(item.svc_prov_id)) ||
      (svc_provider_id && [16].includes(item.svc_provider_id));

    const matchBusNum = matchesBusNumFilter(bus_num, item.bus_num);
    const matchTrialGroup = matchesGroupFlag(trial_group, item.trial_group);
    const matchServiceGroup = matchesGroupFlag(service_group, item.service_group);
    const matchParameterGroup = matchesGroupFlag(
      parameter_group,
      item.parameter_group
    );
    const matchConsistency =
      !consistency_list?.length || consistency_list.includes(item.consistency);

    return (
      matchDepot &&
      matchDepot2 &&
      effDateMatch &&
      matchStatus &&
      matchSvcProv &&
      matchBusNum &&
      matchTrialGroup &&
      matchServiceGroup &&
      matchParameterGroup &&
      matchConsistency
    );
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name]?.value || a[name];
    let vb = b[name]?.value || b[name];

    if (['effective_date_live', 'effective_date'].includes(name)) {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }

    if (!(Number.isNaN(Number(va)) || Number.isNaN(Number(vb)))) {
      va = Number(va);
      vb = Number(vb);
    }
    return compareSortValues(va, vb, desc);
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

router.get('/parameter/scheduler/trialRateSeconds', async (req, res) => {
  try {
    const data = await readData(trialRateSecondsPath);
    const result = {
      status: 200,
      status_code: '200 OK',
      timestamp: Date.now(),
      payload: { ...data },
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /all error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST get items
router.post('/parameter/trial-device/search', async (req, res) => {
  try {
    const db = await readData(trialDeviceSelectionPath);
    let data = [...db];

    const params = req.body;
    const {
      page_size = 10,
      page_index = 0,
      sort_order = [],
      search_text = '',
      search_select_filter = {},
    } = params;

    console.log('📥 Trial Device Search Request:', {
      totalItems: data.length,
      search_text,
      search_select_filter,
    });

    // 🔍 1. Search
    data = applySearch(data, search_text);
    console.log('🔍 After search:', data.length);

    // 🎛️ 2. Filters
    data = applyFilters(data, search_select_filter);
    console.log('🎛️ After filters:', data.length);
    const total = data.length;

    // ↕️ 3. Sort
    data = applySort(data, sort_order);
    // // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const result = {
      status: 201,
      status_code: 'INFO 4359',
      timestamp: Date.now(),
      message: 'List Trial Devices',
      payload: {
        trial_device_summary_list: data,
        records_count: total,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/parameter/trial/search', async (req, res) => {
  try {
    const db = await readData(newParameterApprovePath);
    // const items = [...db]
    let data = [...db];

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
    // // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const filterStatus = search_select_filter.status;
    const payload = { records_count: total };

    if (filterStatus.includes(2)) {
      payload.new_parameter_approval_list = data;
    } else if (filterStatus.includes(4)) {
      payload.parameter_mode_list = data;
    } else if (filterStatus.includes(7)) {
      payload.end_trial_list = data;
    }

    const result = {
      status: 200,
      status_code: 'INFO 4349',
      timestamp: Date.now(),
      payload,
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/parameter/trial-history/search', async (req, res) => {
  try {
    const db = await readData(newParameterApprovePath);
    // const items = [...db]
    let data = [...db];

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
    // // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const filterStatus = search_select_filter.status;
    const payload = { records_count: total };

    if (filterStatus.includes(2)) {
      payload.new_parameter_approval_list = data;
    } else if (filterStatus.includes(4)) {
      payload.parameter_mode_list = data;
    } else if (
      filterStatus.includes(7) ||
      filterStatus.includes(8) ||
      filterStatus.includes(11)
    ) {
      payload.end_trial_list = data;
    }

    const result = {
      status: 200,
      status_code: 'INFO 4349',
      timestamp: Date.now(),
      payload,
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/parameter-trial/search-live', async (req, res) => {
  try {
    const db = await readData(parameterVersionSummaryLivePath);
    // const items = [...db]
    let data = [...db];

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
    // // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 4600',
      timestamp: Date.now(),
      message:
        'Parameter version summary - live parameters with pagination details',
      payload: { records_count: total, parameter_version_summary: data },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/parameter-trial/search-trial', async (req, res) => {
  try {
    const db = await readData(parameterVersionSummaryTrialPath);
    // const items = [...db]
    let data = [...db];

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
    // // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 4601',
      timestamp: Date.now(),
      message:
        'Parameter version summary - trial parameters with pagination details',
      payload: { records_count: total, parameter_version_summary: data },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/dagw-param-version-summary/search', async (req, res) => {
  try {
    const db = await readData(dagwParameterVersionSummaryTrialPath);
    // const items = [...db]
    let data = [...db];

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
    // // 📄 4. Pagination
    data = applyPagination(data, Number.parseInt(page_index), Number.parseInt(page_size));

    const result = {
      status: 200,
      status_code: 'INFO 4500',
      timestamp: Date.now(),
      message: 'DAGW parameter summary with pagination details',
      payload: { records_count: total, dagw_parameter_summary: data },
    };

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

//dashboard task list
router.get('/parameter/trial/status-count', async (req, res) => {
  try {
    const result = {
      status: 200,
      status_code: 'INFO 4346',
      timestamp: Date.now(),
      message: 'Parameter Trial Statuses',
      payload: {
        new_parameter_approval_count: 3,
        parameter_mode_count: 5,
        parameter_end_trial_count: 7,
      },
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /parameter/trial/status-count error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
