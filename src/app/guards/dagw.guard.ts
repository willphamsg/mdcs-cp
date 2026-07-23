import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { inject } from '@angular/core';
import { AuthService } from '@app/services/auth.service';

export const DagwGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isDagw()) {
    return true;
  } else {
    inject(Router).navigate(['/']);
    return false;
  }
};

export const MdcsGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isDagw()) {
    inject(Router).navigate(['/']);
    return false;
  } else {
    return true;
  }
};
