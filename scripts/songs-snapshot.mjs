// Saves the admin's song data (edits, deletions, added songs, toque patterns) from Firestore into
// src/assets/data/songs-remote.json before each build.
//
// The build prerenders ~70 pages and every one needs this data. Reading it once here, instead
// of from each page, keeps a build to two Firestore requests. The file also ships with the
// site, so visitors get the right song list even when Firestore can't be reached.
//
// If Firestore fails (quota spent, outage), the previous file is kept and the build goes on
// with it: the site is then only as fresh as the last good snapshot, never broken.
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'src/assets/data/songs-remote.json';
const env = readFileSync('src/environments/environment.ts', 'utf8');
const pick = key => env.match(new RegExp(`${key}:\\s*'([^']+)'`))[1];
const BASE = `https://firestore.googleapis.com/v1/projects/${pick('projectId')}/databases/(default)/documents`;
const KEY = pick('apiKey');

const decode = v =>
  'stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'doubleValue' in v ? v.doubleValue
  : 'timestampValue' in v ? v.timestampValue
  : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(decode)
  : 'mapValue' in v ? fields(v.mapValue.fields ?? {})
  : null;
const fields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]));
const docId = d => d.name.slice(d.name.lastIndexOf('/') + 1);

async function list(collection) {
  const url = `${BASE}/${collection}?pageSize=300&key=${KEY}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) return (await res.json()).documents ?? [];
    if (!(res.status === 429 || res.status >= 500) || attempt >= 3) throw new Error(`${collection}: HTTP ${res.status}`);
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
  }
}

const previous = JSON.parse(readFileSync(OUT, 'utf8'));

// Toque patterns are read on their own: until the Firestore rules allow reading
// "toque_patterns", this fails and the previous patterns are kept, songs unaffected.
async function patterns() {
  try {
    const docs = await list('toque_patterns');
    return Object.fromEntries(docs.map(d => [docId(d), fields(d.fields ?? {})]));
  } catch (err) {
    console.warn(`songs-remote.json: toque patterns unavailable (${err.message}); keeping the previous ones`);
    return previous.patterns ?? {};
  }
}

try {
  const [overrides, extra, pats] = await Promise.all([list('song_overrides'), list('songs_extra'), patterns()]);
  const snapshot = {
    fetchedAt: new Date().toISOString(),
    overrides: Object.fromEntries(overrides.map(d => [docId(d), fields(d.fields ?? {})])),
    extra: extra.map(d => fields(d.fields ?? {})),
    patterns: pats,
  };
  writeFileSync(OUT, JSON.stringify(snapshot, null, 1) + '\n');
  console.log(`songs-remote.json: ${overrides.length} edits, ${extra.length} added songs, ${Object.keys(pats).length} toque patterns`);
} catch (err) {
  console.warn(`songs-remote.json: Firestore unavailable (${err.message}); keeping the snapshot from ${previous.fetchedAt}`);
}
