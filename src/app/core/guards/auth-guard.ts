import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard para rutas de administrador.
 * Redirige al catálogo público si no está autenticado.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Redirigir al home con parámetro para abrir login
  return router.createUrlTree(['/'], { queryParams: { openLogin: true } });
};

