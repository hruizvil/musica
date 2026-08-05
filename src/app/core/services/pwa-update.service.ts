import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

/**
 * Surfaces a new build instead of forcing it. The app is used with a video playing and
 * lyrics on screen — a roda or a class — so reloading the page the moment a deploy lands
 * would cut the song off mid-verse. The update is downloaded in the background and the
 * user decides when to take it; activation is deferred until then so the running page
 * never ends up asking the new service worker for chunks the old build referenced.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly updates = inject(SwUpdate);

  /** True once a newer build is downloaded and waiting to be activated. */
  readonly updateReady = signal(false);

  constructor() {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));

    // A broken cache can't be recovered in place; a full reload refetches from the network.
    this.updates.unrecoverable.subscribe(() => document.location.reload());
  }

  async applyUpdate(): Promise<void> {
    await this.updates.activateUpdate();
    document.location.reload();
  }

  dismiss(): void {
    this.updateReady.set(false);
  }
}
