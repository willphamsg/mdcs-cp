/**
 * Paste this whole file into the DevTools Console of the tab under test.
 *
 * Blink's Documents counter is not just the page and its iframes: every SVG
 * rendered through <img> or CSS url() is its own isolated document, and none
 * of those appear in the Elements panel as anything you can click on. So when
 * Documents climbs, the number alone says nothing about what caused it.
 *
 * Run it at T0, run it again at the end, and diff the two results. Anything
 * listed the second time but not the first is a document the session created
 * and did not give back.
 *
 *   const t0 = documentProbe();      // at the start, keep the value
 *   ...                              // run the test
 *   documentProbeDiff(t0);           // at the end
 */
globalThis.documentProbe = function documentProbe() {
  const absolute = (url) => {
    try {
      return new URL(url, document.baseURI).href;
    } catch {
      return url;
    }
  };

  const images = new Set();
  const embedded = new Set();
  const css = new Set();

  for (const img of document.querySelectorAll('img')) {
    if (img.currentSrc || img.src) images.add(absolute(img.currentSrc || img.src));
  }
  for (const el of document.querySelectorAll('iframe, embed, object')) {
    const url = el.src || el.data;
    embedded.add(url ? absolute(url) : '(no src - still a document)');
  }
  for (const el of document.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    for (const prop of ['backgroundImage', 'borderImageSource', 'maskImage', 'content']) {
      for (const m of (style[prop] || '').matchAll(/url\("?([^")]+)"?\)/g)) {
        css.add(absolute(m[1]));
      }
    }
  }

  // Anything an extension injected shows up here too, which is worth knowing:
  // it inflates Documents and Event Listeners without the app doing anything.
  const svgLike = (url) => /\.svg(\?|#|$)/i.test(url) || url.startsWith('data:image/svg');

  return {
    at: new Date().toISOString(),
    url: location.href,
    svgImages: [...images].filter(svgLike).sort(),
    otherImages: [...images].filter((u) => !svgLike(u)).sort(),
    embedded: [...embedded].sort(),
    cssUrls: [...css].sort(),
    openerOrOpened: Boolean(window.opener),
  };
};

globalThis.documentProbeDiff = function documentProbeDiff(before) {
  const after = globalThis.documentProbe();
  const added = {};
  for (const key of ['svgImages', 'otherImages', 'embedded', 'cssUrls']) {
    const seen = new Set(before[key] ?? []);
    const gained = (after[key] ?? []).filter((u) => !seen.has(u));
    if (gained.length) added[key] = gained;
  }
  console.log('document probe: taken at', before.at, '->', after.at);
  if (Object.keys(added).length === 0) {
    console.log('  nothing new on the page; the extra documents are not in this DOM.');
  }
  return { added, after };
};

/**
 * A DOM scan cannot see every document: the app preloads its icon set as
 * detached Image objects, so 37 of the documents on an MDCS page are held in
 * JS and appear in no element. Resource timing does see them, and seeing a
 * *new* URL fetched mid-run is what actually identifies a leak - so start
 * this at T0 and read it at the end.
 *
 *   documentProbeWatch();         // at T0
 *   ...                           // run the test
 *   documentProbeWatch.report();  // at the end
 */
globalThis.documentProbeWatch = function documentProbeWatch() {
  if (globalThis.__documentProbeObserver) {
    console.log('document probe: already watching since', globalThis.__documentProbeStart);
    return globalThis.__documentProbeSeen;
  }

  const seen = new Map();
  const interesting = (entry) =>
    ['img', 'css', 'iframe', 'embed', 'object'].includes(entry.initiatorType) ||
    /\.svg(\?|#|$)/i.test(entry.name);

  const record = (entries) => {
    for (const entry of entries) {
      if (!interesting(entry) || seen.has(entry.name)) continue;
      seen.set(entry.name, {
        firstSeen: new Date().toISOString(),
        initiatorType: entry.initiatorType,
        // Seconds since the page loaded, so a new URL lines up with the
        // 2-minute sample on which the counter moved.
        atSeconds: Math.round(entry.startTime / 1000),
      });
    }
  };

  record(performance.getEntriesByType('resource'));
  const observer = new PerformanceObserver((list) => record(list.getEntries()));
  // Observed rather than read from the buffer at the end: the app's polling
  // fills the 250-entry resource buffer within minutes, and overflow is
  // dropped silently.
  observer.observe({ type: 'resource', buffered: true });

  globalThis.__documentProbeObserver = observer;
  globalThis.__documentProbeSeen = seen;
  globalThis.__documentProbeStart = new Date().toISOString();
  console.log(
    `document probe: watching from ${globalThis.__documentProbeStart}; ` +
      `${seen.size} document-capable resources already fetched.`
  );
  return seen;
};

globalThis.documentProbeWatch.report = function report() {
  const seen = globalThis.__documentProbeSeen;
  if (!seen) {
    console.log('document probe: not watching - call documentProbeWatch() first.');
    return null;
  }
  const since = [...seen.entries()].filter(
    ([, v]) => v.firstSeen > globalThis.__documentProbeStart
  );
  console.log(
    `document probe: ${seen.size} document-capable resources fetched in total, ` +
      `${since.length} of them after watching began.`
  );
  for (const [url, meta] of since) {
    console.log(`  +${meta.atSeconds}s  ${meta.initiatorType.padEnd(6)}  ${url}`);
  }
  if (since.length === 0) {
    console.log('  nothing new was fetched: the extra documents did not come from a new URL.');
  }
  return Object.fromEntries(since);
};

globalThis.documentProbe();
