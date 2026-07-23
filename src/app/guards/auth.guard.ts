import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { Observable, map, tap } from 'rxjs';

export const AuthGuard: CanActivateFn = (
  route,
  state
):
  | Observable<boolean | UrlTree>
  | Promise<boolean | UrlTree>
  | boolean
  | UrlTree => {
  const service = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const redirectToLogin = () => {
    const returnUrl = encodeURIComponent(state.url);
    const loginUrl = `/identification/login.html?returnUrl=${returnUrl}`;

    // For static files, use window.location.href instead of Angular router
    if (isPlatformBrowser(platformId)) {
      window.location.href = loginUrl;
      return false; // Prevent navigation, we're doing a full page redirect
    }
    // Fallback for SSR
    return router.createUrlTree(['/identification/login.html'], {
      queryParams: { returnUrl: state.url },
    });
  };

  if (environment.enableSSO) {
    return service.canActivateProtectedRoutes$.pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          return redirectToLogin();
        }
        return true;
      }),
      tap(result =>
        console.log(
          `AuthGuard: Attempted to access ${state.url}, result: ${result}`
        )
      )
    );
  }

  const isAuthenticated = service.isAuthenticated();
  if (!isAuthenticated) {
    return redirectToLogin();
  }
  return true;
};
