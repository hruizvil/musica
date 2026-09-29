import { Component, DestroyRef, ElementRef, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { NovoPlayerService, RepeatMode } from './novo-player.service';
import { NovoLangService } from './novo-lang.service';
import { NovoCoverComponent, NovoIconComponent } from './novo-ui';
import { plainText, seedOf } from './novo-data';

/**
 * The player that stays on screen.
 *
 * Desktop: a strip along the bottom (controls, the line being sung with its translation,
 * what is playing) and, while a video plays, a compact video card docked bottom-left,
 * where on a song page it sits over the cover column and not over the lyrics.
 *
 * Phone: one card above the tab bar. While a video plays it holds the video with the line
 * and controls beneath it, so the lyrics keep as much of the screen as possible.
 *
 * YouTube requires the video to stay visible (at least 200×200) while it plays, so hiding
 * the video always pauses it.
 */
@Component({
  selector: 'app-novo-player',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, NovoCoverComponent, NovoIconComponent],
  template: `
    <!-- The YouTube frame. Always mounted so playback survives navigation; moved off screen
         (never shrunk) when there is nothing to show, and paused whenever it is off screen. -->
    <section #card [attr.aria-label]="L.s().playerAndVideo" class="no-print fixed z-40 overflow-hidden rounded-t-2xl rounded-b-2xl md:rounded-b-none bg-[var(--n-raise)] border border-[var(--n-line)] shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
      [class]="cardClass()" [class.opacity-60]="!!tuckIntent()" [style.left.px]="player.videoShown() && pos() ? pos()!.x : null" [style.top.px]="player.videoShown() && pos() ? pos()!.y : null"
      [attr.aria-hidden]="!player.videoShown()">
      <!-- Desktop grip: drag the video anywhere on screen. Double-tap (or Enter) puts it back.
           Phones drag by the controls strip under the video instead, which saves this bar's height. -->
      <button type="button" class="hidden md:flex w-full h-6 items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing text-[var(--n-tx3)]"
        [attr.aria-label]="L.s().moveVideo" [attr.title]="L.s().moveVideo"
        (pointerdown)="dragStart($event)" (pointermove)="dragMove($event)" (pointerup)="dragEnd($event)" (pointercancel)="dragEnd($event)"
        (dblclick)="resetPos()" (keydown)="dragKey($event)">
        <span aria-hidden="true" class="w-10 h-1.5 rounded-full bg-current opacity-60"></span>
      </button>
      <div class="relative w-full h-[200px] bg-black">
        <div #ytHost class="absolute inset-0 w-full h-full"></div>
      </div>
      @if (player.current(); as item) {
        <div class="md:hidden relative pt-1 touch-none select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]"
          (pointerdown)="rowDown($event)" (pointermove)="rowMove($event)" (pointerup)="rowUp($event)" (pointercancel)="rowUp($event)">
          <span aria-hidden="true" class="absolute left-1/2 -translate-x-1/2 top-[5px] w-8 h-1 rounded-full bg-[var(--n-tx3)] opacity-40"></span>
          <ng-container [ngTemplateOutlet]="phoneControls" [ngTemplateOutletContext]="{ $implicit: item }" />
        </div>
      }
    </section>

    <!-- Tucked against an edge: a small tab that brings the player back (and resumes). -->
    @if (player.tucked(); as t) {
      @if (player.current(); as item) {
        <button type="button" (click)="player.untuck()" [attr.aria-label]="L.s().showPlayer" [attr.title]="L.s().showPlayer"
          class="no-print fixed z-40 w-12 h-[76px] flex flex-col items-center justify-center gap-1.5 bg-[var(--n-surf)] border border-[var(--n-line)] shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
          [class]="t.side === 'left' ? 'left-0 rounded-r-2xl border-l-0' : 'right-0 rounded-l-2xl border-r-0'" [style.top.px]="t.y">
          <app-novo-cover [color]="item.color" [size]="30" [radius]="8" [seed]="seed(item.key)" />
          <span class="text-[var(--n-tx2)]"><app-novo-icon [name]="t.side === 'left' ? 'next' : 'back'" [size]="14" /></span>
        </button>
      }
    }

    @if (player.current(); as item) {
      <!-- Desktop strip -->
      <footer [attr.aria-label]="L.s().player" class="no-print hidden md:grid fixed inset-x-0 bottom-0 z-40 h-24 grid-cols-[auto_minmax(0,1fr)_minmax(0,380px)] items-center gap-6 px-8 bg-[var(--n-surf)] border-t border-[var(--n-line)]">
        <span class="absolute left-0 -top-px h-[3px] bg-[var(--n-acc)] transition-[width] duration-500 ease-linear" [style.width.%]="player.progress() * 100" aria-hidden="true"></span>
        @if (partSpan(); as ps) { <span class="absolute -top-0.5 h-[5px] bg-[var(--n-acc-tx)] opacity-50 rounded-full" [style.left.%]="ps.left" [style.width.%]="ps.width" aria-hidden="true"></span> }
        @if (repeatOpen()) {
          <div class="absolute bottom-full left-6 mb-3 w-[360px] rounded-2xl bg-[var(--n-surf)] border border-[var(--n-line)] shadow-[0_18px_50px_rgba(0,0,0,0.25)] p-4">
            <ng-container [ngTemplateOutlet]="repeatPanel" />
          </div>
        }
        <div class="flex items-center gap-1.5">
          <button type="button" (click)="player.prev()" [disabled]="!player.hasPrev()" [attr.aria-label]="L.s().previous" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="prev" [size]="20" /></button>
          <button type="button" (click)="player.toggle()" [disabled]="!item.videoId" [attr.aria-label]="player.playing() ? L.s().pause : L.s().play" [attr.title]="L.s().playPauseHint"
            class="w-[52px] h-[52px] rounded-2xl bg-[var(--n-acc)] text-[#1a1400] flex items-center justify-center disabled:opacity-40"><app-novo-icon [name]="player.playing() ? 'pause' : 'play'" [size]="20" /></button>
          <button type="button" (click)="player.next()" [disabled]="!player.hasNext()" [attr.aria-label]="L.s().next" class="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="next" [size]="20" /></button>
          <button type="button" (click)="repeatOpen.set(!repeatOpen())" [disabled]="!item.videoId" [attr.aria-expanded]="repeatOpen()" [attr.aria-label]="L.s().repeat" [attr.title]="L.s().repeat"
            class="relative w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-35" [style.color]="player.loop() ? 'var(--n-acc-tx)' : 'var(--n-tx2)'" [style.background]="player.loop() ? 'rgba(255,194,26,0.22)' : null">
            <app-novo-icon name="loop" [size]="18" />
            @if (badge(); as b) { <span class="absolute -top-0.5 -right-1 rounded-md px-1 text-[9px] leading-[14px] font-extrabold bg-[var(--n-acc-tx)] text-[var(--n-surf)]">{{ b }}</span> }
          </button>
          <button type="button" (click)="player.cycleRate()" [attr.aria-label]="L.s().speed" class="h-8 px-2.5 rounded-lg border border-[var(--n-line)] text-xs font-extrabold tabular-nums">{{ rateLabel() }}</button>
        </div>

        <div class="min-w-0 flex items-center gap-2">
          @if (player.currentLine(); as line) {
            <div class="flex flex-col">
              <button type="button" (click)="player.stepLine(-1)" [attr.aria-label]="L.s().prevLine" class="w-8 h-8 rounded-full flex items-center justify-center text-[var(--n-tx3)] hover:bg-[var(--n-raise)]"><app-novo-icon name="up" [size]="16" /></button>
              <button type="button" (click)="player.stepLine(1)" [attr.aria-label]="L.s().nextLine" class="w-8 h-8 rounded-full flex items-center justify-center text-[var(--n-tx3)] hover:bg-[var(--n-raise)]"><app-novo-icon name="down" [size]="16" /></button>
            </div>
            <a [routerLink]="L.to('/cantigas/' + item.songId)" class="min-w-0 flex flex-col gap-0.5 hover:no-underline">
              <span class="text-[13px] text-[var(--n-tx3)] truncate">{{ player.previousLine()?.pt || ' ' }}</span>
              <span class="text-xl font-extrabold tracking-[-0.01em] text-[var(--n-tx)] truncate">{{ line.pt }}</span>
              @if (line.en) { <span class="text-sm text-[var(--n-acc-tx)] truncate">{{ plain(line.en) }}</span> }
            </a>
          } @else {
            <span class="text-sm text-[var(--n-tx2)] truncate">{{ item.subtitle }}</span>
          }
        </div>

        <div class="flex items-center gap-2 justify-end min-w-0">
          <app-novo-cover [color]="item.color" [size]="52" [radius]="10" [seed]="seed(item.key)" />
          <div class="min-w-0 flex flex-col">
            <span class="text-[15px] font-extrabold truncate">{{ item.title }}</span>
            <span class="text-[13px] text-[var(--n-tx2)] truncate">{{ subtitle(item) }}</span>
          </div>
          @if (item.songId) {
            <button type="button" (click)="favorites.toggle(item.songId)" [attr.aria-pressed]="liked()" [attr.aria-label]="L.s().likeSong" class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
              [style.color]="liked() ? 'var(--n-acc-tx)' : 'var(--n-tx3)'"><app-novo-icon name="heart" [size]="20" [filled]="liked()" /></button>
          }
          @if (item.videoId && player.videoShown()) {
            <button type="button" (click)="setMini(!player.mini())" [attr.aria-label]="player.mini() ? L.s().fullVideo : L.s().miniVideo" [attr.title]="player.mini() ? L.s().fullVideo : L.s().miniVideo" class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon [name]="player.mini() ? 'grow' : 'shrink'" [size]="19" /></button>
          }
          @if (item.videoId) {
            @if (player.minimized()) {
              <button type="button" (click)="player.restore()" [attr.aria-label]="L.s().showVideo" [attr.title]="L.s().showVideo" class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="video" [size]="20" /></button>
            } @else {
              <button type="button" (click)="player.minimize()" [attr.aria-label]="L.s().hideVideo" [attr.title]="L.s().hideVideo" class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="min" [size]="20" /></button>
            }
          }
          <button type="button" (click)="player.close()" [attr.aria-label]="L.s().closePlayer" class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[var(--n-tx3)]"><app-novo-icon name="close" [size]="18" /></button>
        </div>
      </footer>

      <!-- Phone card without a video (hidden, or nothing to show): the same controls on their own. -->
      @if (!player.videoShown() && !player.tucked()) {
        <section [attr.aria-label]="L.s().player" class="no-print md:hidden fixed inset-x-2.5 bottom-[84px] z-40 rounded-2xl bg-[var(--n-raise)] border border-[var(--n-line)] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <ng-container [ngTemplateOutlet]="phoneControls" [ngTemplateOutletContext]="{ $implicit: item }" />
        </section>
      }
    }

    <ng-template #phoneControls let-item>
      <span class="absolute left-0 top-0 h-[3px] bg-[var(--n-acc)] transition-[width] duration-500 ease-linear" [style.width.%]="player.progress() * 100" aria-hidden="true"></span>
      @if (partSpan(); as ps) { <span class="absolute top-0 h-[4px] bg-[var(--n-acc-tx)] opacity-50 rounded-full" [style.left.%]="ps.left" [style.width.%]="ps.width" aria-hidden="true"></span> }
      @if (player.mini() && player.videoShown()) {
        <!-- Mini: the 200×200 video with just the essentials; it keeps playing. -->
        <div class="flex items-center justify-between px-1.5 py-1">
          <button type="button" (click)="setMini(false)" [attr.aria-label]="L.s().fullVideo" [attr.title]="L.s().fullVideo" class="w-10 h-10 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="grow" [size]="19" /></button>
          <button type="button" (click)="setMini(false); repeatOpen.set(true)" [attr.aria-label]="L.s().repeat" class="relative w-10 h-10 rounded-full flex items-center justify-center"
            [style.color]="player.loop() ? 'var(--n-acc-tx)' : 'var(--n-tx2)'" [style.background]="player.loop() ? 'rgba(255,194,26,0.22)' : null"><app-novo-icon name="loop" [size]="18" /></button>
          <button type="button" (click)="player.toggle()" [attr.aria-label]="player.playing() ? L.s().pause : L.s().play"
            class="w-10 h-10 rounded-[12px] bg-[var(--n-acc)] text-[#1a1400] flex items-center justify-center"><app-novo-icon [name]="player.playing() ? 'pause' : 'play'" [size]="18" /></button>
        </div>
      } @else {
      <div class="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5">
        <a [routerLink]="L.to(item.songId ? '/cantigas/' + item.songId : '/toques/' + item.toqueId)" draggable="false" class="flex-1 min-w-0 flex flex-col hover:no-underline [-webkit-user-drag:none]">
          <span class="text-xs font-bold text-[var(--n-tx3)] truncate">{{ item.title }}</span>
          @if (player.currentLine(); as line) {
            <span class="text-[15px] font-extrabold text-[var(--n-tx)] truncate">{{ line.pt }}</span>
            @if (line.en) { <span class="text-[12px] text-[var(--n-acc-tx)] truncate">{{ plain(line.en) }}</span> }
          } @else {
            <span class="text-[13px] text-[var(--n-tx2)] truncate">{{ subtitle(item) }}</span>
          }
        </a>
        @if (item.videoId && player.videoShown()) {
          <button type="button" (click)="setMini(true)" [attr.aria-label]="L.s().miniVideo" [attr.title]="L.s().miniVideo" class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="shrink" [size]="18" /></button>
        }
        <!-- Repeat stays in sight: tucked away under "more", people didn't find it. It opens
             the repeat menu (off / whole song / a part). -->
        <button type="button" (click)="repeatOpen.set(!repeatOpen())" [disabled]="!item.videoId" [attr.aria-expanded]="repeatOpen()" [attr.aria-label]="L.s().repeat" [attr.title]="L.s().repeat"
          class="relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center disabled:opacity-35"
          [style.color]="player.loop() ? 'var(--n-acc-tx)' : 'var(--n-tx2)'" [style.background]="player.loop() ? 'rgba(255,194,26,0.22)' : null">
          <app-novo-icon name="loop" [size]="18" />
          @if (badge(); as b) { <span class="absolute -top-0.5 -right-1 rounded-md px-1 text-[9px] leading-[14px] font-extrabold bg-[var(--n-acc-tx)] text-[var(--n-surf)]">{{ b }}</span> }
        </button>
        <button type="button" (click)="player.toggle()" [disabled]="!item.videoId" [attr.aria-label]="player.playing() ? L.s().pause : L.s().play"
          class="w-10 h-10 shrink-0 rounded-[12px] bg-[var(--n-acc)] text-[#1a1400] flex items-center justify-center disabled:opacity-40"><app-novo-icon [name]="player.playing() ? 'pause' : 'play'" [size]="18" /></button>
        <button type="button" (click)="expanded.set(!expanded())" [attr.aria-expanded]="expanded()" [attr.aria-label]="L.s().moreControls" [attr.title]="L.s().moreControls"
          class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[var(--n-tx2)]" [style.background]="expanded() ? 'var(--n-line)' : null"><app-novo-icon name="more" [size]="20" /></button>
      </div>
      @if (repeatOpen()) {
        <div class="border-t border-[var(--n-line)] bg-[var(--n-surf)] px-3 pt-2.5 pb-3">
          <ng-container [ngTemplateOutlet]="repeatPanel" />
        </div>
      } @else if (player.loop()) {
        <div class="px-3 pb-2"><ng-container [ngTemplateOutlet]="repeatStatus" /></div>
      }
      @if (expanded()) {
        <!-- Equal columns, so the row fits the card at any phone width (it used to run past the edge). -->
        <div class="grid grid-cols-7 items-center px-1 pb-2">
          <button type="button" (click)="player.prev()" [disabled]="!player.hasPrev()" [attr.aria-label]="L.s().previous" class="h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="prev" [size]="20" /></button>
          <button type="button" (click)="player.next()" [disabled]="!player.hasNext()" [attr.aria-label]="L.s().next" class="h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="next" [size]="20" /></button>
          <button type="button" (click)="player.stepLine(-1)" [disabled]="!player.currentLine()" [attr.aria-label]="L.s().prevLine" class="h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="up" [size]="20" /></button>
          <button type="button" (click)="player.stepLine(1)" [disabled]="!player.currentLine()" [attr.aria-label]="L.s().nextLine" class="h-11 rounded-full flex items-center justify-center disabled:opacity-35"><app-novo-icon name="down" [size]="20" /></button>
          <button type="button" (click)="player.cycleRate()" [attr.aria-label]="L.s().speed" class="h-9 mx-auto px-2 rounded-lg border border-[var(--n-line)] text-xs font-extrabold tabular-nums">{{ rateLabel() }}</button>
          @if (item.videoId && player.minimized()) {
            <button type="button" (click)="player.restore()" [attr.aria-label]="L.s().showVideo" class="h-11 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="video" [size]="20" /></button>
          } @else if (item.videoId) {
            <button type="button" (click)="tuckAside()" [attr.aria-label]="L.s().tuckVideo" class="h-11 rounded-full flex items-center justify-center text-[var(--n-tx2)]"><app-novo-icon name="min" [size]="20" /></button>
          } @else {
            <span></span>
          }
          <button type="button" (click)="player.close()" [attr.aria-label]="L.s().closePlayer" class="h-11 rounded-full flex items-center justify-center text-[var(--n-tx3)]"><app-novo-icon name="close" [size]="18" /></button>
        </div>
      }
      }
    </ng-template>

    <!-- The repeat menu: off, the whole song, or a part marked while listening. -->
    <ng-template #repeatPanel>
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center">
          <span class="flex-1 text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">{{ L.s().repeat }}</span>
          <button type="button" (click)="repeatOpen.set(false)" class="text-[13px] font-bold text-[var(--n-tx2)] px-2 py-1">{{ L.s().done }}</button>
        </div>
        <div class="grid grid-cols-3 gap-1.5" role="group" [attr.aria-label]="L.s().repeat">
          @for (m of repeatModes; track m) {
            <button type="button" (click)="player.setRepeat(m)" [attr.aria-pressed]="player.repeat() === m"
              class="rounded-xl border-[1.5px] py-2 px-1 text-[13px] font-bold"
              [class]="player.repeat() === m ? 'border-[var(--n-acc)] bg-[rgba(255,194,26,0.18)] text-[var(--n-acc-tx)]' : 'border-[var(--n-line)] bg-[var(--n-surf)] text-[var(--n-tx)]'">{{ modeLabel(m) }}</button>
          }
        </div>
        @if (player.repeat() === 'part') {
          <div class="grid grid-cols-2 gap-2">
            <button type="button" (click)="markStart()" class="rounded-xl py-2.5 px-2 flex flex-col items-center font-extrabold text-[14px]"
              [class]="player.part().a !== null ? 'bg-[rgba(255,194,26,0.22)] text-[var(--n-acc-tx)]' : 'bg-[var(--n-raise)] text-[var(--n-tx)]'">
              {{ L.s().partStart }}<span class="text-[12px] font-bold opacity-80 tabular-nums">{{ player.part().a !== null ? clock(player.part().a!) : L.s().tapWhenStarts }}</span>
            </button>
            <button type="button" (click)="markEnd()" class="rounded-xl py-2.5 px-2 flex flex-col items-center font-extrabold text-[14px]"
              [class]="player.part().b !== null ? 'bg-[rgba(255,194,26,0.22)] text-[var(--n-acc-tx)]' : 'bg-[var(--n-raise)] text-[var(--n-tx)]'">
              {{ L.s().partEnd }}<span class="text-[12px] font-bold opacity-80 tabular-nums">{{ player.part().b !== null ? clock(player.part().b!) : L.s().tapWhenEnds }}</span>
            </button>
          </div>
          <p class="m-0 text-[12.5px]" [class]="repeatMsg() ? 'text-[var(--n-acc-tx)] font-bold' : 'text-[var(--n-tx3)]'" role="status">{{ repeatMsg() || L.s().partHint }}</p>
        }
        <ng-container [ngTemplateOutlet]="repeatStatus" />
      </div>
    </ng-template>

    <ng-template #repeatStatus>
      @if (player.partReady()) {
        <div class="flex items-center gap-2 text-[13px] font-bold text-[var(--n-acc-tx)]">
          <span class="flex-1 tabular-nums">{{ L.s().repeatingPart(clock(player.part().a!), clock(player.part().b!)) }}</span>
          <button type="button" (click)="player.clearPart()" class="underline underline-offset-2 text-[var(--n-tx2)]">{{ L.s().clearPart }}</button>
        </div>
      } @else if (player.repeat() === 'all') {
        <div class="flex items-center gap-2 text-[13px] font-bold text-[var(--n-acc-tx)]">
          <span class="flex-1">{{ L.s().repeatingAll }}</span>
          <button type="button" (click)="player.setRepeat('off')" class="underline underline-offset-2 text-[var(--n-tx2)]">{{ L.s().clearPart }}</button>
        </div>
      }
    </ng-template>
  `,
})
export class NovoPlayerComponent implements OnDestroy {
  readonly player = inject(NovoPlayerService);
  readonly favorites = inject(FavoritesService);
  readonly L = inject(NovoLangService);
  private firebase = inject(FirebaseService);
  private ytHost = viewChild.required<ElementRef<HTMLElement>>('ytHost');
  private card = viewChild.required<ElementRef<HTMLElement>>('card');

  // ── Moving the video around ──
  /** Where the video card was dragged to; null keeps it in its usual spot. Remembered per screen size. */
  readonly pos = signal<{ x: number; y: number } | null>(null);
  /** A press on the phone's controls strip that may turn into a drag once it moves far enough. */
  private pending: { x: number; y: number; id: number; el: HTMLElement } | null = null;
  /** Until when a click counts as "the end of a drag" and is swallowed, so it doesn't also open
   *  the song or press a button. Time-limited: on touch a drag often produces no click at all,
   *  and a plain flag would then eat the next real tap. */
  private suppressClickUntil = 0;
  private drag: { dx: number; dy: number; id: number; moved: boolean; startLeft: number; width: number } | null = null;
  /** Set while the card is pushed against an edge far enough that letting go tucks it. */
  readonly tuckIntent = signal<'left' | 'right' | null>(null);

  readonly cardClass = computed(() => {
    if (!this.player.videoShown()) return '-left-[9999px] bottom-0 w-[356px] opacity-0 pointer-events-none';
    // 356x200 is the smallest 16:9 player YouTube allows (200px minimum height); phones use it too.
    // Mini is 200x200, YouTube's minimum in both directions: still visible, so it keeps playing.
    // 202px wide because the card's 1px border sits inside it; the video itself must be the 200.
    const mini = this.player.mini();
    if (this.pos()) return mini ? 'w-[202px]' : 'w-[min(356px,calc(100vw-20px))] md:w-[356px]';
    if (mini) return 'right-3 bottom-[84px] w-[202px] md:right-auto md:left-6 md:bottom-[112px]';
    return 'left-1/2 -translate-x-1/2 bottom-[84px] w-[min(356px,calc(100vw-20px))] md:translate-x-0 md:left-6 md:bottom-[112px] md:w-[356px]';
  });

  readonly expanded = signal(false);
  readonly repeatOpen = signal(false);
  /** A short correction under the part buttons ("tap Start here first"), cleared after a moment. */
  readonly repeatMsg = signal('');
  private msgTimer?: ReturnType<typeof setTimeout>;
  readonly repeatModes: RepeatMode[] = ['off', 'all', 'part'];
  readonly badge = computed(() => this.player.repeat() === 'all' ? this.L.s().repeatBadgeAll : this.player.partReady() ? this.L.s().repeatBadgePart : null);
  /** Where the repeated part sits on the progress line, in percent. */
  readonly partSpan = computed(() => {
    const d = this.player.duration(), { a, b } = this.player.part();
    if (!this.player.partReady() || !d || a === null || b === null) return null;
    return { left: (a / d) * 100, width: ((b - a) / d) * 100 };
  });
  private destroyRef = inject(DestroyRef);
  readonly liked = computed(() => !!this.player.current()?.songId && this.firebase.favorites().has(this.player.current()!.songId!));
  readonly rateLabel = computed(() => String(this.player.rate()).replace('.', ',') + '×');

  constructor() {
    afterNextRender(() => {
      this.player.attach(this.ytHost().nativeElement);
      this.pos.set(this.readPos());
      // Swallow the click that ends a drag on the controls strip (capture phase, before any link or button sees it).
      const onClick = (ev: Event) => {
        if (performance.now() > this.suppressClickUntil) return;
        this.suppressClickUntil = 0;
        ev.preventDefault();
        ev.stopPropagation();
      };
      document.addEventListener('click', onClick, true);
      this.destroyRef.onDestroy(() => document.removeEventListener('click', onClick, true));
      // Rotating or resizing keeps the card on screen.
      fromEvent(window, 'resize').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        const p = this.readPos();
        this.pos.set(p ? this.clamp(p.x, p.y) : null);
      });
    });
  }

  dragStart(e: PointerEvent): void {
    const r = this.card().nativeElement.getBoundingClientRect();
    this.drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId, moved: false, startLeft: r.left, width: r.width };
    // Keeps the drag going when the finger slides over the video frame, which would otherwise swallow the events.
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
  }

  dragMove(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    this.drag.moved = true;
    // The card never leaves the screen: on phones anything past the edge widens the page
    // (the white column on the right). Where the finger would have taken it decides the
    // tuck instead: a third of the card past an edge means "tuck", and the card fades to say so.
    const x = e.clientX - this.drag.dx, w = this.drag.width;
    const offLeft = -x, offRight = x + w - window.innerWidth;
    this.tuckIntent.set(offLeft > w * 0.33 ? 'left' : offRight > w * 0.33 ? 'right' : null);
    this.pos.set(this.clamp(x, e.clientY - this.drag.dy));
  }

  dragEnd(e: PointerEvent): void {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const edge = this.tuckIntent();
    if (this.drag.moved) {
      const p = this.pos()!;
      if (edge) {
        const home = this.clamp(this.drag.startLeft, p.y);
        this.pos.set(home);
        this.savePos();
        this.player.tuck(edge, this.tabY(home.y));
      } else {
        this.savePos();
      }
    }
    this.tuckIntent.set(null);
    this.drag = null;
  }

  dragKey(e: KeyboardEvent): void {
    const step = 40;
    const r = this.card().nativeElement.getBoundingClientRect();
    const at = this.pos() ?? { x: r.left, y: r.top };
    const moves: Record<string, [number, number]> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.resetPos(); return; }
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    this.pos.set(this.clamp(at.x + m[0], at.y + m[1]));
    this.savePos();
  }

  /** The phone's hide button: tuck to the right edge at the card's current height. */
  tuckAside(): void {
    const r = this.card().nativeElement.getBoundingClientRect();
    this.player.tuck('right', this.tabY(r.top));
  }

  /** Where the edge tab sits: level with the card's video, kept on screen. */
  private tabY(cardTop: number): number {
    return Math.round(Math.min(Math.max(72, cardTop + 60), window.innerHeight - 170));
  }

  rowDown(e: PointerEvent): void {
    if (!this.player.videoShown()) return;
    this.pending = { x: e.clientX, y: e.clientY, id: e.pointerId, el: e.currentTarget as HTMLElement };
  }

  rowMove(e: PointerEvent): void {
    if (this.drag) { this.dragMove(e); return; }
    const p = this.pending;
    if (!p || e.pointerId !== p.id || Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
    // Moved far enough to mean "drag", not "tap": start dragging from where the finger went down.
    const r = this.card().nativeElement.getBoundingClientRect();
    this.drag = { dx: p.x - r.left, dy: p.y - r.top, id: p.id, moved: false, startLeft: r.left, width: r.width };
    try { p.el.setPointerCapture(p.id); } catch { /* pointer already gone */ }
    this.dragMove(e);
  }

  rowUp(e: PointerEvent): void {
    if (this.drag) {
      if (this.drag.moved) this.suppressClickUntil = performance.now() + 400;
      this.dragEnd(e);
    }
    this.pending = null;
  }

  resetPos(): void {
    this.pos.set(null);
    try { localStorage.removeItem(this.posKey()); } catch { /* ignore */ }
  }

  /** Keeps the whole card between the header and the bottom bar, and inside the screen. */
  private clamp(x: number, y: number): { x: number; y: number } {
    const r = this.card().nativeElement.getBoundingClientRect();
    const phone = window.innerWidth < 768;
    const top = phone ? 64 : 80;
    const bottom = window.innerHeight - (phone ? 84 : 104) - r.height;
    const right = window.innerWidth - r.width - 10;
    return { x: Math.round(Math.min(Math.max(10, x), Math.max(10, right))), y: Math.round(Math.min(Math.max(top, y), Math.max(top, bottom))) };
  }

  private posKey(): string { return 'novo-player-pos-' + (window.innerWidth < 768 ? 'phone' : 'wide'); }

  private savePos(): void {
    try { const p = this.pos(); if (p) localStorage.setItem(this.posKey(), JSON.stringify(p)); } catch { /* ignore */ }
  }

  private readPos(): { x: number; y: number } | null {
    try {
      const raw = localStorage.getItem(this.posKey());
      if (!raw) return null;
      const p = JSON.parse(raw) as { x: number; y: number };
      return typeof p.x === 'number' && typeof p.y === 'number' ? this.clamp(p.x, p.y) : null;
    } catch { return null; }
  }

  ngOnDestroy(): void {
    // Leaving the new design stops its music; the current site has its own players.
    this.player.close();
    this.player.detach();
  }

  modeLabel(m: RepeatMode): string {
    const d = this.L.s();
    return m === 'off' ? d.repeatOff : m === 'all' ? d.repeatAll : d.repeatPart;
  }

  clock(s: number): string {
    const t = Math.max(0, Math.floor(s));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  markStart(): void { this.player.markStart(); this.say(''); }

  markEnd(): void {
    const r = this.player.markEnd();
    this.say(r === 'no-start' ? this.L.s().setStartFirst : r === 'too-early' ? this.L.s().waitAfterStart : '');
  }

  private say(msg: string): void {
    this.repeatMsg.set(msg);
    clearTimeout(this.msgTimer);
    if (msg) this.msgTimer = setTimeout(() => this.repeatMsg.set(''), 2600);
  }

  /** Switching size keeps a moved card on screen (the mini one is narrower, the full one wider). */
  setMini(on: boolean): void {
    this.player.setMini(on);
    if (on) this.repeatOpen.set(false);
    setTimeout(() => { const p = this.pos(); if (p) { this.pos.set(this.clamp(p.x, p.y)); this.savePos(); } });
  }

  subtitle(item: { fromToque: boolean; subtitle: string; videoId: string | null }): string {
    if (item.fromToque) return this.L.s().toqueVideoFor(item.subtitle);
    return item.videoId ? item.subtitle : this.L.s().noRecordingShort;
  }

  seed(key: string): number { return seedOf(key); }
  plain(text: string): string { return plainText(text); }
}
