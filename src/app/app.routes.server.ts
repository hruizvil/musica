import { RenderMode, ServerRoute } from '@angular/ssr';
import songsData from '../assets/data/songs.json';
import toquesData from '../assets/data/toques.json';
import { environment } from '../environments/environment';

/**
 * Which pages are generated as real HTML at build time.
 *
 * Every page of the main site, in English (/…) and Portuguese (/pt/…), including one
 * page per song and per toque, so search engines and link previews get the full page
 * without running any JavaScript. The classic design, the admin and anything unknown
 * render in the browser as before.
 *
 * Song ids come from the bundled songs plus the admin's songs in Firestore, read over
 * its public REST API. A song added after a deploy still works (it renders in the
 * browser) and becomes a generated page on the next deploy.
 */
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${environment.firebase.projectId}/databases/(default)/documents`;

interface RestDoc { name: string; fields?: Record<string, { booleanValue?: boolean }> }

async function restIds(collection: string): Promise<{ id: string; deleted: boolean }[]> {
  const res = await fetch(`${FIRESTORE}/${collection}?pageSize=300&mask.fieldPaths=deleted`);
  if (!res.ok) throw new Error(`Firestore ${collection}: HTTP ${res.status}`);
  const body = (await res.json()) as { documents?: RestDoc[] };
  return (body.documents ?? []).map(d => ({
    id: d.name.slice(d.name.lastIndexOf('/') + 1),
    deleted: d.fields?.['deleted']?.booleanValue === true,
  }));
}

let songIdsCache: Promise<string[]> | null = null;
function songIds(): Promise<string[]> {
  return (songIdsCache ??= (async () => {
    const [overrides, extra] = await Promise.all([restIds('song_overrides'), restIds('songs_extra')]);
    const deleted = new Set(overrides.filter(o => o.deleted).map(o => o.id));
    const bundled = songsData.songs.map(s => s.id);
    return [...new Set([...bundled, ...extra.map(e => e.id)])].filter(id => !deleted.has(id));
  })());
}

const toqueIds = () => toquesData.toques.map(t => ({ id: t.id }));
const songParams = async () => (await songIds()).map(id => ({ id }));

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
