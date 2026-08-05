import { Injectable, signal } from '@angular/core';

export const OFFLINE_KEY = 'capoeira-offline';

/** True when the user has opted in to offline caching. Read at bootstrap too. */
export function offlineOptedIn(): boolean {
  try {
    return localStorage.getItem(OFFLINE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Offline caching is opt-in. Registering a service worker writes a copy of the whole app
 * to someone's device and takes over serving it — not something to do to a visitor without
 * asking. Turning it off unregisters the worker and drops its caches, so nothing of ours
 * is left behind.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  readonly enabled = signal<boolean>(offlineOptedIn());
  readonly busy = signal(false);

  readonly supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  async toggle(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (this.enabled()) await this.disable();
      else await this.enable();
    } finally {
      this.busy.set(false);
    }
  }

  private async enable(): Promise<void> {
    this.write('1');
    this.enabled.set(true);
    if (!this.supported) return;
    try {
      // Registered here so caching starts on the tap rather than after a reload. Angular's
      // SwUpdate wiring only attaches on the next load, so update prompts begin next visit.
      await navigator.serviceWorker.register('ngsw-worker.js');
    } catch {
      // A failed registration leaves the preference on; the next load retries via
      // provideServiceWorker. Nothing to show the user beyond the switch state.
    }
  }

  private async disable(): Promise<void> {
    this.write('0');
    this.enabled.set(false);
    if (!this.supported) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      const names = await caches.keys();
      await Promise.all(names.filter(n => n.startsWith('ngsw:')).map(n => caches.delete(n)));
    } catch {
      // Best effort: the preference is already off, so nothing re-registers on next load.
    }
  }

  private write(value: string): void {
    try {
      localStorage.setItem(OFFLINE_KEY, value);
    } catch {
      // storage unavailable (private mode) — the switch still works for this session
    }
  }
}
