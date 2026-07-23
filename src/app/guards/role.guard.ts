// guards/role.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { inject } from '@angular/core';

export const RoleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = route.data?.['roles'] as string[] | undefined;
  const userRoles = authService.getUserRoles();

  if (!expectedRoles || expectedRoles.length === 0) {
    console.warn(`⚠️ No roles defined for route: ${state.url}`);
    router.navigate(['/unauthorized']);
    return false;
  }

  const hasAccess = expectedRoles.some(role => userRoles.includes(role));

  if (!hasAccess) {
    router.navigate(['/unauthorized']);
  }

  return hasAccess;
};
