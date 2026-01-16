import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./portfolio/portfolio.component').then(m => m.PortfolioComponent)
  },
  {
    path: 'auth',
    loadComponent: () => import('./otp-auth/otp-auth.component').then(m => m.OtpAuthComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
