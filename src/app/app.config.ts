import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { headerInterceptor } from './services/header.interceptor';
import { sessionExpiryInterceptor } from './services/session-expiry.interceptor';
import { tokenRefreshInterceptor } from './services/token-refresh.interceptor';
import { requestLogInterceptor } from './services/request-log.interceptor';
import { provideStore } from '@ngrx/store';
import { appStore } from './store/app.state';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      })
    ),
    provideAnimationsAsync(),
    provideOAuthClient(),
    provideHttpClient(withFetch(), withInterceptors([headerInterceptor, tokenRefreshInterceptor, requestLogInterceptor])),
    provideStore(appStore),
    provideCharts(withDefaultRegisterables()),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { subscriptSizing: 'dynamic', appearance: 'outline' },
    },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } },
  ],
};
