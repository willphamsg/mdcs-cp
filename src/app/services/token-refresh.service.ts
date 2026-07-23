import { Injectable, inject } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  map,
  take,
  tap,
  throwError,
} from 'rxjs';
import { ITokenRenewRequest, ITokenRenewResponse } from '@app/models/user';
import { AuthService } from './auth.service';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private readonly authService = inject(AuthService);
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly dynamic = inject(DynamicEndpoint);

  private isRefreshing = false;
  private refreshedAccessToken$ = new BehaviorSubject<string | null>(null);

  // Renews the access/refresh token pair and returns the new access token.
  // Concurrent callers (e.g. several requests failing with 401 at once) share
  // the single in-flight renew call instead of each triggering their own.
  renewAndGetToken(): Observable<string> {
    if (this.isRefreshing) {
      return this.refreshedAccessToken$.pipe(
        filter((token): token is string => token !== null),
        take(1)
      );
    }

    this.isRefreshing = true;
    this.refreshedAccessToken$.next(null);

    const body: ITokenRenewRequest = {
      access_token: this.authService.getToken() || '',
      refresh_token: this.authService.getRefreshToken(),
    };
    const uri = this.dynamic.setDynamicEndpoint('', '');
    return this.http
      .post<ITokenRenewResponse>(
        `${uri}security/token/renew`,
        body
      )
      .pipe(
        map(res => {
          this.applyRenewedTokens(res);
          return res.access_token;
        }),
        tap(accessToken => {
          this.isRefreshing = false;
          this.refreshedAccessToken$.next(accessToken);
        }),
        catchError(err => {
          this.isRefreshing = false;
          return throwError(() => err);
        })
      );
  }

  private applyRenewedTokens(res: ITokenRenewResponse): void {
    this.authService.saveToken(res.access_token);
    if (res.refresh_token) {
      this.authService.saveRefreshToken(res.refresh_token);
    }
  }
}
