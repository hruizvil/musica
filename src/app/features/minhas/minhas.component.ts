import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { RodaService } from '../../core/services/roda.service';
import { SongCardComponent } from '../../shared/components/song-card/song-card.component';
import { Song } from '../../core/models/song.model';

/**
 * Everything the user has marked, in one place: favourites, learned, and the roda
 * queue. Favourites and learned live on the account; the queue is on the device,
 * so this page is still worth opening while signed out.
 */
@Component({
  selector: 'app-minhas',
  standalone: true,
  imports: [RouterLink, SongCardComponent],
  template: `
    <div class="space-y-8">

      <div>
        <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">Minhas</h1>
        <p class="text-stone-400 text-sm mt-1">Suas favoritas, aprendidas e a fila da roda.</p>
      </div>

      <!-- Fila da roda. Device-local, so it shows whether or not anyone is signed in. -->
      <section class="space-y-3">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest">Fila da roda</h2>
          @if (rodaSongs().length) {
            <a routerLink="/roda" class="text-xs font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline">
              Abrir a roda →
            </a>
          }
        </div>
        @if (rodaSongs().length) {
          <ol class="space-y-2">
            @for (song of rodaSongs(); track song.id; let i = $index) {
              <li>
                <a [routerLink]="['/musicas', song.id]"
                   class="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-sm hover:border-capoeira-gold/40 transition-colors">
                  <span class="w-6 h-6 shrink-0 rounded-full bg-capoeira-gold/15 text-capoeira-brown dark:text-capoeira-gold text-xs font-bold flex items-center justify-center">
                    {{ i + 1 }}
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{{ song.title }}</span>
                    @if (song.toque.length) {
                      <span class="block text-xs text-stone-400 truncate">{{ toqueName(song.toque[0]) }}</span>
                    }
                  </span>
                </a>
              </li>
            }
          </ol>
        } @else {
          <p class="text-sm text-stone-400">
            A fila está vazia. Abra uma música e toque em <span class="font-medium">Adicionar à roda</span>.
          </p>
        }
      </section>

      @if (firebase.currentUser()) {

        <section class="space-y-3">
          <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Favoritas
            @if (favorites().length) { <span class="text-stone-300 dark:text-stone-600">· {{ favorites().length }}</span> }
          </h2>
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
  private roda = inject(RodaService);
  readonly firebase = inject(FirebaseService);

  /** Queue order is the roda's order, so map over the ids rather than the songs. */
  readonly rodaSongs = computed<Song[]>(() => {
    const byId = this.data.songById();
    return this.roda.ids()
      .map(id => byId.get(id))
      .filter((song): song is Song => !!song);
  });

  readonly favorites = computed(() => this.pick(this.firebase.favorites()));
  readonly learned = computed(() => this.pick(this.firebase.learnedSongs()));

  private pick(ids: ReadonlySet<string>): Song[] {
    return this.data.songs().filter(song => ids.has(song.id));
  }

  toqueName(id: string): string {
    return this.data.toqueById().get(id)?.name ?? id;
  }
}
