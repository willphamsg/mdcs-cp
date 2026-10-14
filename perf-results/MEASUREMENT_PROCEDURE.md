# Reading the soak-test numbers

Three of the eight standards are read from a counter that moves for reasons
other than a leak. Unless T0 and the final reading are taken under the same
conditions, the table reports the conditions rather than the application.

## The one that matters: take both readings on the same page, after a GC

**Post-GC JS Heap**, **DOM Nodes** and **Event Listeners** are all properties of
whatever page is on screen at the instant you look. They are not running totals.

From a single 8-hour run of a build with no leak in it — nodes returned to
within 1 of their baseline — the instantaneous readings across 239 samples
covered:

| Counter | Low | High | Spread |
|---|---|---|---|
| DOM Nodes | 1,308 | 3,091 | 1,783 (up to +111% of the dashboard value) |
| Event Listeners | 168 | 861 | 693 |
| Post-GC JS Heap | 30.39 MB | 35.80 MB | 5.41 MB |
| **Documents / Frames** | **38** | **38** | **0** |

A table-heavy grid legitimately holds two thousand more nodes than the
dashboard does. Reading T0 on the dashboard and the final value on a grid
therefore produces a "+579 nodes, FAIL" out of a build that leaks nothing.

So:

1. **Navigate to the dashboard** and let it settle before *each* reading.
2. **Force a garbage collection** before *each* reading — the collect-garbage
   (bin) icon in DevTools' Memory panel, or Performance Monitor's own. The
   Performance Monitor graph shows *live* heap, which includes garbage that
   has not been collected yet; that is several MB above the post-GC figure the
   standard asks for.
3. Only then record the row.

`src/tools/perf-soak.js` does exactly this for its baseline and final readings,
which is why its numbers are comparable and its per-sample CSV is not.

### Documents/Frames needs the GC too - it just needs it for a different reason

Documents does not drift with the page mix, but it *does* over-count until a
collection runs. A report iframe that has been torn down is worth **+2
documents and +1 frame** until then. Cycling one eight times:

```
baseline                docs=38 frames=38
round 1: pre-GC docs=40 frames=39 | post-GC docs=38 frames=38
round 2: pre-GC docs=40 frames=39 | post-GC docs=38 frames=38
...
round 8: pre-GC docs=40 frames=39 | post-GC docs=38 frames=38
```

Nothing accumulates - but a reading taken while two or three reports have been
viewed recently shows 42/41 or 44/43 and looks exactly like a leak. A newly
fetched SVG costs the same +2. So a Documents figure is only meaningful after
a forced collection, and the same is true of the 40/40 baseline: it means two
documents were already pending collection when T0 was taken.

## Documents / Frames is the trustworthy leak signal

It did not move once in 239 samples, across every route, at any heap size. So
an increase here is real, and worth chasing — it is the row to trust when the
others disagree.

What it counts is wider than it looks: Blink gives **every SVG rendered through
`<img>` or CSS `url()` its own isolated document**, plus one per iframe, embed
and object, plus any same-origin tab opened with `window.open` (a blob: URL
preview lands in this renderer and is counted here until the tab is closed).
None of the SVG ones appear in the Elements panel.

To find out *which* document appeared, paste `src/tools/document-probe.js`
into the Console of the tab under test:

```js
const t0 = documentProbe();   // at T0, before starting; keep the value
// ... run the test ...
documentProbeDiff(t0);        // at the end
```

It lists every SVG, image, iframe/embed/object and CSS `url()` the page holds,
and the diff names what is new. If the diff is empty while the counter has
risen, the extra documents are not in this page's DOM — the usual causes are a
browser extension injecting frames, or a tab opened from the app and left
open. Re-run in a clean profile (`--guest`, or a new profile with extensions
disabled) to confirm.

A baseline that is not 38/38 on the MDCS dashboard is itself a signal: the
extra documents are present before the test starts, so they did not come from
the app.

## Reliability

A run where the auto-clicker silently stalls measures an idle tab. Check the
click total at the end: roughly 40 clicks per 2 minutes. `perf-soak.js` reports
`PAGE STUCK` and recovers on its own, but a manual run has no such guard.
