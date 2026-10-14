import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/**
 * Every SVG the app renders through `<img src>` or CSS `url()`. Keep this in
 * sync when adding an icon, and reference icons by these exact root-absolute
 * paths - a relative `url('../../assets/..')` in SCSS gets rewritten by the
 * CLI to a separate `/media/..` copy, which Blink treats as a different image.
 */
export const APP_SVG_ICONS: readonly string[] = [
  '/assets/icons/calendar_small.svg',
  '/assets/icons/camera.svg',
  '/assets/icons/circle-check.svg',
  '/assets/icons/circle-cross.svg',
  '/assets/icons/circle-warning.svg',
  '/assets/icons/clear_next_arrow.svg',
  '/assets/icons/clear_prev_arrow.svg',
  '/assets/icons/clock.svg',
  '/assets/icons/dailog-download-icon.svg',
  '/assets/icons/disabled_checkbox.svg',
  '/assets/icons/do-not-disturb-on.svg',
  '/assets/icons/download-icon.svg',
  '/assets/icons/download.svg',
  '/assets/icons/download_white.svg',
  '/assets/icons/dropdown.svg',
  '/assets/icons/export.svg',
  '/assets/icons/eye.svg',
  '/assets/icons/failed-download.svg',
  '/assets/icons/folder-close.svg',
  '/assets/icons/folder-empty.svg',
  '/assets/icons/folder-item.svg',
  '/assets/icons/folder-white.svg',
  '/assets/icons/folder.svg',
  '/assets/icons/grayed_checkbox.svg',
  '/assets/icons/import.svg',
  '/assets/icons/info.svg',
  '/assets/icons/mdcs-icon-delete.svg',
  '/assets/icons/menu-close.svg',
  '/assets/icons/menu-open.svg',
  '/assets/icons/next_arrow_white.svg',
  '/assets/icons/prev_arrow_white.svg',
  '/assets/icons/selected_checkbox.svg',
  '/assets/icons/shutdown.svg',
  '/assets/icons/sort.svg',
  '/assets/icons/union.svg',
  '/assets/icons/white_checkbox.svg',
  '/assets/images/filter.svg',
];

/**
 * Blink renders each SVG image as its own isolated document + frame, created
 * the first time the icon is shown and dropped whenever the image cache lets
 * go of it. Left alone, the app's Documents/Frames/Nodes counters therefore
 * drift with whichever pages were visited recently rather than with anything
 * the app actually holds on to. Decoding the full, fixed icon set once at
 * startup and keeping it referenced gives every later `<img>`/`url()` a cache
 * hit on the same document, so those counters stay flat for the session.
 */
@Injectable({
  providedIn: 'root',
})
export class SvgIconCacheService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly images: HTMLImageElement[] = [];

  preload(icons: readonly string[] = APP_SVG_ICONS): void {
    if (!isPlatformBrowser(this.platformId) || this.images.length > 0) {
      return;
    }
    for (const src of icons) {
      const img = new Image();
      img.src = src;
      this.images.push(img);
    }
  }

  get size(): number {
    return this.images.length;
  }
}
