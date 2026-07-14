import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ThemeService } from '../../core/services/theme.service';

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
  `,
})
export class ShellComponent implements OnInit {
  private theme = inject(ThemeService);

  ngOnInit(): void {
    this.theme.init();
  }
}
