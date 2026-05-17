import { Component, inject, signal } from '@angular/core';
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

const TYPE_LABELS: Record<string, string> = {
  ladainha: 'Ladainha', corrido: 'Corrido', louvacao: 'Louvação', quadra: 'Quadra'
};
const TYPE_DOT: Record<string, string> = {
  ladainha: 'bg-amber-400', corrido: 'bg-emerald-400',
  louvacao: 'bg-sky-400',   quadra:  'bg-purple-400',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="font-display text-2xl font-bold text-capoeira-brown dark:text-capoeira-cream">Editar Músicas</h1>
        <button (click)="signOut()" class="text-sm text-stone-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700">
          Sair
        </button>
      </div>

      <!-- Two-column layout -->
      <div class="flex gap-4 items-start">

        <!-- LEFT: song list -->
        <div class="w-72 shrink-0 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div class="px-4 py-2 border-b border-stone-100 dark:border-stone-700">
            <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide">{{ data.songs().length }} músicas — selecione uma</p>
          </div>
          <div class="divide-y divide-stone-100 dark:divide-stone-700 max-h-[75vh] overflow-y-auto">
            @if (!data.songsLoaded()) {
              <p class="px-4 py-6 text-sm text-stone-400 text-center">Carregando...</p>
            }
            @for (song of data.songs(); track song.id) {
              <button
                (click)="selectSong(song)"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-700/50"
                [class.bg-capoeira-gold]="selectedSong()?.id === song.id"
                [class.bg-opacity-10]="selectedSong()?.id === song.id">
                <span class="w-2 h-2 rounded-full shrink-0" [class]="dot(song.type)"></span>
                <span class="flex-1 text-sm text-stone-700 dark:text-stone-200 truncate">{{ song.title }}</span>
                <span class="text-xs shrink-0" [class]="song.audioLinks.youtube ? 'text-emerald-500' : 'text-stone-300'">
                  {{ song.audioLinks.youtube ? '▶' : '○' }}
                </span>
              </button>
            }
          </div>
        </div>

        <!-- RIGHT: edit panel -->
        <div class="flex-1 min-w-0">
          @if (!selectedSong()) {
            <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-10 text-center">
              <p class="text-stone-400 text-sm">← Selecione uma música na lista para editar</p>
            </div>
          } @else {
            <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-5">

              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs text-stone-400 mb-0.5">{{ typeLabel(selectedSong()!.type) }}</p>
                  <h2 class="font-display text-xl font-bold text-capoeira-brown dark:text-capoeira-cream">{{ selectedSong()!.title }}</h2>
                </div>
                <button (click)="selectedSong.set(null)" class="text-stone-300 hover:text-stone-500 text-xl leading-none shrink-0 mt-1">✕</button>
              </div>

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

              <!-- YouTube -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">YouTube</label>
                <input type="text" [(ngModel)]="editYoutube" name="youtube"
                  placeholder="Cole a URL do YouTube ou o ID de 11 caracteres"
                  class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
                @if (editYoutube.trim()) {
                  <p class="text-xs text-stone-400">ID detectado: <span class="font-mono text-capoeira-gold">{{ previewYoutubeId() }}</span></p>
                }
              </div>

              <!-- Spotify -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Spotify</label>
                <input type="text" [(ngModel)]="editSpotify" name="spotify"
                  placeholder="Cole a URL do Spotify"
                  class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
              </div>

              <!-- Lyrics -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Letra <span class="normal-case font-normal">(deixe em branco para manter a atual)</span></label>
                <textarea [(ngModel)]="editLyrics" name="lyrics" rows="8"
                  class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm font-mono placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
                </textarea>
              </div>

              <!-- Translation -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Tradução <span class="normal-case font-normal">(opcional)</span></label>
                <textarea [(ngModel)]="editTranslation" name="translation" rows="5"
                  class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
                </textarea>
              </div>

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
                <button (click)="selectedSong.set(null)"
                  class="px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 text-sm hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminComponent {
  data = inject(DataService);
  private fb = inject(FirebaseService);
  private router = inject(Router);

  selectedSong = signal<Song | null>(null);
  editType = '';
  editYoutube = '';
  editSpotify = '';
  editLyrics = '';
  editTranslation = '';

  saving = signal(false);
  saveError = signal('');
  saveSuccess = signal(false);

  selectSong(song: Song) {
    this.selectedSong.set(song);
    this.editType = song.type;
    this.editYoutube = song.audioLinks.youtube ?? '';
    this.editSpotify = song.audioLinks.spotify ?? '';
    this.editLyrics = song.lyrics ?? '';
    this.editTranslation = song.translation ?? '';
    this.saveError.set('');
    this.saveSuccess.set(false);
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
      const override: SongOverride = {};
      if (this.editType) override.type = this.editType;
      if (this.editYoutube.trim()) override.youtube = extractYoutubeId(this.editYoutube);
      if (this.editSpotify.trim()) override.spotify = normalizeSpotify(this.editSpotify);
      if (this.editLyrics.trim()) override.lyrics = this.editLyrics.trim();
      if (this.editTranslation.trim()) override.translation = this.editTranslation.trim();
      await this.fb.saveSongOverride(song.id, override);
      await this.data.refreshOverrides();
      this.saveSuccess.set(true);
    } catch {
      this.saveError.set('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }

  async signOut() {
    await this.fb.signOut();
    this.router.navigate(['/admin/login']);
  }

  typeLabel(type: string) { return TYPE_LABELS[type] ?? type; }
  dot(type: string) { return TYPE_DOT[type] ?? 'bg-stone-300'; }
}
