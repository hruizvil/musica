import { Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NovoLangService } from './novo-lang.service';
import { NovoSeoService } from './novo-seo.service';

/** An address that matches nothing, said plainly, in the site's language, and kept out of search results. */
@Component({
  selector: 'app-novo-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-md mx-auto px-4 py-20 text-center flex flex-col gap-4 items-center">
      <p class="m-0 n-disp text-6xl font-bold text-[var(--n-acc-tx)]">404</p>
      <h1 class="m-0 n-disp text-2xl font-bold">{{ L.s().notFoundTitle }}</h1>
      <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">{{ L.s().notFoundBody }}</p>
      <div class="flex flex-wrap justify-center gap-3 mt-2">
        <a [routerLink]="L.to('/cantigas')" class="h-11 px-5 rounded-xl bg-[var(--n-acc)] text-[#1a1400] font-extrabold inline-flex items-center hover:no-underline">{{ L.s().seeAllSongs }}</a>
        <a [routerLink]="L.to('/')" class="h-11 px-5 rounded-xl border border-[var(--n-line)] font-bold inline-flex items-center hover:no-underline">{{ L.s().goHome }}</a>
      </div>
    </div>
  `,
})
export class NovoNotFoundComponent {
  readonly L = inject(NovoLangService);
  private seo = inject(NovoSeoService);

  constructor() {
    effect(() => this.seo.set({ title: this.L.s().notFoundTitle, description: this.L.s().notFoundBody, path: this.L.bare(), noindex: true }));
  }
}
