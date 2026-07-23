import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenRefreshService } from './token-refresh.service';

// Axios-style response interceptor: on a 401, if we have an access token in
// session storage (i.e. the user was signed in), renew it and retry the
// original request once. Sits after sessionExpiryInterceptor in the
// outgoing interceptor chain so it sees 401 responses first (interceptor
// response handling runs in reverse array order) and gets a chance to
// renew-and-retry before sessionExpiryInterceptor's hard logout kicks in.
export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !authService.getToken()) {
        return throwError(() => error);
      }

      return tokenRefreshService.renewAndGetToken().pipe(
        switchMap(accessToken => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${accessToken}` },
          });
          return next(retryReq);
        }),
        catchError(() => throwError(() => error))
      );
    })
  );
};
