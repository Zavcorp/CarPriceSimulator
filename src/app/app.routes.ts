import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/public/vehicle-catalog/vehicle-catalog')
        .then(m => m.VehicleCatalog),
    title: 'Catálogo de Vehículos',
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout')
        .then(m => m.AdminLayout),
    title: 'Panel Administrador',
    children: [
      {
        path: '',
        redirectTo: 'upload',
        pathMatch: 'full',
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./features/admin/vehicle-upload/vehicle-upload')
            .then(m => m.VehicleUpload),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/admin/upload-history/upload-history')
            .then(m => m.UploadHistoryC),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
