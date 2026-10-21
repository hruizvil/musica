import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

export const authGuard = async () => {
  const firebase = inject(FirebaseService);
  const router = inject(Router);
  if (await firebase.ensureAdminChecked()) return true;
  return router.createUrlTree(['/admin/login']);
};
