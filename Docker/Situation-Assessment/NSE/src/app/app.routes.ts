import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'devices/:subnet',
    loadComponent: () => import('./components/device-table/device-table.component').then(m => m.DeviceTableComponent)
  },
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full'
  }
];