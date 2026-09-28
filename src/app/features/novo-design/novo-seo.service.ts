import { Injectable, DOCUMENT, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NovoLangService } from './novo-lang.service';

/** The public address the site is served from. Canonical and hreflang links must be absolute. */
export const SITE_ORIGIN = 'https://abada-musica.vercel.app';
const DEFAULT_IMAGE = SITE_ORIGIN + '/hero.jpg';

export interface PageSeo {
  /** Page title without the site name; omit for the home page. */
  title?: string;
  description: string;
  /** The page's path without the language prefix, e.g. "/cantigas/paranaue". */
  path: string;
  /** schema.org data for the page, rendered as JSON-LD. */
  jsonLd?: Record<string, unknown>;
  /** Pages that should not appear in search results (a signed-in list, a missing page). */
  noindex?: boolean;
}

/**
 * Everything a search engine or a chat app reads from a page's head, set per page and per
 * language: title, description, canonical, the English/Portuguese alternates (hreflang),
 * Open Graph, the html lang attribute and structured data. Runs the same during build-time
 * prerendering (so the generated HTML carries it) and in the browser.
 */
@Injectable({ providedIn: 'root' })
export class NovoSeoService {
  private doc = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);
  private lang = inject(NovoLangService);

  set(page: PageSeo): void {
    const d = this.lang.s();
    const full = page.title ? `${page.title} · ${d.site}` : `${d.site} — ${d.tagline}`;
    const url = (lang: 'en' | 'pt') => SITE_ORIGIN + this.lang.inLang(lang, page.path);
    const self = url(this.lang.lang());

    this.doc.documentElement.lang = d.htmlLang;
    this.title.setTitle(full);
    this.tag('name', 'description', page.description);
    this.tag('name', 'robots', page.noindex ? 'noindex, follow' : 'index, follow');
    this.tag('property', 'og:type', 'website');
    this.tag('property', 'og:site_name', d.site);
    this.tag('property', 'og:title', full);
    this.tag('property', 'og:description', page.description);
    this.tag('property', 'og:url', self);
    this.tag('property', 'og:image', DEFAULT_IMAGE);
    this.tag('property', 'og:locale', d.locale);
    this.tag('property', 'og:locale:alternate', this.lang.lang() === 'en' ? 'pt_BR' : 'en_US');
    this.tag('name', 'twitter:card', 'summary_large_image');
    this.tag('name', 'twitter:title', full);
    this.tag('name', 'twitter:description', page.description);

    this.link('canonical', self);
    this.alternate('en', url('en'));
    this.alternate('pt-BR', url('pt'));
    this.alternate('x-default', url('en'));
    this.jsonLd(page.jsonLd);
  }

  private tag(attr: 'name' | 'property', key: string, content: string): void {
    const selector = `${attr}="${key}"`;
    if (this.meta.getTag(selector)) this.meta.updateTag({ [attr]: key, content }, selector);
    else this.meta.addTag({ [attr]: key, content });
  }

  private link(rel: string, href: string): void {
    let el = this.doc.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([hreflang])`);
    if (!el) { el = this.doc.createElement('link'); el.rel = rel; this.doc.head.appendChild(el); }
    el.href = href;
  }

  private alternate(hreflang: string, href: string): void {
    let el = this.doc.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if (!el) {
      el = this.doc.createElement('link');
      el.rel = 'alternate';
      el.setAttribute('hreflang', hreflang);
      this.doc.head.appendChild(el);
    }
    el.href = href;
  }

  private jsonLd(data: Record<string, unknown> | undefined): void {
    let el = this.doc.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-novo]');
    if (!data) { el?.remove(); return; }
    if (!el) {
      el = this.doc.createElement('script');
      el.type = 'application/ld+json';
      el.setAttribute('data-novo', '');
      this.doc.head.appendChild(el);
    }
    // "<" is escaped so song text can never close the script element early.
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
  }
}
