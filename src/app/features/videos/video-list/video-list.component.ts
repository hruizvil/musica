import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { FilterChipComponent } from '../../../shared/components/filter-chip/filter-chip.component';
import { Video, VideoCategory } from '../../../core/models/video.model';

const CATEGORY_LABELS: Record<VideoCategory, string> = {
  'toque-demo': 'Demonstração de Toque',
  'performance': 'Apresentação',
  'class': 'Aula',
  'batizado': 'Batizado',
  'interview': 'Entrevista',
};

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [RouterLink, YoutubeEmbedComponent, FilterChipComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">Vídeos</h1>
        <p class="text-stone-400 text-sm mt-1">
          Todos os vídeos reunidos. Cada demonstração também aparece na página do seu toque.
        </p>
      </div>

      <!-- Category filter. Only categories that actually have videos get a chip — an
           empty filter is a dead end. -->
      @if (categories().length > 1) {
        <div class="flex flex-wrap gap-2">
          <app-filter-chip label="Todos" [active]="!activeCategory()" (toggled)="activeCategory.set(null)" />
          @for (cat of categories(); track cat.value) {
            <app-filter-chip
              [label]="cat.label"
              [active]="activeCategory() === cat.value"
              (toggled)="activeCategory.set(activeCategory() === cat.value ? null : cat.value)" />
          }
        </div>
      }

      @if (filteredVideos().length) {
        <div class="grid gap-6 sm:grid-cols-2">
          @for (video of filteredVideos(); track video.id) {
            <div class="space-y-2">
              <app-youtube-embed [videoId]="video.youtubeId" [title]="video.title" />
              <!-- The toque link stretches over this text block only. Stretching it over
                   the card would cover the embed and swallow the tap that plays the video. -->
              <div class="relative space-y-2">
                <div>
                  <h3 class="font-medium text-stone-800 dark:text-stone-200 text-sm">{{ video.title }}</h3>
                  <span class="text-xs text-stone-400">{{ CATEGORY_LABELS[video.category] }}</span>
                </div>
                @if (video.description) {
                  <p class="text-xs text-stone-500 dark:text-stone-400">{{ video.description }}</p>
                }
                @if (toqueOf(video); as toque) {
                  <a [routerLink]="['/toques', toque.id]"
                     class="inline-flex items-center gap-1 text-xs font-medium text-capoeira-brown dark:text-capoeira-gold hover:underline py-1 stretched-link">
                    Ver o toque {{ toque.name }}
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </a>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="text-center py-16 text-stone-400">
          <p class="text-4xl mb-3">📹</p>
          <p>Nenhum vídeo disponível ainda.</p>
        </div>
      }
    </div>
  `,
})
export class VideoListComponent {
  CATEGORY_LABELS = CATEGORY_LABELS;
  private data = inject(DataService);

  activeCategory = signal<VideoCategory | null>(null);

  categories = computed(() => {
    const present = new Set(this.data.videos().map(v => v.category));
    return (Object.entries(CATEGORY_LABELS) as [VideoCategory, string][])
      .filter(([value]) => present.has(value))
      .map(([value, label]) => ({ value, label }));
  });

  filteredVideos = computed(() => {
    const cat = this.activeCategory();
    const videos = this.data.videos();
    return cat ? videos.filter(v => v.category === cat) : videos;
  });

  /** The toque a video belongs to, for the link back to it. */
  toqueOf(video: Video) {
    return video.toque ? this.data.toqueById().get(video.toque) : undefined;
  }
}
