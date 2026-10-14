import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@app/services/auth.service';

export const DagwGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isDagw()) {
    return true;
  } else {
    void inject(Router).navigate(['/']);
    return false;
  }
};

export const MdcsGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isDagw()) {
    void inject(Router).navigate(['/']);
    return false;
  } else {
    return true;
  }
};
