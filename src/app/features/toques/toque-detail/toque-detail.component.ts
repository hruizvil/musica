import { Component, inject, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';

const TEMPO_LABELS: Record<string, string> = {
  slow: 'Lento', medium: 'Médio', fast: 'Rápido', variable: 'Variável'
};

@Component({
  selector: 'app-toque-detail',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent],
  template: `
    @if (toque()) {
      <div class="max-w-2xl space-y-8">

        <!-- Back -->
        <a routerLink="/toques" class="text-sm text-stone-400 hover:text-capoeira-gold flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Toques
        </a>

        <!-- Header -->
        <div>
          <div class="flex flex-wrap gap-2 mb-2">
            <span class="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-700 text-stone-500">
              {{ categoryLabel() }}
            </span>
            <span [class]="tempoClass()" class="px-2 py-0.5 rounded-full text-xs font-medium">
              {{ TEMPO_LABELS[toque()!.tempo] }}
            </span>
            @if (toque()!.tempoBPM) {
              <span class="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-700 text-stone-500">
                {{ toque()!.tempoBPM!.min }}–{{ toque()!.tempoBPM!.max }} BPM
              </span>
            }
          </div>
          <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">{{ toque()!.name }}</h1>
        </div>

        <!-- Description -->
        <div class="bg-white dark:bg-stone-800 rounded-xl p-6 border border-stone-200 dark:border-stone-700 space-y-4">
          <div>
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Descrição</h2>
            <p class="text-stone-700 dark:text-stone-300 leading-relaxed">{{ toque()!.description }}</p>
          </div>
          <div>
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Contexto do Jogo</h2>
            <p class="text-stone-700 dark:text-stone-300 leading-relaxed">{{ toque()!.context }}</p>
          </div>
          <div>
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Caráter do Jogo</h2>
            <p class="text-stone-600 dark:text-stone-400 italic">{{ toque()!.gameCharacter }}</p>
          </div>
        </div>

        <!-- Instruments -->
        <div>
          <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Instrumentos</h2>
          <div class="flex flex-wrap gap-2">
            @for (inst of toque()!.instruments; track inst) {
              <span class="px-3 py-1.5 rounded-lg text-sm bg-capoeira-gold/10 text-capoeira-brown dark:text-capoeira-gold border border-capoeira-gold/20">
                🎵 {{ inst }}
              </span>
            }
          </div>
        </div>

        <!-- Videos -->
        @if (toque()!.videoLinks.length) {
          <div class="space-y-4">
            <h2 class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Demonstração em Vídeo</h2>
            @for (v of toque()!.videoLinks; track v.url) {
              <div>
                <app-youtube-embed [videoId]="v.url" [title]="v.label" />
                <p class="text-sm text-stone-400 mt-2">{{ v.label }}</p>
              </div>
            }
          </div>
        }

      </div>
    } @else {
      <p class="text-stone-400 text-center py-16">Toque não encontrado.</p>
    }
  `,
})
export class ToqueDetailComponent {
  TEMPO_LABELS = TEMPO_LABELS;
  id = input.required<string>();
  private data = inject(DataService);

  toque = computed(() => this.data.toqueById().get(this.id()));

  categoryLabel = computed(() => {
    const c = this.toque()?.category;
    return c === 'angola' ? 'Angola' : c === 'regional' ? 'Regional' : 'Outro';
  });

  tempoClass = computed(() => {
    const t = this.toque()?.tempo;
    if (t === 'slow') return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
    if (t === 'fast') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    if (t === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
    return 'bg-stone-100 dark:bg-stone-700 text-stone-500';
  });
}
