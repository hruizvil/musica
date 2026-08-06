import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RodaService } from '../../core/services/roda.service';

/**
 * The four destinations, always within thumb reach. Phones only — from md the
 * header carries the same links across the top, so showing both would be two
 * controls doing one job.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navegação principal"
      class="no-print md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul class="flex items-stretch">

        <li class="flex-1">
          <a routerLink="/musicas" routerLinkActive #m="routerLinkActive"
             [attr.aria-current]="m.isActive ? 'page' : null"
             class="flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.25rem] transition-colors"
             [class]="m.isActive ? activeClass : idleClass">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 18V5l10-2v13"/>
              <circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>
            </svg>
            <span class="text-[10px] font-semibold leading-none">Músicas</span>
          </a>
        </li>

        <li class="flex-1">
          <a routerLink="/toques" routerLinkActive #t="routerLinkActive"
             [attr.aria-current]="t.isActive ? 'page' : null"
             class="flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.25rem] transition-colors"
             [class]="t.isActive ? activeClass : idleClass">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path stroke-linecap="round" d="M12 3v18M3 12h18"/>
            </svg>
            <span class="text-[10px] font-semibold leading-none">Toques</span>
          </a>
        </li>

        <li class="flex-1">
          <a routerLink="/roda" routerLinkActive #r="routerLinkActive"
             [attr.aria-current]="r.isActive ? 'page' : null"
             class="relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.25rem] transition-colors"
             [class]="r.isActive ? activeClass : idleClass">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.6m15.4 2A8 8 0 004.6 9m0 0H9m11 11v-5h-.6m0 0a8 8 0 01-15.4-2m15.4 2H15"/>
            </svg>
            <span class="text-[10px] font-semibold leading-none">Roda</span>
            @if (roda.count()) {
              <span aria-hidden="true"
                class="absolute top-1 right-[22%] min-w-[16px] h-4 px-1 rounded-full bg-capoeira-gold text-capoeira-night text-[10px] font-bold leading-4 text-center">
                {{ roda.count() }}
              </span>
            }
          </a>
        </li>

        <li class="flex-1">
          <a routerLink="/minhas" routerLinkActive #n="routerLinkActive"
             [attr.aria-current]="n.isActive ? 'page' : null"
             class="flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.25rem] transition-colors"
             [class]="n.isActive ? activeClass : idleClass">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.5 3.8l2.2 4.5 5 .7-3.6 3.5.9 4.9-4.5-2.3-4.5 2.3.9-4.9L4.3 9l5-.7 2.2-4.5z"/>
            </svg>
            <span class="text-[10px] font-semibold leading-none">Minhas</span>
          </a>
        </li>

      </ul>
    </nav>
  `,
})
export class BottomNavComponent {
  readonly roda = inject(RodaService);

  // Bound rather than handed to routerLinkActive: two text-colour utilities on one
  // element have equal specificity, so which one wins comes down to the order
  // Tailwind emitted them in — and the idle grey was winning over the gold. Swapping
  // the class instead of stacking a second one takes the cascade out of it.
  readonly activeClass = 'text-capoeira-gold';
  readonly idleClass = 'text-stone-500 dark:text-stone-400';
}
