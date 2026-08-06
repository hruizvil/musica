import { Component, inject, input, computed, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { TabBarComponent, TabOption } from '../../../shared/components/tab-bar/tab-bar.component';

type ToqueTab = 'sobre' | 'videos';

const TEMPO_LABELS: Record<string, string> = {
  slow: 'Lento', medium: 'Médio', fast: 'Rápido', variable: 'Variável'
};

@Component({
  selector: 'app-toque-detail',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent, TabBarComponent],
  template: `
    @if (toque()) {
      <div class="max-w-2xl space-y-8">

        <!-- Back -->
        <a routerLink="/toques" class="text-sm text-stone-400 hover:text-capoeira-gold inline-flex items-center gap-1 py-2 -my-2">
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

        <!-- Sobre / Vídeos. The tab bar only appears once there is a video to switch
             to; with nothing to demonstrate, a lone "Sobre" tab is just noise. -->
        @if (tabs().length > 1) {
          <app-tab-bar
            [tabs]="tabs()" [active]="activeTab()" idPrefix="toque"
            ariaLabel="Seções do toque"
            (select)="activeTab.set($any($event))" />
        }

        <!-- Description -->
        <div id="toque-panel-sobre" role="tabpanel" aria-labelledby="toque-tab-sobre"
          class="print-show space-y-8" [class.hidden]="activeTab() !== 'sobre'">
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
        </div>

        <!-- Videos. Two sources feed this one panel: videos.json entries pointing at
             this toque, and any links written on the toque itself. People come to a
             toque expecting to hear it, so the demonstration belongs here rather than
             only on the videos index. -->
        @if (hasVideos()) {
          <div id="toque-panel-videos" role="tabpanel" aria-labelledby="toque-tab-videos"
            class="print-show space-y-4" [class.hidden]="activeTab() !== 'videos'">
            @for (video of demoVideos(); track video.id) {
              <div>
                <app-youtube-embed [videoId]="video.youtubeId" [title]="video.title" />
                <!-- The title is only worth repeating when it says something the toque
                     name above has not already said. -->
                @if (video.title !== toque()!.name) {
                  <p class="text-sm text-stone-500 dark:text-stone-400 mt-2 font-medium">{{ video.title }}</p>
                }
                @if (video.description) {
                  <p class="text-sm text-stone-400 mt-1">{{ video.description }}</p>
                }
              </div>
            }
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
  demoVideos = computed(() => this.data.videosByToque().get(this.id()) ?? []);

  readonly hasVideos = computed(() =>
    this.demoVideos().length > 0 || (this.toque()?.videoLinks.length ?? 0) > 0);

  readonly tabs = computed<TabOption<ToqueTab>[]>(() => {
    const tabs: TabOption<ToqueTab>[] = [{ value: 'sobre', label: 'Sobre' }];
    if (this.hasVideos()) tabs.push({ value: 'videos', label: 'Vídeos' });
    return tabs;
  });

  /** Falls back to Sobre on a toque with nothing to show. */
  readonly activeTab = linkedSignal<TabOption<ToqueTab>[], ToqueTab>({
    source: () => this.tabs(),
    computation: (tabs, previous) => {
      const kept = previous?.value;
      return kept && tabs.some(t => t.value === kept) ? kept : 'sobre';
    },
  });

  categoryLabel = computed(() => {
    const c = this.toque()?.category;
    if (c === 'angola') return 'Angola';
    if (c === 'regional') return 'Regional';
    if (c === 'abada') return 'Abadá';
    return 'Outro';
  });

  tempoClass = computed(() => {
    const t = this.toque()?.tempo;
    if (t === 'slow') return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
    if (t === 'fast') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    if (t === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
    return 'bg-stone-100 dark:bg-stone-700 text-stone-500';
  });
}
