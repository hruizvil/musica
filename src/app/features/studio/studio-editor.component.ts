import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NovoIconComponent } from '../novo-design/novo-ui';
import { Draft, StudioService, shortDate, youtubeId } from './studio.service';

type TextKey = 'refrao' | 'refraoTranslation' | 'lyrics' | 'translation' | 'notes' | 'notesEn';

const PAIRS: { pt: TextKey; en: TextKey; ptLabel: string; enLabel: string; rows: number; ptHint: string }[] = [
  { pt: 'refrao', en: 'refraoTranslation', ptLabel: 'Chorus', enLabel: 'Chorus translation', rows: 3, ptHint: 'The line everyone answers' },
  { pt: 'lyrics', en: 'translation', ptLabel: 'Lyrics', enLabel: 'Translation', rows: 11, ptHint: 'One line per sung line' },
  { pt: 'notes', en: 'notesEn', ptLabel: 'About this song', enLabel: 'About this song', rows: 4, ptHint: 'History, pronunciation, when it is sung' },
];

/**
 * Editing or adding one song. Portuguese and English sit side by side on desktop, so
 * translating is reading across a row; on a phone a switch shows one language at a time,
 * with title, video and toque first, since that's what gets filled in on the go.
 */
@Component({
  selector: 'app-studio-editor',
  standalone: true,
  imports: [RouterLink, NovoIconComponent],
  host: { '(document:keydown)': 'onKey($event)', '(window:beforeunload)': 'onUnload($event)' },
  template: `
    @if (draft(); as d) {
      <!-- Top bar -->
      <div class="sticky top-14 md:top-0 z-20 bg-[var(--n-surf)] border-b border-[var(--n-line)]">
        <div class="h-14 flex items-center gap-2 md:gap-3 px-2 md:px-6">
          <a routerLink="/admin/songs" class="md:hidden w-10 h-10 grid place-items-center rounded-full" aria-label="Back to songs"><app-novo-icon name="back" [size]="21" /></a>
          <a routerLink="/admin/songs" class="hidden md:inline text-[var(--n-tx3)] hover:text-[var(--n-tx)]">Songs</a>
          <span class="hidden md:inline text-[var(--n-tx3)]">/</span>
          <b class="truncate min-w-0 flex-1 md:flex-none md:max-w-[360px]">{{ d.title || (isNew() ? 'New song' : 'Untitled') }}</b>
          @if (dirty()) {
            <span class="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold bg-[var(--n-acc-bg)] text-[var(--n-acc-tx)] shrink-0">● Unsaved</span>
          }
          <div class="hidden md:block flex-1"></div>
          @if (!isNew()) {
            <a [href]="'/cantigas/' + song()!.id" target="_blank" rel="noopener" class="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--n-line)] px-4 py-2 text-[13px] font-bold hover:border-[var(--n-tx3)]">View on site <app-novo-icon name="external" [size]="14" /></a>
          }
          <a routerLink="/admin/songs" class="hidden md:inline-flex rounded-full border border-[var(--n-line)] px-4 py-2 text-[13px] font-bold hover:border-[var(--n-tx3)]">Cancel</a>
          <button type="button" (click)="save()" [disabled]="saving()"
            class="rounded-full bg-[var(--n-acc)] text-[#101114] px-5 py-2 text-[14px] font-bold disabled:opacity-60 shrink-0 hover:brightness-105">
            {{ saving() ? 'Saving…' : isNew() ? 'Add song' : 'Save' }}
          </button>
        </div>
      </div>

      <div class="grid md:grid-cols-[minmax(0,1fr)_300px] md:grid-rows-[auto_1fr] md:min-h-[calc(100vh-56px)]">

        <!-- Title -->
        <div class="md:col-start-1 md:row-start-1 px-4 md:px-6 pt-4 md:pt-5">
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">Title</span>
            <input class="s-field !text-[17px] font-bold" [value]="d.title" (input)="set('title', $any($event.target).value)" placeholder="First line or name of the song" />
          </label>
        </div>

        <!-- Details: on a phone these come before the text -->
        <aside class="md:col-start-2 md:row-start-1 md:row-span-2 md:border-l border-[var(--n-line)] md:bg-[var(--n-surf)] px-4 md:px-5 py-4 md:py-5 flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <span class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">Video</span>
            <input class="s-field" [class.s-empty]="!d.youtube" [value]="d.youtube" (input)="setVideo($any($event.target).value)" placeholder="Paste a YouTube link" inputmode="url" />
            @if (videoId(); as id) {
              <a [href]="'https://www.youtube.com/watch?v=' + id" target="_blank" rel="noopener" class="relative block rounded-xl overflow-hidden aspect-video bg-[#1b1c20]">
                <img [src]="'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'" alt="" class="w-full h-full object-cover" loading="lazy" />
                <span class="absolute inset-0 grid place-items-center"><span class="w-12 h-12 rounded-full bg-black/60 grid place-items-center text-white"><app-novo-icon name="play" [size]="20" /></span></span>
              </a>
              @if (videoNote()) { <span class="text-[12.5px] text-[var(--n-tx3)]">{{ videoNote() }}</span> }
            } @else if (d.youtube.trim()) {
              <span class="text-[12.5px] text-[var(--n-warn)] font-semibold">That doesn't look like a YouTube link.</span>
            }
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">Toque</span>
            <div class="flex flex-wrap gap-1.5">
              @for (t of toques(); track t.id) {
                <button type="button" (click)="toggleToque(t.id)" [attr.aria-pressed]="d.toque.includes(t.id)"
                  class="rounded-full px-3 py-1.5 md:py-1 text-[13px] md:text-[12.5px] font-bold border"
                  [class]="d.toque.includes(t.id) ? 'bg-[var(--n-acc-bg)] border-[var(--n-acc)] text-[var(--n-acc-tx)]' : 'bg-transparent border-[var(--n-line)] text-[var(--n-tx2)]'">{{ t.name }}</button>
              }
            </div>
          </div>

          <label class="flex flex-col gap-2">
            <span class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">Composer</span>
            <input class="s-field" [class.s-empty]="!d.composer" [value]="d.composer" (input)="set('composer', $any($event.target).value)" placeholder="Unknown" />
          </label>

          @if (!isNew()) {
            <div class="md:mt-auto flex flex-col gap-2 text-[12.5px] text-[var(--n-tx3)]">
              <span>{{ savedLine() }}</span>
              <a [href]="'/cantigas/' + song()!.id" target="_blank" rel="noopener" class="md:hidden font-bold text-[var(--n-tx2)]">View on site ↗</a>
              <button type="button" (click)="confirmDelete.set(true)" class="self-start inline-flex items-center gap-1.5 font-bold text-[var(--n-bad)]"><app-novo-icon name="trash" [size]="15" /> Delete song</button>
            </div>
          }
        </aside>

        <!-- Portuguese | English -->
        <div class="md:col-start-1 md:row-start-2 px-4 md:px-6 pt-2 pb-10 md:pb-8 flex flex-col gap-3">
          <div class="md:hidden flex items-center gap-2 sticky top-28 z-10 py-2 bg-[var(--n-bg)]">
            <div class="inline-flex rounded-full bg-[var(--n-raise)] p-1" role="group" aria-label="Language">
              <button type="button" (click)="lang.set('pt')" [attr.aria-pressed]="lang() === 'pt'" class="rounded-full px-4 py-1.5 text-[13px] font-bold" [class]="lang() === 'pt' ? 'bg-[var(--n-surf)] text-[var(--n-tx)] shadow-sm' : 'text-[var(--n-tx2)]'">Portuguese</button>
              <button type="button" (click)="lang.set('en')" [attr.aria-pressed]="lang() === 'en'" class="rounded-full px-4 py-1.5 text-[13px] font-bold" [class]="lang() === 'en' ? 'bg-[var(--n-surf)] text-[var(--n-tx)] shadow-sm' : 'text-[var(--n-tx2)]'">English @if (enMissing()) { <span class="text-[var(--n-warn)]">●</span> }</button>
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-x-4 gap-y-3">
            <div class="hidden md:flex items-baseline gap-2"><span class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">Portuguese</span><span class="text-[12px] text-[var(--n-tx3)]">what's sung</span></div>
            <div class="hidden md:flex items-baseline gap-2"><span class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">English</span><span class="text-[12px] text-[var(--n-tx3)]">for the English site · keep capoeira words in *asterisks*</span></div>
            @for (p of pairs; track p.pt) {
              <label class="flex-col gap-1" [class]="lang() === 'pt' ? 'flex' : 'hidden md:flex'">
                <span class="text-[12.5px] font-bold text-[var(--n-tx2)]">{{ p.ptLabel }}</span>
                <textarea class="s-field resize-y" [class.s-empty]="!d[p.pt]" [rows]="p.rows" [value]="d[p.pt]" (input)="set(p.pt, $any($event.target).value)" [placeholder]="p.ptHint"></textarea>
              </label>
              <label class="flex-col gap-1" [class]="lang() === 'en' ? 'flex' : 'hidden md:flex'">
                <span class="text-[12.5px] font-bold text-[var(--n-tx2)] flex items-center gap-2 min-h-[19px]">
                  {{ p.enLabel }}
                  @if (d[p.pt].trim() && !d[p.en].trim()) {
                    <span class="rounded-full px-2 py-px text-[11px] font-bold bg-[var(--n-warn-bg)] text-[var(--n-warn)]">Missing</span>
                    <a [href]="translateUrl(d[p.pt])" target="_blank" rel="noopener" class="ml-auto text-[12px] font-semibold text-[var(--n-tx3)] underline underline-offset-2">Google Translate ↗</a>
                  }
                </span>
                <textarea class="s-field resize-y" [class.s-empty]="!d[p.en]" [rows]="p.rows" [value]="d[p.en]" (input)="set(p.en, $any($event.target).value)" [placeholder]="p.enLabel + ' in English'"></textarea>
              </label>
            }
          </div>
        </div>
      </div>

      @if (confirmDelete()) {
        <div class="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4" (click)="confirmDelete.set(false)">
          <div class="w-full max-w-[400px] rounded-2xl bg-[var(--n-surf)] p-5 flex flex-col gap-3" (click)="$event.stopPropagation()" role="alertdialog" aria-labelledby="del-title">
            <h2 id="del-title" class="n-disp text-[18px] font-semibold">Delete this song?</h2>
            <p class="m-0 text-[14px] text-[var(--n-tx2)]">"{{ d.title }}" disappears from the site for everyone. This can't be undone here.</p>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="confirmDelete.set(false)" class="rounded-full px-4 py-2 font-bold text-[14px] text-[var(--n-tx2)]">Keep it</button>
              <button type="button" (click)="remove()" [disabled]="saving()" class="rounded-full px-5 py-2 font-bold text-[14px] bg-[var(--n-bad)] text-white disabled:opacity-60">Delete</button>
            </div>
          </div>
        </div>
      }
    } @else if (missing()) {
      <div class="px-6 py-16 text-center flex flex-col items-center gap-3">
        <h1 class="n-disp text-[20px] font-semibold">Song not found</h1>
        <p class="m-0 text-[var(--n-tx2)]">It may have been deleted.</p>
        <a routerLink="/admin/songs" class="rounded-full bg-[var(--n-acc)] text-[#101114] px-5 py-2 font-bold">Back to songs</a>
      </div>
    } @else {
      <div class="px-6 py-16 text-center text-[var(--n-tx2)]">Loading…</div>
    }
  `,
})
export class StudioEditorComponent {
  /** From the route: a song id, or absent when adding. */
  readonly id = input<string>();

  private studio = inject(StudioService);
  private data = inject(DataService);
  private router = inject(Router);

  readonly pairs = PAIRS;
  readonly toques = this.data.toques;
  readonly isNew = computed(() => !this.id());
  readonly song = computed(() => { const id = this.id(); return id ? this.data.songById().get(id) ?? null : null; });
  readonly missing = computed(() => !this.isNew() && this.data.songsLoaded() && !this.song());

  readonly draft = signal<Draft | null>(null);
  private initial = signal('');
  readonly dirty = computed(() => !!this.draft() && JSON.stringify(this.draft()) !== this.initial());
  readonly saving = signal(false);
  readonly confirmDelete = signal(false);
  readonly lang = signal<'pt' | 'en'>('pt');
  readonly videoNote = signal('');
  private lookedUp = '';

  readonly videoId = computed(() => youtubeId(this.draft()?.youtube ?? ''));
  readonly enMissing = computed(() => { const d = this.draft(); return !!d && PAIRS.some(p => d[p.pt].trim() && !d[p.en].trim()); });
  readonly savedLine = computed(() => {
    const s = this.song(); if (!s) return '';
    const m = this.studio.meta(s.id);
    return m ? `Last saved ${shortDate(m.at)}${m.by ? ' by ' + m.by : ''}` : `Added ${shortDate(s.dateAdded)}`;
  });

  constructor() {
    // Fill the form once the song is available (songs arrive a moment after the page).
    effect(() => {
      const isNew = this.isNew(), song = this.song(), key = this.id() ?? '';
      untracked(() => {
        if (this.draft() && this.loadedFor === key) return;
        if (!isNew && !song) return;
        this.loadedFor = key;
        this.reset(this.studio.draftOf(isNew ? null : song));
      });
    });
  }
  private loadedFor: string | null = null;

  private reset(d: Draft): void {
    this.draft.set(d);
    this.initial.set(JSON.stringify(d));
    this.videoNote.set('');
    this.lookedUp = youtubeId(d.youtube);
  }

  set<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update(d => d ? { ...d, [key]: value } : d);
  }

  toggleToque(id: string): void {
    const d = this.draft(); if (!d) return;
    this.set('toque', d.toque.includes(id) ? d.toque.filter(t => t !== id) : [...d.toque, id]);
  }

  /** Pasting a link fills an empty title and composer from the video, as the old admin's button did. */
  async setVideo(value: string): Promise<void> {
    this.set('youtube', value);
    const id = youtubeId(value);
    if (!id || id === this.lookedUp) return;
    this.lookedUp = id;
    this.videoNote.set('');
    const info = await this.studio.videoInfo(id);
    const d = this.draft();
    if (!info || !d || youtubeId(d.youtube) !== id) return;
    const filled: string[] = [];
    if (!d.title.trim() && info.title) { this.set('title', info.title); filled.push('title'); }
    if (!d.composer.trim() && info.author) { this.set('composer', info.author); filled.push('composer'); }
    this.videoNote.set(filled.length ? `Filled in the ${filled.join(' and ')} from the video. Check they're right.` : `Video: ${info.title}`);
  }

  async save(): Promise<void> {
    const d = this.draft();
    if (!d || this.saving()) return;
    if (!d.title.trim()) { this.studio.flash('Give the song a title first'); return; }
    this.saving.set(true);
    try {
      const id = await this.studio.save(this.song(), d);
      this.initial.set(JSON.stringify(d));
      if (this.isNew()) {
        this.studio.flash(`Added "${d.title.trim()}". It's on the site now`);
        this.loadedFor = null;
        this.draft.set(null);
        this.router.navigate(['/admin/songs', id], { replaceUrl: true });
      } else {
        this.studio.flash('Saved');
      }
    } catch (e) {
      this.studio.flash(this.studio.errorText(e, 'save'));
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    const s = this.song(); if (!s) return;
    this.saving.set(true);
    try {
      await this.studio.remove(s);
      this.initial.set(JSON.stringify(this.draft()));
      this.studio.flash(`Deleted "${s.title}"`);
      this.router.navigate(['/admin/songs']);
    } catch (e) {
      this.studio.flash(this.studio.errorText(e, 'delete'));
    } finally {
      this.saving.set(false);
      this.confirmDelete.set(false);
    }
  }

  translateUrl(text: string): string {
    return `https://translate.google.com/?sl=pt&tl=en&text=${encodeURIComponent(text.slice(0, 4000))}`;
  }

  /** Used by the route's leave guard. */
  canLeave(): boolean {
    return !this.dirty() || confirm('You have unsaved changes. Leave without saving?');
  }

  onKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.save(); }
  }

  onUnload(e: BeforeUnloadEvent): void {
    if (this.dirty()) { e.preventDefault(); e.returnValue = ''; }
  }
}
