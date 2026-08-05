import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RodaService } from '../../core/services/roda.service';
import { DataService } from '../../core/services/data.service';
import { Song } from '../../core/models/song.model';
import { YoutubeEmbedComponent } from '../../shared/components/youtube-embed/youtube-embed.component';

@Component({
  selector: 'app-roda',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">Roda</h1>
          <p class="text-stone-400 text-sm mt-1">{{ queuedSongs().length }} música(s) na fila</p>
        </div>
        @if (queuedSongs().length) {
          <button (click)="clearAll()"
            class="px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-red-500 hover:border-red-300 text-sm font-medium transition-colors bg-white dark:bg-stone-900 shadow-sm">
            Limpar roda
          </button>
        }
      </div>

      @if (!queuedSongs().length) {
        <div class="text-center py-16 px-4">
          <p class="text-stone-400 max-w-sm mx-auto leading-relaxed">
            Sua roda está vazia. Abra uma música e toque em
            <span class="text-capoeira-gold font-semibold">"+ Adicionar à roda"</span>
            para montar a fila de hoje.
          </p>
          <a routerLink="/musicas" class="inline-block mt-4 text-sm font-semibold text-capoeira-brown dark:text-capoeira-gold hover:underline">
            Ver músicas →
          </a>
        </div>
      } @else {
        <div class="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-8 lg:items-start">

          <!-- Queue -->
          <ol class="space-y-2">
            @for (song of queuedSongs(); track song.id; let i = $index) {
              <li
                class="flex items-center gap-2 p-3 rounded-xl border shadow-sm transition-colors"
                [class]="activeSong()?.id === song.id
                  ? 'border-capoeira-gold/50 bg-capoeira-gold/10'
                  : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900'">
                <button (click)="play(song.id)" class="flex-1 min-w-0 text-left">
                  <p class="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{{ i + 1 }}. {{ song.title }}</p>
                  @if (song.toque.length) {
                    <p class="text-xs text-stone-400 truncate">{{ toqueNames(song) }}</p>
                  }
                </button>
                <div class="flex items-center gap-1 shrink-0">
                  <button (click)="moveUp(i)" [disabled]="i === 0" title="Mover para cima"
                    class="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                    ↑
                  </button>
                  <button (click)="moveDown(i)" [disabled]="i === queuedSongs().length - 1" title="Mover para baixo"
                    class="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-capoeira-gold hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                    ↓
                  </button>
                  <button (click)="remove(song.id)" title="Remover da roda"
                    class="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                    ×
                  </button>
                </div>
              </li>
            }
          </ol>

          <!-- Player -->
          <div class="mt-8 lg:mt-0 space-y-4">
            @if (activeSong()) {
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-bold text-stone-700 dark:text-stone-200 truncate">{{ activeSong()!.title }}</h2>
                @if (activeSong()!.refrao) {
                  <button (click)="bigView.set(!bigView())"
                    class="shrink-0 px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold hover:border-capoeira-gold text-xs font-semibold transition-colors bg-white dark:bg-stone-900 shadow-sm">
                    Modo Coro
                  </button>
                }
              </div>

              @if (activeSong()!.audioLinks.youtube) {
                <app-youtube-embed [videoId]="activeSong()!.audioLinks.youtube!" [title]="activeSong()!.title" />
              } @else {
                <div class="w-full aspect-video rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-sm">
                  Vídeo não disponível
                </div>
              }

              <div class="flex items-center justify-between gap-2">
                <button (click)="prev()" [disabled]="activeIndex() <= 0"
                  class="px-4 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-capoeira-gold text-sm font-semibold disabled:opacity-30 transition-colors bg-white dark:bg-stone-900 shadow-sm">
                  ← Anterior
                </button>
                <a [routerLink]="['/musicas', activeSong()!.id]"
                  class="px-1.5 py-2 rounded text-xs text-stone-400 hover:text-capoeira-gold hover:underline">
                  Ver letra completa
                </a>
                <button (click)="next()" [disabled]="activeIndex() >= queuedSongs().length - 1"
                  class="px-4 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-capoeira-gold text-sm font-semibold disabled:opacity-30 transition-colors bg-white dark:bg-stone-900 shadow-sm">
                  Próxima →
                </button>
              </div>
            }
          </div>

        </div>
      }
    </div>

    <!-- Big-type coro view for call-and-response — minimal chrome, legible at arm's length. -->
    @if (bigView() && activeSong()?.refrao) {
      <div class="fixed inset-0 z-[70] bg-white dark:bg-stone-950 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto text-center">
        <button (click)="bigView.set(false)"
          class="absolute top-4 right-4 px-4 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-capoeira-brown dark:hover:text-capoeira-gold text-sm font-semibold transition-colors">
          Fechar
        </button>
        <p class="font-display font-bold text-capoeira-brown dark:text-capoeira-cream leading-tight whitespace-pre-wrap text-4xl sm:text-6xl">{{ activeSong()!.refrao }}</p>
        @if (activeSong()!.refraoTranslation) {
          <p class="mt-6 text-stone-500 dark:text-stone-400 italic leading-tight whitespace-pre-wrap text-xl sm:text-3xl">{{ activeSong()!.refraoTranslation }}</p>
        }
      </div>
    }
  `,
})
export class RodaComponent {
  private roda = inject(RodaService);
  private data = inject(DataService);

  /** Which song is playing, chosen by id so reordering/removal never leaves a stale index. */
  private activeId = signal<string | null>(null);
  readonly bigView = signal(false);

  readonly queuedSongs = computed(() =>
    this.roda.ids()
      .map(id => this.data.songById().get(id))
      .filter((s): s is Song => !!s)
  );

  readonly activeSong = computed(() => {
    const songs = this.queuedSongs();
    if (!songs.length) return null;
    return songs.find(s => s.id === this.activeId()) ?? songs[0];
  });

  readonly activeIndex = computed(() => {
    const active = this.activeSong();
    return active ? this.queuedSongs().findIndex(s => s.id === active.id) : -1;
  });

  play(id: string): void {
    this.activeId.set(id);
    this.bigView.set(false);
  }

  next(): void {
    const songs = this.queuedSongs();
    const idx = this.activeIndex();
    if (idx < 0 || idx >= songs.length - 1) return;
    this.play(songs[idx + 1].id);
  }

  prev(): void {
    const songs = this.queuedSongs();
    const idx = this.activeIndex();
    if (idx <= 0) return;
    this.play(songs[idx - 1].id);
  }

  remove(id: string): void {
    this.roda.remove(id);
  }

  moveUp(index: number): void {
    this.roda.reorder(index, -1);
  }

  moveDown(index: number): void {
    this.roda.reorder(index, 1);
  }

  clearAll(): void {
    this.roda.clear();
    this.activeId.set(null);
  }

  toqueNames(song: Song): string {
    return song.toque.map(t => this.data.toqueById().get(t)?.name ?? t).join(', ');
  }
}
