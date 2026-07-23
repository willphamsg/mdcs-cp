const express = require('express');
const {
  readCollection,
  readDoc,
  replaceCollection,
  replaceDoc,
} = require('../utils/data-store');

const router = express.Router();

// Read parameter-viewer doc
async function readData() {
  return readDoc('parameter-viewer');
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
  } = filter;

  const effDateFrom = effective_date_from
    ? new Date(effective_date_from)
    : null;
  const effDateTill = effective_date_till
    ? new Date(effective_date_till)
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

    const hasStatusFilter =
      status && Array.isArray(status) && status.length > 0;
    const matchStatus = !hasStatusFilter || status.includes(item.status_code);

    const hasSvcProvFilter = svc_prov_id || svc_provider_id;
    const matchSvcProv =
      !hasSvcProvFilter ||
      (svc_prov_id && svc_prov_id === item.svc_prov_id) ||
      (svc_provider_id && svc_provider_id === item.svc_provider_id);

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

    return (
      matchDepot &&
      matchDepot2 &&
      effDateMatch &&
      matchStatus &&
      matchSvcProv &&
      matchBusNum &&
      matchTrialGroup &&
      matchServiceGroup &&
      matchParameterGroup
    );
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name]?.value || a[name];
    let vb = b[name]?.value || b[name];

    console.log('Sorting by:', name, 'Values:', va, vb, typeof va, typeof vb);

    if (['effective_date_live', 'effective_date'].includes(name)) {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }

    if (isNaN(va) || isNaN(vb)) {
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

router.get('/view-device-types', async (req, res) => {
  try {
    const data = await readData();
    const result = {
      status: 200,
      status_code: 'INFO 4300',
      timestamp: Date.now(),
      message: 'View Device Types',
      payload: { tabList: data['tabList'] },
    };
    res.json(result);
  } catch (err) {
    console.error('❌ /all error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST get items
router.post('/view-group-list-by-type-Id', async (req, res) => {
  try {
    const db = await readData();
    const result = {
      status: 200,
      status_code: 'INFO 4359',
      timestamp: Date.now(),
      message: 'View Group List By Type Id',
      payload: {
        devices: db['types'],
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/view-parameter-file-by-file-id', async (req, res) => {
  try {
    const db = await readData();
    let items = db['files'];

    const params = req.body;
    const { parameter_name } = params;

    const data = items.filter(item => item.parameter_name === parameter_name);

    const result = {
      status: 200,
      status_code: 'INFO 4349',
      timestamp: Date.now(),
      payload: {
        ParameterViewObjectList: data || [],
      },
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
