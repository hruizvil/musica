import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Song } from '../../core/models/song.model';
import { NovoIconComponent, NovoStatusComponent, NovoTempoComponent } from './novo-ui';
import { YoutubeEmbedComponent } from '../../shared/components/youtube-embed/youtube-embed.component';

/** Estúdio home: what to practise next, how far along you are, and the toques to hear. */
@Component({
  selector: 'app-novo-home',
  standalone: true,
  imports: [RouterLink, NovoIconComponent, NovoStatusComponent, NovoTempoComponent, YoutubeEmbedComponent],
  template: `
    <div class="max-w-[1180px] mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6 md:gap-8">

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <p class="n-label hidden md:block">Início</p>
          @if (firebase.currentUser()) {
            <h1 class="m-0 text-3xl md:text-4xl font-semibold tracking-[-0.03em]">{{ greeting() }}, {{ firstName() }}.</h1>
            <p class="m-0 text-[15px] text-[#5f6778]">
              @if (queue().length) {
                {{ queue().length === 1 ? 'Uma cantiga' : queue().length + ' cantigas' }} na sua fila de prática.
              } @else {
                Sua fila de prática está vazia. Toque no coração de uma cantiga para começar.
              }
            </p>
          } @else {
            <h1 class="m-0 text-3xl md:text-4xl font-semibold tracking-[-0.03em]">Aprenda as cantigas da roda.</h1>
            <p class="m-0 max-w-xl text-[15px] text-[#5f6778]">{{ data.songs().length }} cantigas com letra e tradução, {{ data.toques().length }} toques e um modo de prática para decorar a letra.</p>
          }
        </div>
        @if (queue().length) {
          <a [routerLink]="['/novo/musicas', queue()[0].id]" [queryParams]="{ modo: 'praticar' }"
             class="h-12 md:h-11 px-5 rounded-xl md:rounded-[10px] bg-[#2146d8] text-white text-base md:text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#1733a8]">
            <app-novo-icon name="eye" [size]="18" /> Praticar a próxima
          </a>
        } @else if (!firebase.currentUser() && !firebase.pendingSignedIn()) {
          <a routerLink="/novo/musicas" class="h-12 md:h-11 px-5 rounded-[10px] bg-[#2146d8] text-white font-semibold inline-flex items-center justify-center gap-2">Ver as cantigas</a>
        }
      </div>

      <div class="grid md:grid-cols-[2fr_1fr] gap-5 items-start">
        <section class="flex flex-col gap-3" aria-labelledby="fila">
          <div class="flex items-center justify-between">
            <h2 id="fila" class="m-0 text-base font-semibold">Fila de prática</h2>
            <a routerLink="/novo/musicas" [queryParams]="{ lista: 'favoritas' }" class="min-h-9 inline-flex items-center text-sm font-semibold text-[#2146d8]">Ver fila</a>
          </div>
          @if (queue().length) {
            <div class="grid sm:grid-cols-3 gap-3">
              @for (song of queue().slice(0, 3); track song.id; let i = $index) {
                <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 md:p-5 flex flex-col gap-3.5">
                  <div class="flex items-center justify-between"><span class="n-mono text-xs text-[#5f6778]">#{{ i + 1 }} na fila</span><app-novo-status [songId]="song.id" /></div>
                  <a [routerLink]="['/novo/musicas', song.id]" class="text-lg md:text-xl font-semibold tracking-[-0.01em] text-[#0f1115] hover:text-[#2146d8]">{{ song.title }}</a>
                  <div class="flex items-center gap-2 flex-wrap"><span class="text-[13px] text-[#5f6778]">{{ toqueName(song) }}</span><app-novo-tempo [toque]="toqueOf(song)" /></div>
                  <div class="flex gap-2 mt-auto">
                    <a [routerLink]="['/novo/musicas', song.id]" [queryParams]="{ modo: 'praticar' }" class="h-10 md:h-9 px-3.5 rounded-[10px] bg-[#2146d8] text-white text-sm font-semibold inline-flex items-center gap-2"><app-novo-icon name="eye" [size]="16" />Praticar</a>
                    <a [routerLink]="['/novo/musicas', song.id]" class="h-10 md:h-9 px-3.5 rounded-[10px] border border-[#e3e6eb] text-sm font-semibold inline-flex items-center text-[#0f1115]">Letra</a>
                  </div>
                </div>
              }
            </div>
          } @else if (firebase.pendingSignedIn()) {
            <div aria-hidden="true" class="h-44 rounded-[14px] bg-[#eef0f3] animate-pulse"></div>
          } @else {
            <div class="bg-white border border-dashed border-[#c9ced8] rounded-[14px] p-6 flex flex-col gap-3 items-start">
              <p class="m-0 text-[15px] text-[#434a5a]">A fila é feita das cantigas que você marca com o coração. Elas aparecem aqui, na ordem em que você marcou.</p>
              @if (!firebase.currentUser()) {
                <a routerLink="/login" [queryParams]="{ returnUrl: '/novo' }" class="h-10 px-4 rounded-[10px] bg-[#0f1115] text-white text-sm font-semibold inline-flex items-center">Entrar com Google</a>
              } @else {
                <a routerLink="/novo/musicas" class="h-10 px-4 rounded-[10px] bg-[#0f1115] text-white text-sm font-semibold inline-flex items-center">Escolher cantigas</a>
              }
            </div>
          }
        </section>

        <section class="bg-white border border-[#e3e6eb] rounded-[14px] p-5 flex flex-col gap-4" aria-labelledby="progresso">
          <h2 id="progresso" class="n-label m-0 font-normal">Seu progresso</h2>
          <p class="m-0 text-4xl font-semibold tracking-[-0.02em]">{{ learnedCount() }}<span class="text-lg text-[#5f6778] font-medium"> de {{ data.songs().length }} aprendidas</span></p>
          <div class="h-2 rounded-full bg-[#f6f7f9] overflow-hidden" role="progressbar" [attr.aria-valuenow]="learnedCount()" aria-valuemin="0" [attr.aria-valuemax]="data.songs().length" aria-label="Cantigas aprendidas">
            <div class="h-full bg-[#0b7a55]" [style.width.%]="learnedPct()"></div>
          </div>
          @for (row of byToque(); track row.id) {
            <a [routerLink]="['/novo/toques', row.id]" class="flex items-center justify-between text-sm text-[#434a5a] hover:text-[#2146d8]">
              <span>{{ row.name }}</span><span class="n-mono text-[13px]">{{ row.learned }} / {{ row.total }}</span>
            </a>
          }
          @if (!firebase.currentUser()) {
            <p class="m-0 text-[13px] text-[#5f6778]">Entre para marcar as cantigas que já sabe.</p>
          }
        </section>
      </div>

      @if (videos().length) {
        <section class="flex flex-col gap-3" aria-labelledby="toques-video">
          <h2 id="toques-video" class="m-0 text-base font-semibold">Ouça os toques</h2>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (v of videos(); track v.id) {
              <div class="bg-white border border-[#e3e6eb] rounded-[14px] p-3 flex flex-col gap-3">
                <app-youtube-embed [videoId]="v.youtubeId" [title]="v.title" [showControls]="false" />
                <div class="flex items-center justify-between gap-2 px-1 pb-1">
                  <a [routerLink]="['/novo/toques', v.toque]" class="text-[15px] font-semibold text-[#0f1115] hover:text-[#2146d8]">{{ v.title }}</a>
                  <app-novo-tempo [toque]="data.toqueById().get(v.toque ?? '')" />
                </div>
              </div>
            }
          </div>
        </section>
      }

      <section class="flex flex-col gap-3" aria-labelledby="recentes">
        <div class="flex items-center justify-between">
          <h2 id="recentes" class="m-0 text-base font-semibold">Adicionadas recentemente</h2>
          <a routerLink="/novo/musicas" class="min-h-9 inline-flex items-center text-sm font-semibold text-[#2146d8]">Ver todas</a>
        </div>
        <div class="bg-white border border-[#e3e6eb] rounded-[14px] overflow-hidden">
          <table class="w-full border-collapse">
            <caption class="sr-only">Cantigas adicionadas recentemente</caption>
            <tbody>
              @for (song of recent(); track song.id) {
                <tr class="border-t first:border-t-0 border-[#e3e6eb]">
                  <td class="px-4 py-3"><a [routerLink]="['/novo/musicas', song.id]" class="text-sm font-semibold text-[#0f1115] hover:text-[#2146d8]">{{ song.title }}</a></td>
                  <td class="px-4 py-3 text-sm text-[#434a5a] hidden sm:table-cell">{{ toqueName(song) }}</td>
                  <td class="px-4 py-3"><app-novo-status [songId]="song.id" /></td>
                  <td class="px-4 py-3 text-right n-mono text-xs text-[#5f6778] hidden sm:table-cell">{{ song.dateAdded }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class NovoHomeComponent {
  readonly data = inject(DataService);
  readonly firebase = inject(FirebaseService);

  /** The practice queue is the favourites, in the order they were starred. */
  readonly queue = computed<Song[]>(() => {
    const byId = this.data.songById();
    return [...this.firebase.favorites()].map(id => byId.get(id)).filter((s): s is Song => !!s);
  });

  readonly learnedCount = computed(() => {
    const byId = this.data.songById();
    return [...this.firebase.learnedSongs()].filter(id => byId.has(id)).length;
  });
  readonly learnedPct = computed(() => (this.data.songs().length ? (this.learnedCount() / this.data.songs().length) * 100 : 0));

  /** Progress for the three toques with the most songs. */
  readonly byToque = computed(() => {
    const learned = this.firebase.learnedSongs();
    return [...this.data.songsByToque().entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([id, songs]) => ({
        id, name: this.data.toqueById().get(id)?.name ?? id,
        total: songs.length, learned: songs.filter(s => learned.has(s.id)).length,
      }));
  });

  readonly videos = computed(() => this.data.videos().filter(v => !!v.toque));
  readonly recent = computed(() => [...this.data.songs()].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 5));

  readonly firstName = computed(() => {
    const u = this.firebase.currentUser();
    return (u?.displayName || u?.email?.split('@')[0] || '').split(' ')[0];
  });

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  });

  toqueOf(song: Song) { return this.data.toqueById().get(song.toque[0]); }
  toqueName(song: Song): string { return this.toqueOf(song)?.name ?? ''; }
}
