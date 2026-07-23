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

    return generalMatch;
  });
}

function applyFilters(items, filter) {
  if (!filter) return items;

  const { param_type: type, depot_id } = filter;
  console.log('Applying type filter');

  return items.filter(item => {
    const matchDepot =
      !depot_id?.length || depot_id.includes(item.param_depot_id);

    const matchType =
      !type?.length ||
      type.map(_t => _t.toUpperCase()).includes(item.param_type);

    return matchDepot && matchType;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name]?.value || a[name];
    let vb = b[name]?.value || b[name];

    console.log('Sorting by:', name, 'Values:', va, vb);

    if (['effective_date_live', 'effective_date'].includes(name)) {
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
router.post('/import/search', async (req, res) => {
  try {
    const db = await readDoc('parameter-import-export');
    const items = db['parameter_file_data'];
    let data = [...items];
    const params = req.body;

    const { itemCount } = params;
    // console.log('Received upload request with', itemCount, 'itemCount');

    data.length = itemCount || data.length;

    const result = {
      status: 200,
      status_code: 'INFO 3020',
      timestamp: Date.now(),
      message: 'Parameter import status with pagination details',
      payload: {
        parameter_file_data: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        records_count: 0,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/import/upload/zip', async (req, res) => {
  try {
    const db = await readDoc('parameter-import-export');
    const items = db['parameter_file_data'];
    let data = [...items];
    const params = req.body;

    const { itemCount } = params;
    // console.log('Received upload request with', itemCount, 'itemCount');

    data.length = itemCount || data.length;

    const result = {
      status: 201,
      status_code: 'INFO 7501',
      timestamp: Date.now(),
      message: 'Added new records into the parameter import status',
      payload: {
        param_import_files: [
          {
            status: 'NEW',
            id: 1150,
            grp_identifier_id: '61dd9d1e5c62cd16',
            identifier_id: '6bda03d2857832dc',
            file_id: '0x8950',
            depot_id: 18500,
            service_provider_id: 16,
            param_filename: 'Group.png',
            param_version: 18189,
            effective_date_time: '1970-01-01T08:26:41',
            description: null,
          },
          {
            status: 'NEW',
            id: 1151,
            grp_identifier_id: '61dd9d1e5c62cd16',
            identifier_id: '6ee77226c6f77423',
            file_id: '0x8950',
            depot_id: 18500,
            service_provider_id: 16,
            param_filename: 'Layer_1.png',
            param_version: 18189,
            effective_date_time: '1970-01-01T08:26:41',
            description: null,
          },
          {
            status: 'NEW',
            id: 1152,
            grp_identifier_id: '61dd9d1e5c62cd16',
            identifier_id: '659d5a95189a4231',
            file_id: '0x8950',
            depot_id: 18500,
            service_provider_id: 16,
            param_filename: 'Group 26088025.png',
            param_version: 18189,
            effective_date_time: '1970-01-01T08:26:41',
            description: null,
          },
        ],
        records_count: 3,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST create items
router.post('/export/search', async (req, res) => {
  try {
    const db = await readDoc('parameter-import-export');
    const items = db['parameter_file_export_data'];
    let data = [...items];

    const params = req.body;
    const {
      page_size = 10,
      page_index = 0,
      sort_order = [],
      search_text = '',
      search_select_filter = {},
    } = params;

    data = data.filter(item => !item.status);

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
      status_code: 'INFO 7600',
      timestamp: Date.now(),
      message: 'Fetch export file successful',
      payload: {
        param_file_export_entity_pgn: data,
        records_count: total,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/export/search-export-status', async (req, res) => {
  try {
    let processCount = req.app.locals.PARAMETER_FILE_EXPORT_COUNT || 0;
    const params = req.body;
    const { param_file_export_data } = params;

    let data = param_file_export_data.map(item => ({
      ...item,
      id: item.id || null,
      status: processCount === 10 ? 'Cancelled' : 'PENDING',
      description: null,
      grp_identifier_id: '4848678629',
      identifier_id: '4848678629',
    }));

    if (processCount === 10) {
      req.app.locals.PARAMETER_FILE_EXPORT_COUNT = 0;
    } else req.app.locals.PARAMETER_FILE_EXPORT_COUNT = processCount + 1;

    const result = {
      status: 200,
      status_code: 'INFO 7600',
      timestamp: Date.now(),
      message: 'Fetch export file successful',
      payload: {
        param_file_export_entity_pgn: data,
        records_count: param_file_export_data.length,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/export/send-file-request', async (req, res) => {
  try {
    const params = req.body;
    const { param_file_export_data } = params;

    const result = {
      status: 200,
      status_code: 'INFO 7602',
      timestamp: Date.now(),
      message: 'Parameter export status with group identifier details',
      payload: {
        param_export_files: param_file_export_data,
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update items
router.put('/update', async (req, res) => {
  let items = await readDoc('parameter-import-export');
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
  await replaceDoc('parameter-import-export', merged);

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
    let items = await readDoc('parameter-import-export');
    const deleteItems = req.body;

    if (!Array.isArray(deleteItems)) {
      return res.status(400).json({ message: 'The params must be an array' });
    }
    const ids = new Set(deleteItems.map(x => x.id));
    // Delete items
    const filtered = items.filter(item => !ids.has(item.id));

    await replaceDoc('parameter-import-export', filtered);
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
