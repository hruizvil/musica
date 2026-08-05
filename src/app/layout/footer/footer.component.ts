import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="mt-16 border-t border-stone-200 dark:border-stone-800 bg-capoeira-cream dark:bg-capoeira-night">
      <div class="max-w-6xl mx-auto px-4 py-10">

        <!-- Every link here resolves to a route that exists. Sections like Legal or
             Suporte are intentionally absent until there are real pages behind them. -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div class="col-span-2 sm:col-span-2">
            <p class="font-display font-bold text-capoeira-brown dark:text-capoeira-cream mb-2">Abadá Música</p>
            <p class="text-sm text-stone-400 leading-relaxed max-w-xs">
              A biblioteca musical da Abadá Capoeira. Preservando a tradição,
              compartilhando conhecimento.
            </p>
          </div>

          <div>
            <p class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Navegação</p>
            <ul class="space-y-2 text-sm">
              @for (item of nav; track item.path) {
                <li>
                  <a [routerLink]="item.path"
                     class="text-stone-500 dark:text-stone-400 hover:text-capoeira-gold transition-colors">{{ item.label }}</a>
                </li>
              }
            </ul>
          </div>

          <div>
            <p class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Conta</p>
            <ul class="space-y-2 text-sm">
              <li>
                <a routerLink="/login"
                   class="text-stone-500 dark:text-stone-400 hover:text-capoeira-gold transition-colors">Entrar</a>
              </li>
              <li>
                <a routerLink="/admin"
                   class="text-stone-500 dark:text-stone-400 hover:text-capoeira-gold transition-colors">Admin</a>
              </li>
            </ul>
          </div>
        </div>

        <div class="pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-400">
          <p>© {{ year }} Abadá Capoeira — Biblioteca Musical</p>

          <!-- Offline caching is opt-in: it writes a copy of the app to the visitor's
               device, so they decide, not us. -->
          @if (offline.supported) {
            <button type="button" role="switch" (click)="offline.toggle()"
              [attr.aria-checked]="offline.enabled()"
              [disabled]="offline.busy()"
              [title]="offline.enabled()
                ? 'Letras e traduções ficam salvas neste aparelho'
                : 'Salvar letras e traduções neste aparelho para usar sem internet'"
              class="no-print inline-flex items-center gap-2.5 px-3 py-2 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm transition-colors hover:border-capoeira-gold/50 disabled:opacity-60">
              <span class="text-xs font-semibold transition-colors"
                [class]="offline.enabled() ? 'text-capoeira-brown dark:text-capoeira-gold' : 'text-stone-500 dark:text-stone-400'">
                Disponível offline
              </span>
              <span class="relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200"
                [class]="offline.enabled() ? 'bg-capoeira-gold' : 'bg-stone-300 dark:bg-stone-700'">
                <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                  [class]="offline.enabled() ? 'translate-x-5' : 'translate-x-0'"></span>
              </span>
            </button>
          }

          <p>Axé, camará 🌟</p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly offline = inject(OfflineService);
  readonly year = new Date().getFullYear();

  readonly nav = [
    { path: '/musicas', label: 'Músicas' },
    { path: '/toques', label: 'Toques' },
    { path: '/videos', label: 'Vídeos' },
    { path: '/roda', label: 'Roda' },
  ];
}
