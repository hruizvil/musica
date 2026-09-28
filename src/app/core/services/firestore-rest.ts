import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Song } from '../models/song.model';
import { SongOverride } from './firebase.service';
import { environment } from '../../../environments/environment';

/**
 * Reads the two public song collections through Firestore's REST API, with HttpClient.
 *
 * Used when a page is prerendered at build time. The Firebase SDK is browser-first and
 * its requests are invisible to Angular's server renderer, which would capture the page
 * before the admin's songs arrived. HttpClient requests are tracked, so the renderer waits
 * for them. Both collections allow public reads (see firestore.rules).
 */
const BASE = `https://firestore.googleapis.com/v1/projects/${environment.firebase.projectId}/databases/(default)/documents`;

interface RestValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: Record<string, RestValue> };
}
interface RestDoc { name: string; fields?: Record<string, RestValue>; }
interface RestList { documents?: RestDoc[]; }

function decode(v: RestValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue?.values ?? []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue?.fields ?? {});
  return null;
}
function decodeFields(fields: Record<string, RestValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));
}
function docId(doc: RestDoc): string {
  return doc.name.slice(doc.name.lastIndexOf('/') + 1);
}

export function readSongCollections(http: HttpClient): Observable<[Map<string, SongOverride>, Song[]]> {
  const list = (name: string) => http.get<RestList>(`${BASE}/${name}?pageSize=300`).pipe(map(r => r.documents ?? []));
  return forkJoin([list('song_overrides'), list('songs_extra')]).pipe(
    map(([overrides, extra]) => [
      new Map(overrides.map(d => [docId(d), decodeFields(d.fields ?? {}) as SongOverride])),
      extra.map(d => decodeFields(d.fields ?? {}) as unknown as Song),
    ]),
  );
}
