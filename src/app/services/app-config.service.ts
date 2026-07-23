import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config: any;
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  constructor(
    private readonly http: HttpClient
  ) {}

  loadConfig(): Promise<void> {
    return this.http.get('/assets/app-config.json')
      .toPromise()
      .then((config: any) => {
        this.config = config;

        // Set environment flags dynamically
        const APP_MODE = this.config.APP_MODE?.toLowerCase();
        environment.dagw = APP_MODE === 'dagw';
        environment.version = this.config.version || environment.version;

        // Optionally expose globally
        if (this.isBrowser()) {
          (window as any).__appConfig = config;
        }
      })
      .catch(err => {
        console.error('Failed to load configuration:', err);
      });
  }

  getConfig(key: string): any {
    return this.config ? this.config[key] : null;
  }

  get appMode(): string {
    return this.config?.APP_MODE;
  }

  get dagwDepot(): number {
    return this.config?.DAGW_DEPOT;
  }
}