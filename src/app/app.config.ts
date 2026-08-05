import {
  ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideEnvironmentInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { offlineOptedIn } from './core/services/offline.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    // Offline caching is opt-in, so this only registers for someone who turned it on
    // (OfflineService writes that preference). isDevMode() keeps it out of `ng serve`
    // entirely, where a service worker fights live reload.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && offlineOptedIn(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Instantiates PwaUpdateService as part of bootstrap (rather than injecting it from a
    // component) so the update watcher exists app-wide without app.ts needing to know about it.
    provideEnvironmentInitializer(() => inject(PwaUpdateService)),
  ]
};
