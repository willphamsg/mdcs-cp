const express = require('express');
const {
  readCollection,
  readDoc,
  replaceCollection,
  replaceDoc,
} = require('../utils/data-store');

const router = express.Router();

// Collection names (base name of the original JSON data files).
const NEW_PARAMETER_APPROVE = 'new-parameter-approve';
const NEW_PARAMETER_APPROVE_HISTORY = 'new-parameter-approve-history';
const NEW_PARAMETER_APPROVE_TEMP = 'new-parameter-approve-temp';
const TRIAL_DEVICE_SELECTION = 'trial-device-selection';
const PARAMETER_VERSION_SUMMARY_LIVE = 'parameter-version-summary-live';
const PARAMETER_VERSION_SUMMARY_TRIAL = 'parameter-version-summary-trial';
const DAGW_PARAM_VERSION_SUMMARY = 'dagw-param-version-summary';
const TRIAL_RATE_SECONDS = 'trialRateSeconds';
const DEPOT_LIST = 'depot-list';

// Read an array-backed collection. Preserves the original `readData()` behavior:
// when called with no collection name it returned [] (the old file read threw).
async function readData(collectionName) {
  if (!collectionName) return [];
  return readCollection(collectionName);
}

// Read the object-backed trialRateSeconds document.
async function readTrialRateSeconds() {
  return readDoc(TRIAL_RATE_SECONDS);
}

// Save an array-backed collection (default: trial-device-selection).
async function saveData(data, collectionName = TRIAL_DEVICE_SELECTION) {
  await replaceCollection(collectionName, data);
}

// Read the depot list array-backed collection.
async function readDepotListData() {
  return readCollection(DEPOT_LIST);
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
    last_updated_end,
    last_updated_start
  } = filter;

  const effDateFrom = effective_date_from
    ? new Date(effective_date_from)
    : null;
  const effDateTill = effective_date_till
    ? new Date(effective_date_till)
    : null;
  const lastUpdatedStart = last_updated_start
    ? new Date(last_updated_start)
    : null;
  const lastUpdatedEnd = last_updated_end
    ? new Date(last_updated_end)
    : null;

  return items.filter(item => {
    const hasDepotFilter =
      depot_id && Array.isArray(depot_id) && depot_id.length > 0;
    const matchDepot = !hasDepotFilter || depot_id.includes(item.depot_id);

    const hasDepotListFilter =
      depot_id_list && Array.isArray(depot_id_list) && depot_id_list.length > 0;
    const matchDepot2 =
      !hasDepotListFilter || depot_id_list.includes(item.depot_id);

    let effDateMatch = true;
    if (effDateFrom && effDateTill && item.effective_date_time) {
      const effDate = new Date(item.effective_date_time);
      effDateMatch = effDate >= effDateFrom && effDate <= effDateTill;
    }

    let lastUpdatedMatch = true;
    if ((lastUpdatedStart || lastUpdatedEnd) && item.last_update) {
      const lastUpdate = new Date(item.last_update);
      const afterStart = !lastUpdatedStart || lastUpdate >= lastUpdatedStart;
      const beforeEnd = !lastUpdatedEnd || lastUpdate <= lastUpdatedEnd;
      lastUpdatedMatch = afterStart && beforeEnd;
    }

    const hasStatusFilter =
      status && Array.isArray(status) && status.length > 0;
    const matchStatus = !hasStatusFilter || status.includes(item.status_code);

    const hasSvcProvFilter = svc_prov_id || svc_provider_id;
    const matchSvcProv =
      !hasSvcProvFilter ||
      (svc_prov_id && [16].includes(item.svc_prov_id)) ||
      (svc_provider_id && [16].includes(item.svc_provider_id));

    const hasBusNumFilter = bus_num && bus_num !== '';
    const matchBusNum =
      !hasBusNumFilter ||
      (item.bus_num &&
        item.bus_num.toLowerCase().includes(bus_num.toLowerCase()));

    const hasTrialGroupFilter =
      trial_group &&
      trial_group !== '' &&
      trial_group !== null &&
      trial_group !== undefined;
    const matchTrialGroup =
      !hasTrialGroupFilter ||
      (trial_group === 'trial' && item.trial_group === true) ||
      (trial_group === 'non-trial' && item.trial_group === false);

    const hasServiceGroupFilter =
      service_group &&
      service_group !== '' &&
      service_group !== null &&
      service_group !== undefined;
    const matchServiceGroup =
      !hasServiceGroupFilter ||
      (service_group === 'trial' && item.service_group === true) ||
      (service_group === 'non-trial' && item.service_group === false);

    const hasParameterGroupFilter =
      parameter_group &&
      parameter_group !== '' &&
      parameter_group !== null &&
      parameter_group !== undefined;
    const matchParameterGroup =
      !hasParameterGroupFilter ||
      (parameter_group === 'trial' && item.parameter_group === true) ||
      (parameter_group === 'non-trial' && item.parameter_group === false);


    const matchConsistency =
      !consistency_list?.length || consistency_list.includes(item.consistency);

    return (
      matchDepot &&
      matchDepot2 &&
      effDateMatch &&
      lastUpdatedMatch &&
      matchStatus &&
      matchSvcProv &&
      matchBusNum &&
      matchTrialGroup &&
      matchServiceGroup &&
      matchParameterGroup && matchConsistency
    );
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) {
     sortOrder = [{ name: 'last_update', desc: true }];
  };

  const [{ name, desc }] = sortOrder;

  console.log('Sorting by:', name, 'Order:', desc ? 'DESC' : 'ASC');

  return items.sort((a, b) => {
    let va = a[name]?.value || a[name];
    let vb = b[name]?.value || b[name];

    console.log('Sorting by:', name, 'Values:', va, vb, typeof va, typeof vb);

    if (['effective_date_live', 'effective_date'].includes(name)) {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }

    if (Number.isNaN(Number(va)) || Number.isNaN(Number(vb))) {
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
    } else {
      va = Number(va);
      vb = Number(vb);
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
    }
    return 0;
  });
}

function applyPagination(items, pageIndex, pageSize) {
  const start = pageIndex * pageSize;
  return items.slice(start, start + pageSize);
}

router.get('/parameter/scheduler/trialRateSeconds', async (req, res) => {
  try {
    const data = await readTrialRateSeconds();
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
    const db = await readData(TRIAL_DEVICE_SELECTION);
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
    const db = await readData(NEW_PARAMETER_APPROVE);
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
    console.log({ data });
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
    const db = await readData(NEW_PARAMETER_APPROVE_HISTORY);
    const tempItems = await readData(NEW_PARAMETER_APPROVE_TEMP);
    // const items = [...db]
    let data = [...db];
    let processCount = req.app.locals.PARAMETER_MODE_LIVE_TRIAL_COUNT || 0;

    console.log({ data, tempItems, processCount });

    if (tempItems.length > 0) {
      tempItems.forEach(item => {
        if (!data.some(d => d.param_master_id === item.param_master_id && d.status_code === item.status_code)) {
          data.unshift({ ...item, history_id: Date.now() });
        }
      })
    }

    if (processCount === 10) {
      req.app.locals.PARAMETER_MODE_LIVE_TRIAL_COUNT = 0;
      const items = await readData(NEW_PARAMETER_APPROVE);
      tempItems.forEach(item => {
        if (!items.some(d => d.param_master_id === item.param_master_id)) {
          items.unshift({ ...item, history_id: Date.now() });
        }
      })
      await saveData(items, NEW_PARAMETER_APPROVE);
      await saveData([], NEW_PARAMETER_APPROVE_TEMP);
    } else req.app.locals.PARAMETER_MODE_LIVE_TRIAL_COUNT = processCount + 1;

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

router.post('/parameter-version-summary/search-live', async (req, res) => {
  try {
    const db = await readData(PARAMETER_VERSION_SUMMARY_LIVE);
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

router.post('/parameter-version-summary/search-trial', async (req, res) => {
  try {
    const db = await readData(PARAMETER_VERSION_SUMMARY_TRIAL);
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
    const db = await readData(DAGW_PARAM_VERSION_SUMMARY);
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

//parameter mode validate live
router.post('/parameter/trial/validate-live', async (req, res) => {
  try {
    const params = req.body;
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Parameters set live successfully', params);

    const result = {
      status: 200,
      status_code: 'INFO 4347',
      timestamp: 1774857781681,
      message: 'Approved Parameters with Remarks',
      payload: {
        validated_parameter_status: params.map(p => ({
          parameter_status: p,
          scenario_details: {
            scenario_id: 3,
            message: "You are not allowed to select BFC1APPA for Live as same type is Active. Please note that this parameter will be Rejected upon confirmation!",
            user_action_type: 'OK',
          },
        })),
      },
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /parameter/set-live error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//parameter mode validate live
router.post('/parameter/trial/validate-trial', async (req, res) => {
  try {
    const params = req.body;
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Parameters set live successfully', params);

    const result = {
      status: 200,
      status_code: 'INFO 4347',
      timestamp: 1774857781681,
      message: 'Approved Parameters with Remarks',
      payload: {
        validated_parameter_status: params.map(p => ({
          parameter_status: p,
          scenario_details: {
            scenario_id: 17,
            message: '',
            user_action_type: 'NONE',
          },
        })),
      },
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /parameter/set-trial error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//parameter mode submit live
router.post('/parameter/trial/live', async (req, res) => {
  try {
    const items = await readData(NEW_PARAMETER_APPROVE);
    const tempItems = [];
    const params = req.body;
    // Simulate processing time
    // await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Parameters end trial successfully', params);
    const deleteIds = new Set(params.map(p => p.parameter_status.param_master_id));
    const filtered = [];

    items.forEach(item => {
      if (deleteIds.has(item.param_master_id)) {
        tempItems.push({ ...item, status_code: 4, status_desc: 'APPROVE_TO_LIVE' });
      } else {
        filtered.push(item);
      }
    });

    await saveData(filtered, NEW_PARAMETER_APPROVE);
    await saveData(tempItems, NEW_PARAMETER_APPROVE_TEMP);

    // await new Promise(resolve => setTimeout(resolve, 2000));
    const result = {
      status: 201,
      status_code: 'INFO 4348',
      timestamp: 1774857781681,
      message: `Records submitted for processing (Set Live) - (${params.length}) records`,
      payload: {},
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /parameter/end-trial error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//parameter mode submit live
router.post('/parameter/trial/trial', async (req, res) => {
  try {
    const items = await readData(NEW_PARAMETER_APPROVE);
    const tempItems = [];
    const params = req.body;
    // Simulate processing time
    // await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Parameters end trial successfully', params);

    console.log('Parameters end trial successfully', params);
    const deleteIds = new Set(params.map(p => p.parameter_status.param_master_id));
    const filtered = [];

    items.forEach(item => {
      if (deleteIds.has(item.param_master_id)) {
        tempItems.push({ ...item, status_code: 4, status_desc: 'APPROVE_TO_TRIAL' });
      } else {
        filtered.push(item);
      }
    });

    await saveData(filtered, NEW_PARAMETER_APPROVE);
    await saveData(tempItems, NEW_PARAMETER_APPROVE_TEMP);

    // await new Promise(resolve => setTimeout(resolve, 2000));
    const result = {
      status: 201,
      status_code: 'INFO 4348',
      timestamp: 1774857781681,
      message: `Records submitted for processing (Set Trial) - (${params.length}) records`,
      payload: {},
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /parameter/end-trial error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
