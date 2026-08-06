import {
  ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners, provideEnvironmentInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { offlineOptedIn } from './core/services/offline.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Angular leaves the scroll position alone by default, so opening a song from
    // halfway down the list lands you halfway down the song. 'enabled' sends a new
    // navigation to the top and restores your old position on Back, which is what
    // both the browser's back button and a long song list need.
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
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
