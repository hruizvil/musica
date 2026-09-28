import { Component, ElementRef, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { NovoPlayerService } from './novo-player.service';
import { NovoCoverComponent, NovoIconComponent } from './novo-ui';
import { plainText, seedOf } from './novo-data';

/**
 * The player that stays on screen: a strip along the bottom showing the line being sung
 * and its translation, and a video card that stays visible while something plays (YouTube
 * requires it; minimising pauses). On a phone the strip is a card above the tab bar.
 */
@Component({
  selector: 'app-novo-player',
  standalone: true,
  imports: [RouterLink, NovoCoverComponent, NovoIconComponent],
  template: `
    <!-- The YouTube frame. Always mounted so playback survives navigation; moved off screen
         (never shrunk) when there is nothing to show, and paused whenever it is off screen. -->
    <section aria-label="Vídeo" class="no-print fixed z-50 rounded-2xl overflow-hidden bg-[var(--n-surf)] border border-[var(--n-line)] shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-opacity"
      [class]="videoVisible() ? 'right-2.5 left-2.5 md:left-auto md:right-6 bottom-[176px] md:bottom-[112px] md:w-[380px] opacity-100' : '-left-[9999px] bottom-0 w-[380px] opacity-0 pointer-events-none'"
      [attr.aria-hidden]="!videoVisible()">
      <div class="flex items-center gap-2 pl-4 pr-1.5 h-11">
        <span class="flex-1 min-w-0 text-[13px] font-bold truncate">{{ player.current()?.fromToque ? 'Toque ' + player.current()?.subtitle : player.current()?.title }}</span>
        <button type="button" (click)="player.minimize()" aria-label="Minimizar vídeo (pausa)" class="w-9 h-9 rounded-full flex items-center justify-center text-[var(--n-tx2)] hover:bg-[var(--n-raise)]"><app-novo-icon name="min" [size]="18" /></button>
      </div>
      <div class="relative w-full aspect-video min-h-[200px] bg-black">
        <div #ytHost class="absolute inset-0 w-full h-full"></div>
      </div>
      @if (player.current()?.fromToque) {
        <p class="m-0 px-4 py-2.5 text-[12px] text-[var(--n-tx2)]">Esta cantiga ainda não tem gravação. Tocando a demonstração do toque.</p>
      }
    </section>

    @if (player.current(); as item) {
      <!-- Desktop strip -->
      <footer aria-label="Player" class="no-print hidden md:grid fixed inset-x-0 bottom-0 z-40 h-24 grid-cols-[auto_minmax(0,1fr)_minmax(0,360px)] items-center gap-6 px-8 bg-[var(--n-surf)] border-t border-[var(--n-line)]">
        <span class="absolute left-0 -top-px h-[3px] bg-[var(--n-acc)] transition-[width] duration-500 ease-linear" [style.width.%]="player.progress() * 100" aria-hidden="true"></span>
        <div class="flex items-center gap-1.5">
          <button type="button" (click)="player.prev()" [disabled]="!player.hasPrev()" aria-label="Anterior" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="prev" [size]="20" /></button>
          <button type="button" (click)="player.toggle()" [disabled]="!item.videoId" [attr.aria-label]="player.playing() ? 'Pausar' : 'Tocar'"
            class="w-[52px] h-[52px] rounded-2xl bg-[var(--n-acc)] text-[#1a1400] flex items-center justify-center disabled:opacity-40"><app-novo-icon [name]="player.playing() ? 'pause' : 'play'" [size]="20" /></button>
          <button type="button" (click)="player.next()" [disabled]="!player.hasNext()" aria-label="Próxima" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="next" [size]="20" /></button>
          <button type="button" (click)="player.toggleLoop()" [attr.aria-pressed]="player.loop()" aria-label="Repetir" class="w-11 h-11 rounded-full flex items-center justify-center"
            [style.color]="player.loop() ? 'var(--n-acc-tx)' : 'var(--n-tx2)'"><app-novo-icon name="loop" [size]="18" /></button>
          <button type="button" (click)="player.cycleRate()" aria-label="Velocidade" class="h-8 px-2.5 rounded-lg border border-[var(--n-line)] text-xs font-extrabold tabular-nums">{{ rateLabel() }}</button>
        </div>

        <div class="min-w-0 flex items-center gap-2">
          @if (player.currentLine(); as line) {
            <div class="flex flex-col">
              <button type="button" (click)="player.stepLine(-1)" aria-label="Linha anterior" class="w-8 h-8 rounded-full flex items-center justify-center text-[var(--n-tx3)] hover:bg-[var(--n-raise)]"><app-novo-icon name="up" [size]="16" /></button>
              <button type="button" (click)="player.stepLine(1)" aria-label="Próxima linha" class="w-8 h-8 rounded-full flex items-center justify-center text-[var(--n-tx3)] hover:bg-[var(--n-raise)]"><app-novo-icon name="down" [size]="16" /></button>
            </div>
            <a [routerLink]="['/novo/cantigas', item.songId]" class="min-w-0 flex flex-col gap-0.5 hover:no-underline">
              <span class="text-[13px] text-[var(--n-tx3)] truncate">{{ player.previousLine()?.pt || ' ' }}</span>
              <span class="n-disp text-xl font-semibold tracking-[-0.02em] text-[var(--n-tx)] truncate">{{ line.pt }}</span>
              @if (line.en) { <span class="text-sm text-[var(--n-acc-tx)] truncate">{{ plain(line.en) }}</span> }
            </a>
          } @else {
            <span class="text-sm text-[var(--n-tx2)] truncate">{{ item.subtitle }}</span>
          }
        </div>

        <div class="flex items-center gap-3 justify-end min-w-0">
          <app-novo-cover [color]="item.color" [size]="52" [radius]="10" [seed]="seed(item.key)" />
          <div class="min-w-0 flex flex-col">
            <span class="text-[15px] font-extrabold truncate">{{ item.title }}</span>
            <span class="text-[13px] text-[var(--n-tx2)] truncate">{{ item.fromToque ? 'Vídeo do toque ' + item.subtitle : (item.videoId ? item.subtitle : 'Sem gravação ainda') }}</span>
          </div>
          @if (item.songId) {
            <button type="button" (click)="favorites.toggle(item.songId)" [attr.aria-pressed]="liked()" aria-label="Curtir" class="w-10 h-10 rounded-full flex items-center justify-center"
              [style.color]="liked() ? 'var(--n-acc-tx)' : 'var(--n-tx3)'"><app-novo-icon name="heart" [size]="20" [filled]="liked()" /></button>
          }
          @if (player.minimized() && item.videoId) {
            <button type="button" (click)="player.restore()" aria-label="Mostrar vídeo" class="w-10 h-10 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="video" [size]="20" /></button>
          }
          <button type="button" (click)="player.close()" aria-label="Fechar player" class="w-10 h-10 rounded-full flex items-center justify-center text-[var(--n-tx3)]"><app-novo-icon name="close" [size]="18" /></button>
        </div>
      </footer>

      <!-- Phone card, above the tab bar -->
      <section aria-label="Player" class="no-print md:hidden fixed inset-x-2.5 bottom-[84px] z-40 rounded-2xl bg-[var(--n-raise)] border border-[var(--n-line)] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <span class="absolute left-0 bottom-0 h-[3px] bg-[var(--n-acc)] transition-[width] duration-500 ease-linear" [style.width.%]="player.progress() * 100" aria-hidden="true"></span>
        <div class="flex items-center gap-3 pl-3.5 pr-2 py-2.5">
          <a [routerLink]="item.songId ? ['/novo/cantigas', item.songId] : ['/novo/toques', item.toqueId]" class="flex-1 min-w-0 flex flex-col gap-0.5 hover:no-underline">
            <span class="text-xs font-bold text-[var(--n-tx3)] truncate">{{ item.title }}</span>
            @if (player.currentLine(); as line) {
              <span class="n-disp text-[15px] font-semibold tracking-[-0.02em] text-[var(--n-tx)] truncate">{{ line.pt }}</span>
              @if (line.en) { <span class="text-[13px] text-[var(--n-acc-tx)] truncate">{{ plain(line.en) }}</span> }
            } @else {
              <span class="text-[13px] text-[var(--n-tx2)] truncate">{{ item.videoId ? item.subtitle : 'Sem gravação ainda' }}</span>
            }
          </a>
          <button type="button" (click)="expanded.set(!expanded())" [attr.aria-expanded]="expanded()" aria-label="Mais controles" class="w-11 h-11 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon [name]="expanded() ? 'down' : 'up'" [size]="20" /></button>
          <button type="button" (click)="player.toggle()" [disabled]="!item.videoId" [attr.aria-label]="player.playing() ? 'Pausar' : 'Tocar'"
            class="w-[46px] h-[46px] shrink-0 rounded-[14px] bg-[var(--n-acc)] text-[#1a1400] flex items-center justify-center disabled:opacity-40"><app-novo-icon [name]="player.playing() ? 'pause' : 'play'" [size]="18" /></button>
        </div>
        @if (expanded()) {
          <div class="flex items-center justify-between px-2 pb-2.5">
            <button type="button" (click)="player.prev()" [disabled]="!player.hasPrev()" aria-label="Anterior" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="prev" [size]="20" /></button>
            <button type="button" (click)="player.next()" [disabled]="!player.hasNext()" aria-label="Próxima" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="next" [size]="20" /></button>
            <button type="button" (click)="player.stepLine(-1)" [disabled]="!player.currentLine()" aria-label="Linha anterior" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="up" [size]="20" /></button>
            <button type="button" (click)="player.stepLine(1)" [disabled]="!player.currentLine()" aria-label="Próxima linha" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="down" [size]="20" /></button>
            <button type="button" (click)="player.toggleLoop()" [attr.aria-pressed]="player.loop()" aria-label="Repetir" class="w-11 h-11 rounded-full flex items-center justify-center" [style.color]="player.loop() ? 'var(--n-acc-tx)' : 'var(--n-tx2)'"><app-novo-icon name="loop" [size]="18" /></button>
            <button type="button" (click)="player.cycleRate()" aria-label="Velocidade" class="h-9 px-2.5 rounded-lg border border-[var(--n-line)] text-xs font-extrabold tabular-nums">{{ rateLabel() }}</button>
            @if (player.minimized() && item.videoId) {
              <button type="button" (click)="player.restore()" aria-label="Mostrar vídeo" class="w-11 h-11 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="video" [size]="20" /></button>
            } @else {
              <button type="button" (click)="player.close()" aria-label="Fechar player" class="w-11 h-11 rounded-full flex items-center justify-center text-[var(--n-tx3)]"><app-novo-icon name="close" [size]="18" /></button>
            }
          </div>
        }
      </section>
    }
  `,
})
export class NovoPlayerComponent implements OnDestroy {
  readonly player = inject(NovoPlayerService);
  readonly favorites = inject(FavoritesService);
  private firebase = inject(FirebaseService);
  private ytHost = viewChild.required<ElementRef<HTMLElement>>('ytHost');

  readonly expanded = signal(false);
  readonly videoVisible = computed(() => !!this.player.current()?.videoId && !this.player.minimized());
  readonly liked = computed(() => !!this.player.current()?.songId && this.firebase.favorites().has(this.player.current()!.songId!));
  readonly rateLabel = computed(() => String(this.player.rate()).replace('.', ',') + '×');

  constructor() {
    afterNextRender(() => this.player.attach(this.ytHost().nativeElement));
  }

  ngOnDestroy(): void {
    // Leaving the new design stops its music; the current site has its own players.
    this.player.close();
    this.player.detach();
  }

  seed(key: string): number { return seedOf(key); }
  plain(text: string): string { return plainText(text); }
}
