import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Dict, STRINGS } from './novo-i18n';

export type Lang = 'en' | 'pt';

/**
 * The site's language lives in the address: English at /…, Portuguese at /pt/…. That is
 * what lets search engines index both, and a shared link open in the language it was
 * shared in. Everything else (the switch, every internal link) derives from the URL.
 */
@Injectable({ providedIn: 'root' })
export class NovoLangService {
  private router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), map(e => e.urlAfterRedirects)),
    { initialValue: this.router.url },
  );

  readonly lang = computed<Lang>(() => (/^\/pt(\/|\?|#|$)/.test(this.url()) ? 'pt' : 'en'));
  readonly s = computed<Dict>(() => STRINGS[this.lang()]);

  /** The current path without the language prefix, always starting with "/". */
  readonly bare = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return path.replace(/^\/pt(?=\/|$)/, '') || '/';
  });

  /** An internal path in the current language: "/cantigas" or "/pt/cantigas". */
  to(path: string): string {
    return this.inLang(this.lang(), path);
  }

  inLang(lang: Lang, path: string): string {
    const clean = path.startsWith('/') ? path : '/' + path;
    if (lang === 'en') return clean;
    return clean === '/' ? '/pt' : '/pt' + clean;
  }

  /** The same page in the other language, keeping the query string. */
  readonly otherUrl = computed(() => {
    const query = this.url().includes('?') ? this.url().slice(this.url().indexOf('?')) : '';
    return this.inLang(this.lang() === 'en' ? 'pt' : 'en', this.bare()) + query;
  });
}
