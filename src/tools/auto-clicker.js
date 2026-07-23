const POLL_INTERVAL_MS = 3000; // 3 seconds between clicks

let clickIndex = 0;
let elements = [];
let autoClickInterval;

function collectClickableElements() {
  const selectors = [
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

  const query = selectors.join(', ');
  const nodeList = document.querySelectorAll(query);

  // Filter to visible, enabled elements only
  return Array.from(nodeList).filter(el => {
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
  });
}

function getRandomInt(min, max) {
    min = Math.ceil(min); // round up lower bound
    max = Math.floor(max); // round down upper bound
    return Math.floor(Math.random() * (max - min + 1)) + min; // NOSONAR - non-security use: random UI element pick
}

function startAutoClicker() {
    if (autoClickInterval) clearInterval(autoClickInterval);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        autoClickInterval = setInterval(() => {
            let els = collectClickableElements().filter(el => el.id !== 'mat-mdc-slide-toggle-0-button' && !el.classList.contains('profile-btn'));
            const elmIdex = getRandomInt(0, els.length - 1);
            const el = els[elmIdex];
            if (el) {
                el.click();
                console.log('Clicked:', el.textContent);
            } else {
                console.warn('Element not found:', targetSelector);
            }
        }, POLL_INTERVAL_MS);
    }
}

function stopAutoClicker() {
    clearInterval(autoClickInterval);
    console.log('Auto clicker stopped');
}

export { startAutoClicker, stopAutoClicker };

// Example:
// startAutoClicker(2000); // click every 2s
