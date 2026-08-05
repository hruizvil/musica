import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ThemeService } from '../../core/services/theme.service';
import { PwaUpdateService } from '../../core/services/pwa-update.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-amber-50/40 dark:bg-stone-900">
      <app-header />
      <main class="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <router-outlet />
      </main>
      <app-footer />
    </div>

    <!-- New build waiting. Offered rather than applied, so a song playing at a roda
         isn't cut off by a reload nobody asked for. -->
    @if (pwa.updateReady()) {
      <div class="no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-capoeira-brown text-white shadow-lg">
        <span class="text-sm">Nova versão disponível</span>
        <button type="button" (click)="pwa.applyUpdate()"
          class="px-3 py-1.5 rounded-lg bg-capoeira-gold text-capoeira-brown text-sm font-bold hover:bg-amber-400 transition-colors">
          Atualizar
        </button>
        <button type="button" (click)="pwa.dismiss()" aria-label="Dispensar"
          class="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          ×
        </button>
      </div>
    }
  `,
})
export class ShellComponent implements OnInit {
  private theme = inject(ThemeService);
  readonly pwa = inject(PwaUpdateService);

  ngOnInit(): void {
    this.theme.init();
  }
}
