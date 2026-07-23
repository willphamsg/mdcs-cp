import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// export const headerInterceptor: HttpInterceptorFn = (req, next) => {
//   const oAuthService = inject(AuthService);
//   const authToken = oAuthService.getToken();
//   const authReq = req.clone({
//     setHeaders: {
//       Authorization: `Bearer ${authToken}`,
//       'Content-Type': 'application/json',
//       'Access-Control-Allow-Origin': '*',
//     },
//   });

//   return next(authReq).pipe();
// };

export const headerInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const isFormData = req.body instanceof FormData;
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const authReq = req.clone({ setHeaders: headers });

  return next(authReq);
};
