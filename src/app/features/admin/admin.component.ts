import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DataService } from '../../core/services/data.service';
import { FirebaseService, SongOverride } from '../../core/services/firebase.service';
import { ThemeService } from '../../core/services/theme.service';
import { Song } from '../../core/models/song.model';
import { Toque } from '../../core/models/toque.model';

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

const TYPE_OPTIONS = [
  { value: 'ladainha', label: 'Ladainha' },
  { value: 'corrido',  label: 'Corrido'  },
  { value: 'louvacao', label: 'Louvação' },
  { value: 'quadra',   label: 'Quadra'   },
];

const TYPE_COLORS: Record<string, { dot: string; base: string; active: string }> = {
  ladainha: {
    dot: 'bg-amber-400',
    base: 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-amber-300 hover:text-amber-700',
    active: 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-500 text-amber-800 dark:text-amber-300 font-semibold',
  },
  corrido: {
    dot: 'bg-emerald-400',
    base: 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-emerald-300 hover:text-emerald-700',
    active: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold',
  },
  louvacao: {
    dot: 'bg-sky-400',
    base: 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-sky-300 hover:text-sky-700',
    active: 'bg-sky-50 dark:bg-sky-900/30 border-sky-400 dark:border-sky-500 text-sky-800 dark:text-sky-300 font-semibold',
  },
  quadra: {
    dot: 'bg-purple-400',
    base: 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-purple-300 hover:text-purple-700',
    active: 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 dark:border-purple-500 text-purple-800 dark:text-purple-300 font-semibold',
  },
};

type PanelMode = 'none' | 'edit' | 'add';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="h-screen flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-900">

      <!-- ── GLOBAL HEADER ─────────────────────────────────────────── -->
      <header class="h-14 shrink-0 backdrop-blur-md bg-white/90 dark:bg-stone-950/90 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center px-5 gap-3 z-20">

        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-display text-sm font-bold text-capoeira-brown dark:text-capoeira-gold whitespace-nowrap">Abadá Música</span>
          <svg class="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          <span class="text-sm text-stone-400 dark:text-stone-500 whitespace-nowrap">Admin</span>

          @if (panelMode() !== 'none') {
            <svg class="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span class="text-sm font-medium text-stone-700 dark:text-stone-200 truncate max-w-[16rem]">
              {{ panelMode() === 'add' ? 'Nova música' : (editTitle || selectedSong()?.title || '') }}
            </span>
            @if (isDirty()) {
              <span class="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0 ml-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Não salvo
              </span>
            }
            @if (saveSuccess()) {
              <span class="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                Salvo
              </span>
            }
          }
        </div>

        <div class="flex-1"></div>

        <!-- Header actions -->
        <div class="flex items-center gap-2 shrink-0">
          @if (saveError()) {
            <span class="text-xs text-red-500 hidden sm:inline">{{ saveError() }}</span>
          }
          @if (panelMode() !== 'none') {
            <button (click)="closePanel()"
              class="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-sm hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
              Cancelar
            </button>
            <button (click)="panelMode() === 'edit' ? save() : addSong()"
              [disabled]="saving() || (panelMode() === 'add' && !editTitle.trim())"
              class="px-4 py-1.5 rounded-xl bg-capoeira-brown text-white text-sm font-semibold hover:bg-capoeira-brown/90 disabled:opacity-50 transition-colors shadow-sm shadow-capoeira-gold/10">
              {{ saving() ? 'Salvando…' : panelMode() === 'add' ? 'Adicionar' : 'Salvar alterações' }}
            </button>
          }
          <button (click)="signOut()"
            class="text-xs text-stone-400 hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 ml-1">
            Sair
          </button>
        </div>
      </header>

      <!-- ── BODY: three-column ────────────────────────────────────── -->
      <div class="flex flex-1 overflow-hidden">

        <!-- Left sidebar: song list -->
        <aside
          [ngClass]="{ 'hidden': panelMode() !== 'none' }"
          class="md:flex md:flex-col w-full md:w-64 md:shrink-0 border-r border-stone-200/60 dark:border-stone-800/60 bg-white dark:bg-stone-950">

          <!-- Sidebar header -->
          <div class="px-3 py-3 border-b border-stone-100 dark:border-stone-700 space-y-2 shrink-0">
            <div class="flex items-center justify-between px-1">
              <p class="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                {{ filteredSongs().length === data.songs().length
                    ? data.songs().length + ' músicas'
                    : filteredSongs().length + ' / ' + data.songs().length + ' músicas' }}
              </p>
              @if (!bulkSelectMode()) {
                <button type="button" (click)="enterBulkMode()"
                  title="Selecionar para apagar"
                  class="p-1 rounded text-stone-300 dark:text-stone-600 hover:text-red-400 dark:hover:text-red-400 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </button>
              } @else {
                <button type="button" (click)="exitBulkMode()"
                  class="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                  Cancelar
                </button>
              }
            </div>
            <input
              type="search"
              [ngModel]="filterQuery()"
              (ngModelChange)="filterQuery.set($event)"
              placeholder="Filtrar músicas..."
              class="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-xs placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-capoeira-gold shadow-inner"
            />
          </div>

          <!-- Song list -->
          <div class="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-700/50">
            @if (!data.songsLoaded()) {
              @for (i of [1,2,3,4,5,6,7]; track i) {
                <div class="px-4 py-3 flex items-center gap-3 animate-pulse">
                  <span class="w-2 h-2 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0"></span>
                  <div class="flex-1 space-y-1.5">
                    <span class="block h-3 rounded bg-stone-100 dark:bg-stone-700 w-3/4"></span>
                    <span class="block h-2 rounded bg-stone-100 dark:bg-stone-700 w-1/3"></span>
                  </div>
                </div>
              }
            }
            @for (song of filteredSongs(); track song.id) {
              <div class="flex items-center group transition-colors"
                   [ngClass]="!bulkSelectMode() && selectedSong()?.id === song.id
                     ? 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-capoeira-gold'
                     : bulkSelectMode() && bulkSelected().has(song.id)
                       ? 'bg-red-50 dark:bg-red-900/10 border-l-2 border-red-300 dark:border-red-700'
                       : 'border-l-2 border-transparent hover:bg-stone-50 dark:hover:bg-stone-700/30'">
                <button (click)="bulkSelectMode() ? toggleBulkSelect(song.id, $event) : selectSong(song)"
                        class="flex-1 flex items-center gap-2.5 pl-3 pr-2 py-2.5 text-left min-w-0">
                  @if (bulkSelectMode()) {
                    <input type="checkbox" [checked]="bulkSelected().has(song.id)"
                      class="w-4 h-4 shrink-0 accent-red-500 cursor-pointer pointer-events-none" />
                  } @else {
                    <span class="w-2 h-2 rounded-full shrink-0" [class]="dot(song.type)"></span>
                  }
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-stone-700 dark:text-stone-200 truncate"
                       [class.font-semibold]="selectedSong()?.id === song.id">{{ song.title }}</p>
                    <p class="text-xs text-stone-400 dark:text-stone-500">{{ song.toque.length ? toqueNameById(song.toque[0]) : song.type }}</p>
                  </div>
                  @if (!bulkSelectMode()) {
                    <span class="text-[10px] shrink-0 transition-colors"
                          [class]="song.audioLinks.youtube ? 'text-red-400' : 'text-stone-200 dark:text-stone-700'">▶</span>
                  }
                </button>
                @if (!bulkSelectMode()) {
                  <button (click)="confirmDelete(song)"
                    class="px-2.5 py-2.5 text-stone-200 dark:text-stone-700 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    title="Apagar">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                }
              </div>
            } @empty {
              @if (data.songsLoaded()) {
                <p class="px-4 py-6 text-xs text-stone-400 text-center">Nenhum resultado.</p>
              }
            }
          </div>

          <!-- Add / bulk-delete button pinned to bottom of sidebar -->
          <div class="p-3 border-t border-stone-100 dark:border-stone-700 shrink-0">
            @if (bulkSelectMode()) {
              <button type="button" (click)="bulkDelete()" [disabled]="saving() || bulkSelectedCount() === 0"
                class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                {{ saving() ? 'Apagando…' : bulkSelectedCount() > 0 ? 'Apagar ' + bulkSelectedCount() + ' música(s)' : 'Selecione músicas' }}
              </button>
            } @else {
              <button (click)="startAdd()"
                class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-capoeira-brown text-white text-sm font-semibold hover:bg-capoeira-brown/90 transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Adicionar música
              </button>
            }
          </div>
        </aside>

        <!-- Main content: scrollable form area -->
        <main
          [ngClass]="{ 'hidden': panelMode() === 'none' }"
          class="md:flex md:flex-col flex-1 overflow-y-auto">

          @if (panelMode() === 'none') {
            <!-- Empty state (desktop only — mobile hides main when none) -->
            <div class="flex flex-col items-center justify-center h-full text-center px-8">
              <div class="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                </svg>
              </div>
              <p class="text-stone-500 dark:text-stone-400 text-sm font-medium">Nenhuma música selecionada</p>
              <p class="text-stone-400 dark:text-stone-500 text-xs mt-1">Selecione uma música na lista ou clique em <strong>Adicionar</strong></p>
            </div>
          }

          @if (panelMode() !== 'none') {
            <!-- Mobile back button -->
            <div class="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shrink-0">
              <button (click)="closePanel()" class="flex items-center gap-1.5 text-sm text-capoeira-brown dark:text-capoeira-gold font-medium">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Músicas
              </button>
              @if (isDirty()) {
                <span class="ml-auto flex items-center gap-1 text-xs text-amber-600">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Não salvo
                </span>
              }
            </div>

            <div class="w-full px-4 md:px-6 py-5 space-y-4">

              <!-- Top 2-col grid on lg: Informações left, Mídia+Publicação right -->
              <div class="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-4 items-start">

              <!-- ─ Left column: Informações + Letra & Tradução ──── -->
              <div class="space-y-4">

              <!-- ─ Card: Informações + Letra & Tradução (merged) ── -->
              <section class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
                <div class="px-5 py-4 space-y-4">

                  <!-- Título + Compositor + Toque in one row -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">

                    <!-- Título -->
                    <div class="space-y-1.5">
                      <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                        Título@if (panelMode() === 'add') { <span class="text-red-400 normal-case font-normal"> *</span> }
                      </label>
                      <input type="text" [(ngModel)]="editTitle" name="editTitle"
                        [placeholder]="panelMode() === 'add' ? 'Nome da música' : ''"
                        class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold transition-shadow" />
                    </div>

                    <!-- Compositor -->
                    <div class="space-y-1.5">
                      <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Compositor</label>
                      <input type="text" [(ngModel)]="editMestre" name="mestre"
                        placeholder="ex: Mestre Bimba, Professor Coala..."
                        class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold transition-shadow" />
                    </div>

                    <!-- Toque autocomplete -->
                    <div class="space-y-1.5">
                      <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Toque</label>

                      @if (editToque.length > 0) {
                        <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
                          <span class="flex-1 truncate text-sm">{{ toqueNameById(editToque[0]) }}</span>
                          <button type="button" (click)="editToque = []; toqueSearchQuery.set('')"
                            class="shrink-0 text-amber-400 hover:text-amber-700 dark:hover:text-amber-100 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      }

                      <div class="relative">
                        <input type="text"
                          [ngModel]="toqueSearchQuery()"
                          (ngModelChange)="toqueSearchQuery.set($event)"
                          (focus)="showToqueDropdown.set(true)"
                          (blur)="showToqueDropdown.set(false)"
                          [placeholder]="editToque.length > 0 ? 'Trocar toque...' : 'Buscar toque...'"
                          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />

                        @if (showToqueDropdown()) {
                          <div class="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                            @for (group of filteredGroupedToques(); track group.label) {
                              <div class="px-3 pt-2 pb-1">
                                <p class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">{{ group.label }}</p>
                                @for (toque of group.toques; track toque.id) {
                                  <button type="button"
                                    (mousedown)="$event.preventDefault(); selectToque(toque.id)"
                                    [ngClass]="isToqueSelected(toque.id)
                                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 font-semibold'
                                      : 'text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50'"
                                    class="w-full text-left px-2 py-1.5 text-sm rounded transition-colors">
                                    {{ toque.name }}
                                  </button>
                                }
                              </div>
                            }
                            @if (filteredGroupedToques().length === 0) {
                              <p class="px-3 py-3 text-xs text-stone-400">Nenhum toque encontrado.</p>
                            }
                          </div>
                        }
                      </div>
                    </div>

                  </div>

                  <!-- Refrão -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Refrão (Português)</label>
                        @if (editRefraoTranslation.trim()) {
                          <a [href]="googleTranslateUrl(editRefraoTranslation, 'en', 'pt')"
                            target="_blank" rel="noopener"
                            class="text-xs text-stone-400 hover:text-capoeira-gold transition-colors">
                            ← EN→PT ↗
                          </a>
                        }
                      </div>
                      <textarea [(ngModel)]="editRefrao" name="refrao" rows="3"
                        placeholder="Verso que se repete entre as partes..."
                        class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm leading-relaxed placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
                      </textarea>
                    </div>
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                          Refrão (Inglês) <span class="normal-case font-normal text-stone-300 dark:text-stone-600">opcional</span>
                        </label>
                        @if (editRefrao.trim()) {
                          <a [href]="googleTranslateUrl(editRefrao, 'pt', 'en')"
                            target="_blank" rel="noopener"
                            class="text-xs text-stone-400 hover:text-capoeira-gold transition-colors">
                            PT→EN ↗
                          </a>
                        }
                      </div>
                      <textarea [(ngModel)]="editRefraoTranslation" name="refraoTranslation" rows="3"
                        placeholder="Chorus translation..."
                        class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm leading-relaxed placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
                      </textarea>
                    </div>
                  </div>

                  <!-- Letra & Tradução -->
                  <div class="pt-2 border-t border-stone-100 dark:border-stone-700">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                          <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Letra (Português)</label>
                          @if (editTranslation.trim()) {
                            <a [href]="googleTranslateUrl(editTranslation, 'en', 'pt')"
                              target="_blank" rel="noopener"
                              class="text-xs text-stone-400 hover:text-capoeira-gold transition-colors">
                              ← EN→PT ↗
                            </a>
                          }
                        </div>
                        <textarea [(ngModel)]="editLyrics" name="lyrics" rows="16"
                          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm leading-relaxed placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
                        </textarea>
                      </div>
                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between">
                          <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                            Tradução (Inglês) <span class="normal-case font-normal text-stone-300 dark:text-stone-600">opcional</span>
                          </label>
                          @if (editLyrics.trim()) {
                            <a [href]="googleTranslateUrl(editLyrics, 'pt', 'en')"
                              target="_blank" rel="noopener"
                              class="text-xs text-stone-400 hover:text-capoeira-gold transition-colors">
                              PT→EN ↗
                            </a>
                          }
                        </div>
                        <textarea [(ngModel)]="editTranslation" name="translation" rows="16"
                          class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm leading-relaxed placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
                        </textarea>
                      </div>
                    </div>
                  </div>

                  <!-- Notas -->
                  <div class="pt-2 border-t border-stone-100 dark:border-stone-700">
                    <p class="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3">Notas</p>
                    <textarea [(ngModel)]="editNotes" name="notes" rows="4"
                      placeholder="Contexto histórico, dicas de pronúncia, uso em aulas..."
                      class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm leading-relaxed placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold resize-y">
                    </textarea>
                  </div>

                </div>
              </section>

              </div><!-- /left column -->

              <!-- ─ Right column: Mídia + Publicação + Notas ──────── -->
              <div class="space-y-4">

              <!-- ─ Card: Mídia ────────────────────────────────── -->
              <section class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
                <header class="px-5 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60">
                  <h2 class="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Mídia</h2>
                </header>
                <div class="px-5 py-4 space-y-4">

                  <!-- YouTube -->
                  <div class="space-y-1.5">
                    <label class="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wide">
                      <svg class="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube
                    </label>
                    <input type="text" [(ngModel)]="editYoutube" name="youtube"
                      placeholder="https://youtube.com/watch?v=..."
                      class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
                    @if (editYoutube.trim()) {
                      <p class="text-xs text-stone-400">ID: <span class="font-mono text-capoeira-gold">{{ previewYoutubeId() }}</span></p>
                    }
                    @if (validYoutubeId(); as ytId) {
                      <div class="aspect-video w-full rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-900">
                        @if (playingYoutubeId() === ytId) {
                          <iframe [src]="youtubeEmbedUrl" class="w-full h-full"
                            title="YouTube preview" frameborder="0"
                            allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen>
                          </iframe>
                        } @else {
                          <button type="button" (click)="playYoutube()"
                            class="relative w-full h-full group/play cursor-pointer" title="Ver vídeo">
                            <img [src]="'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg'"
                              alt="Prévia do vídeo" class="w-full h-full object-cover" loading="lazy" />
                            <span class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/play:bg-black/40 transition-colors">
                              <span class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <svg class="w-6 h-6 text-capoeira-brown ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </span>
                            </span>
                          </button>
                        }
                      </div>
                    }
                  </div>

                  <!-- Spotify -->
                  <div class="space-y-1.5">
                    <label class="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wide">
                      <svg class="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3c-.2.36-.66.47-1 .25-2.8-1.7-6.3-2.1-10.44-1.15-.4.1-.78-.16-.87-.55-.1-.4.16-.78.55-.87 4.53-1.04 8.4-.6 11.53 1.32.35.2.46.66.24 1zm1.47-3.27c-.27.44-.85.58-1.3.3-3.2-1.96-8.06-2.53-11.83-1.38-.5.15-1.02-.13-1.17-.62-.15-.5.13-1.02.62-1.17 4.32-1.3 9.68-.67 13.37 1.6.44.26.58.84.3 1.28zm.13-3.4C15.24 8.35 8.94 8.14 5.28 9.25c-.6.18-1.22-.16-1.4-.74-.18-.6.15-1.22.74-1.4 4.2-1.28 11.2-1.03 15.6 1.58.53.32.7 1 .4 1.54-.32.53-1.02.7-1.55.4z"/>
                      </svg>
                      Spotify
                    </label>
                    <input type="text" [(ngModel)]="editSpotify" name="spotify"
                      placeholder="https://open.spotify.com/track/..."
                      class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
                    @if (!validYoutubeId() && validSpotifyUri(); as spUri) {
                      <div class="w-full">
                        @if (loadedSpotifyUri() === spUri) {
                          <iframe [src]="spotifyEmbedUrl" class="w-full rounded-lg" height="152"
                            title="Spotify preview" frameborder="0"
                            allow="encrypted-media" loading="lazy">
                          </iframe>
                        } @else {
                          <button type="button" (click)="loadSpotify()"
                            class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-sm text-stone-500 hover:text-emerald-600 hover:border-emerald-400 transition-colors cursor-pointer">
                            <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3c-.2.36-.66.47-1 .25-2.8-1.7-6.3-2.1-10.44-1.15-.4.1-.78-.16-.87-.55-.1-.4.16-.78.55-.87 4.53-1.04 8.4-.6 11.53 1.32.35.2.46.66.24 1zm1.47-3.27c-.27.44-.85.58-1.3.3-3.2-1.96-8.06-2.53-11.83-1.38-.5.15-1.02-.13-1.17-.62-.15-.5.13-1.02.62-1.17 4.32-1.3 9.68-.67 13.37 1.6.44.26.58.84.3 1.28zm.13-3.4C15.24 8.35 8.94 8.14 5.28 9.25c-.6.18-1.22-.16-1.4-.74-.18-.6.15-1.22.74-1.4 4.2-1.28 11.2-1.03 15.6 1.58.53.32.7 1 .4 1.54-.32.53-1.02.7-1.55.4z"/>
                            </svg>
                            Ouvir prévia do Spotify
                          </button>
                        }
                      </div>
                    }
                  </div>

                </div>
              </section>

              <!-- ─ Card: Publicação ───────────────────────────── -->
              <section class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
                <header class="px-5 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60">
                  <h2 class="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Publicação</h2>
                </header>
                <div class="px-5 py-4">
                  <div class="flex gap-2">
                    <button type="button" (click)="editPreview = true"
                      [ngClass]="editPreview
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-300 hover:text-stone-700 dark:hover:text-stone-300'"
                      class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      Visível publicamente
                    </button>
                    <button type="button" (click)="editPreview = false"
                      [ngClass]="!editPreview
                        ? 'bg-stone-100 dark:bg-stone-700 border-stone-400 dark:border-stone-500 text-stone-800 dark:text-stone-200 font-semibold'
                        : 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-300 hover:text-stone-700 dark:hover:text-stone-300'"
                      class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                      Somente assinantes
                    </button>
                  </div>
                </div>
              </section>

              </div><!-- /right column -->
              </div><!-- /top grid -->

              <!-- Keyboard shortcut hint + spacer -->
              <div class="flex items-center justify-end pb-6">
                <span class="text-xs text-stone-300 dark:text-stone-600">⌘S / Ctrl+S para salvar</span>
              </div>

            </div>
          }
        </main>

        <!-- Right sidebar: song metadata (desktop only) -->
        @if (panelMode() === 'edit' && selectedSong()) {
          <aside class="hidden lg:flex lg:flex-col w-52 shrink-0 border-l border-stone-200/60 dark:border-stone-800/60 overflow-y-auto bg-white dark:bg-stone-950">
            <div class="px-4 py-5 space-y-5">

              <div>
                <p class="text-[10px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest mb-3">Detalhes</p>
                <div class="space-y-4">

                  <div>
                    <p class="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1">Tipo</p>
                    <div class="flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full" [class]="dot(selectedSong()!.type)"></span>
                      <p class="text-sm font-medium text-stone-700 dark:text-stone-200 capitalize">{{ selectedSong()!.type }}</p>
                    </div>
                  </div>

                  <div>
                    <p class="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1">Adicionada em</p>
                    <p class="text-sm text-stone-700 dark:text-stone-200">{{ selectedSong()!.dateAdded }}</p>
                  </div>

                  <div>
                    <p class="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">Mídia</p>
                    <div class="space-y-1.5">
                      <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0"
                          [class]="selectedSong()!.audioLinks.youtube ? 'bg-red-400' : 'bg-stone-200 dark:bg-stone-600'"></span>
                        <span class="text-xs"
                          [class]="selectedSong()!.audioLinks.youtube ? 'text-stone-600 dark:text-stone-300' : 'text-stone-300 dark:text-stone-600'">YouTube</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0"
                          [class]="selectedSong()!.audioLinks.spotify ? 'bg-emerald-400' : 'bg-stone-200 dark:bg-stone-600'"></span>
                        <span class="text-xs"
                          [class]="selectedSong()!.audioLinks.spotify ? 'text-stone-600 dark:text-stone-300' : 'text-stone-300 dark:text-stone-600'">Spotify</span>
                      </div>
                    </div>
                  </div>

                  @if (selectedSong()!.toque.length > 0) {
                    <div>
                      <p class="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">Toques</p>
                      <div class="flex flex-wrap gap-1">
                        @for (toqueId of selectedSong()!.toque; track toqueId) {
                          <span class="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
                            {{ toqueNameById(toqueId) }}
                          </span>
                        }
                      </div>
                    </div>
                  }

                  <div>
                    <p class="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1">ID</p>
                    <p class="text-[10px] font-mono text-stone-400 dark:text-stone-500 break-all leading-relaxed">{{ selectedSong()!.id }}</p>
                  </div>

                </div>
              </div>

              <div class="border-t border-stone-100 dark:border-stone-700 pt-4">
                <p class="text-[10px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest mb-2">Atalhos</p>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-stone-400 dark:text-stone-500">Salvar</span>
                  <kbd class="text-[10px] bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500 px-1.5 py-0.5 rounded font-mono border border-stone-200 dark:border-stone-600">⌘S</kbd>
                </div>
              </div>

            </div>
          </aside>
        }

      </div>

      <!-- Delete confirmation modal -->
      @if (deleteTarget()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-capoeira-night/60 backdrop-blur-sm px-4">
          <div class="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 class="font-display text-lg font-bold text-stone-800 dark:text-stone-100">Apagar música?</h3>
            <p class="text-sm text-stone-500">"{{ deleteTarget()!.title }}" será removida permanentemente.</p>
            <div class="flex gap-3">
              <button (click)="deleteSong()" [disabled]="saving()"
                class="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {{ saving() ? 'Apagando…' : 'Sim, apagar' }}
              </button>
              <button (click)="deleteTarget.set(null)"
                class="flex-1 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
})
export class AdminComponent implements OnInit {
  data = inject(DataService);
  private fb = inject(FirebaseService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private theme = inject(ThemeService);

  panelMode = signal<PanelMode>('none');
  selectedSong = signal<Song | null>(null);
  deleteTarget = signal<Song | null>(null);
  filterQuery = signal('');
  toqueSearchQuery = signal('');
  showToqueDropdown = signal(false);
  bulkSelectMode = signal(false);
  bulkSelected = signal<Set<string>>(new Set());
  bulkSelectedCount = computed(() => this.bulkSelected().size);

  readonly typeOptions = TYPE_OPTIONS;

  readonly filteredSongs = computed(() => {
    const q = this.filterQuery().toLowerCase().trim();
    if (!q) return this.data.songs();
    return this.data.songs().filter(s => s.title.toLowerCase().includes(q));
  });

  readonly groupedToques = computed(() => {
    const order = ['angola', 'regional', 'abada', 'other'];
    const labels: Record<string, string> = { angola: 'Angola', regional: 'Regional', abada: 'Abadá', other: 'Outros' };
    const map = new Map<string, Toque[]>();
    for (const t of this.data.toques()) {
      const cat = (t as any).category ?? 'other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return order.filter(c => map.has(c)).map(c => ({ label: labels[c], toques: map.get(c)! }));
  });

  readonly filteredGroupedToques = computed(() => {
    const q = this.toqueSearchQuery().toLowerCase().trim();
    const groups = this.groupedToques();
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, toques: g.toques.filter(t => t.name.toLowerCase().includes(q)) }))
      .filter(g => g.toques.length > 0);
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
  editRefrao = '';
  editRefraoTranslation = '';
  editPreview = false;

  saving = signal(false);
  saveError = signal('');
  saveSuccess = signal(false);

  private snapshot: { title: string; type: string; toque: string[]; mestre: string; youtube: string; spotify: string; lyrics: string; translation: string; notes: string; refrao: string; refraoTranslation: string; preview: boolean } | null = null;

  ngOnInit() {
    this.theme.init();
  }

  isDirty(): boolean {
    const s = this.snapshot;
    if (!s) return false;
    return s.title !== this.editTitle ||
      s.type !== this.editType ||
      s.mestre !== this.editMestre ||
      s.youtube !== this.editYoutube ||
      s.spotify !== this.editSpotify ||
      s.lyrics !== this.editLyrics ||
      s.translation !== this.editTranslation ||
      s.notes !== this.editNotes ||
      s.refrao !== this.editRefrao ||
      s.refraoTranslation !== this.editRefraoTranslation ||
      s.preview !== this.editPreview ||
      JSON.stringify(s.toque.slice().sort()) !== JSON.stringify(this.editToque.slice().sort());
  }

  private takeSnapshot() {
    this.snapshot = {
      title: this.editTitle, type: this.editType, toque: [...this.editToque],
      mestre: this.editMestre, youtube: this.editYoutube, spotify: this.editSpotify,
      lyrics: this.editLyrics, translation: this.editTranslation,
      notes: this.editNotes, refrao: this.editRefrao, refraoTranslation: this.editRefraoTranslation, preview: this.editPreview,
    };
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (this.panelMode() === 'edit') this.save();
      if (this.panelMode() === 'add') this.addSong();
    }
  }

  typeOptionClass(value: string): string {
    const c = TYPE_COLORS[value];
    return this.editType === value ? (c?.active ?? '') : (c?.base ?? '');
  }

  typeDotClass(value: string): string {
    return TYPE_COLORS[value]?.dot ?? 'bg-stone-300';
  }

  isToqueSelected(id: string): boolean {
    return this.editToque.includes(id);
  }

  toggleToque(id: string): void {
    this.editToque = this.editToque.includes(id) ? [] : [id];
  }

  selectToque(id: string): void {
    this.editToque = [id];
    this.toqueSearchQuery.set('');
    this.showToqueDropdown.set(false);
  }

  selectedToqueObjects(): Toque[] {
    const allToques = this.data.toques();
    return this.editToque
      .map(id => allToques.find(t => t.id === id))
      .filter((t): t is Toque => !!t);
  }

  toqueNameById(id: string): string {
    return this.data.toques().find(t => t.id === id)?.name ?? id;
  }

  googleTranslateUrl(text: string, from: string, to: string): string {
    return `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text)}`;
  }

  selectSong(song: Song) {
    if (this.isDirty() && !confirm('Há alterações não salvas. Descartar e continuar?')) return;
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
    this.editRefrao = song.refrao ?? '';
    this.editRefraoTranslation = song.refraoTranslation ?? '';
    this.editPreview = song.preview ?? false;
    this.saveError.set('');
    this.saveSuccess.set(false);
    this.toqueSearchQuery.set('');
    this.resetMediaPreview();
    this.takeSnapshot();
  }

  startAdd() {
    if (this.isDirty() && !confirm('Há alterações não salvas. Descartar e continuar?')) return;
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
    this.editRefrao = '';
    this.editRefraoTranslation = '';
    this.editPreview = false;
    this.saveError.set('');
    this.saveSuccess.set(false);
    this.toqueSearchQuery.set('');
    this.resetMediaPreview();
    this.takeSnapshot();
  }

  closePanel() {
    if (this.isDirty() && !confirm('Há alterações não salvas. Descartar e fechar?')) return;
    this.snapshot = null;
    this.panelMode.set('none');
    this.selectedSong.set(null);
    this.toqueSearchQuery.set('');
    this.resetMediaPreview();
  }

  previewYoutubeId(): string {
    return extractYoutubeId(this.editYoutube);
  }

  playingYoutubeId = signal('');
  youtubeEmbedUrl: SafeResourceUrl | null = null;
  loadedSpotifyUri = signal('');
  spotifyEmbedUrl: SafeResourceUrl | null = null;

  validYoutubeId(): string {
    const id = this.previewYoutubeId();
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : '';
  }

  validSpotifyUri(): string {
    if (!this.editSpotify.trim()) return '';
    const uri = normalizeSpotify(this.editSpotify);
    return /^spotify:(track|album|playlist):[A-Za-z0-9]+$/.test(uri) ? uri : '';
  }

  playYoutube() {
    const id = this.validYoutubeId();
    if (!id) return;
    this.youtubeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${id}?autoplay=1`
    );
    this.playingYoutubeId.set(id);
  }

  loadSpotify() {
    const uri = this.validSpotifyUri();
    if (!uri) return;
    const [, type, id] = uri.split(':');
    this.spotifyEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://open.spotify.com/embed/${type}/${id}`
    );
    this.loadedSpotifyUri.set(uri);
  }

  private resetMediaPreview() {
    this.playingYoutubeId.set('');
    this.youtubeEmbedUrl = null;
    this.loadedSpotifyUri.set('');
    this.spotifyEmbedUrl = null;
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
          refrao: this.editRefrao.trim() || null,
          refraoTranslation: this.editRefraoTranslation.trim() || null,
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
        if (this.editRefrao.trim()) override.refrao = this.editRefrao.trim();
        if (this.editRefraoTranslation.trim()) override.refraoTranslation = this.editRefraoTranslation.trim();
        await this.fb.saveSongOverride(song.id, override);
      }
      await this.data.refreshOverrides();
      const refreshed = this.data.songById().get(song.id);
      if (refreshed) this.selectedSong.set(refreshed);
      this.takeSnapshot();
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
        refrao: this.editRefrao.trim() || null,
        refraoTranslation: this.editRefraoTranslation.trim() || null,
        themes: [],
        audioLinks,
        preview: this.editPreview,
        dateAdded: new Date().toISOString().split('T')[0],
      };
      await this.fb.saveExtraSong(newSong);
      await this.data.refreshOverrides();
      this.takeSnapshot();
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
      this.editRefrao = '';
      this.editRefraoTranslation = '';
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

  enterBulkMode(): void {
    this.bulkSelectMode.set(true);
    this.bulkSelected.set(new Set());
  }

  toggleBulkSelect(songId: string, event: Event): void {
    event.stopPropagation();
    const s = new Set(this.bulkSelected());
    s.has(songId) ? s.delete(songId) : s.add(songId);
    this.bulkSelected.set(s);
  }

  exitBulkMode(): void {
    this.bulkSelectMode.set(false);
    this.bulkSelected.set(new Set());
  }

  async bulkDelete(): Promise<void> {
    const ids = [...this.bulkSelected()];
    if (!ids.length) return;
    if (!confirm(`Apagar ${ids.length} música(s)? Esta ação não pode ser desfeita.`)) return;
    this.saving.set(true);
    try {
      const extraIds = this.data.extraSongIds();
      await Promise.all(
        ids.map(id => extraIds.has(id) ? this.fb.deleteExtraSong(id) : this.fb.markDeleted(id))
      );
      await this.data.refreshOverrides();
      if (this.selectedSong() && ids.includes(this.selectedSong()!.id)) this.closePanel();
      this.exitBulkMode();
    } catch {
      // silently ignore errors
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
