import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { NovoIconComponent, NovoTempoComponent } from './novo-ui';
import { CATEGORY_LABEL, CATEGORY_ORDER } from './novo-utils';

/** Estúdio toques: every toque by style, with its tempo, songs and how many you know. */
@Component({
  selector: 'app-novo-toques',
  standalone: true,
  imports: [RouterLink, NovoIconComponent, NovoTempoComponent],
  template: `
    <div class="max-w-[1180px] mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6">
      <div class="flex flex-col gap-1.5">
        <p class="n-label hidden md:block">Biblioteca</p>
        <h1 class="m-0 text-3xl md:text-[32px] font-semibold tracking-[-0.03em]">Toques</h1>
        <p class="m-0 max-w-2xl text-[15px] text-[#5f6778]">O ritmo do berimbau define o jogo e o que se canta. Abra um toque para ouvir, marcar o pulso e ver as cantigas dele.</p>
      </div>

      @for (group of groups(); track group.label) {
        <section class="flex flex-col gap-3" [attr.aria-label]="group.label">
          <h2 class="m-0 text-base font-semibold">{{ group.label }} <span class="n-mono text-xs font-normal text-[#5f6778]">{{ group.toques.length }}</span></h2>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (t of group.toques; track t.id) {
              <a [routerLink]="['/novo/toques', t.id]" class="bg-white border border-[#e3e6eb] rounded-[14px] p-4 flex flex-col gap-2.5 hover:border-[#2146d8] transition-colors">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-[17px] font-semibold text-[#0f1115]">{{ t.name }}</span>
                  <app-novo-tempo [toque]="t" />
                </div>
                <span class="text-[13px] leading-snug text-[#5f6778] line-clamp-2">{{ t.gameCharacter }}</span>
                <span class="mt-auto flex items-center gap-3 text-[13px] text-[#434a5a]">
                  <span>{{ t.songs }} {{ t.songs === 1 ? 'cantiga' : 'cantigas' }}</span>
                  @if (firebase.currentUser() && t.songs) { <span class="n-mono text-xs text-[#0b7a55]">{{ t.learned }} aprendida{{ t.learned === 1 ? '' : 's' }}</span> }
                  @if (t.video) { <span class="ml-auto inline-flex items-center gap-1 text-[#2146d8] font-semibold"><app-novo-icon name="video" [size]="15" />Vídeo</span> }
                </span>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class NovoToquesComponent {
  private data = inject(DataService);
  readonly firebase = inject(FirebaseService);

  readonly groups = computed(() => {
    const byToque = this.data.songsByToque(); const videos = this.data.videosByToque(); const learned = this.firebase.learnedSongs();
    return CATEGORY_ORDER.map(cat => ({
      label: CATEGORY_LABEL[cat],
      toques: this.data.toques().filter(t => t.category === cat).map(t => {
        const songs = byToque.get(t.id) ?? [];
        return { ...t, songs: songs.length, learned: songs.filter(s => learned.has(s.id)).length, video: !!videos.get(t.id)?.length || t.videoLinks.length > 0 };
      }),
    })).filter(g => g.toques.length);
  });
}
