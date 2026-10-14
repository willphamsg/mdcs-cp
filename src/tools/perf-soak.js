/**
 * Automated soak test for the MDCS dummy build.
 *
 * Drives a real Chrome via CDP: signs in, enables the in-app Auto Click
 * toggle, then samples Chrome's Performance Monitor counters (the same
 * Performance.getMetrics feed the DevTools panel renders) on a fixed
 * interval, forcing a GC first so every sample is a post-GC reading.
 *
 * Needs pnpm start:dummy, pnpm server:mdcs and pnpm ws:mdcs running, plus
 * puppeteer-core (not a project dependency - install it anywhere and point
 * PUPPETEER_CORE at it if it isn't resolvable from here).
 *
 * Usage: node src/tools/perf-soak.js <out.csv> [durationMin=60] [intervalSec=120] [warmupClickMin=8|none]
 *        warmupClickMin=none skips the warm-up entirely: T0 is taken straight
 *        after sign-in, the way the manual procedure does it.
 * Env:   CHROME_BIN (default /usr/bin/google-chrome), PUPPETEER_CORE,
 *        HEAP_SNAPSHOTS=1 to also save baseline/final .heapsnapshot files next to the CSV,
 *        HEAP_SNAPSHOT_EVERY_MIN=<n> to save one every n minutes during the soak too
 */
const path = require('path');
const fs = require('fs');
const { createExternalClicker } = require('./external-clicker.js');
const os = require('os');

function loadPuppeteer() {
  for (const id of [process.env.PUPPETEER_CORE, 'puppeteer-core'].filter(Boolean)) {
    try {
      return require(id);
    } catch {
      // try the next candidate
    }
  }
  console.error('puppeteer-core not found: npm i -g puppeteer-core, or set PUPPETEER_CORE=/path/to/puppeteer-core');
  process.exit(1);
}
const puppeteer = loadPuppeteer();
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/google-chrome';

const OUT = process.argv[2] || '/tmp/perf/metrics.csv';
const DURATION_MIN = Number(process.argv[3] || 60);
const INTERVAL_SEC = Number(process.argv[4] || 120);
const COLD_START = process.argv[5] === 'none';
const WARMUP_CLICK_MIN = COLD_START ? 0 : Number(process.argv[5] ?? 8);

const WARMUP_ROUTES = [
  '/mdcs/bus-operation',
  '/mdcs/card-key-version',
  '/mdcs/bus-exception-list',
  '/mdcs/bus-list',
  '/mdcs/vehicle-list',
  '/mdcs/bus-transfer',
  '/mdcs/report/daily-report/bus-arrival-exception-list',
  '/mdcs/report/daily-report/bus-list-audit-trial',
  '/mdcs/report/daily-report/bus-partial-upload-report',
  '/mdcs/report/daily-report/bus-transfer-report',
  '/mdcs/report/daily-report/daily-bus-list-report',
  '/mdcs/report/daily-report/dagw-monthly-availability-report',
  '/mdcs/report/adhoc/bus-arrival-exception-list',
  '/mdcs/report/adhoc/bus-list-audit-trial',
  '/mdcs/report/adhoc/bus-partial-upload-report',
  '/mdcs/report/adhoc/bus-transfer-report',
  '/mdcs/report/adhoc/daily-bus-list-report',
  '/mdcs/report/adhoc/dagw-monthly-availability-report',
  '/mdcs/dagw-parameter',
  '/mdcs/parameter-viewer',
  '/mdcs/export-parameter',
  '/mdcs/maintenance/diagnostics',
  '/mdcs/maintenance/eod-process',
  '/mdcs/maintenance/audit-log',
  '/mdcs/maintenance/system-information',
  '/mdcs/parameter-trial/approval',
  '/mdcs/parameter-trial/parameter-mode',
  '/mdcs/parameter-trial/trial-device-selection',
  '/mdcs/parameter-trial/parameter-version-summary',
  '/mdcs/parameter-trial/end-trial',
  '/mdcs/notification-centre',
  '/mdcs/event-history',
  '/mdcs/dashboard',
];

const BASE = 'http://localhost:8035';
const USERNAME = 'supervisor';
const PASSWORD = 'password';
const SVC_PROVIDER = 'SBST';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = msg => console.log(`[${new Date().toISOString()}] ${msg}`);

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#sign-in-username-input', { timeout: 30000 });

  await page.evaluate(
    (user, pass) => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
        desc.set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#sign-in-username-input', user);
      setVal('#sign-in-password-input', pass);
      document.querySelector('[role=combobox]').click();
    },
    USERNAME,
    PASSWORD
  );

  await page.waitForFunction(() => document.querySelectorAll('mat-option').length > 0, {
    timeout: 15000,
  });
  await page.evaluate(sp => {
    const opt = Array.from(document.querySelectorAll('mat-option')).find(o =>
      o.textContent.includes(sp)
    );
    if (opt) opt.click();
  }, SVC_PROVIDER);

  await sleep(300);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.type === 'submit');
    if (btn) btn.click();
  });

  await page.waitForFunction(() => location.pathname.startsWith('/mdcs/'), { timeout: 30000 });
  await sleep(2000);
  log(`signed in -> ${page.url()}`);
}

/**
 * The toggle is a bare (change)-handler with no [checked] binding, and a click
 * dispatched before Angular has bound it is silently swallowed - so confirm
 * the switch actually flipped and that ticks are landing before trusting it.
 */
/**
 * The clicker runs in this process, not in the page (see external-clicker.js),
 * so there is no in-app toggle to switch and nothing of the instrument's own
 * is left inside what the metrics measure. Signing in is still needed: the
 * clickable shell only exists once authenticated.
 */
async function enableAutoClick(page, clicker) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    if (!page.url().includes('/mdcs/')) {
      await signIn(page);
      await sleep(2000);
    }

    const before = clicker.count;
    clicker.start();
    await sleep(8000); // two tick intervals
    if (clicker.count > before) {
      log(`auto-click confirmed active (attempt ${attempt}, ${clicker.count} ticks seen)`);
      return true;
    }
    await clicker.stop();
    log(`auto-click not ticking yet (attempt ${attempt}), retrying`);
  }
  throw new Error('could not confirm the external clicker is running');
}

async function setAutoClick(page, on, clicker) {
  if (on) {
    clicker.start();
  } else {
    await clicker.stop();
  }
}

/** Angular's router follows popstate, so this routes without a reload. */
async function navigateInApp(page, routePath) {
  await page.evaluate(p => {
    history.pushState(null, '', p);
    dispatchEvent(new PopStateEvent('popstate', { state: null }));
  }, routePath);
  await sleep(2500);
}

/**
 * First visits are one-off costs, not leaks: each route's lazy chunk and
 * component template metadata, and every distinct SVG icon (Blink keeps each
 * as its own isolated SVG document + frame in the image cache). Measuring
 * from a cold dashboard counts all of that as "growth". Touch every route,
 * then let the auto-clicker exercise overlays, so T0 is a steady-state
 * baseline and anything that grows afterwards is a real leak. Deliberately
 * NOT the DAMS link: it opens a new tab, which hides this one.
 */
async function warmUp(page, clicker) {
  log(`warm-up: visiting ${WARMUP_ROUTES.length} routes x2`);
  for (let pass = 1; pass <= 2; pass++) {
    for (const r of WARMUP_ROUTES) await navigateInApp(page, r);
  }


  if (WARMUP_CLICK_MIN > 0) {
    log(`warm-up: auto-click for ${WARMUP_CLICK_MIN} min`);
    await enableAutoClick(page, clicker);
    await sleep(WARMUP_CLICK_MIN * 60 * 1000);
    await setAutoClick(page, false, clicker);
    await sleep(4000);
  }
  log('warm-up complete');
}

/**
 * A fixed, scripted cycle for the "median cycle runtime" row. Random clicks
 * cost wildly different amounts depending on which page they land on (a
 * table-heavy page is several times dearer than a form), so comparing random
 * intervals from the start and end of the hour measures the page mix, not the
 * app. The same route loop, timed at T0 and again at T+1h, is like-for-like.
 */
const CYCLE_ROUTES = [
  '/mdcs/bus-operation',
  '/mdcs/bus-list',
  '/mdcs/bus-transfer',
  '/mdcs/report/daily-report/daily-bus-list-report',
  '/mdcs/parameter-viewer',
  '/mdcs/maintenance/audit-log',
  '/mdcs/parameter-trial/parameter-mode',
  '/mdcs/event-history',
  '/mdcs/dashboard',
];
// A fixed number of cycles measures how warm V8 happened to be, not the work.
// Four identical benchmarks run back to back, with no soaking between them,
// disagreed by 44% (medians 565, 462, 431, 392 ms): the loop keeps getting
// cheaper for several whole passes, so a T0/final pair compares warm-up states
// as much as anything else. Instead run cycles until the cheapest one stops
// getting cheaper and report that minimum - the least-contended pass is the
// closest thing to the cost of the work. Discarding one converged pass and
// measuring on the second brought run-to-run disagreement from 44% to about
// 7%, which is what makes a +/-15% standard meaningful at all.
// Overridable so a smoke test of the rest of the harness need not pay for a
// full convergence (about ten minutes per benchmark).
const CYCLE_MAX = Number(process.env.CYCLE_MAX || 30);
const CYCLE_PATIENCE = Number(process.env.CYCLE_PATIENCE || 6);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

async function convergeCycles(page, client) {
  let best = Infinity;
  let sinceBest = 0;
  const runs = [];
  while (runs.length < CYCLE_MAX && sinceBest < CYCLE_PATIENCE) {
    const before = metricsToObject((await client.send('Performance.getMetrics')).metrics);
    const wallStart = Date.now();
    for (const r of CYCLE_ROUTES) await navigateInApp(page, r);
    const after = metricsToObject((await client.send('Performance.getMetrics')).metrics);
    const cpuMs = Math.round((after.TaskDuration - before.TaskDuration) * 1000);
    runs.push({ cpuMs, wallMs: Date.now() - wallStart });
    if (cpuMs < best) {
      best = cpuMs;
      sinceBest = 0;
    } else {
      sinceBest++;
    }
  }
  return { best, runs };
}

async function benchmarkCycles(page, client) {
  const warmUpPass = await convergeCycles(page, client);
  const measured = await convergeCycles(page, client);

  const cpu = measured.runs.map(r => r.cpuMs);
  const sorted = [...cpu].sort((a, b) => a - b);
  return {
    cpuMsConverged: measured.best,
    medianCpuMs: median(cpu),
    // Kept so a delta can be read against the precision of the instrument.
    spreadPct: Number((((sorted.at(-1) - sorted[0]) / median(cpu)) * 100).toFixed(1)),
    samples: cpu.length,
    warmUpCycles: warmUpPass.runs.length,
    warmUpBest: warmUpPass.best,
    runs: measured.runs,
  };
}

/**
 * Blink's Documents counter includes things that never show up in the frame
 * tree - every SVG rendered through <img> or CSS url() is its own isolated
 * document. So when the count climbs, list what the page is currently holding
 * that can mint one, plus the extra tabs, and let the log name the culprit
 * rather than leaving a bare number to guess at.
 */
async function documentSources(page, browser, client) {
  const dom = await page
    .evaluate(() => {
      const srcs = el => [...document.querySelectorAll(el)].map(n => n.src || n.data || '');
      const cssUrls = new Set();
      for (const el of document.querySelectorAll('*')) {
        const bg = getComputedStyle(el).backgroundImage;
        for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) cssUrls.add(m[1]);
      }
      return {
        images: [...new Set(srcs('img'))],
        frames: [...new Set([...srcs('iframe'), ...srcs('embed'), ...srcs('object')])],
        css: [...cssUrls],
      };
    })
    .catch(() => ({ images: [], frames: [], css: [] }));

  let tree = [];
  try {
    const { frameTree } = await client.send('Page.getFrameTree');
    const walk = n => [n.frame.url, ...(n.childFrames ?? []).flatMap(walk)];
    tree = walk(frameTree);
  } catch {
    /* frame tree is best effort */
  }

  const tabs = (await browser.pages()).map(p => p.url());
  return { ...dom, frameTree: tree, tabs };
}

async function saveHeapSnapshot(client, file) {
  const chunks = [];
  const onChunk = e => chunks.push(e.chunk);
  client.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  client.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  fs.writeFileSync(file, chunks.join(''));
  log(`heap snapshot -> ${file}`);
}

function metricsToObject(metrics) {
  const out = {};
  for (const m of metrics) out[m.name] = m.value;
  return out;
}

/**
 * A single HeapProfiler.collectGarbage leaves a lot behind - measured ~1040
 * stale nodes still counted after one pass vs ~185 after the full collection a
 * heap snapshot forces. Blink's node counter spans V8 and Oilpan, and freeing
 * cross-heap wrappers takes several cycles, so sweep repeatedly before reading
 * anything, or "post-GC" numbers are really just uncollected garbage.
 */
async function forceGc(page, client) {
  for (let i = 0; i < 3; i++) {
    await client.send('HeapProfiler.collectGarbage');
    await page.evaluate(() => {
      if (typeof globalThis.gc === 'function') {
        globalThis.gc({ type: 'major', execution: 'sync' });
      }
    }).catch(() => {});
    await sleep(400);
  }
}

/**
 * Nodes/Documents/Frames swing by hundreds depending on which route happens
 * to be mounted, so a T0/T+1h pair taken at arbitrary moments compares two
 * different pages rather than measuring growth. Park on the dashboard, let it
 * settle, and collect twice before reading, so baseline and final are
 * like-for-like.
 */
/**
 * Close anything the clicker left open.
 *
 * Landing on the dashboard is not the same as reading the dashboard: a dialog
 * or menu the clicker could not dismiss stays on top of it, and its nodes and
 * listeners are counted too. A baseline taken that way read 1,898 nodes and
 * 392 listeners where the dashboard alone is about 1,464 and 236 - and since
 * whichever dialog happens to be open differs between T0 and the final
 * reading, the difference is reported as growth.
 */
async function clearOverlays(page, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    const open = await page
      .evaluate(() => {
        const visible = el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const panes = Array.from(document.querySelectorAll('.cdk-overlay-pane')).filter(visible);
        if (!panes.length) return 0;

        const pane = panes[panes.length - 1];
        const close = pane.querySelector(
          '[mat-dialog-close], [aria-label="Close" i], [aria-label="Cancel" i], .mat-mdc-dialog-close, .close, .cancel'
        );
        if (close && visible(close)) {
          close.click();
          return panes.length;
        }
        const backdrops = document.querySelectorAll('.cdk-overlay-backdrop');
        if (backdrops.length) {
          backdrops[backdrops.length - 1].click();
          return panes.length;
        }
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })
        );
        return panes.length;
      })
      .catch(() => 0);

    if (open === 0) return 0;
    await sleep(700);
  }

  const left = await page
    .evaluate(() => document.querySelectorAll('.cdk-overlay-pane').length)
    .catch(() => -1);
  if (left > 0) log(`warning: ${left} overlay pane(s) would not close before a reading`);
  return left;
}

/**
 * Wait until the app stops navigating on its own.
 *
 * A click resolves its evaluate the moment the handler returns, but the router
 * navigation it started completes later - after the route's lazy chunk loads,
 * which can take seconds. Stopping the clicker therefore leaves a queue of
 * navigations still to land, and a reading taken straight afterwards is of
 * whichever one arrived last: one checkpoint walked dashboard -> parameter-mode
 * -> event-history -> bus-operation at five-second intervals with nothing
 * clicking at all.
 */
async function waitForUrlQuiet(page, quietMs = 8000, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let url = page.url();
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    await sleep(500);
    const now = page.url();
    if (now !== url) {
      url = now;
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= quietMs) {
      return true;
    }
  }
  log(`warning: the app kept navigating for ${timeoutMs / 1000}s after the clicker stopped (now ${page.url()})`);
  return false;
}

async function controlledReading(page, client, clicker) {
  const onDashboard = () => new URL(page.url()).pathname === '/mdcs/dashboard';

  // Let the navigations already in flight land before going anywhere.
  const clicksAtStart = clicker ? clicker.count : null;
  if (clicker && clicker.running) {
    log('BUG: controlledReading called while the clicker is still running');
  }
  await waitForUrlQuiet(page);

  // Route in-app, never page.goto: a hard navigation re-boots Angular and
  // drops the dummy-mode session, which lands on /unauthorized and would
  // measure an empty shell instead of the dashboard.
  //
  // Repeated, because arriving once is not enough. A click issued just before
  // the clicker stopped resolves its evaluate immediately but its router
  // navigation lands later, after this has already reached the dashboard - so
  // the reading was taken on whatever that click opened. Settle, check we are
  // still here, and go back if not.
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (!onDashboard()) {
      const clicked = await page.evaluate(() => {
        const a = document.querySelector('a.logo[href], a[href="/mdcs/dashboard"]');
        if (!a) return false;
        a.click();
        return true;
      });
      if (clicked) {
        await page
          .waitForFunction(() => location.pathname === '/mdcs/dashboard', { timeout: 20000 })
          .catch(() => undefined);
      }

      // A link click is blocked by an overlay backdrop, and a reading taken
      // wherever the run happened to stop is not comparable to the baseline -
      // that is a grid page with a dialog open, worth hundreds of nodes and
      // listeners. Routing through history answers to no backdrop.
      if (!onDashboard()) {
        await navigateInApp(page, '/mdcs/dashboard');
        await page
          .waitForFunction(() => location.pathname === '/mdcs/dashboard', { timeout: 20000 })
          .catch(() => undefined);
      }
    }

    await clearOverlays(page);
    await sleep(5000);
    if (onDashboard()) break;
    log(`warning: left the dashboard for ${page.url()} while settling (attempt ${attempt})`);
  }

  if (!onDashboard()) {
    log(`WARNING: reading taken on ${page.url()}, not the dashboard - not comparable to the baseline`);
  }

  // Measure and read in one go, and throw the attempt away if the page moved
  // while we were doing it: the metrics are taken after the idle window, so a
  // navigation landing inside that window would otherwise be reported as a
  // dashboard reading. One checkpoint came back at 2,003 nodes that way,
  // against 1,464 for the dashboard it claimed to be.
  for (let attempt = 1; attempt <= 4; attempt++) {
    await clearOverlays(page);
    const urlBefore = page.url();

    // True idle CPU: the clicker is off here, so this window measures the app
    // doing nothing but its own timers and websocket traffic.
    const idleStart = metricsToObject((await client.send('Performance.getMetrics')).metrics);
    const idleWallStart = Date.now();
    await sleep(10000);
    const idleEnd = metricsToObject((await client.send('Performance.getMetrics')).metrics);
    const idleCpu = (
      ((idleEnd.TaskDuration - idleStart.TaskDuration) / ((Date.now() - idleWallStart) / 1000)) *
      100
    ).toFixed(2);

    await forceGc(page, client);
    const { metrics } = await client.send('Performance.getMetrics');

    const panesOpen = await page
      .evaluate(() => document.querySelectorAll('.cdk-overlay-pane').length)
      .catch(() => 0);

    if (clicker && clicker.count !== clicksAtStart) {
      log(`note: ${clicker.count - clicksAtStart} click(s) landed during the reading`);
    }

    if (page.url() === urlBefore && panesOpen === 0) {
      const m = metricsToObject(metrics);
      m.__idleCpu = idleCpu;
      m.__url = page.url();
      return m;
    }

    if (panesOpen > 0) {
      log(`warning: ${panesOpen} overlay pane(s) open during the reading; discarding it (attempt ${attempt})`);
      continue;
    }

    log(
      `warning: navigated from ${urlBefore} to ${page.url()} during the reading; ` +
        `discarding it (attempt ${attempt})`
    );
    await waitForUrlQuiet(page);
    if (!onDashboard()) {
      await navigateInApp(page, '/mdcs/dashboard');
      await sleep(3000);
    }
  }

  // Best effort rather than a blank row: the counters are still worth having,
  // and the warning above says the page would not stay put.
  log('WARNING: could not take a reading that stayed put; reporting a best-effort one');
  const idleStart = metricsToObject((await client.send('Performance.getMetrics')).metrics);
  const idleWallStart = Date.now();
  await sleep(10000);
  const idleEnd = metricsToObject((await client.send('Performance.getMetrics')).metrics);
  await forceGc(page, client);
  const m = metricsToObject((await client.send('Performance.getMetrics')).metrics);
  m.__idleCpu = (
    ((idleEnd.TaskDuration - idleStart.TaskDuration) / ((Date.now() - idleWallStart) / 1000)) *
    100
  ).toFixed(2);
  m.__url = page.url();
  m.__unstable = true;
  return m;
}

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'perf-soak-')),
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1600,1000',
      '--disable-popup-blocking',
      '--js-flags=--expose-gc',
    ],
  });

  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.setViewport({ width: 1600, height: 1000 });

  // Counts live here, in the test process, because the clicker does.
  const clicker = createExternalClicker(page);
  const clickCounter = {
    get count() {
      return clicker.count;
    },
  };

  const recentConsole = [];
  page.on('console', msg => {
    const text = msg.text();
    if (!text.startsWith('[WebSocket')) {
      recentConsole.push(`${new Date().toISOString()} [${msg.type()}] ${text.slice(0, 160)}`);
      if (recentConsole.length > 15) recentConsole.shift();
    }
  });
  page.on('pageerror', err => {
    recentConsole.push(`${new Date().toISOString()} [pageerror] ${err.message.slice(0, 160)}`);
    if (recentConsole.length > 15) recentConsole.shift();
  });

  const client = await page.createCDPSession();
  await client.send('Performance.enable');

  // QA watches Performance Monitor with DevTools open; this harness used to
  // attach CDP for Performance.getMetrics alone. That difference decides
  // whether arguments handed to console.* are collected or retained for the
  // life of the tab, and it is why the two disagreed about heap growth on the
  // same build. Enabling the console domain on its own session puts every
  // logged argument in the "console" object group and never releases it, so
  // the soak measures what QA measures. Set DEVTOOLS_CONSOLE=0 to opt out.
  let consoleMessages = 0;
  // Counting is not enough to act on: tally by text so the run names whatever
  // is still logging on a hot path, and how much of it carries an object.
  const consoleTally = new Map();
  if (process.env.DEVTOOLS_CONSOLE !== '0') {
    const consoleSession = await page.createCDPSession();
    await consoleSession.send('Runtime.enable');
    consoleSession.on('Runtime.consoleAPICalled', event => {
      consoleMessages++;
      const first = event.args?.[0];
      const text = String(first?.value ?? first?.description ?? `(${first?.type})`).slice(0, 90);
      const key = `${event.type} ${text}`;
      const entry = consoleTally.get(key) ?? { count: 0, withObject: 0 };
      entry.count++;
      // An argument with an objectId is a live handle the console now pins.
      if (event.args?.some(a => a.objectId)) entry.withObject++;
      consoleTally.set(key, entry);
    });
    log('console retention enabled (mirrors an open DevTools window)');
  }
  await client.send('HeapProfiler.enable');

  await signIn(page);
  if (COLD_START) {
    log('cold start: no warm-up, T0 is the freshly signed-in dashboard');
  } else {
    await warmUp(page, clicker);
  }

  const header = [
    'iso_time',
    'elapsed_min',
    'js_heap_used_mb',
    'nodes',
    'js_event_listeners',
    'documents',
    'frames',
    'layout_count',
    'recalc_style_count',
    'task_duration_s',
    'cpu_pct_since_last',
    'clicks_total',
    'tabs',
    'url',
    'note',
  ].join(',');
  fs.writeFileSync(OUT, header + '\n');

  const writeRow = (m, elapsedMin, cpuPct, tabs, url, note) =>
    fs.appendFileSync(
      OUT,
      [
        new Date().toISOString(),
        elapsedMin,
        (m.JSHeapUsedSize / 1048576).toFixed(2),
        m.Nodes,
        m.JSEventListeners,
        m.Documents,
        m.Frames,
        m.LayoutCount,
        m.RecalcStyleCount,
        (m.TaskDuration || 0).toFixed(2),
        cpuPct,
        clickCounter.count,
        tabs,
        url,
        note,
      ].join(',') + '\n'
    );

  const baseline = await controlledReading(page, client, clicker);
  writeRow(
    baseline,
    '0.0',
    baseline.__idleCpu,
    (await browser.pages()).length,
    page.url(),
    'controlled-baseline (idle cpu)'
  );
  log(
    `BASELINE (dashboard, post-GC): heap=${(baseline.JSHeapUsedSize / 1048576).toFixed(1)}MB ` +
      `nodes=${baseline.Nodes} listeners=${baseline.JSEventListeners} docs=${baseline.Documents} frames=${baseline.Frames}`
  );

  if (process.env.HEAP_SNAPSHOTS) {
    await saveHeapSnapshot(client, OUT.replace(/\.csv$/, '') + '.baseline.heapsnapshot');
  }
  const cyclesT0 = await benchmarkCycles(page, client);
  log(
    `CYCLES T0: ${cyclesT0.cpuMsConverged} ms CPU per cycle (converged over ${cyclesT0.samples} cycles, ` +
      `${cyclesT0.warmUpCycles} discarded; median ${cyclesT0.medianCpuMs}, spread ${cyclesT0.spreadPct}%) ` +
      JSON.stringify(cyclesT0.runs.map(r => r.cpuMs))
  );

  await enableAutoClick(page, clicker);

  const started = Date.now();
  const endAt = started + DURATION_MIN * 60 * 1000;
  const snapshotEveryMin = Number(process.env.HEAP_SNAPSHOT_EVERY_MIN || 0);
  let nextSnapshotMin = snapshotEveryMin;
  // Readings QA can compare directly: same page, same post-GC discipline as
  // the baseline, taken at each checkpoint rather than only at the end.
  const checkpointsMin = (process.env.CHECKPOINTS_MIN || '')
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => v > 0 && v < DURATION_MIN)
    .sort((a, b) => a - b);
  const checkpoints = [];
  let nextCheckpoint = 0;
  const URL_STUCK_MS = 4 * 60 * 1000;
  let lastUrl = page.url();
  let lastUrlChange = Date.now();
  let clicksAtUrlChange = 0;
  let urlStuckReported = false;
  let prevTask = null;
  let prevWall = null;
  let sampleNo = 0;
  let peakDocuments = baseline.Documents;
  // A controlled reading deliberately stops the clicker, so the watchdog below
  // sees the click count stop moving and the URL stop changing - both of which
  // it is built to treat as a hung page. Left alone it re-armed clicking in
  // the middle of a checkpoint, and the "dashboard, post-GC" figure was then
  // taken on whatever the new clicks opened.
  let readingInProgress = false;
  const stalls = [];
  let pendingNote = '';
  let hiddenEvents = 0;

  /**
   * A soak with a stalled clicker isn't a soak - it's an idle app that will
   * look leak-free. Check every 20s that ticks are still landing; if they
   * stop, record what the page looked like (for root-causing) and re-arm.
   */
  const watchedSleep = async ms => {
    const until = Date.now() + ms;
    let lastCount = clickCounter.count;
    let lastProgress = Date.now();
    while (Date.now() < until) {
      await sleep(Math.min(20000, until - Date.now()));

      if (readingInProgress) {
        // Rebase the watchdog's clocks: the pause was ours, not the app's.
        lastCount = clickCounter.count;
        lastProgress = Date.now();
        lastUrl = page.url();
        lastUrlChange = Date.now();
        clicksAtUrlChange = clickCounter.count;
        continue;
      }

      // A hidden tab gets no animation frames, so rAF callbacks and CSS
      // animations stop being serviced and everything they reference piles
      // up - the run would be measuring a background tab, not the app.
      const visibility = await page.evaluate(() => document.visibilityState).catch(() => 'unknown');
      if (visibility !== 'visible') {
        hiddenEvents++;
        log(`WARNING: page is ${visibility} (another tab took focus); bringing it back to front`);
        pendingNote = `${pendingNote} page was ${visibility};`.trim();
        await page.bringToFront().catch(() => {});
      }

      // Clicks can keep landing while the app stops responding to them - a
      // dialog that won't close, a router that stopped navigating - and the
      // soak then measures an idle page on one route for the rest of the run.
      const here = page.url();
      if (here !== lastUrl) {
        lastUrl = here;
        lastUrlChange = Date.now();
        urlStuckReported = false;
      } else if (!urlStuckReported && Date.now() - lastUrlChange > URL_STUCK_MS) {
        urlStuckReported = true;
        const stuckState = await page
          .evaluate(() => ({
            url: location.pathname,
            panes: Array.from(document.querySelectorAll('.cdk-overlay-pane'))
              .filter(p => p.getBoundingClientRect().width > 0)
              .map(p => p.innerText.replace(/\s+/g, ' ').slice(0, 80)),
            backdrops: document.querySelectorAll('.cdk-overlay-backdrop').length,
          }))
          .catch(e => ({ evalError: e.message }));
        const stuck = {
          at: new Date().toISOString(),
          elapsedMin: ((Date.now() - started) / 60000).toFixed(1),
          stuckForMin: ((Date.now() - lastUrlChange) / 60000).toFixed(1),
          clicksWhileStuck: clickCounter.count - clicksAtUrlChange,
          state: stuckState,
          recentConsole: [...recentConsole],
        };
        stalls.push(stuck);
        log(`PAGE STUCK: ${JSON.stringify(stuck.state)} (${stuck.clicksWhileStuck} clicks with no route change)`);
        for (const line of recentConsole.slice(-8)) log(`   ${line}`);
        pendingNote = `page stuck on ${stuckState.url} for ${stuck.stuckForMin} min; nudged to dashboard`;
        await setAutoClick(page, false, clicker);
        await sleep(2000);
        await navigateInApp(page, '/mdcs/dashboard');
        await enableAutoClick(page, clicker).catch(e => log(`re-arm failed: ${e.message}`));
        lastUrl = page.url();
        lastUrlChange = Date.now();
        clicksAtUrlChange = clickCounter.count;
      }

      if (clickCounter.count > lastCount) {
        lastCount = clickCounter.count;
        lastProgress = Date.now();
        continue;
      }
      if (Date.now() - lastProgress < 30000) continue;

      const state = await page
        .evaluate(() => ({
          path: location.pathname,
          toggle: document.querySelector('mat-slide-toggle button[role=switch]')?.getAttribute('aria-checked'),
          overlays: Array.from(document.querySelectorAll('.cdk-overlay-pane'))
            .filter(p => p.getBoundingClientRect().width > 0)
            .map(p => p.innerText.replace(/\s+/g, ' ').slice(0, 80)),
        }))
        .catch(e => ({ evalError: e.message }));
      const stall = {
        at: new Date().toISOString(),
        elapsedMin: ((Date.now() - started) / 60000).toFixed(1),
        state,
        recentConsole: [...recentConsole],
      };
      stalls.push(stall);
      log(`STALL #${stalls.length}: no clicks for 30s+ ${JSON.stringify(state)}`);
      for (const line of recentConsole.slice(-8)) log(`   ${line}`);
      pendingNote = `auto-click stall #${stalls.length} re-armed`;

      await setAutoClick(page, false, clicker);
      await sleep(3000);
      await enableAutoClick(page, clicker).catch(e => log(`re-arm failed: ${e.message}`));
      lastCount = clickCounter.count;
      lastProgress = Date.now();
    }
  };

  while (Date.now() <= endAt) {
    let note = pendingNote;
    pendingNote = '';

    // The dummy-mode token is short-lived, and the auto-clicker can land on
    // the logout confirmation - either way, recover so the soak keeps running.
    const url = page.url();
    if (url.includes('/unauthorized') || url.includes('/sign-in')) {
      // Re-auth reloads the page and wipes the heap, so everything after this
      // row is a fresh app instance - flag it rather than let the final
      // reading silently look better than a continuous hour would.
      note = 'CONTINUITY BREAK: session lost, re-authenticated (page reloaded)';
      log('session lost, re-authenticating');
      try {
        await signIn(page);
        await enableAutoClick(page, clicker);
      } catch (err) {
        note = `re-auth failed: ${err.message}`;
        log(note);
      }
    }

    await forceGc(page, client);

    const { metrics } = await client.send('Performance.getMetrics');
    const m = metricsToObject(metrics);
    const wall = Date.now();

    let cpuPct = '';
    if (prevTask !== null) {
      const dTask = m.TaskDuration - prevTask;
      const dWall = (wall - prevWall) / 1000;
      cpuPct = ((dTask / dWall) * 100).toFixed(2);
    }
    prevTask = m.TaskDuration;
    prevWall = wall;

    const tabs = (await browser.pages()).length;
    const elapsedMin = (wall - started) / 60000;
    writeRow(m, elapsedMin.toFixed(1), cpuPct, tabs, page.url(), note);

    if (snapshotEveryMin > 0 && elapsedMin >= nextSnapshotMin) {
      await saveHeapSnapshot(
        client,
        `${OUT.replace(/\.csv$/, '')}.t${String(Math.round(nextSnapshotMin)).padStart(3, '0')}.heapsnapshot`
      );
      nextSnapshotMin += snapshotEveryMin;
    }
    log(
      `sample ${++sampleNo}: heap=${(m.JSHeapUsedSize / 1048576).toFixed(1)}MB nodes=${m.Nodes} ` +
        `listeners=${m.JSEventListeners} docs=${m.Documents} frames=${m.Frames} cpu=${cpuPct}% clicks=${clickCounter.count}`
    );

    // Report a document leak the first time it appears and at each new high,
    // while whatever created it is still on the page.
    if (m.Documents > peakDocuments) {
      peakDocuments = m.Documents;
      if (m.Documents > baseline.Documents) {
        log(
          `DOCUMENTS UP: ${baseline.Documents} -> ${m.Documents} at ${page.url()} ` +
            JSON.stringify(await documentSources(page, browser, client))
        );
      }
    }

    if (
      nextCheckpoint < checkpointsMin.length &&
      elapsedMin >= checkpointsMin[nextCheckpoint]
    ) {
      const atMin = checkpointsMin[nextCheckpoint++];
      readingInProgress = true;
      await setAutoClick(page, false, clicker);
      const reading = await controlledReading(page, client, clicker);
      reading.__atMin = atMin;
      reading.__consoleMessages = consoleMessages;
      checkpoints.push(reading);
      writeRow(
        reading,
        elapsedMin.toFixed(1),
        reading.__idleCpu,
        (await browser.pages()).length,
        page.url(),
        `controlled-checkpoint-${atMin}min (idle cpu)`
      );
      log(
        `CHECKPOINT ${atMin}min (dashboard, post-GC): ` +
          `heap=${(reading.JSHeapUsedSize / 1048576).toFixed(2)}MB ` +
          `nodes=${reading.Nodes} listeners=${reading.JSEventListeners} ` +
          `docs=${reading.Documents} frames=${reading.Frames} ` +
          `idleCpu=${reading.__idleCpu}% consoleMessages=${consoleMessages}`
      );
      await enableAutoClick(page, clicker);
      readingInProgress = false;
      // The clock the loop keeps is wall time, so the pause is already
      // accounted for; only the CPU delta needs rebasing.
      prevTask = null;
      prevWall = null;
    }

    const remaining = endAt - Date.now();
    if (remaining <= 0) break;
    await watchedSleep(Math.min(INTERVAL_SEC * 1000, remaining + 1000));
  }

  fs.writeFileSync(OUT.replace(/\.csv$/, '') + '.stalls.json', JSON.stringify(stalls, null, 2));

  await setAutoClick(page, false, clicker);
  await sleep(5000);

  const final = await controlledReading(page, client, clicker);
  writeRow(
    final,
    DURATION_MIN.toFixed(1),
    final.__idleCpu,
    (await browser.pages()).length,
    page.url(),
    'controlled-final (idle cpu)'
  );
  log(
    `FINAL (dashboard, post-GC): heap=${(final.JSHeapUsedSize / 1048576).toFixed(1)}MB ` +
      `nodes=${final.Nodes} listeners=${final.JSEventListeners} docs=${final.Documents} frames=${final.Frames}`
  );

  if (process.env.HEAP_SNAPSHOTS) {
    await saveHeapSnapshot(client, OUT.replace(/\.csv$/, '') + '.final.heapsnapshot');
  }
  const cyclesT1 = await benchmarkCycles(page, client);
  log(
    `CYCLES T+1h: ${cyclesT1.cpuMsConverged} ms CPU per cycle (converged over ${cyclesT1.samples} cycles, ` +
      `${cyclesT1.warmUpCycles} discarded; median ${cyclesT1.medianCpuMs}, spread ${cyclesT1.spreadPct}%) ` +
      JSON.stringify(cyclesT1.runs.map(r => r.cpuMs))
  );
  fs.writeFileSync(
    OUT.replace(/\.csv$/, '') + '.cycles.json',
    JSON.stringify({ routes: CYCLE_ROUTES, t0: cyclesT0, t1: cyclesT1 }, null, 2)
  );

  const pct = (a, b) => (((b - a) / a) * 100).toFixed(1);
  if (checkpoints.length) {
    log('=== CHECKPOINTS (like-for-like, dashboard, post-GC) ===');
    const mb = v => (v / 1048576).toFixed(2);
    log(
      `  ${'at'.padStart(6)} ${'heap MB'.padStart(8)} ${'d heap'.padStart(8)} ` +
        `${'nodes'.padStart(6)} ${'listen'.padStart(7)} ${'docs'.padStart(5)} ${'frames'.padStart(7)} ${'idleCpu'.padStart(8)}`
    );
    for (const r of [...checkpoints, { ...final, __atMin: DURATION_MIN }]) {
      log(
        `  ${String(r.__atMin) + 'm'.padEnd(1)}`.padEnd(8) +
          `${mb(r.JSHeapUsedSize).padStart(8)} ` +
          `${(r.JSHeapUsedSize >= baseline.JSHeapUsedSize ? '+' : '') + mb(r.JSHeapUsedSize - baseline.JSHeapUsedSize)}`.padStart(9) +
          ` ${String(r.Nodes).padStart(6)} ${String(r.JSEventListeners).padStart(7)} ` +
          `${String(r.Documents).padStart(5)} ${String(r.Frames).padStart(7)} ${String(r.__idleCpu + '%').padStart(8)}`
      );
    }
    fs.writeFileSync(
      OUT.replace(/\.csv$/, '') + '.checkpoints.json',
      JSON.stringify({ baseline, checkpoints, final }, null, 2)
    );
  }
  log(`console messages logged during the run: ${consoleMessages}`);
  if (consoleTally.size) {
    const worst = [...consoleTally.entries()].sort((a, b) => b[1].count - a[1].count);
    log('  top talkers (count, of which pin an object):');
    for (const [text, { count, withObject }] of worst.slice(0, 12)) {
      log(`    ${String(count).padStart(6)}  ${String(withObject).padStart(6)} obj  ${text}`);
    }
    fs.writeFileSync(
      OUT.replace(/\.csv$/, '') + '.console.json',
      JSON.stringify(Object.fromEntries(worst), null, 2)
    );
  }

  log('=== BASELINE -> FINAL (like-for-like, dashboard, post-GC) ===');
  log(
    `heap      ${(baseline.JSHeapUsedSize / 1048576).toFixed(2)} -> ${(final.JSHeapUsedSize / 1048576).toFixed(2)} MB ` +
      `(${pct(baseline.JSHeapUsedSize, final.JSHeapUsedSize)}%)`
  );
  log(`nodes     ${baseline.Nodes} -> ${final.Nodes} (${pct(baseline.Nodes, final.Nodes)}%)`);
  log(
    `listeners ${baseline.JSEventListeners} -> ${final.JSEventListeners} (${pct(baseline.JSEventListeners, final.JSEventListeners)}%)`
  );
  log(`documents ${baseline.Documents} -> ${final.Documents}`);
  log(`frames    ${baseline.Frames} -> ${final.Frames}`);
  log(`idle cpu  ${baseline.__idleCpu}% -> ${final.__idleCpu}%`);
  log(`total auto-clicks: ${clickCounter.count}`);
  log(`page-hidden events: ${hiddenEvents}`);

  log('soak complete');
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('FATAL', err);
  process.exit(1);
});
