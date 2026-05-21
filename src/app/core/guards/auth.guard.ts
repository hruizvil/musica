import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

export const authGuard = async () => {
  const firebase = inject(FirebaseService);
  const router = inject(Router);
  await firebase.waitForAuthReady();
  if (firebase.isAdmin()) return true;
  return router.createUrlTree(['/admin/login']);
};
