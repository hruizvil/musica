import { Component, computed, effect, inject } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { NovoToqueCardComponent } from './novo-parts';
import { CATEGORY_ORDER } from './novo-data';
import { NovoLangService } from './novo-lang.service';
import { NovoContentService } from './novo-content.service';
import { NovoSeoService } from './novo-seo.service';

/** Every toque, grouped by style, each shown with its berimbau pattern. */
@Component({
  selector: 'app-novo-toques',
  standalone: true,
  imports: [NovoToqueCardComponent],
  template: `
    <div class="max-w-[1360px] mx-auto px-4 md:px-10 py-6 md:py-9 flex flex-col gap-8">
      <div class="flex flex-col gap-3">
        <h1 class="m-0 n-disp text-3xl md:text-5xl font-bold tracking-[-0.04em]">{{ L.s().toques }}</h1>
        <p class="m-0 max-w-2xl text-base md:text-[17px] leading-relaxed text-[var(--n-tx2)]">{{ L.s().toquesIntro }}</p>
        <span class="inline-flex gap-4 text-[13px] text-[var(--n-tx2)]"><span><b class="text-[var(--n-tx)]">dim</b> {{ L.s().strokeDim }}</span><span><b class="text-[var(--n-tx)]">tch</b> {{ L.s().strokeTch }}</span><span><b class="text-[var(--n-tx)]">dom</b> {{ L.s().strokeDom }}</span></span>
      </div>
      @for (group of groups(); track group.label) {
        <section class="flex flex-col gap-3.5" [attr.aria-label]="group.label">
          <h2 class="m-0 text-lg font-extrabold">{{ group.label }} <span class="text-sm font-semibold text-[var(--n-tx3)]">{{ group.toques.length }}</span></h2>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            @for (t of group.toques; track t.id) { <app-novo-toque-card [toque]="t" /> }
          </div>
        </section>
      }
    </div>
  `,
})
export class NovoToquesComponent {
  private data = inject(DataService);
  private content = inject(NovoContentService);
  private seo = inject(NovoSeoService);
  readonly L = inject(NovoLangService);

  constructor() {
    effect(() => this.seo.set({ title: this.L.s().toques, description: this.L.s().seoToques, path: '/toques' }));
  }

  readonly groups = computed(() => CATEGORY_ORDER
    .map(cat => ({ label: this.content.category(cat), toques: this.data.toques().filter(t => t.category === cat) }))
    .filter(g => g.toques.length));
}
