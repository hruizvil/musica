import { Component, OnDestroy, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Song } from '../../core/models/song.model';
import { YoutubeEmbedComponent } from '../../shared/components/youtube-embed/youtube-embed.component';
import { NovoIconComponent, NovoStatusComponent, NovoTempoComponent } from './novo-ui';
import { isPracticeWord, lineCount, stanzas } from './novo-utils';

type Modo = 'ler' | 'lado' | 'praticar';
interface Word { text: string; key: string; hidden: boolean }
interface Line { words: Word[]; en: string }

/**
 * Estúdio song page. The lyrics are the workspace, with three ways to read them:
 *  - Ler: the Portuguese, clean.
 *  - Lado a lado: Portuguese and English line by line.
 *  - Praticar: some words become gaps; tap a gap to check yourself.
 * The player and the "learned" button sit beside the lyrics on a desktop and below them
 * on a phone.
 */
@Component({
  selector: 'app-novo-song',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent, NovoIconComponent, NovoStatusComponent, NovoTempoComponent],
  template: `
    @if (song(); as s) {
      <div class="no-print hidden md:flex h-16 items-center gap-3 px-8 bg-white border-b border-[#e3e6eb]">
        <nav aria-label="Trilha" class="text-sm text-[#5f6778]">
          <a routerLink="/novo/musicas" class="text-[#5f6778] hover:text-[#0f1115]">Músicas</a>
          <span class="mx-1.5 text-[#b3b9c4]">/</span><span class="text-[#0f1115]">{{ s.title }}</span>
        </nav>
        @if (queuePos() >= 0) {
          <div class="ml-auto flex items-center gap-2">
            <span class="n-mono text-xs text-[#5f6778]">{{ queuePos() + 1 }} de {{ queue().length }} na fila</span>
            <a [routerLink]="prevId() ? ['/novo/musicas', prevId()] : null" [attr.aria-disabled]="!prevId()" [queryParamsHandling]="'preserve'"
               class="h-9 px-3 rounded-[10px] border border-[#e3e6eb] inline-flex items-center gap-1.5 text-sm font-semibold"
               [class]="prevId() ? 'text-[#0f1115] bg-white' : 'text-[#b3b9c4] pointer-events-none'"><app-novo-icon name="back" [size]="16" />Anterior</a>
            <a [routerLink]="nextId() ? ['/novo/musicas', nextId()] : null" [attr.aria-disabled]="!nextId()" [queryParamsHandling]="'preserve'"
               class="h-9 px-3 rounded-[10px] border border-[#e3e6eb] inline-flex items-center gap-1.5 text-sm font-semibold"
               [class]="nextId() ? 'text-[#0f1115] bg-white' : 'text-[#b3b9c4] pointer-events-none'">Próxima<app-novo-icon name="next" [size]="16" /></a>
          </div>
        }
      </div>

      <div class="max-w-[1320px] mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col lg:flex-row gap-6 items-start">

        <div class="flex-1 min-w-0 w-full flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 flex-wrap">
              <a [routerLink]="['/novo/toques', s.toque[0]]" class="min-h-10 md:min-h-0 inline-flex items-center text-[13px] font-semibold text-[#2146d8] hover:underline">{{ toqueName() }}</a>
              <app-novo-tempo [toque]="toque()" />
              @if (learned() || inQueue()) { <app-novo-status [songId]="s.id" /> }
            </div>
            <h1 class="m-0 text-3xl md:text-[44px] leading-[1.05] font-semibold tracking-[-0.03em]">{{ s.title }}</h1>
            <p class="m-0 text-sm text-[#5f6778]">
              @if (s.composer) { {{ s.composer }} · }
              {{ lines() }} linhas
            </p>
          </div>

          <div class="no-print flex flex-col sm:flex-row sm:items-center gap-3">
            <div role="group" aria-label="Modo de leitura" class="flex gap-0.5 p-1 rounded-[10px] bg-[#eceef2]">
              @for (m of modos(); track m.id) {
                <button type="button" (click)="setModo(m.id)" [attr.aria-pressed]="mode() === m.id"
                  class="flex-1 sm:flex-none h-10 md:h-[34px] px-3.5 rounded-lg text-sm md:text-[13px] font-semibold"
                  [class]="mode() === m.id ? 'bg-white text-[#0f1115] shadow-[0_1px_2px_rgba(15,17,21,0.08)]' : 'text-[#5f6778]'">{{ m.label }}</button>
              }
            </div>
            @if (mode() === 'praticar') {
              <span class="text-[13px] text-[#5f6778]">Cante a linha e toque na lacuna para conferir.</span>
            }
          </div>

          @if (s.refrao) {
            <div class="bg-[#eef1fd] border border-[#d5ddfa] rounded-[14px] p-4 md:p-5 flex flex-col gap-1.5">
              <p class="n-label m-0 !text-[#2146d8]">Coro</p>
              <p class="m-0 text-lg font-semibold whitespace-pre-line text-[#0f1115]">{{ s.refrao }}</p>
              @if (mode() === 'lado' && s.refraoTranslation) {
                <p class="m-0 text-[15px] whitespace-pre-line text-[#434a5a]">{{ s.refraoTranslation }}</p>
              }
            </div>
          }

          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-2 md:p-4 flex flex-col gap-5">
            @if (mode() === 'lado') {
              <div class="hidden sm:grid grid-cols-2 gap-6 px-3.5 pt-1"><p class="n-label m-0">Português</p><p class="n-label m-0">English</p></div>
            }
            @for (stanza of text(); track $index; let si = $index) {
              <div class="flex flex-col gap-0.5">
                @for (line of stanza; track $index) {
                  @if (mode() === 'lado') {
                    <div class="grid sm:grid-cols-2 gap-x-6 gap-y-0.5 px-3.5 py-1.5 rounded-lg hover:bg-[#fafbfc]">
                      <p class="m-0 text-lg md:text-xl leading-snug font-medium text-[#0f1115]">{{ plain(line) }}</p>
                      <p class="m-0 text-base md:text-lg leading-snug text-[#5f6778]">{{ line.en }}</p>
                    </div>
                  } @else {
                    <p class="m-0 px-3.5 py-1.5 rounded-lg text-xl md:text-2xl leading-[1.45] font-medium text-[#0f1115]">
                      @for (w of line.words; track w.key) {
                        @if (mode() === 'praticar' && w.hidden && !revealed().has(w.key)) {
                          <button type="button" (click)="reveal(w.key)" [attr.aria-label]="'Revelar palavra'"
                            class="inline-block align-[-0.1em] h-[0.95em] mx-[0.08em] rounded-md bg-[#dfe4f2] hover:bg-[#c9d3f5]"
                            [style.width.em]="gapWidth(w.text)"></button>{{ ' ' }}
                        } @else {
                          <span [class]="mode() === 'praticar' && w.hidden ? 'text-[#2146d8]' : ''">{{ w.text }}</span>{{ ' ' }}
                        }
                      }
                    </p>
                  }
                }
              </div>
            }
          </div>

          @if (mode() === 'praticar') {
            <div class="no-print flex items-center gap-3 flex-wrap">
              <span class="text-sm text-[#434a5a]">Lacunas conferidas</span>
              <div class="flex-1 min-w-[120px] h-1.5 rounded-full bg-[#e3e6eb] overflow-hidden"><div class="h-full bg-[#2146d8]" [style.width.%]="practicePct()"></div></div>
              <span class="n-mono text-[13px] text-[#434a5a]">{{ revealed().size }} / {{ gapCount() }}</span>
              <button type="button" (click)="revealAll()" class="h-9 px-3 rounded-[10px] border border-[#e3e6eb] bg-white text-sm font-semibold">Mostrar tudo</button>
              <button type="button" (click)="revealed.set(emptySet())" class="h-9 px-3 rounded-[10px] border border-[#e3e6eb] bg-white text-sm font-semibold">Recomeçar</button>
            </div>
          }
        </div>

        <aside class="no-print w-full lg:w-[420px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">
          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-3.5 flex flex-col gap-2">
            @if (video(); as v) {
              <app-youtube-embed [videoId]="v.id" [title]="v.title" />
              @if (v.fromToque) {
                <p class="m-0 px-1 text-[13px] text-[#5f6778]">Esta cantiga ainda não tem gravação. Acima, o toque <a [routerLink]="['/novo/toques', s.toque[0]]" class="font-semibold text-[#2146d8]">{{ toqueName() }}</a>.</p>
              }
            } @else {
              <div class="aspect-video rounded-[10px] bg-[#f6f7f9] border border-dashed border-[#c9ced8] flex items-center justify-center text-sm text-[#5f6778] text-center px-6">Ainda não há gravação desta cantiga nem do seu toque.</div>
            }
          </div>

          <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-3.5 flex flex-col gap-3">
            <button type="button" (click)="toggleLearned()" [attr.aria-pressed]="learned()"
              class="h-12 rounded-[10px] border flex items-center justify-center gap-2 text-[15px] font-semibold"
              [class]="learned() ? 'bg-[#0b7a55] border-[#0b7a55] text-white' : 'bg-[#e6f5ee] border-[#0b7a55] text-[#0b7a55]'">
              <app-novo-icon name="check" [size]="18" />{{ learned() ? 'Aprendida' : 'Marcar como aprendida' }}
            </button>
            <div class="flex gap-2">
              <button type="button" (click)="favorites.toggle(s.id)" [attr.aria-pressed]="inQueue()"
                class="flex-1 h-11 md:h-10 rounded-[10px] border flex items-center justify-center gap-2 text-sm font-semibold"
                [class]="inQueue() ? 'bg-[#fdf0f2] border-[#f3c4ca] text-[#c6283a]' : 'bg-white border-[#e3e6eb] text-[#0f1115]'">
                <svg width="16" height="16" viewBox="0 0 24 24" [attr.fill]="inQueue() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                {{ inQueue() ? 'Na fila' : 'Pôr na fila' }}
              </button>
              <button type="button" (click)="share()" [attr.aria-label]="shared() ? 'Link copiado' : 'Compartilhar'" class="w-11 md:w-10 h-11 md:h-10 rounded-[10px] border border-[#e3e6eb] bg-white flex items-center justify-center">
                <app-novo-icon [name]="shared() ? 'check' : 'share'" [size]="16" />
              </button>
              <button type="button" (click)="print()" aria-label="Imprimir" class="w-11 md:w-10 h-11 md:h-10 rounded-[10px] border border-[#e3e6eb] bg-white flex items-center justify-center">
                <app-novo-icon name="print" [size]="16" />
              </button>
            </div>
          </div>

          @if (s.notes || s.themes.length) {
            <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 flex flex-col gap-2.5">
              <p class="n-label m-0">Sobre</p>
              @if (s.notes) { <p class="m-0 text-sm leading-relaxed text-[#434a5a]">{{ s.notes }}</p> }
              @if (s.themes.length) {
                <div class="flex flex-wrap gap-1.5">
                  @for (t of s.themes; track t) {
                    <a routerLink="/novo/musicas" [queryParams]="{ q: t }" class="min-h-9 md:min-h-0 inline-flex items-center px-2.5 md:px-2 py-0.5 rounded-md bg-[#f6f7f9] border border-[#e3e6eb] text-xs text-[#434a5a] hover:border-[#2146d8]">{{ t }}</a>
                  }
                </div>
              }
            </div>
          }

          @if (sameToque().length) {
            <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 flex flex-col gap-1">
              <p class="n-label m-0 pb-1">Também em {{ toqueName() }}</p>
              @for (o of sameToque(); track o.id) {
                <a [routerLink]="['/novo/musicas', o.id]" class="min-h-10 flex items-center justify-between gap-2 text-sm font-medium text-[#0f1115] hover:text-[#2146d8]">
                  {{ o.title }} <app-novo-status [songId]="o.id" />
                </a>
              }
            </div>
          }
        </aside>
      </div>
    } @else if (data.songsLoaded()) {
      <div class="max-w-md mx-auto px-4 py-20 text-center flex flex-col gap-4 items-center">
        <h1 class="m-0 text-2xl font-semibold">Cantiga não encontrada</h1>
        <a routerLink="/novo/musicas" class="h-10 px-4 rounded-[10px] bg-[#2146d8] text-white text-sm font-semibold inline-flex items-center">Ver todas as cantigas</a>
      </div>
    }
  `,
})
export class NovoSongComponent implements OnDestroy {
  readonly data = inject(DataService);
  readonly firebase = inject(FirebaseService);
  readonly favorites = inject(FavoritesService);
  private router = inject(Router);
  private titleService = inject(Title);

  id = input.required<string>();
  /** ?modo= in the address: ler (default), lado or praticar. */
  modo = input<string>();

  readonly song = computed(() => this.data.songById().get(this.id()));
  readonly toque = computed(() => this.data.toqueById().get(this.song()?.toque[0] ?? ''));
  readonly toqueName = computed(() => this.toque()?.name ?? '');
  readonly lines = computed(() => (this.song() ? lineCount(this.song()!) : 0));

  readonly mode = computed<Modo>(() => {
    const m = this.modo();
    if (m === 'praticar') return 'praticar';
    if (m === 'lado' && this.song()?.translation) return 'lado';
    return 'ler';
  });
  readonly modos = computed(() => [
    { id: 'ler' as Modo, label: 'Ler' },
    ...(this.song()?.translation ? [{ id: 'lado' as Modo, label: 'Lado a lado' }] : []),
    { id: 'praticar' as Modo, label: 'Praticar' },
  ]);

  /** Lyrics split into stanzas and lines, each word tagged with whether practice hides it. */
  readonly text = computed<Line[][]>(() => {
    const s = this.song();
    if (!s) return [];
    const pt = stanzas(s.lyrics); const en = stanzas(s.translation);
    let n = 0;
    return pt.map((stanza, si) => stanza.map((line, li) => ({
      en: en[si]?.[li] ?? '',
      words: line.split(/\s+/).map((w, wi) => {
        const candidate = isPracticeWord(w);
        const hidden = candidate && n++ % 2 === 0;
        return { text: w, key: si + '-' + li + '-' + wi, hidden };
      }),
    })));
  });

  readonly gapCount = computed(() => this.text().flat().flatMap(l => l.words).filter(w => w.hidden).length);
  /** Gaps opened so far; a different song starts with all of them closed again. */
  readonly revealed = linkedSignal<string, Set<string>>({ source: () => this.id(), computation: () => new Set() });
  readonly practicePct = computed(() => (this.gapCount() ? (this.revealed().size / this.gapCount()) * 100 : 0));

  readonly learned = computed(() => this.firebase.learnedSongs().has(this.id()));
  readonly inQueue = computed(() => this.firebase.favorites().has(this.id()));

  readonly queue = computed(() => [...this.firebase.favorites()].filter(id => this.data.songById().has(id)));
  readonly queuePos = computed(() => this.queue().indexOf(this.id()));
  readonly prevId = computed(() => (this.queuePos() > 0 ? this.queue()[this.queuePos() - 1] : null));
  readonly nextId = computed(() => {
    const i = this.queuePos();
    return i >= 0 && i < this.queue().length - 1 ? this.queue()[i + 1] : null;
  });

  /** The song's own recording; failing that, a demonstration of its toque. */
  readonly video = computed(() => {
    const s = this.song();
    if (!s) return null;
    if (s.audioLinks.youtube) return { id: s.audioLinks.youtube, title: s.title, fromToque: false };
    for (const tid of s.toque) {
      const demo = this.data.videosByToque().get(tid)?.[0];
      if (demo) return { id: demo.youtubeId, title: demo.title, fromToque: true };
    }
    return null;
  });

  readonly sameToque = computed<Song[]>(() => {
    const s = this.song();
    if (!s) return [];
    return (this.data.songsByToque().get(s.toque[0]) ?? []).filter(o => o.id !== s.id).slice(0, 5);
  });

  readonly shared = signal(false);
  private shareTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const s = this.song();
      if (s) this.titleService.setTitle(s.title + ' · Novo design · Abadá Música');
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.shareTimer);
  }

  setModo(m: Modo): void {
    void this.router.navigate([], { queryParams: { modo: m === 'ler' ? null : m }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  plain(line: Line): string { return line.words.map(w => w.text).join(' '); }
  gapWidth(word: string): number { return Math.max(2.2, word.length * 0.55); }
  emptySet(): Set<string> { return new Set(); }

  reveal(key: string): void {
    const next = new Set(this.revealed()); next.add(key); this.revealed.set(next);
  }
  revealAll(): void {
    this.revealed.set(new Set(this.text().flat().flatMap(l => l.words).filter(w => w.hidden).map(w => w.key)));
  }

  async toggleLearned(): Promise<void> {
    await this.firebase.waitForAuthReady();
    if (!this.firebase.currentUser()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    try { await this.firebase.toggleLearned(this.id()); } catch { /* the service puts the state back */ }
  }

  async share(): Promise<void> {
    const url = window.location.href;
    const title = this.song()?.title ?? 'Abadá Música';
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      this.shared.set(true);
      clearTimeout(this.shareTimer);
      this.shareTimer = setTimeout(() => this.shared.set(false), 2000);
    } catch { /* dismissed or not allowed */ }
  }

  print(): void { window.print(); }
}
