import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shown for any address the app does not know — an old link, a typo, a removed page. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-md mx-auto text-center py-20 px-4 flex flex-col items-center gap-4">
      <p class="font-display text-6xl font-bold text-capoeira-gold">404</p>
      <h1 class="font-display text-2xl font-bold text-capoeira-brown dark:text-capoeira-cream">Página não encontrada</h1>
      <p class="text-stone-500 dark:text-stone-400 leading-relaxed">
        O link pode estar errado ou a página foi removida.
      </p>
      <div class="flex flex-wrap justify-center gap-3 mt-2">
        <a routerLink="/classico/musicas"
          class="h-11 px-5 rounded-xl bg-capoeira-gold text-capoeira-night font-bold flex items-center hover:bg-amber-400 transition-colors">
          Ver músicas
        </a>
        <a routerLink="/classico"
          class="h-11 px-5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold flex items-center hover:border-capoeira-gold transition-colors">
          Página inicial
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
