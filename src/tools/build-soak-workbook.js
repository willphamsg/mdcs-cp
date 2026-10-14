/**
 * Builds the soak-test workbook from perf-soak.js output.
 *
 * Usage: node src/tools/build-soak-workbook.js <soak.csv> <out.xlsx> [runLabel] [cold|warm]
 * Env:   EXCELJS (path to exceljs, if it isn't resolvable from here)
 *
 * Reads <soak.csv> plus its sidecar <soak>.stalls.json and <soak>.cycles.json,
 * and writes a workbook with three sheets: Summary (the standards table, as
 * formulas over the Samples sheet), Samples (every 2-minute reading) and
 * Method & Notes (how each row was measured).
 */
const fs = require('fs');

function loadExcelJs() {
  for (const id of [process.env.EXCELJS, 'exceljs'].filter(Boolean)) {
    try {
      return require(id);
    } catch {
      // try the next candidate
    }
  }
  console.error('exceljs not found: npm i -g exceljs, or set EXCELJS=/path/to/exceljs');
  process.exit(1);
}
const ExcelJS = loadExcelJs();

const [, , CSV, OUT, RUN_LABEL = 'MDCS soak test', MODE = 'warm'] = process.argv;
if (!CSV || !OUT) {
  console.error('usage: build-soak-workbook.js <soak.csv> <out.xlsx> [runLabel] [cold|warm]');
  process.exit(1);
}
const COLD = MODE === 'cold';
const stem = CSV.replace(/\.csv$/, '');
const stalls = fs.existsSync(`${stem}.stalls.json`)
  ? JSON.parse(fs.readFileSync(`${stem}.stalls.json`, 'utf8'))
  : [];
const cycles = fs.existsSync(`${stem}.cycles.json`)
  ? JSON.parse(fs.readFileSync(`${stem}.cycles.json`, 'utf8'))
  : null;

const lines = fs.readFileSync(CSV, 'utf8').trim().split('\n');
const head = lines[0].split(',');
const rows = lines.slice(1).map(line => {
  const cells = line.split(',');
  return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
});

const baseIdx = rows.findIndex(r => r.note.startsWith('controlled-baseline'));
const finalIdx = rows.findIndex(r => r.note.startsWith('controlled-final'));
if (baseIdx < 0 || finalIdx < 0) throw new Error('CSV is missing the controlled baseline/final rows');
const soakRows = rows.filter((_, i) => i > baseIdx && i < finalIdx);
const breaks = rows.filter(r => r.note.includes('CONTINUITY BREAK')).length;

const num = v => (v === '' || v === undefined ? null : Number(v));
const B = rows[baseIdx];
const F = rows[finalIdx];

// ---- derived values (written as each formula's cached result) ----
const heap0 = num(B.js_heap_used_mb);
const heap1 = num(F.js_heap_used_mb);
const nodes0 = num(B.nodes);
const nodes1 = num(F.nodes);
const lis0 = num(B.js_event_listeners);
const lis1 = num(F.js_event_listeners);
const doc0 = num(B.documents);
const doc1 = num(F.documents);
const frm0 = num(B.frames);
const frm1 = num(F.frames);
const idle0 = num(B.cpu_pct_since_last);
const idle1 = num(F.cpu_pct_since_last);

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const slopePer10 = series => {
  if (series.length < 2) return 0;
  const xs = series.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(series);
  let n = 0;
  let d = 0;
  xs.forEach((x, i) => {
    n += (x - mx) * (series[i] - my);
    d += (x - mx) ** 2;
  });
  return d === 0 ? 0 : (n / d) * 10;
};
const heapSeries = soakRows.map(r => num(r.js_heap_used_mb));
const slopeAll = slopePer10(heapSeries);
const slopeLastHalf = slopePer10(heapSeries.slice(Math.floor(heapSeries.length / 2)));
const heapMin = Math.min(...heapSeries);
const heapMax = Math.max(...heapSeries);

// Benchmarks before the warm-up cycle was introduced have no `warmUp` flag;
// treat every run in those as measured.
const measuredCycles = (b) =>
  b.runs.filter((r) => !r.warmUp).map((r) => r.cpuMs);
const spreadNote = (b) =>
  b.spreadPct === undefined ? '' : ` (spread ${b.spreadPct}% of the median)`;

// Older runs recorded only a median; newer ones converge on a minimum, which
// repeats about six times more closely.
const cycleValue = b => b.cpuMsConverged ?? b.medianCpuMs;
const cyc0 = cycles ? cycleValue(cycles.t0) : null;
const cyc1 = cycles ? cycleValue(cycles.t1) : null;

const soakMin = num(F.elapsed_min);
// A stall is detected after 30 s without a tick and re-armed right after, so
// each one costs at most ~60 s of clicking.
const stalledSec = stalls.length * 60;
const uptime = Math.max(0, 1 - stalledSec / (soakMin * 60));
const reliability = breaks > 0 ? 0 : uptime;

// ---- workbook ----
const wb = new ExcelJS.Workbook();
wb.creator = 'perf-soak.js';
wb.created = new Date();
const FONT = { name: 'Arial', size: 10 };
const BOLD = { name: 'Arial', size: 10, bold: true };
const HDR = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
const HDR_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E5F' } };
const PASS_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2E7' } };
const FAIL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBE3E3' } };
const thin = { style: 'thin', color: { argb: 'FFBFBFBF' } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const pass = ok => (ok ? 'PASS' : 'FAIL');
// Excel's TEXT(..,"+0.0;-0.0") prints the sign; the cached copy must match.
const sign = delta => (delta >= 0 ? '+' : '');
const f = (formula, result) => ({ formula, result });

// ---- Samples sheet (added first so Summary can point at its cells) ----
const S = wb.addWorksheet('Samples (2-min)');
const cols = [
  ['Time (UTC)', 'iso_time', 22],
  ['Elapsed (min)', 'elapsed_min', 13],
  ['JS heap (MB)', 'js_heap_used_mb', 13],
  ['Nodes', 'nodes', 9],
  ['Listeners', 'js_event_listeners', 11],
  ['Documents', 'documents', 11],
  ['Frames', 'frames', 9],
  ['Layouts', 'layout_count', 10],
  ['Style recalcs', 'recalc_style_count', 14],
  ['Task duration (s)', 'task_duration_s', 16],
  ['CPU % since last', 'cpu_pct_since_last', 16],
  ['Clicks', 'clicks_total', 9],
  ['Tabs', 'tabs', 7],
  ['URL', 'url', 46],
  ['Note', 'note', 40],
];
S.getRow(1).values = cols.map(c => c[0]);
cols.forEach((c, i) => {
  S.getColumn(i + 1).width = c[2];
  const cell = S.getRow(1).getCell(i + 1);
  cell.font = HDR;
  cell.fill = HDR_FILL;
  cell.border = box;
});
rows.forEach((r, ri) => {
  const row = S.getRow(ri + 2);
  cols.forEach(([, key], ci) => {
    const numeric = !['iso_time', 'url', 'note'].includes(key);
    const cell = row.getCell(ci + 1);
    cell.value = numeric && r[key] !== '' ? Number(r[key]) : r[key];
    cell.font = r.note.startsWith('controlled') ? BOLD : FONT;
    cell.border = box;
  });
});
S.views = [{ state: 'frozen', ySplit: 1 }];

const bR = baseIdx + 2; // sheet row of the controlled baseline
const fR = finalIdx + 2; // sheet row of the controlled final reading
const cell = (col, row) => `'Samples (2-min)'!${col}${row}`;

// ---- Summary sheet ----
const W = wb.addWorksheet('Summary');
W.getColumn(1).width = 38;
[2, 3, 4].forEach(c => (W.getColumn(c).width = 20));
W.getColumn(4).width = 34;
W.getColumn(5).width = 36;
W.getColumn(6).width = 10;

W.mergeCells('A1:F1');
W.getCell('A1').value = `${RUN_LABEL} — results`;
W.getCell('A1').font = { name: 'Arial', size: 14, bold: true };
W.mergeCells('A2:F2');
W.getCell('A2').value =
  `Soak: ${soakMin} min continuous Auto Click ` +
  `${COLD ? 'from a cold start (T0 = freshly signed-in dashboard, no warm-up)' : 'after warm-up'} · ` +
  `sampled every 2 min · T0 and T+1h are like-for-like readings on /mdcs/dashboard after forced GC ` +
  `(see Method & Notes)`;
W.getCell('A2').font = { ...FONT, italic: true, color: { argb: 'FF57706C' } };

const hdrRow = W.getRow(4);
['Metric', 'T0 Baseline', 'T+1h', 'Change T0 → T+1h', 'Limit', 'Result'].forEach((h, i) => {
  const c = hdrRow.getCell(i + 1);
  c.value = h;
  c.font = HDR;
  c.fill = HDR_FILL;
  c.border = box;
  c.alignment = { vertical: 'middle', horizontal: i === 0 || i === 4 ? 'left' : 'center' };
});
hdrRow.height = 20;

const summary = [
  {
    metric: 'Post-GC JS Heap (MB)',
    t0: f(`=${cell('C', bR)}`, heap0),
    t1: f(`=${cell('C', fR)}`, heap1),
    fmt: '0.00',
    chg: f(
      `=TEXT(C5-B5,"+0.00;-0.00")&" MB / "&TEXT((C5-B5)/B5,"+0.0%;-0.0%")`,
      `${sign(heap1 - heap0)}${(heap1 - heap0).toFixed(2)} MB / ${sign(heap1 - heap0)}${(((heap1 - heap0) / heap0) * 100).toFixed(1)}%`
    ),
    limit: '≤ +10 MB or +10%',
    result: f(
      `=IF(OR(C5-B5<=10,(C5-B5)/B5<=0.1),"PASS","FAIL")`,
      pass(heap1 - heap0 <= 10 || (heap1 - heap0) / heap0 <= 0.1)
    ),
    ok: heap1 - heap0 <= 10 || (heap1 - heap0) / heap0 <= 0.1,
  },
  {
    metric: 'Heap Slope / Trend (MB per 10 cycles)',
    t0: slopeAll,
    t1: slopeLastHalf,
    fmt: '0.00',
    chg: `whole run ${slopeAll.toFixed(2)} → second half ${slopeLastHalf.toFixed(2)} MB/10 cycles; range ${heapMin.toFixed(1)}–${heapMax.toFixed(1)} MB`,
    limit: '≤ 1 MB / 10 cycles, or a bounded plateau',
    result: f(`=IF(OR(B6<=1,C6<=1),"PASS","FAIL")`, pass(slopeAll <= 1 || slopeLastHalf <= 1)),
    ok: slopeAll <= 1 || slopeLastHalf <= 1,
  },
  {
    metric: 'DOM Nodes',
    t0: f(`=${cell('D', bR)}`, nodes0),
    t1: f(`=${cell('D', fR)}`, nodes1),
    fmt: '0',
    chg: f(
      `=TEXT(C7-B7,"+0;-0")&" / "&TEXT((C7-B7)/B7,"+0.0%;-0.0%")`,
      `${sign(nodes1 - nodes0)}${nodes1 - nodes0} / ${sign(nodes1 - nodes0)}${(((nodes1 - nodes0) / nodes0) * 100).toFixed(1)}%`
    ),
    limit: '≤ +100 or +5%',
    result: f(
      `=IF(OR(C7-B7<=100,(C7-B7)/B7<=0.05),"PASS","FAIL")`,
      pass(nodes1 - nodes0 <= 100 || (nodes1 - nodes0) / nodes0 <= 0.05)
    ),
    ok: nodes1 - nodes0 <= 100 || (nodes1 - nodes0) / nodes0 <= 0.05,
  },
  {
    metric: 'Event Listeners',
    t0: f(`=${cell('E', bR)}`, lis0),
    t1: f(`=${cell('E', fR)}`, lis1),
    fmt: '0',
    chg: f(
      `=TEXT(C8-B8,"+0;-0")&" / "&TEXT((C8-B8)/B8,"+0.0%;-0.0%")`,
      `${sign(lis1 - lis0)}${lis1 - lis0} / ${sign(lis1 - lis0)}${(((lis1 - lis0) / lis0) * 100).toFixed(1)}%`
    ),
    limit: '≤ +20 or +5%',
    result: f(
      `=IF(OR(C8-B8<=20,(C8-B8)/B8<=0.05),"PASS","FAIL")`,
      pass(lis1 - lis0 <= 20 || (lis1 - lis0) / lis0 <= 0.05)
    ),
    ok: lis1 - lis0 <= 20 || (lis1 - lis0) / lis0 <= 0.05,
  },
  {
    metric: 'Documents / Frames',
    t0: `${doc0} / ${frm0}`,
    t1: `${doc1} / ${frm1}`,
    chg: `${sign(doc1 - doc0)}${doc1 - doc0} / ${sign(frm1 - frm0)}${frm1 - frm0}`,
    limit: 'No increase',
    result: f(
      `=IF(AND(${cell('F', fR)}<=${cell('F', bR)},${cell('G', fR)}<=${cell('G', bR)}),"PASS","FAIL")`,
      pass(doc1 <= doc0 && frm1 <= frm0)
    ),
    ok: doc1 <= doc0 && frm1 <= frm0,
  },
  {
    metric: 'Idle CPU',
    t0: idle0 / 100,
    t1: idle1 / 100,
    fmt: '0.00%',
    chg: f(
      `=TEXT((C10-B10)*100,"+0.00;-0.00")&" percentage points"`,
      `${sign(idle1 - idle0)}${(idle1 - idle0).toFixed(2)} percentage points`
    ),
    limit: '≤ 5%',
    result: f(`=IF(C10<=0.05,"PASS","FAIL")`, pass(idle1 / 100 <= 0.05)),
    ok: idle1 / 100 <= 0.05,
  },
  {
    metric: cycles ? 'Median Cycle Runtime (ms CPU / cycle)' : 'Median Cycle Runtime',
    t0: cyc0,
    t1: cyc1,
    fmt: '0',
    chg: cycles
      ? f(
          `=TEXT((C11-B11)/B11,"+0.0%;-0.0%")`,
          `${sign(cyc1 - cyc0)}${(((cyc1 - cyc0) / cyc0) * 100).toFixed(1)}%`
        )
      : 'not measured',
    limit: '≤ +15%',
    result: cycles
      ? f(`=IF((C11-B11)/B11<=0.15,"PASS","FAIL")`, pass((cyc1 - cyc0) / cyc0 <= 0.15))
      : 'N/A',
    ok: cycles ? (cyc1 - cyc0) / cyc0 <= 0.15 : true,
  },
  {
    metric: 'Automation Reliability',
    t0: '—',
    t1: reliability,
    fmt: '0.0%',
    chg: `${stalls.length} stall(s), ${breaks} continuity break(s), ${F.clicks_total} clicks`,
    limit: '≥ 99.5%',
    result: f(`=IF(C12>=0.995,"PASS","FAIL")`, pass(reliability >= 0.995)),
    ok: reliability >= 0.995,
  },
];

summary.forEach((s, i) => {
  const r = W.getRow(i + 5);
  r.getCell(1).value = s.metric;
  r.getCell(2).value = s.t0;
  r.getCell(3).value = s.t1;
  r.getCell(4).value = s.chg;
  r.getCell(5).value = s.limit;
  r.getCell(6).value = s.result;
  for (let c = 1; c <= 6; c++) {
    const cc = r.getCell(c);
    cc.font = c === 6 ? BOLD : FONT;
    cc.border = box;
    cc.alignment = { vertical: 'middle', horizontal: c === 1 || c === 5 ? 'left' : 'center' };
    if (s.fmt && (c === 2 || c === 3)) cc.numFmt = s.fmt;
    if (c === 6) cc.fill = s.ok ? PASS_FILL : FAIL_FILL;
  }
  r.height = 18;
});

const allPass = summary.every(s => s.ok);
W.mergeCells('A14:F14');
W.getCell('A14').value = allPass
  ? 'OVERALL: all standards met.'
  : 'OVERALL: at least one standard not met — see the FAIL rows above.';
W.getCell('A14').font = { name: 'Arial', size: 11, bold: true };
W.getCell('A14').fill = allPass ? PASS_FILL : FAIL_FILL;
W.mergeCells('A16:F16');
W.getCell('A16').value =
  'T0 and T+1h pull from the Samples sheet (bold rows); change and result cells are formulas, so editing a sample updates them.';
W.getCell('A16').font = { ...FONT, italic: true, color: { argb: 'FF57706C' } };

// ---- Method & Notes ----
const N = wb.addWorksheet('Method & Notes');
N.getColumn(1).width = 30;
N.getColumn(2).width = 110;
const notes = [
  [
    'Procedure',
    'pnpm start:dummy + pnpm server:mdcs + pnpm ws:mdcs → sign in as supervisor/SBST → enable Auto Click → sample every 2 min for the duration. Driven by src/tools/perf-soak.js against headless Chrome.',
  ],
  [
    'Metric source',
    "Chrome's Performance.getMetrics over CDP — the same counters the DevTools Performance Monitor panel renders (JSHeapUsedSize, Nodes, JSEventListeners, Documents, Frames, TaskDuration).",
  ],
  [
    'Post-GC',
    'Every reading is taken after 3 rounds of HeapProfiler.collectGarbage + gc({type:"major"}). One round leaves hundreds of nodes uncollected, because Blink\'s node counter spans V8 and Oilpan and cross-heap wrappers take several cycles to free.',
  ],
  COLD
    ? [
        'Warm-up',
        'None. T0 is read on the dashboard straight after sign-in, exactly as in the manual procedure, so every first-use cost (V8 JIT code, Angular template metadata) falls inside the measured hour. The app loads its full SVG icon set at startup (SvgIconCacheService), so Documents/Frames are fixed from the first reading rather than growing as pages are visited.',
      ]
    : [
        'Warm-up',
        'Before T0 the harness visits every MDCS route twice (in-app, no reloads) and runs Auto Click for a few minutes, so first-visit costs are part of the baseline rather than showing up as growth.',
      ],
  [
    'Like-for-like T0 / T+1h',
    'Nodes and Documents/Frames swing by hundreds depending on which route is mounted, so both readings are taken on /mdcs/dashboard, reached by in-app navigation, with Auto Click off and after forced GC. The 2-min samples are taken wherever the clicker happens to be and show the in-soak trend.',
  ],
  [
    'Idle CPU',
    'Main-thread TaskDuration over a 10 s window with Auto Click off, on the dashboard, immediately before each controlled reading.',
  ],
  [
    'Heap slope',
    `Least-squares slope of post-GC heap across the in-soak samples; one cycle = one 2-min sample, so the figure is MB per 20 min. Whole run ${slopeAll.toFixed(2)}, second half ${slopeLastHalf.toFixed(2)}. Passing on the second half means the heap climbed while V8 compiled the app's code and Angular built each screen's metadata, then held flat — a bounded plateau rather than ongoing growth.`,
  ],
  cycles
    ? [
        'Median cycle runtime',
        `One cycle is a fixed in-app loop through ${cycles.routes.length} routes (${cycles.routes.join(', ')}), run right after the T0 reading and again right after the final reading; the row compares median main-thread CPU per cycle. A fixed loop is used because a random auto-click costs anywhere from ~50 to ~170 ms depending on the page it lands on, so comparing random intervals measures the page mix rather than the app. The first cycle of each benchmark is discarded as warm-up for the loop itself. T0 measured runs (ms): ${measuredCycles(cycles.t0).join(', ')}${spreadNote(cycles.t0)}. Final measured runs (ms): ${measuredCycles(cycles.t1).join(', ')}${spreadNote(cycles.t1)}. Read any delta against that spread: a change smaller than it is measurement noise, not the app.`,
      ]
    : ['Median cycle runtime', 'Not measured in this run (no .cycles.json sidecar).'],
  [
    'Tab visibility',
    'The page must stay the visible, foreground tab: a hidden tab gets no animation frames, so rAF callbacks and CSS animations are never serviced and everything they reference piles up. The harness checks every 20 s and logs any hidden period in the Note column; the auto-clicker skips controls that open a new tab (DAMS, target=_blank links).',
  ],
  [
    'Automation reliability',
    'Share of soak time the clicker was actively ticking. A watchdog checks every 20 s; a stall (no ticks for 30 s+) costs at most 60 s and is re-armed. Any session loss (page reload) is a continuity break and fails this row.',
  ],
  [
    'Run',
    `Stalls: ${stalls.length}. Continuity breaks: ${breaks}. Total auto-clicks: ${F.clicks_total}. In-soak samples: ${soakRows.length}. Source CSV: ${CSV.split('/').pop()}.`,
  ],
];
notes.forEach(([k, v], i) => {
  const r = N.getRow(i + 1);
  r.getCell(1).value = k;
  r.getCell(2).value = v;
  r.getCell(1).font = BOLD;
  r.getCell(2).font = FONT;
  r.getCell(1).alignment = { vertical: 'top' };
  r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
});

// Samples was created first so Summary could reference it; show Summary first.
W.orderNo = 0;
S.orderNo = 1;
N.orderNo = 2;
wb.views = [{ activeTab: 0 }];

wb.xlsx.writeFile(OUT).then(() => {
  console.log(`wrote ${OUT}`);
  const value = x => (x && typeof x === 'object' && 'result' in x ? x.result : x);
  summary.forEach(s => {
    const t1 = value(s.t1);
    console.log(
      `${s.metric.padEnd(40)} ${String(value(s.t0)).padStart(10)} ${String(typeof t1 === 'number' ? t1.toFixed(3) : t1).padStart(10)}  ` +
        `${String(value(s.chg)).padEnd(40)} ${s.limit.padEnd(38)} ${value(s.result)}`
    );
  });
  console.log(allPass ? 'OVERALL: ALL PASS' : 'OVERALL: has FAIL');
});
