import { Component, inject, input, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-youtube-embed',
  standalone: true,
  template: `
    @if (safeUrl()) {
      <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-capoeira-night">
        <iframe
          [src]="safeUrl()!"
          class="absolute inset-0 w-full h-full"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
          [title]="title()">
        </iframe>
      </div>
    } @else {
      <div class="w-full aspect-video rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-sm">
        Vídeo não disponível
      </div>
    }
  `,
})
export class YoutubeEmbedComponent {
  private sanitizer = inject(DomSanitizer);

  videoId = input.required<string>();
  title = input<string>('YouTube video');

  readonly safeUrl = computed((): SafeResourceUrl | null => {
    const id = this.extractId(this.videoId());
    if (!id) return null;
    const url = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private extractId(input: string): string | null {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const match = input.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
}
