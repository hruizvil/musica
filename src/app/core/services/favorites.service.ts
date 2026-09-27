import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';

/**
 * The one way to favourite a song, from anywhere — a card in a list or the song page.
 *
 * Signed out, the heart used to be missing altogether, so nobody could tell the feature
 * existed. Now it is always there: signed in it saves and says so, signed out it opens
 * the sign-in prompt instead of doing nothing.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private firebase = inject(FirebaseService);

  /** The "sign in to save" prompt, rendered once by the shell. */
  readonly promptOpen = signal(false);
  /** A short confirmation, rendered once by the shell. */
  readonly toast = signal<{ text: string; linkToLibrary: boolean } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  isFavorite(songId: string): boolean {
    return this.firebase.favorites().has(songId);
  }

  async toggle(songId: string): Promise<void> {
    // Firebase loads after the first paint, and until it does a signed-in visitor looks
    // signed out. Deciding before that would show the sign-in prompt to someone who is
    // already signed in.
    await this.firebase.waitForAuthReady();
    if (!this.firebase.currentUser()) {
      this.promptOpen.set(true);
      return;
    }

    const adding = !this.isFavorite(songId);
    try {
      await this.firebase.toggleFavorite(songId);
      this.flash(adding ? 'Salva nas favoritas' : 'Removida das favoritas', adding);
    } catch {
      // The heart has already been put back by the service; say why it moved.
      this.flash('Não foi possível salvar. Tente de novo.', false);
    }
  }

  closePrompt(): void {
    this.promptOpen.set(false);
  }

  private flash(text: string, linkToLibrary: boolean): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, linkToLibrary });
    this.toastTimer = setTimeout(() => this.toast.set(null), 2800);
  }
}
