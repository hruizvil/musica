import { RenderMode, ServerRoute } from '@angular/ssr';
import songsData from '../assets/data/songs.json';
import toquesData from '../assets/data/toques.json';
import snapshot from '../assets/data/songs-remote.json';
import { fromSnapshot, SongSnapshot } from './core/services/songs-remote';

/**
 * Which pages are generated as real HTML at build time.
 *
 * Every page of the main site, in English (/…) and Portuguese (/pt/…), including one
 * page per song and per toque, so search engines and link previews get the full page
 * without running any JavaScript. The classic design, the admin and anything unknown
 * render in the browser as before.
 *
 * Song ids come from the bundled songs plus the admin's, as saved in the build-time snapshot
 * (scripts/songs-snapshot.mjs). A song added after a deploy still works (it renders in the
 * browser) and becomes a generated page on the next deploy.
 */
/** Song ids: bundled songs plus the admin's, minus the ones the admin deleted. */
function songIds(): string[] {
  const { overrides, extra } = fromSnapshot(snapshot as unknown as SongSnapshot);
  const deleted = new Set([...overrides].filter(([, o]) => o.deleted).map(([id]) => id));
  const bundled = songsData.songs.map(s => s.id);
  return [...new Set([...bundled, ...extra.map(e => e.id)])].filter(id => !deleted.has(id));
}

const toqueIds = () => toquesData.toques.map(t => ({ id: t.id }));
const songParams = async () => songIds().map(id => ({ id }));

const staticPages = ['', 'toques', 'cantigas', 'curtidas', 'login'];

export const serverRoutes: ServerRoute[] = [
  ...staticPages.flatMap(p => [
    { path: p, renderMode: RenderMode.Prerender } as ServerRoute,
    { path: p ? `pt/${p}` : 'pt', renderMode: RenderMode.Prerender } as ServerRoute,
  ]),
  { path: 'toques/:id', renderMode: RenderMode.Prerender, getPrerenderParams: async () => toqueIds() },
  { path: 'pt/toques/:id', renderMode: RenderMode.Prerender, getPrerenderParams: async () => toqueIds() },
  { path: 'cantigas/:id', renderMode: RenderMode.Prerender, getPrerenderParams: songParams },
  { path: 'pt/cantigas/:id', renderMode: RenderMode.Prerender, getPrerenderParams: songParams },
  // Classic design, admin, old addresses (redirected in the browser and by vercel.json), unknown pages.
  { path: '**', renderMode: RenderMode.Client },
];
