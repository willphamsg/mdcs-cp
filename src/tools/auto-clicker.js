const POLL_INTERVAL_MS = 3000; // 3 seconds between clicks
const OVERLAY_CLOSE_TIMEOUT_MS = 2000; // max time to wait for an overlay to actually close
const MAX_OVERLAY_CLOSE_ATTEMPTS = 5; // safety cap so a stuck overlay can't spin forever

const CONTENT_SELECTORS = [
  'a[href]',
  'button:not([role="switch"])',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[ng-click]',
  '[onclick]',
  '[tabindex]',
  '.clickable',
  '[mat-button]',
  '[mat-raised-button]',
  '[mat-icon-button]',
  '[mat-fab]',
  '[mat-mini-fab]',
  '[mat-stroked-button]',
  '[mat-flat-button]',
  '[routerLink]',
];

const AUTO_CLICK_TOGGLE_SELECTOR = '[data-auto-click-toggle]';
// Anything that opens another window/tab. The browser brings the new tab to
// the front, and the app's tab - now hidden - gets no animation frames: its
// pending requestAnimationFrame callbacks (e.g. CDK overlay backdrops) and CSS
// animations are never serviced, so every page the clicker leaves afterwards
// stays pinned in memory. A soak that runs in a background tab measures that,
// not the app.
const OPENS_WINDOW_SELECTOR = 'a[target="_blank"], [data-opens-window]';
const OVERLAY_PANE_SELECTOR = '.cdk-overlay-pane';
const OVERLAY_BACKDROP_SELECTOR = '.cdk-overlay-backdrop';
const OVERLAY_CLOSE_SELECTOR =
  '[mat-dialog-close], [aria-label="Close" i], [aria-label="Cancel" i], .mat-mdc-dialog-close, .close, .cancel';

let autoClickTimer;
let running = false;
let startUrl = null;

function isVisible(el) {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0 &&
    !el.disabled
  );
}

function collectClickableElements(root) {
  const query = CONTENT_SELECTORS.join(', ');
  const nodeList = (root || document).querySelectorAll(query);
  return Array.from(nodeList).filter(isVisible);
}

function getOpenOverlayPanes() {
  return Array.from(document.querySelectorAll(OVERLAY_PANE_SELECTOR)).filter(isVisible);
}

function getRandomInt(min, max) {
    min = Math.ceil(min); // round up lower bound
    max = Math.floor(max); // round down upper bound
    return Math.floor(Math.random() * (max - min + 1)) + min; // NOSONAR - non-security use: random UI element pick
}

function pickRandom(list) {
  if (!list.length) return null;
  return list[getRandomInt(0, list.length - 1)];
}

function waitFor(predicate, timeoutMs, intervalMs) {
  return new Promise(resolve => {
    const start = Date.now();
    (function tick() {
      if (predicate() || Date.now() - start >= timeoutMs) {
        resolve();
        return;
      }
      setTimeout(tick, intervalMs || 100);
    })();
  });
}

// Prefer a real close/cancel control - some dialogs are opened with
// disableClose: true specifically to block Escape and backdrop dismissal,
// so an explicit button is the only thing that will actually close them.
// Otherwise click the CDK backdrop: a synthetic (non-trusted) Escape
// keydown does not reliably close a mat-select/mat-menu panel, but a
// synthetic click on the backdrop does, since CDK wires that as a plain
// click listener rather than routing through keyboard event dispatch.
function closeOverlay(pane) {
  const closeButton = pane.querySelector(OVERLAY_CLOSE_SELECTOR);
  if (closeButton && isVisible(closeButton)) {
    closeButton.click();
    return;
  }
  // The LAST backdrop, not the first: overlays stack (a mat-select opened
  // inside a dialog has its own backdrop appended after the dialog's), and
  // clicking the bottom one does nothing - the clicker then never gets the
  // top overlay closed and spends the rest of the run on that one page.
  const backdrops = document.querySelectorAll(OVERLAY_BACKDROP_SELECTOR);
  const backdrop = backdrops[backdrops.length - 1];
  if (backdrop) {
    backdrop.click();
    return;
  }
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })
  );
}

async function settleOpenOverlays() {
  let attempts = 0;
  let panes = getOpenOverlayPanes();
  while (panes.length > 0 && attempts < MAX_OVERLAY_CLOSE_ATTEMPTS) {
    const before = panes.length;
    closeOverlay(panes[panes.length - 1]);
    await waitFor(() => getOpenOverlayPanes().length < before, OVERLAY_CLOSE_TIMEOUT_MS);
    panes = getOpenOverlayPanes();
    attempts++;
  }
}

// A single tick, in two mutually exclusive modes:
//  - an overlay (dialog/menu/select) is open: only act inside it - either
//    close it, or click something inside it. Never wander off into the rest
//    of the page or fire a routerLink navigation while something is open,
//    since that's what stacks orphaned dialogs and leaves subscriptions
//    resolving into a torn-down component.
//  - nothing is open: click anywhere on the page, as before.
async function performClick() {
  const openPanes = getOpenOverlayPanes();

  if (openPanes.length > 0) {
    const pane = openPanes[openPanes.length - 1];
    const withinOverlay = collectClickableElements(pane).filter(
      el => !el.hasAttribute('routerLink') && !el.closest(OPENS_WINDOW_SELECTOR)
    );
    const shouldClose = withinOverlay.length === 0 || Math.random() < 0.4;

    if (shouldClose) {
      closeOverlay(pane);
      counts.overlaysClosed++;
      noteClick();
      if (verbose) console.log('Closed overlay');
    } else {
      const el = pickRandom(withinOverlay);
      if (el) {
        el.click();
        counts.overlayClicks++;
        noteClick();
        if (verbose) console.log('Clicked (in overlay):', el.textContent);
      }
    }
    return;
  }

  // Match the toggle by a stable attribute, not its generated id: the id is
  // only `mat-mdc-slide-toggle-0-button` for the first header instance. Any
  // trip outside the layout (e.g. /unauthorized) rebuilds the header as
  // `-1-button`, and the clicker would start switching itself off.
  const els = collectClickableElements().filter(
    el =>
      !el.closest(AUTO_CLICK_TOGGLE_SELECTOR) &&
      !el.closest(OPENS_WINDOW_SELECTOR) &&
      !el.classList.contains('profile-btn')
  );
  const el = pickRandom(els);
  if (el) {
    el.click();
    noteClick();
    if (verbose) console.log('Clicked:', el.textContent);
  } else {
    counts.notFound++;
    if (verbose) console.warn('Element not found');
  }
}

// This tool ships inside the app and QA runs it with DevTools open, where
// every console message is retained for the life of the tab along with its
// stack trace. Logging each click cost ~1,200 messages an hour and showed up
// as heap growth in the very measurement it exists to support. Count instead,
// and say so once every SUMMARY_EVERY clicks so a run can still be seen to be
// alive; setAutoClickerVerbose(true) restores the per-click detail.
const SUMMARY_EVERY = 250;
let verbose = false;
const counts = { clicks: 0, overlayClicks: 0, overlaysClosed: 0, notFound: 0 };

function setAutoClickerVerbose(on) {
  verbose = Boolean(on);
}

function getAutoClickerCounts() {
  return { ...counts };
}

function noteClick() {
  counts.clicks++;
  // Machine-readable progress for anyone driving this toggle by hand, now that
  // each click is no longer announced on the console.
  document.documentElement.dataset.autoClickCount = String(counts.clicks);
  if (counts.clicks % SUMMARY_EVERY === 0) {
    console.log(
      `[auto-clicker] ${counts.clicks} clicks ` +
        `(${counts.overlayClicks} in overlays, ${counts.overlaysClosed} overlays closed, ` +
        `${counts.notFound} with nothing to click)`
    );
  }
}

// A tick already in flight when the clicker is stopped and restarted would
// otherwise reschedule itself alongside the new loop, doubling the click rate.
let generation = 0;

function scheduleNextClick(gen) {
  if (!running || gen !== generation) return;
  autoClickTimer = setTimeout(async () => {
    try {
      await performClick();
    } catch (err) {
      console.error('[auto-clicker] click failed:', err);
    }
    scheduleNextClick(gen);
  }, POLL_INTERVAL_MS);
}

function startAutoClicker() {
    if (running) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    running = true;
    startUrl = location.pathname + location.search + location.hash;
    scheduleNextClick(++generation);
}

// Where the current/last run was switched on, so stopping can hand the app
// back on the same page - otherwise a before/after reading compares whatever
// random page the last click landed on against the page the run started from.
function getAutoClickerStartUrl() {
  return startUrl;
}

function isAutoClickerRunning() {
  return running;
}

function stopAutoClicker() {
    running = false;
    generation++;
    if (autoClickTimer) {
      clearTimeout(autoClickTimer);
      autoClickTimer = undefined;
    }
    // Leave the app the way a real user would - nothing left open - rather
    // than however the last random click happened to leave it.
    return settleOpenOverlays().then(() =>
      console.log(
        `[auto-clicker] stopped after ${counts.clicks} clicks ` +
          `(${counts.overlayClicks} in overlays, ${counts.overlaysClosed} overlays closed, ` +
          `${counts.notFound} with nothing to click)`
      )
    );
}

export {
  startAutoClicker,
  stopAutoClicker,
  isAutoClickerRunning,
  getAutoClickerStartUrl,
  setAutoClickerVerbose,
  getAutoClickerCounts,
};

// Example:
// startAutoClicker(2000); // click every 2s
