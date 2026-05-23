import { Component, inject, signal, computed } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService, SongOverride } from '../../core/services/firebase.service';
import { Song } from '../../core/models/song.model';

const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
const SPOTIFY_RE = /open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/;

function extractYoutubeId(input: string): string {
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  const m = input.match(YOUTUBE_RE);
  return m ? m[1] : input.trim();
}

function normalizeSpotify(input: string): string {
  if (input.startsWith('spotify:')) return input.trim();
  const m = input.match(SPOTIFY_RE);
  return m ? `spotify:${m[1]}:${m[2]}` : input.trim();
}

function slugify(title: string): string {
  return title.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

const TYPE_DOT: Record<string, string> = {
  ladainha: 'bg-amber-400', corrido: 'bg-emerald-400',
  louvacao: 'bg-sky-400',   quadra:  'bg-purple-400',
};

type PanelMode = 'none' | 'edit' | 'add';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, NgClass, NgTemplateOutlet],
  template: `
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="font-display text-2xl font-bold text-capoeira-brown dark:text-capoeira-cream">Editar Músicas</h1>
        <div class="flex items-center gap-2">
          <button (click)="startAdd()"
            class="text-sm font-semibold px-3 py-1.5 rounded-lg bg-capoeira-brown text-white hover:bg-capoeira-brown/90 transition-colors">
            + Adicionar
          </button>
          <button (click)="signOut()"
            class="text-sm text-stone-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700">
            Sair
          </button>
        </div>
      </div>

      <!-- Layout: stacks on mobile, side-by-side on md+ -->
      <div class="flex flex-col md:flex-row gap-4 items-start">

        <!-- Song list -->
        <div class="w-full md:w-72 md:shrink-0 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">

          <!-- Filter header -->
          <div class="px-3 py-2 border-b border-stone-100 dark:border-stone-700 space-y-2">
            <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide">
              {{ filteredSongs().length === data.songs().length
                  ? data.songs().length + ' músicas'
                  : filteredSongs().length + ' / ' + data.songs().length + ' músicas' }}
            </p>
            <input
              type="search"
              [ngModel]="filterQuery()"
              (ngModelChange)="filterQuery.set($event)"
              placeholder="Filtrar..."
              class="w-full px-2.5 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-capoeira-gold"
            />
          </div>

          <div class="divide-y divide-stone-100 dark:divide-stone-700 overflow-y-auto md:max-h-[75vh]">
            @if (!data.songsLoaded()) {
              <p class="px-4 py-6 text-sm text-stone-400 text-center">Carregando...</p>
            }
            @for (song of filteredSongs(); track song.id) {
              <div class="flex items-center group transition-colors"
                   [ngClass]="selectedSong()?.id === song.id
                     ? 'bg-amber-50 dark:bg-stone-700/60 border-l-2 border-capoeira-gold'
                     : 'hover:bg-stone-50 dark:hover:bg-stone-700/50'">
                <button (click)="selectSong(song)"
                        [title]="song.title"
                        class="flex-1 flex items-center gap-3 px-4 py-2.5 text-left min-w-0">
                  <span class="w-2 h-2 rounded-full shrink-0" [class]="dot(song.type)"></span>
                  <span class="flex-1 text-sm text-stone-700 dark:text-stone-200 truncate">{{ song.title }}</span>
                  <span class="text-xs shrink-0" [class]="song.audioLinks.youtube ? 'text-emerald-500' : 'text-stone-300'">
                    {{ song.audioLinks.youtube ? '▶' : '○' }}
                  </span>
                </button>
                <button (click)="confirmDelete(song)"
                  class="px-3 py-2.5 text-stone-300 hover:text-red-400 transition-colors shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  title="Apagar">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            } @empty {
              @if (data.songsLoaded()) {
                <p class="px-4 py-4 text-xs text-stone-400 text-center">Nenhum resultado.</p>
              }
            }
          </div>
        </div>

        <!-- Edit / Add panel — fixed overlay on mobile, sticky side panel on desktop -->
        <div [class]="formPanelClass()">

          @if (panelMode() === 'none') {
            <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-10 text-center">
              <p class="text-stone-400 text-sm">Selecione uma música para editar, ou clique em <strong>+ Adicionar</strong> para criar uma nova.</p>
            </div>
          }

          @if (panelMode() === 'edit' && selectedSong()) {
            <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-5">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-xs text-stone-400">Editando música</p>
                  <p class="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">{{ selectedSong()!.title }}</p>
                </div>
                <button (click)="closePanel()" class="text-stone-300 hover:text-stone-500 text-xl leading-none shrink-0 mt-0.5">✕</button>
              </div>

              <!-- Title (edit only — not in shared template) -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Título</label>
                <input type="text" [(ngModel)]="editTitle" name="editTitle"
                  class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
              </div>

              <ng-container *ngTemplateOutlet="formFields" />

              @if (saveError()) {
                <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{{ saveError() }}</p>
              }
              @if (saveSuccess()) {
                <p class="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">Salvo com sucesso!</p>
              }

              <div class="flex gap-3 pt-1">
                <button (click)="save()" [disabled]="saving()"
                  class="px-6 py-2.5 rounded-lg bg-capoeira-brown text-white text-sm font-semibold hover:bg-capoeira-brown/90 disabled:opacity-50 transition-colors">
                  {{ saving() ? 'Salvando...' : 'Salvar alterações' }}
                </button>
                <button (click)="closePanel()"
                  class="px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 text-sm hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          }

          @if (panelMode() === 'add') {
            <div class="bg-white dark:bg-stone-800 rounded-xl border border-capoeira-gold/40 p-6 space-y-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs text-capoeira-gold mb-0.5 font-semibold uppercase tracking-wide">Nova música</p>
                  <h2 class="font-display text-xl font-bold text-capoeira-brown dark:text-capoeira-cream">Adicionar Música</h2>
                </div>
                <button (click)="closePanel()" class="text-stone-300 hover:text-stone-500 text-xl leading-none shrink-0 mt-1">✕</button>
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Título <span class="text-red-400">*</span></label>
                <input type="text" [(ngModel)]="editTitle" name="title" placeholder="Nome da música"
                  class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
              </div>

              <ng-container *ngTemplateOutlet="formFields" />

              @if (saveError()) {
                <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{{ saveError() }}</p>
              }
              @if (saveSuccess()) {
                <p class="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">Música adicionada!</p>
              }

              <div class="flex gap-3 pt-1">
                <button (click)="addSong()" [disabled]="saving() || !editTitle.trim()"
                  class="px-6 py-2.5 rounded-lg bg-capoeira-brown text-white text-sm font-semibold hover:bg-capoeira-brown/90 disabled:opacity-50 transition-colors">
                  {{ saving() ? 'Adicionando...' : 'Adicionar música' }}
                </button>
                <button (click)="closePanel()"
                  class="px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 text-sm hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          }

        </div>
      </div>

      <!-- Delete confirmation -->
      @if (deleteTarget()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div class="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 class="font-display text-lg font-bold text-stone-800 dark:text-stone-100">Apagar música?</h3>
            <p class="text-sm text-stone-500">"{{ deleteTarget()!.title }}" será removida permanentemente.</p>
            <div class="flex gap-3">
              <button (click)="deleteSong()" [disabled]="saving()"
                class="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {{ saving() ? 'Apagando...' : 'Sim, apagar' }}
              </button>
              <button (click)="deleteTarget.set(null)"
                class="flex-1 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 text-sm hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Shared form fields -->
    <ng-template #formFields>

      <!-- Type -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Tipo</label>
        <select [(ngModel)]="editType" name="type"
          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-capoeira-gold">
          <option value="ladainha">Ladainha</option>
          <option value="corrido">Corrido</option>
          <option value="louvacao">Louvação</option>
          <option value="quadra">Quadra</option>
        </select>
      </div>

      <!-- Toques -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Toques</label>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          @for (toque of data.toques(); track toque.id) {
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                [checked]="isToqueSelected(toque.id)"
                (change)="toggleToque(toque.id)"
                class="w-4 h-4 rounded border-stone-300 text-capoeira-gold accent-capoeira-gold cursor-pointer" />
              <span class="text-sm text-stone-700 dark:text-stone-200">{{ toque.name }}</span>
            </label>
          }
        </div>
      </div>

      <!-- Por (Mestre / Compositor) -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Por <span class="normal-case font-normal">(Mestre / Compositor)</span></label>
        <input type="text" [(ngModel)]="editMestre" name="mestre"
          placeholder="ex: Mestre Bimba, Professor Coala..."
          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
      </div>

      <!-- YouTube + Spotify -->
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">YouTube (URL ou ID)</label>
          <input type="text" [(ngModel)]="editYoutube" name="youtube"
            placeholder="https://youtube.com/watch?v=..."
            class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
          @if (editYoutube.trim()) {
            <p class="text-xs text-stone-400">ID: <span class="font-mono text-capoeira-gold">{{ previewYoutubeId() }}</span></p>
          }
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Spotify</label>
          <input type="text" [(ngModel)]="editSpotify" name="spotify"
            placeholder="https://open.spotify.com/track/..."
            class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
        </div>
      </div>

      <!-- Letra -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Letra</label>
        <textarea [(ngModel)]="editLyrics" name="lyrics" rows="8"
          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm font-mono placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
        </textarea>
      </div>

      <!-- Tradução -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Tradução <span class="normal-case font-normal">(opcional)</span></label>
        <textarea [(ngModel)]="editTranslation" name="translation" rows="4"
          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
        </textarea>
      </div>

      <!-- Notas -->
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Notas <span class="normal-case font-normal">(opcional)</span></label>
        <textarea [(ngModel)]="editNotes" name="notes" rows="3"
          placeholder="Contexto histórico, dicas de pronúncia..."
          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
        </textarea>
      </div>

      <!-- Preview -->
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" [(ngModel)]="editPreview" name="preview"
          class="w-4 h-4 rounded accent-capoeira-gold cursor-pointer" />
        <span class="text-sm text-stone-700 dark:text-stone-200">
          Preview <span class="text-stone-400 font-normal">(visível sem assinatura)</span>
        </span>
      </label>
    </ng-template>
  `,
})
export class AdminComponent {
  data = inject(DataService);
  private fb = inject(FirebaseService);
  private router = inject(Router);

  panelMode = signal<PanelMode>('none');
  selectedSong = signal<Song | null>(null);
  deleteTarget = signal<Song | null>(null);
  filterQuery = signal('');

  readonly formPanelClass = computed(() =>
    this.panelMode() === 'none'
      ? 'hidden md:block md:flex-1 md:min-w-0 md:sticky md:top-4'
      : 'fixed inset-0 z-50 overflow-y-auto bg-stone-50 dark:bg-stone-900 p-4 md:static md:inset-auto md:z-auto md:overflow-visible md:bg-transparent md:p-0 md:flex-1 md:min-w-0 md:sticky md:top-4'
  );

  readonly filteredSongs = computed(() => {
    const q = this.filterQuery().toLowerCase().trim();
    if (!q) return this.data.songs();
    return this.data.songs().filter(s => s.title.toLowerCase().includes(q));
  });

  editTitle = '';
  editType = 'corrido';
  editToque: string[] = [];
  editMestre = '';
  editYoutube = '';
  editSpotify = '';
  editLyrics = '';
  editTranslation = '';
  editNotes = '';
  editPreview = false;

  saving = signal(false);
  saveError = signal('');
  saveSuccess = signal(false);

  isToqueSelected(id: string): boolean {
    return this.editToque.includes(id);
  }

  toggleToque(id: string): void {
    this.editToque = this.editToque.includes(id)
      ? this.editToque.filter(t => t !== id)
      : [...this.editToque, id];
  }

  selectSong(song: Song) {
    this.panelMode.set('edit');
    this.selectedSong.set(song);
    this.editTitle = song.title;
    this.editType = song.type;
    this.editToque = [...song.toque];
    this.editMestre = song.mestre ?? '';
    this.editYoutube = song.audioLinks.youtube ?? '';
    this.editSpotify = song.audioLinks.spotify ?? '';
    this.editLyrics = song.lyrics ?? '';
    this.editTranslation = song.translation ?? '';
    this.editNotes = song.notes ?? '';
    this.editPreview = song.preview ?? false;
    this.saveError.set('');
    this.saveSuccess.set(false);
  }

  startAdd() {
    this.panelMode.set('add');
    this.selectedSong.set(null);
    this.editTitle = '';
    this.editType = 'corrido';
    this.editToque = [];
    this.editMestre = '';
    this.editYoutube = '';
    this.editSpotify = '';
    this.editLyrics = '';
    this.editTranslation = '';
    this.editNotes = '';
    this.editPreview = false;
    this.saveError.set('');
    this.saveSuccess.set(false);
  }

  closePanel() {
    this.panelMode.set('none');
    this.selectedSong.set(null);
  }

  previewYoutubeId(): string {
    return extractYoutubeId(this.editYoutube);
  }

  async save() {
    const song = this.selectedSong();
    if (!song) return;
    this.saving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);
    try {
      if (this.data.extraSongIds().has(song.id)) {
        const audioLinks: Song['audioLinks'] = {};
        if (this.editYoutube.trim()) audioLinks.youtube = extractYoutubeId(this.editYoutube);
        if (this.editSpotify.trim()) audioLinks.spotify = normalizeSpotify(this.editSpotify);
        const updated: Song = {
          ...song,
          title: this.editTitle.trim() || song.title,
          type: this.editType as Song['type'],
          toque: this.editToque,
          mestre: this.editMestre.trim() || null,
          lyrics: this.editLyrics.trim(),
          translation: this.editTranslation.trim() || null,
          notes: this.editNotes.trim() || null,
          preview: this.editPreview,
          audioLinks,
        };
        await this.fb.saveExtraSong(updated);
      } else {
        const override: SongOverride = { type: this.editType, preview: this.editPreview };
        if (this.editTitle.trim() && this.editTitle.trim() !== song.title) {
          override.title = this.editTitle.trim();
        }
        if (this.editToque.length) override.toque = this.editToque;
        if (this.editMestre.trim()) override.mestre = this.editMestre.trim();
        if (this.editYoutube.trim()) override.youtube = extractYoutubeId(this.editYoutube);
        if (this.editSpotify.trim()) override.spotify = normalizeSpotify(this.editSpotify);
        if (this.editLyrics.trim()) override.lyrics = this.editLyrics.trim();
        if (this.editTranslation.trim()) override.translation = this.editTranslation.trim();
        if (this.editNotes.trim()) override.notes = this.editNotes.trim();
        await this.fb.saveSongOverride(song.id, override);
      }
      await this.data.refreshOverrides();
      const refreshed = this.data.songById().get(song.id);
      if (refreshed) this.selectedSong.set(refreshed);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch {
      this.saveError.set('Erro ao salvar. Verifique sua conexão.');
    } finally {
      this.saving.set(false);
    }
  }

  async addSong() {
    if (!this.editTitle.trim()) return;
    this.saving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);
    try {
      const audioLinks: Song['audioLinks'] = {};
      if (this.editYoutube.trim()) audioLinks.youtube = extractYoutubeId(this.editYoutube);
      if (this.editSpotify.trim()) audioLinks.spotify = normalizeSpotify(this.editSpotify);
      const newSong: Song = {
        id: slugify(this.editTitle),
        title: this.editTitle.trim(),
        type: this.editType as Song['type'],
        toque: this.editToque,
        mestre: this.editMestre.trim() || null,
        composer: null,
        album: null,
        lyrics: this.editLyrics.trim(),
        translation: this.editTranslation.trim() || null,
        notes: this.editNotes.trim() || null,
        themes: [],
        audioLinks,
        preview: this.editPreview,
        dateAdded: new Date().toISOString().split('T')[0],
      };
      await this.fb.saveExtraSong(newSong);
      await this.data.refreshOverrides();
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
      this.editTitle = '';
      this.editToque = [];
      this.editMestre = '';
      this.editLyrics = '';
      this.editYoutube = '';
      this.editSpotify = '';
      this.editTranslation = '';
      this.editNotes = '';
      this.editPreview = false;
    } catch {
      this.saveError.set('Erro ao adicionar. Verifique sua conexão.');
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(song: Song) {
    this.deleteTarget.set(song);
  }

  async deleteSong() {
    const song = this.deleteTarget();
    if (!song) return;
    this.saving.set(true);
    try {
      if (this.data.extraSongIds().has(song.id)) {
        await this.fb.deleteExtraSong(song.id);
      } else {
        await this.fb.markDeleted(song.id);
      }
      await this.data.refreshOverrides();
      this.deleteTarget.set(null);
      if (this.selectedSong()?.id === song.id) this.closePanel();
    } catch {
      // silently ignore delete errors
    } finally {
      this.saving.set(false);
    }
  }

  async signOut() {
    await this.fb.signOut();
    this.router.navigate(['/admin/login']);
  }

  dot(type: string) { return TYPE_DOT[type] ?? 'bg-stone-300'; }
}
