import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="mt-16 border-t border-stone-200 dark:border-stone-800 bg-capoeira-cream dark:bg-capoeira-night">
      <div class="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-400">
        <p>Abadá Capoeira — Biblioteca Musical</p>
        <p>Axé, camará 🌟</p>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
