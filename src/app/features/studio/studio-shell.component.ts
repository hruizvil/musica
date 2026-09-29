import { Component, DestroyRef, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FirebaseService } from '../../core/services/firebase.service';
import { DataService } from '../../core/services/data.service';
import { NovoIconComponent } from '../novo-design/novo-ui';
import { NovoThemeService } from '../novo-design/novo-theme.service';
import { StudioService } from './studio.service';

/**
 * The admin ("Control Room"): a sidebar with the overview, songs and toques on desktop,
 * a top bar with a menu on phones. Colours match the public site's tokens.
 */
@Component({
  selector: 'app-studio-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NovoIconComponent],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .studio {
      --n-bg: #f7f6f2; --n-surf: #ffffff; --n-raise: #eeece6; --n-line: #dcd8ce;
      --n-tx: #101114; --n-tx2: #3b3e46; --n-tx3: #5a5d66; --n-acc: #ffc21a; --n-acc-tx: #6b4d00; --n-ok: #0a7550;
      --n-warn: #a34a06; --n-warn-bg: #fdebd9; --n-acc-bg: #fff1c7; --n-ok-bg: #e1f2ea; --n-bad: #b3261e;
      --n-low: #1e3a8a; --n-low-bg: #e4e9f7;
      font-family: 'Figtree', system-ui, sans-serif; color: var(--n-tx); background: var(--n-bg); color-scheme: light;
    }
    .studio.studio-dark {
      --n-bg: #101114; --n-surf: #181a1f; --n-raise: #22252c; --n-line: #2d3038;
      --n-tx: #f4f3ef; --n-tx2: #b4b6bd; --n-tx3: #8f929b; --n-acc: #ffc21a; --n-acc-tx: #ffc21a; --n-ok: #3fcf8e;
      --n-warn: #ffab6b; --n-warn-bg: #3a2616; --n-acc-bg: #3a3014; --n-ok-bg: #143126; --n-bad: #ff8a80;
      --n-low: #a9bdf5; --n-low-bg: #1c2540;
      color-scheme: dark;
    }
    .studio .n-disp { font-family: 'Unbounded', system-ui, sans-serif; }
    :where(.studio) a { color: inherit; text-decoration: none; }
    .studio a:focus-visible, .studio button:focus-visible, .studio input:focus-visible, .studio textarea:focus-visible {
      outline: 2px solid var(--n-acc); outline-offset: 2px;
    }
    .studio .s-field {
      width: 100%; border: 1px solid var(--n-line); border-radius: 10px; background: var(--n-surf);
      padding: 9px 11px; font-size: 15px; line-height: 1.5; color: var(--n-tx); outline: none;
    }
    .studio .s-field::placeholder { color: var(--n-tx3); }
    .studio .s-field:focus { border-color: var(--n-acc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--n-acc) 35%, transparent); outline: none; }
    .studio .s-field.s-empty { border-style: dashed; }
    @media (min-width: 768px) { .studio .s-field { font-size: 14px; } }
  `],
  template: `
    <div class="studio min-h-screen md:h-screen md:flex" [class.studio-dark]="theme.dark()">

      <!-- Desktop sidebar -->
      <aside class="hidden md:flex w-[232px] shrink-0 flex-col gap-1 px-3.5 py-5 bg-[var(--n-surf)] border-r border-[var(--n-line)]">
        <a routerLink="/admin" class="n-disp font-bold text-[17px] tracking-[-0.02em] px-2.5 pb-5">abadá<span class="text-[var(--n-acc-tx)]">.</span>admin</a>
        @for (item of nav; track item.link) {
          <a [routerLink]="item.link" routerLinkActive="!bg-[var(--n-acc-bg)] !text-[var(--n-acc-tx)] font-bold" [routerLinkActiveOptions]="{ exact: item.exact }"
             class="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 font-semibold text-[var(--n-tx2)] hover:bg-[var(--n-raise)]">
            <app-novo-icon [name]="item.icon" [size]="18" /><span class="flex-1">{{ item.label }}</span>
            @if (item.count) { <span class="text-[var(--n-tx3)] text-[13px] tabular-nums">{{ item.count() }}</span> }
          </a>
        }
        <a routerLink="/admin/add" class="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--n-acc)] text-[#101114] font-bold text-[14px] py-2.5 hover:brightness-105">
          <app-novo-icon name="plus" [size]="17" /> Add song
        </a>
        <div class="flex-1"></div>
        <div class="rounded-xl border border-[var(--n-line)] bg-[var(--n-bg)] px-3 py-2.5">
          <div class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[var(--n-tx3)]">Editing as</div>
          <div class="flex items-center mt-0.5">
            <span class="font-bold flex-1 truncate">{{ studio.editor() || 'No name set' }}</span>
            <button type="button" (click)="askName()" class="text-[12.5px] text-[var(--n-tx2)] underline underline-offset-2">change</button>
          </div>
        </div>
        <a href="/" target="_blank" rel="noopener" class="flex items-center gap-2 px-2.5 py-2 text-[13px] text-[var(--n-tx2)] hover:text-[var(--n-tx)]"><app-novo-icon name="external" [size]="15" /> View site</a>
        <button type="button" (click)="signOut()" class="flex items-center gap-2 px-2.5 py-2 text-[13px] text-[var(--n-tx2)] hover:text-[var(--n-bad)] text-left"><app-novo-icon name="logout" [size]="15" /> Sign out</button>
      </aside>

      <!-- Phone top bar -->
      <header class="md:hidden sticky top-0 z-30 bg-[var(--n-surf)] border-b border-[var(--n-line)]">
        <div class="h-14 flex items-center gap-2 pl-4 pr-2">
          <a routerLink="/admin" class="n-disp font-bold text-[16px] tracking-[-0.02em] flex-1">abadá<span class="text-[var(--n-acc-tx)]">.</span>admin</a>
          <button type="button" (click)="askName()" class="h-10 px-3 rounded-full text-[13px] font-bold text-[var(--n-tx2)] max-w-[40vw] truncate">{{ studio.editor() || 'Set name' }}</button>
          <button type="button" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-label="Menu" class="w-11 h-11 grid place-items-center rounded-full hover:bg-[var(--n-raise)]">
            <app-novo-icon [name]="menu() ? 'close' : 'menu'" [size]="22" />
          </button>
        </div>
        @if (menu()) {
          <nav class="border-t border-[var(--n-line)] px-2 py-2 flex flex-col" (click)="menu.set(false)">
            @for (item of nav; track item.link) {
              <a [routerLink]="item.link" class="flex items-center gap-3 px-3 py-3 rounded-lg font-semibold"><app-novo-icon [name]="item.icon" [size]="19" />{{ item.label }}</a>
            }
            <a href="/" target="_blank" rel="noopener" class="flex items-center gap-3 px-3 py-3 rounded-lg font-semibold"><app-novo-icon name="external" [size]="19" />View site</a>
            <button type="button" (click)="signOut()" class="flex items-center gap-3 px-3 py-3 rounded-lg font-semibold text-left text-[var(--n-bad)]"><app-novo-icon name="logout" [size]="19" />Sign out</button>
          </nav>
        }
      </header>

      <main class="flex-1 min-w-0 md:overflow-y-auto">
        <router-outlet />
      </main>

      <!-- Phone: quick way to add a song from the lists -->
      @if (showFab()) {
        <a routerLink="/admin/add" class="md:hidden fixed right-4 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-20 inline-flex items-center gap-1.5 rounded-full bg-[var(--n-acc)] text-[#101114] font-bold text-[16px] px-5 py-3.5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.35)]">
          <app-novo-icon name="plus" [size]="19" /> Add song
        </a>
      }

      @if (studio.toast()) {
        <div role="status" class="fixed left-1/2 -translate-x-1/2 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-50 max-w-[90vw] rounded-xl bg-[#15161a] text-white px-4 py-2.5 text-[14px] font-semibold shadow-lg text-center">{{ studio.toast() }}</div>
      }

      <!-- Who's editing on this device (the login is shared) -->
      @if (nameOpen()) {
        <div class="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4" (click)="closeName()">
          <form class="w-full max-w-[380px] rounded-2xl bg-[var(--n-surf)] p-5 flex flex-col gap-3" (click)="$event.stopPropagation()" (submit)="saveName($event, nameInput.value)">
            <h2 class="n-disp text-[19px] font-semibold">Who's editing?</h2>
            <p class="text-[14px] text-[var(--n-tx2)] m-0">Everyone shares one login, so this device remembers a name. Songs you save will show "Last saved by" that name.</p>
            <input #nameInput class="s-field" [value]="studio.editor()" placeholder="Your name, e.g. Hugo" autocomplete="name" maxlength="40" />
            <div class="flex gap-2 justify-end">
              <button type="button" (click)="closeName()" class="rounded-full px-4 py-2 font-bold text-[14px] text-[var(--n-tx2)]">Not now</button>
              <button type="submit" class="rounded-full px-5 py-2 font-bold text-[14px] bg-[var(--n-acc)] text-[#101114]">Save</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class StudioShellComponent {
  readonly studio = inject(StudioService);
  readonly theme = inject(NovoThemeService);
  private data = inject(DataService);
  private fb = inject(FirebaseService);
  private router = inject(Router);

  readonly menu = signal(false);
  /** Opens by itself on a device that has no name yet; "Not now" hides it for this visit. */
  private nameManual = signal(false);
  readonly nameOpen = computed(() => this.nameManual() || !this.studio.askedEditor());

  readonly nav = [
    { link: '/admin', label: 'Overview', icon: 'home', exact: true, count: null },
    { link: '/admin/songs', label: 'Songs', icon: 'note', exact: false, count: computed(() => this.studio.songs().length) },
    { link: '/admin/toques', label: 'Toques', icon: 'drum', exact: false, count: computed(() => this.data.toques().length) },
  ];

  private url = toSignal(this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url)), { initialValue: this.router.url });
  /** Only on the overview and the song list; the editor has its own Save. */
  readonly showFab = computed(() => /^\/admin(\/songs)?(\?.*)?$/.test(this.url()));

  constructor() {
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.menu.set(false));
  }

  askName(): void { this.menu.set(false); this.nameManual.set(true); }
  closeName(): void { this.nameManual.set(false); this.studio.askedEditor.set(true); }
  saveName(e: Event, value: string): void {
    e.preventDefault();
    this.studio.setEditor(value);
    this.nameManual.set(false);
    if (value.trim()) this.studio.flash(`Saving as ${value.trim()} on this device`);
  }

  async signOut(): Promise<void> {
    await this.fb.signOut();
    this.router.navigate(['/admin/login']);
  }
}
