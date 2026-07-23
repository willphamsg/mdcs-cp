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

  const { depot_id_list, update_type, user_id, date_from, date_till } = filter;

  const from = new Date(date_from);
  const till = new Date(date_till);

  return items.filter(item => {
    // ✅ Depot filter
    const depotMatch =
      !depot_id_list.length || depot_id_list.includes(item.depot_id);

    // ✅ User filter (case-insensitive, partial match)
    const userMatch =
      !user_id.length ||
      user_id.some(u => item.userId.toLowerCase().includes(u.toLowerCase()));

    // ✅ Update type filter (case-insensitive exact match)
    const updateMatch =
      !update_type.length ||
      update_type.some(
        type => item.updateType.toLowerCase() === type.toLowerCase()
      );

    // ✅ Date filter (inclusive range)
    const itemDate = new Date(item.dateTime);
    const dateMatch =
      !date_from || !date_till || (itemDate >= from && itemDate <= till);

    return depotMatch && userMatch && updateMatch && dateMatch;
  });
}

function applySort(items, sortOrder) {
  if (!Array.isArray(sortOrder) || sortOrder.length === 0) return items;

  const [{ name, desc }] = sortOrder;

  return items.sort((a, b) => {
    let va = a[name];
    let vb = b[name];

    if (name === 'dateTime') {
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
router.get('/default', async (req, res) => {
  try {
    const db = await readDoc('settings');
    const result = {
      ...db
    };

    res.json(result);
  } catch (err) {
    console.error('❌ /search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
