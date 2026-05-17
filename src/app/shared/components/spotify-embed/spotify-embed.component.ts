import { Component, inject, input, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-spotify-embed',
  standalone: true,
  template: `
    @if (safeUrl()) {
      <iframe
        [src]="safeUrl()!"
        class="w-full rounded-lg"
        [style.height]="compact() ? '80px' : '352px'"
        frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        [title]="title()">
      </iframe>
    }
  `,
})
export class SpotifyEmbedComponent {
  private sanitizer = inject(DomSanitizer);

  spotifyUri = input.required<string>();
  compact = input<boolean>(false);
  title = input<string>('Spotify player');

  readonly safeUrl = computed((): SafeResourceUrl | null => {
    const path = this.toEmbedPath(this.spotifyUri());
    if (!path) return null;
    const url = `https://open.spotify.com/embed/${path}?utm_source=generator&theme=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private toEmbedPath(uri: string): string | null {
    const uriMatch = uri.match(/spotify:(track|album|playlist):([A-Za-z0-9]+)/);
    if (uriMatch) return `${uriMatch[1]}/${uriMatch[2]}`;
    const urlMatch = uri.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
    if (urlMatch) return `${urlMatch[1]}/${urlMatch[2]}`;
    return null;
  }
}
