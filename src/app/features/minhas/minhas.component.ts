import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { SongCardComponent } from '../../shared/components/song-card/song-card.component';
import { Song } from '../../core/models/song.model';

/**
 * Everything the user has marked, in one place: favourites and learned. Both live on
 * the account, so this page asks for a sign-in before it has anything to show.
 */
@Component({
  selector: 'app-minhas',
  standalone: true,
  imports: [RouterLink, SongCardComponent],
  template: `
    <div class="space-y-8">

      <div>
        <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">Minhas</h1>
        <p class="text-stone-400 text-sm mt-1">Suas favoritas e aprendidas.</p>
      </div>

      @if (firebase.currentUser()) {

        <section class="space-y-3">
          <div class="flex items-center gap-3 flex-wrap">
            <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest">
              Favoritas
              @if (favorites().length) { <span class="text-stone-300 dark:text-stone-600">· {{ favorites().length }}</span> }
            </h2>
            <!-- The favourites are the setlist now, and this is the way in to playing them. -->
            @if (favorites().length) {
              <a routerLink="/minhas/tocar"
                 class="flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-capoeira-gold text-capoeira-brown text-sm font-bold hover:bg-amber-400 transition-colors shadow-sm">
                ▶ Tocar favoritas
              </a>
            }
          </div>
          @if (favorites().length) {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              @for (song of favorites(); track song.id) {
                <app-song-card [song]="song" />
              }
            </div>
          } @else {
            <p class="text-sm text-stone-400">Você ainda não marcou nenhuma música como favorita.</p>
          }
        </section>

        <section class="space-y-3">
          <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Aprendidas
            @if (learned().length) { <span class="text-stone-300 dark:text-stone-600">· {{ learned().length }}</span> }
          </h2>
          @if (learned().length) {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              @for (song of learned(); track song.id) {
                <app-song-card [song]="song" />
              }
            </div>
          } @else {
            <p class="text-sm text-stone-400">Você ainda não marcou nenhuma música como aprendida.</p>
          }
        </section>

      } @else if (firebase.pendingSignedIn()) {
        <!-- Returning user, Firebase still loading: hold the space instead of asking
             someone who is signed in to sign in. -->
        <div aria-hidden="true" class="space-y-3">
          <div class="h-4 w-28 rounded bg-stone-200 dark:bg-stone-800 animate-pulse"></div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <div class="h-28 rounded-2xl bg-stone-100 dark:bg-stone-800/60 animate-pulse"></div>
            <div class="h-28 rounded-2xl bg-stone-100 dark:bg-stone-800/60 animate-pulse"></div>
            <div class="h-28 rounded-2xl bg-stone-100 dark:bg-stone-800/60 animate-pulse"></div>
          </div>
        </div>
      } @else {
        <section class="rounded-xl border border-capoeira-gold/30 bg-capoeira-gold/5 dark:bg-capoeira-gold/10 p-5 space-y-2">
          <h2 class="text-sm font-bold text-capoeira-brown dark:text-capoeira-gold">Favoritas e aprendidas</h2>
          <p class="text-sm text-stone-600 dark:text-stone-300">
            Entre na sua conta para marcar músicas e encontrá-las em qualquer aparelho.
          </p>
          <a routerLink="/login"
             class="inline-block mt-1 px-4 py-2 rounded-xl bg-capoeira-gold text-capoeira-brown text-sm font-bold hover:bg-amber-400 transition-colors shadow-sm">
            Entrar
          </a>
        </section>
      }

    </div>
  `,
})
export class MinhasComponent {
  private data = inject(DataService);
  readonly firebase = inject(FirebaseService);

  /** Starred order, so the grid here and the player read in the same sequence. */
  readonly favorites = computed<Song[]>(() => {
    const byId = this.data.songById();
    return [...this.firebase.favorites()]
      .map(id => byId.get(id))
      .filter((song): song is Song => !!song);
  });

  readonly learned = computed(() => {
    const ids = this.firebase.learnedSongs();
    return this.data.songs().filter(song => ids.has(song.id));
  });
}
