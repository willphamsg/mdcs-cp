import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, throwError } from 'rxjs';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { AppStore } from '@app/store/app.state';
import { AuthService } from './auth.service';
import { CommonService } from './common.service';

export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store<AppStore>);
  const authService = inject(AuthService);
  const commonService = inject(CommonService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && error.statusText === 'Unauthorized') {
        // Show red error toast
        store.dispatch(
          showSnackbar({
            message: 'Session expired. You will be redirected to login.',
            title: 'Session Expired',
            typeSnackbar: 'error',
          })
        );

        // Get settings and perform logout with proper URL
        return commonService.getSettingDefault().pipe(
          switchMap(settings => {
            // Perform logout
            authService.logout();

            // Redirect to proper logout URL
            if (settings?.authenticate_adfs_url) {
              window.location.href = '/adfs-logout';
            } else {
              window.location.href = settings?.logout_url || '/';
            }

            return throwError(() => error);
          }),
          catchError(() => {
            // Fallback if settings call fails
            authService.logout();
            window.location.href = '/identification/login.html';
            return throwError(() => error);
          })
        );
      }

      return throwError(() => error);
    })
  );
}; 