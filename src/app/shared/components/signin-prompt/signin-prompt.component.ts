import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../../core/services/favorites.service';

/**
 * Shown when someone signed out taps a heart. A bottom sheet on a phone, a centred
 * dialog from sm up. Rendered once, by the shell, and driven by FavoritesService.
 */
@Component({
  selector: 'app-signin-prompt',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (favorites.promptOpen()) {
      <div class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
        <button type="button" aria-label="Fechar" (click)="favorites.closePrompt()"
          class="absolute inset-0 bg-capoeira-night/50 backdrop-blur-[2px] cursor-default"></button>

        <section role="dialog" aria-modal="true" aria-labelledby="signin-prompt-title"
          tabindex="-1" (keydown.escape)="favorites.closePrompt()"
          class="relative w-full sm:max-w-sm bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl px-6 pt-3 pb-8 sm:pt-8 shadow-2xl flex flex-col items-center gap-4 text-center">
          <span aria-hidden="true" class="sm:hidden w-10 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700"></span>
          <span aria-hidden="true" class="mt-2 sm:mt-0 w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
            <svg class="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
            </svg>
          </span>
          <h2 id="signin-prompt-title" class="font-display text-2xl font-bold text-stone-800 dark:text-stone-100">
            Salve suas músicas favoritas
          </h2>
          <p class="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Entre na sua conta para guardar suas favoritas em qualquer aparelho e tocá-las em sequência em Minhas.
          </p>
          <div class="self-stretch flex flex-col gap-2 mt-1">
            <a routerLink="/login" (click)="favorites.closePrompt()"
              class="h-12 rounded-xl bg-capoeira-gold text-capoeira-night font-bold flex items-center justify-center hover:bg-amber-400 transition-colors">
              Entrar para salvar
            </a>
            <button type="button" (click)="favorites.closePrompt()"
              class="h-12 rounded-xl text-stone-600 dark:text-stone-300 font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              Agora não
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class SigninPromptComponent {
  readonly favorites = inject(FavoritesService);
}
