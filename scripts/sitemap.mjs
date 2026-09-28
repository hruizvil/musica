// Writes sitemap.xml next to the built site, from the pages Angular prerendered.
// Each English page is listed with its Portuguese twin (and the other way round) via
// hreflang alternates, which is how search engines learn the two are the same page.
// Private pages (sign-in, the signed-in lists) are left out; they are noindex anyway.
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://abada-musica.vercel.app';
const DIST = 'dist/capoeira-musica-library';
const PRIVATE = new Set(['/login', '/curtidas']);

const routes = Object.keys(JSON.parse(readFileSync(`${DIST}/prerendered-routes.json`, 'utf8')).routes);
const bare = [...new Set(routes.map(r => r.replace(/^\/pt(?=\/|$)/, '') || '/'))].filter(r => !PRIVATE.has(r)).sort();

const url = (lang, path) => ORIGIN + (lang === 'pt' ? (path === '/' ? '/pt' : '/pt' + path) : path);
const today = new Date().toISOString().slice(0, 10);
const entry = (lang, path) => `  <url>
    <loc>${url(lang, path)}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${url('en', path)}"/>
    <xhtml:link rel="alternate" hreflang="pt-BR" href="${url('pt', path)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${url('en', path)}"/>
  </url>`;

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${bare.flatMap(p => [entry('en', p), entry('pt', p)]).join('\n')}
</urlset>
`;
writeFileSync(`${DIST}/browser/sitemap.xml`, xml);
console.log(`sitemap.xml: ${bare.length * 2} pages (${bare.length} in each language)`);
