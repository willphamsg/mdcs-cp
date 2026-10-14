/**
 * Drives the same random-click soak as the in-app Auto Click toggle, but from
 * the test process instead of from inside the application.
 *
 * The in-app clicker is imported by the header component, so it ships in the
 * bundle and runs in the page under test: its module, its timer and its
 * counters are all part of what the soak then measures, and anything it logs
 * is retained for the life of the tab by an open DevTools window. Measuring a
 * page that contains the instrument means the instrument's own footprint is
 * reported as the application's.
 *
 * Here nothing is installed in the page. Each tick evaluates one pure function
 * that picks an element, clicks it and returns what it did; the timer, the
 * counters and the decisions all live in Node. The page keeps no reference to
 * any of it, so what the metrics report is the application alone.
 */

const DEFAULT_INTERVAL_MS = 3000;
const OVERLAY_CLOSE_TIMEOUT_MS = 2000;
const MAX_OVERLAY_CLOSE_ATTEMPTS = 5;

/**
 * Serialised into the page on every tick. Self-contained by necessity: it
 * closes over nothing, and everything it needs arrives as `config`.
 */
/* eslint-disable */
function clickOnce(config) {
  const {
    contentSelectors,
    autoClickToggleSelector,
    opensWindowSelector,
    overlayPaneSelector,
    overlayBackdropSelector,
    overlayCloseSelector,
    closeOverlayProbability,
    settleOnly,
  } = config;

  const isVisible = el => {
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
  };

  const collect = root =>
    Array.from((root || document).querySelectorAll(contentSelectors.join(', '))).filter(isVisible);

  const openPanes = () =>
    Array.from(document.querySelectorAll(overlayPaneSelector)).filter(isVisible);

  const pickRandom = list =>
    list.length ? list[Math.floor(Math.random() * list.length)] : null;

  // Prefer a real close/cancel control: dialogs opened with disableClose:true
  // block Escape and backdrop dismissal, so an explicit button is the only
  // thing that will shut them.
  const closeOverlay = pane => {
    const closeButton = pane.querySelector(overlayCloseSelector);
    if (closeButton && isVisible(closeButton)) {
      closeButton.click();
      return 'close-button';
    }
    // The LAST backdrop, not the first: overlays stack (a mat-select opened
    // inside a dialog appends its own backdrop after the dialog's), and
    // clicking the bottom one does nothing - the run would then spend the
    // rest of its time on that one page.
    const backdrops = document.querySelectorAll(overlayBackdropSelector);
    const backdrop = backdrops[backdrops.length - 1];
    if (backdrop) {
      backdrop.click();
      return 'backdrop';
    }
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        bubbles: true,
      })
    );
    return 'escape';
  };

  const panes = openPanes();

  if (settleOnly) {
    if (!panes.length) return { action: 'settled', panes: 0 };
    closeOverlay(panes[panes.length - 1]);
    return { action: 'closing', panes: panes.length };
  }

  // Two mutually exclusive modes. With an overlay open, act only inside it:
  // wandering off - or firing a routerLink - while a dialog is up is what
  // stacks orphaned dialogs and leaves subscriptions resolving into a torn
  // down component.
  if (panes.length > 0) {
    const pane = panes[panes.length - 1];
    const within = collect(pane).filter(
      el => !el.hasAttribute('routerLink') && !el.closest(opensWindowSelector)
    );
    if (within.length === 0 || Math.random() < closeOverlayProbability) {
      closeOverlay(pane);
      return { action: 'overlay-closed' };
    }
    const el = pickRandom(within);
    if (!el) return { action: 'nothing-found' };
    el.click();
    return { action: 'overlay-click' };
  }

  // Match the toggle by a stable attribute, not its generated id: any trip
  // outside the layout rebuilds the header and renumbers it.
  const candidates = collect().filter(
    el =>
      !el.closest(autoClickToggleSelector) &&
      !el.closest(opensWindowSelector) &&
      !el.classList.contains('profile-btn')
  );
  const el = pickRandom(candidates);
  if (!el) return { action: 'nothing-found' };
  el.click();
  return { action: 'click' };
}
/* eslint-enable */

const CONFIG = {
  contentSelectors: [
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
  ],
  autoClickToggleSelector: '[data-auto-click-toggle]',
  // Anything that opens another window or tab. The browser brings the new tab
  // to the front and this one stops getting animation frames, so pending rAF
  // callbacks and CSS animations are never serviced and every page left
  // behind stays pinned. A soak in a background tab measures that, not the app.
  opensWindowSelector: 'a[target="_blank"], [data-opens-window]',
  overlayPaneSelector: '.cdk-overlay-pane',
  overlayBackdropSelector: '.cdk-overlay-backdrop',
  overlayCloseSelector:
    '[mat-dialog-close], [aria-label="Close" i], [aria-label="Cancel" i], .mat-mdc-dialog-close, .close, .cancel',
  closeOverlayProbability: 0.4,
  settleOnly: false,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function createExternalClicker(page, options = {}) {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const counts = { clicks: 0, overlayClicks: 0, overlaysClosed: 0, notFound: 0, errors: 0 };
  let running = false;
  // A tick already in flight when the clicker is stopped and restarted would
  // otherwise reschedule itself alongside the new loop, doubling the rate.
  let generation = 0;
  // Held so stop() can wait for the current iteration to finish. Without it a
  // click already in flight lands after the caller has navigated somewhere to
  // take a reading, and the reading is then of whatever that click opened:
  // three "dashboard, post-GC" readings in one run came back on
  // parameter-mode and bus-transfer, at 2,834 nodes and 11% CPU.
  let loopPromise = Promise.resolve();

  const tick = async () => {
    const result = await page.evaluate(clickOnce, CONFIG);
    switch (result.action) {
      case 'click':
        counts.clicks++;
        break;
      case 'overlay-click':
        counts.clicks++;
        counts.overlayClicks++;
        break;
      case 'overlay-closed':
        counts.clicks++;
        counts.overlaysClosed++;
        break;
      default:
        counts.notFound++;
    }
    return result;
  };

  const loop = async gen => {
    while (running && gen === generation) {
      try {
        await tick();
      } catch {
        // A navigation can destroy the execution context mid-evaluate; that is
        // ordinary here, so count it and carry on rather than ending the run.
        counts.errors++;
      }
      // Wake often enough that stop() is not held up for a whole interval.
      const until = Date.now() + intervalMs;
      while (running && gen === generation && Date.now() < until) {
        await sleep(Math.min(200, until - Date.now()));
      }
    }
  };

  return {
    start() {
      if (running) return;
      running = true;
      // Not awaited here - the loop runs for the life of the soak - but kept
      // so stop() can join it.
      loopPromise = loop(++generation);
    },
    async stop() {
      running = false;
      generation++;
      await loopPromise;
      await this.settle();
    },
    /** Leave the app as a user would - nothing left open. */
    async settle() {
      for (let i = 0; i < MAX_OVERLAY_CLOSE_ATTEMPTS; i++) {
        const result = await page
          .evaluate(clickOnce, { ...CONFIG, settleOnly: true })
          .catch(() => ({ action: 'settled' }));
        if (result.action === 'settled') return;
        await sleep(OVERLAY_CLOSE_TIMEOUT_MS / MAX_OVERLAY_CLOSE_ATTEMPTS);
      }
    },
    get count() {
      return counts.clicks;
    },
    get counts() {
      return { ...counts };
    },
    get running() {
      return running;
    },
  };
}

module.exports = { createExternalClicker };
