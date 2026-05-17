import { Component, inject, signal, computed } from '@angular/core';
import { DataService } from '../../../core/services/data.service';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { FilterChipComponent } from '../../../shared/components/filter-chip/filter-chip.component';
import { VideoCategory } from '../../../core/models/video.model';

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
  imports: [YoutubeEmbedComponent, FilterChipComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">Vídeos</h1>
        <p class="text-stone-400 text-sm mt-1">Demonstrações de toques, apresentações e aulas</p>
      </div>

      <!-- Category filter -->
      <div class="flex flex-wrap gap-2">
        <app-filter-chip label="Todos" [active]="!activeCategory()" (toggle)="activeCategory.set(null)" />
        @for (cat of categories; track cat.value) {
          <app-filter-chip
            [label]="cat.label"
            [active]="activeCategory() === cat.value"
            (toggle)="activeCategory.set(activeCategory() === cat.value ? null : cat.value)" />
        }
      </div>

      @if (filteredVideos().length) {
        <div class="grid gap-6 sm:grid-cols-2">
          @for (video of filteredVideos(); track video.id) {
            <div class="space-y-2">
              <app-youtube-embed [videoId]="video.youtubeId" [title]="video.title" />
              <div>
                <h3 class="font-medium text-stone-800 dark:text-stone-200 text-sm">{{ video.title }}</h3>
                <span class="text-xs text-stone-400">{{ CATEGORY_LABELS[video.category] }}</span>
              </div>
              <p class="text-xs text-stone-500 dark:text-stone-400">{{ video.description }}</p>
            </div>
          }
        </div>
      } @else {
        <div class="text-center py-16 text-stone-400">
          <p class="text-4xl mb-3">📹</p>
          <p>Nenhum vídeo disponível ainda.</p>
          <p class="text-sm mt-1">Adicione vídeos em <code class="text-xs bg-stone-100 dark:bg-stone-800 px-1 rounded">assets/data/videos.json</code></p>
        </div>
      }
    </div>
  `,
})
export class VideoListComponent {
  CATEGORY_LABELS = CATEGORY_LABELS;
  private data = inject(DataService);

  activeCategory = signal<VideoCategory | null>(null);

  categories = (Object.entries(CATEGORY_LABELS) as [VideoCategory, string][]).map(([value, label]) => ({ value, label }));

  filteredVideos = computed(() => {
    const cat = this.activeCategory();
    const videos = this.data.videos();
    return cat ? videos.filter(v => v.category === cat) : videos;
  });
}
