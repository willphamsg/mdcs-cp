import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_SVG_ICONS, SvgIconCacheService } from './svg-icon-cache.service';

describe('SvgIconCacheService', () => {
  function create(platform: 'browser' | 'server'): SvgIconCacheService {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platform }],
    });
    return TestBed.inject(SvgIconCacheService);
  }

  it('lists each icon once, by root-absolute path', () => {
    expect(new Set(APP_SVG_ICONS).size).toBe(APP_SVG_ICONS.length);
    for (const src of APP_SVG_ICONS) {
      expect(src).toMatch(/^\/assets\/.+\.svg$/);
    }
  });

  it('holds on to one image per icon in the browser', () => {
    const service = create('browser');
    const icons = ['/assets/icons/eye.svg', '/assets/icons/sort.svg'];

    service.preload(icons);

    expect(service.size).toBe(2);
    const srcs = service['images'].map(img => new URL(img.src).pathname);
    expect(srcs).toEqual(icons);
  });

  it('only preloads once, so repeated calls do not stack up images', () => {
    const service = create('browser');

    service.preload(['/assets/icons/eye.svg']);
    service.preload(['/assets/icons/eye.svg', '/assets/icons/sort.svg']);

    expect(service.size).toBe(1);
  });

  it('defaults to the full app icon set', () => {
    const service = create('browser');

    service.preload();

    expect(service.size).toBe(APP_SVG_ICONS.length);
  });

  it('does nothing during server-side rendering', () => {
    const service = create('server');

    service.preload();

    expect(service.size).toBe(0);
  });
});
