import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class DynamicEndpoint {
  private readonly isDynamic = environment.useDynamicEndpoint;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  public setDynamicEndpoint(module: string, uri: string): string {
    if (this.isDynamic && isPlatformBrowser(this.platformId)) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;

      const url = uri.split(':')[2] ?? '';
      let endpoint = '';

      url.split('/').forEach((value, index) => {
        if (index !== 0 && value !== '') {
          endpoint += `${value}/`;
        }
      });

      const modulePrefix = module ? '/' : '';
      uri = environment.useDummyData
        ? `http://localhost:3000${modulePrefix}${module}/${endpoint}`
        : `${protocol}//${hostname}:${port}${modulePrefix}${module}/${endpoint}`;
    }

    return uri;
  }
}
