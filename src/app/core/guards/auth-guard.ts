import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/'], { queryParams: { openLogin: true } });
  }

  // Verificar que tenga rol admin, no solo estar autenticado
  if (!auth.isAdmin()) {
    return router.createUrlTree(['/'], { queryParams: { unauthorized: true } });
  }

  return true;
};
