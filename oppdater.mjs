// Bygger nettsiden til mappa _site:
//  • henter ALLE videoene og tallene fra YouTube-kanalen
//      – med API-nøkkel (config.js → youtube.apiKey): hele kanalen + abonnenter/visninger
//      – uten nøkkel: de nyeste fra RSS, og siden husker alle den har sett før
//  • henter innlegg du har lagt ut som GitHub-issues med merkelappen «innlegg»
//  • skriver alt til data/feed.js, som nettsiden leser
// Kjøres av GitHub Actions i skyen – PC-en trenger ikke være på. Ingen pakker nødvendig (Node 20+).
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '_site');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const PAGES = (process.env.PAGES_URL || '').replace(/\/$/, '');
const log = (...a) => console.log('•', ...a);
const warn = m => console.log(`::warning::${m}`);

async function readConfig() {
  const src = await fs.readFile(path.join(ROOT, 'config.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(src, ctx, { timeout: 1000 });
  return ctx.window.SITE || {};
}

async function get(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow', ...opts, headers: { 'user-agent': UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(25000) });
      if (!r.ok && !(opts.redirect === 'manual' && r.status >= 300 && r.status < 400)) throw new Error(`${r.status} ${r.statusText} – ${url.replace(/key=[^&]+/, 'key=***')}`);
      return r;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise(res => setTimeout(res, 1500 * i));
    }
  }
}

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]).trim() : ''; };
const attr = (xml, name, a) => { const m = xml.match(new RegExp(`<${name}\\b[^>]*\\b${a}="([^"]*)"`)); return m ? decode(m[1]) : ''; };
const num = s => { const m = String(s || '').replace(/\s/g, '').match(/^([\d.,]+)([KkMmBb]?)/); if (!m) return 0; let n = parseFloat(m[1].replace(/,(?=\d{3}\b)/g, '').replace(',', '.')); const k = { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1; return Math.round(n * k); };
const isoDur = s => { const m = String(s || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0) : 0; };

// ---------------------------------------------------------------- forrige versjon av siden
async function previous() {
  if (!PAGES) return null;
  try {
    const t = await (await get(`${PAGES}/data/feed.js?t=${Date.now()}`, {}, 1)).text();
    return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  } catch { return null; }
}

// ---------------------------------------------------------------- YouTube
async function channelPage(yt) {
  const h = (yt.handle || '').trim();
  const url = yt.channelId ? `https://www.youtube.com/channel/${yt.channelId}` : /^https:/.test(h) ? h : 'https://www.youtube.com/@' + encodeURIComponent(h.replace(/^@/, ''));
  return (await get(url, { headers: { 'accept-language': 'en-US,en;q=0.8', cookie: 'CONSENT=YES+cb; SOCS=CAI' } })).text();
}
function idFromPage(html) {
  const m = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) || html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/) || html.match(/"channelId":"(UC[\w-]{22})"/);
  return m?.[1] || null;
}

async function viaApi(yt, key) {
  const H = PAGES ? { referer: PAGES + '/' } : {};
  const api = async (p, q) => (await get(`https://www.googleapis.com/youtube/v3/${p}?${new URLSearchParams({ ...q, key })}`, { headers: H })).json();
  const q = /^UC[\w-]{22}$/.test(yt.channelId || '') ? { id: yt.channelId } : { forHandle: '@' + (yt.handle || '').replace(/^@/, '') };
  const ch = (await api('channels', { part: 'snippet,statistics,contentDetails', ...q })).items?.[0];
  if (!ch) throw new Error('fant ikke kanalen via API-et');
  const uploads = ch.contentDetails.relatedPlaylists.uploads;
  const ids = [];
  let pageToken = '';
  do {
    const r = await api('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: 50, ...(pageToken ? { pageToken } : {}) });
    ids.push(...r.items.map(i => i.contentDetails.videoId));
    pageToken = r.nextPageToken || '';
  } while (pageToken && ids.length < 2000);
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await api('videos', { part: 'snippet,statistics,contentDetails,status', id: ids.slice(i, i + 50).join(',') });
    for (const v of r.items) {
      if (v.status?.privacyStatus && v.status.privacyStatus !== 'public') continue;
      if (v.snippet.liveBroadcastContent === 'upcoming') continue;
      videos.push({ id: v.id, title: v.snippet.title, published: v.snippet.publishedAt, views: +v.statistics.viewCount || 0, duration: isoDur(v.contentDetails.duration), desc: (v.snippet.description || '').slice(0, 600), short: false });
    }
  }
  // Shorts: korte videoer sjekkes mot youtube.com/shorts/ID (200 = short, videresending = vanlig video)
  for (const v of videos.filter(v => v.duration && v.duration <= 180)) {
    try { const r = await get(`https://www.youtube.com/shorts/${v.id}`, { redirect: 'manual' }, 1); v.short = r.status === 200; } catch {}
  }
  const s = ch.statistics;
  return { channelId: ch.id, videos, stats: { subs: +s.subscriberCount || 0, views: +s.viewCount || 0, videos: +s.videoCount || videos.length } };
}

// Henter hele opplastingslista fra YouTube-siden (uten API-nøkkel). Beste forsøk – feiler stille.
const ytData = html => { const m = html.match(/ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/); return m ? JSON.parse(m[1]) : null; };
function agoToIso(txt) {
  // «3 days ago», «1d ago», «2mo ago», «for 1 md. siden» …
  const m = String(txt || '').toLowerCase().match(/(\d+)\s*([a-zåæø.]+)/);
  if (!m) return null;
  const u = m[2];
  const sec = /^(y|yr|year|år)/.test(u) ? 31536000 : /^(mo|month|md|måned|mnd)/.test(u) ? 2592000 : /^(w|wk|week|u\.|uke)/.test(u) ? 604800
    : /^(d|dag)/.test(u) ? 86400 : /^(h|hr|hour|t\.|time)/.test(u) ? 3600 : /^(m|min)/.test(u) ? 60 : /^(s|sek)/.test(u) ? 1 : 0;
  return sec ? new Date(Date.now() - (+m[1]) * sec * 1000).toISOString() : null;
}
function lockups(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (obj.lockupViewModel) { out.push(obj.lockupViewModel); return out; }
  for (const k in obj) lockups(obj[k], out);
  return out;
}
function findAll(obj, key, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (obj[key] !== undefined) out.push(obj[key]);
  for (const k in obj) findAll(obj[k], key, out);
  return out;
}
function fromLockup(l) {
  if (l.contentType && l.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;
  const md = l.metadata?.lockupMetadataViewModel;
  const badge = findAll(l.contentImage, 'thumbnailBadgeViewModel').map(b => b.text).find(t => /^\d+(:\d+)+$/.test(t || ''));
  if (!badge) return null; // direktesendinger som ikke er ferdige, premierer o.l.
  const parts = (md?.metadata?.contentMetadataViewModel?.metadataRows || []).flatMap(r => (r.metadataParts || []).map(p => p.text?.content || ''));
  const when = parts.find(p => /ago|siden/i.test(p));
  const views = parts.find(p => p !== when && (/views?|visning/i.test(p) || /^[\d.,\s]+[KkMmBb]?$/.test(p.trim())));
  const duration = badge.split(':').reduce((a, n) => a * 60 + (+n), 0);
  const anyWhen = findAll(l, 'content').find(t => typeof t === 'string' && /ago|siden/i.test(t));
  return { id: l.contentId, title: md?.title?.content || '', duration, views: /no views|ingen/i.test(views || '') ? 0 : num(views), published: agoToIso(when) || agoToIso(anyWhen), approx: true, short: duration <= 60, rawParts: parts };
}
async function scrapeUploads(channelId) {
  const H = { 'accept-language': 'en-US,en;q=0.8', cookie: 'CONSENT=YES+cb; SOCS=CAI' };
  const html = await (await get(`https://www.youtube.com/playlist?list=UU${channelId.slice(2)}`, { headers: H })).text();
  const data = ytData(html);
  if (!data) throw new Error('fant ikke videolista på YouTube-siden');
  let items = lockups(data);
  const ver = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || '2.20250101.00.00';
  let token = findAll(data, 'continuationCommand')[0]?.token;
  for (let page = 0; token && page < 20; page++) {
    const r = await (await get('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: ver, hl: 'en', gl: 'US' } }, continuation: token }) }, 2)).json();
    const more = lockups(r);
    if (!more.length) break;
    items = items.concat(more);
    token = findAll(r, 'continuationCommand')[0]?.token;
  }
  const seen = new Set();
  const list = items.map(fromLockup).filter(v => v && /^[\w-]{11}$/.test(v.id) && !seen.has(v.id) && seen.add(v.id));
  const miss = list.filter(v => !v.published);
  if (miss.length) log(`Uten dato: ${miss.length}. Eksempel: ${JSON.stringify(miss[0].rawParts)}`);
  // lista er sortert nyest først: videoer uten dato får tiden til videoen foran seg
  let last = Date.now();
  for (const v of list) { if (v.published) last = new Date(v.published).getTime(); else { last -= 60000; v.published = new Date(last).toISOString(); v.noDate = true; } delete v.rawParts; }
  return list;
}

async function viaRss(yt, prev) {
  let id = /^UC[\w-]{22}$/.test(yt.channelId || '') ? yt.channelId : null;
  let html = '';
  try { html = await channelPage(yt); id ||= idFromPage(html); } catch (e) { warn(`Kanalsiden svarte ikke: ${e.message}`); }
  id ||= prev?.channelId;
  if (!id) throw new Error('fant ikke kanal-ID – skriv den inn i config.js (youtube.channelId)');
  const xml = await (await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`)).text();
  const fresh = xml.split('<entry>').slice(1).map(e => e.split('</entry>')[0]).map(e => {
    const vid = tag(e, 'yt:videoId');
    return { id: vid, title: tag(e, 'title'), published: tag(e, 'published'), short: /\/shorts\//.test(attr(e, 'link', 'href')), views: +attr(e, 'media:statistics', 'views') || 0, desc: tag(e, 'media:description').slice(0, 600) };
  }).filter(v => /^[\w-]{11}$/.test(v.id));
  // husk alle videoer vi har sett før (RSS viser bare de 15 nyeste) og hent resten fra opplastingslista
  const byId = new Map((prev?.videos || []).map(v => [v.id, v]));
  let all = null;
  try { all = await scrapeUploads(id); log(`Opplastingslista: ${all.length} videoer`); } catch (e) { warn(`Kunne ikke lese hele videolista: ${e.message}`); }
  if (all?.length) {
    const keep = new Set([...all.map(v => v.id), ...fresh.map(v => v.id)]);
    for (const k of [...byId.keys()]) if (!keep.has(k)) byId.delete(k); // slettede videoer forsvinner
    for (const v of all) { const old = byId.get(v.id); byId.set(v.id, old ? { ...old, views: v.views || old.views, duration: v.duration || old.duration, title: v.title || old.title, ...(old.approx !== false ? { published: v.published, noDate: v.noDate } : {}) } : v); }
  }
  for (const v of fresh) { const old = byId.get(v.id); byId.set(v.id, { ...old, ...v, approx: false, noDate: false, duration: old?.duration || v.duration }); }
  const videos = [...byId.values()];
  // korte videoer (1–3 min) kan være Shorts: sjekk mot youtube.com/shorts/ID én gang
  for (const v of videos.filter(v => v.approx && v.duration > 60 && v.duration <= 180 && v.shortChecked !== true).slice(0, 40)) {
    try { const r = await get(`https://www.youtube.com/shorts/${v.id}`, { redirect: 'manual' }, 1); v.short = r.status === 200; v.shortChecked = true; } catch {}
  }
  const stats = { ...(prev?.stats || {}) };
  const subs = html.match(/"(?:simpleText|content|label)":"([\d.,]+\s*[KMB]?)\s+subscribers?"/i);
  if (subs) stats.subs = num(subs[1]);
  const vc = html.match(/"(?:simpleText|content|label)":"([\d.,]+\s*[KMB]?)\s+videos?"/i);
  stats.videos = videos.length || (vc ? num(vc[1]) : 0);
  if (all?.length) stats.views = videos.reduce((s, v) => s + (v.views || 0), 0); else delete stats.views;
  return { channelId: id, videos, stats };
}

// ---------------------------------------------------------------- innlegg (GitHub-issues fra eieren)
const IMG = /\.(png|jpe?g|webp|gif)(\?|$)/i;
async function saveImage(url, base) {
  const r = await get(url, {}, 2);
  const ct = (r.headers.get('content-type') || '').split(';')[0];
  let pth = ''; try { pth = new URL(r.url || url).pathname; } catch {}
  const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[ct] || (pth.match(IMG)?.[1] || '').replace('jpeg', 'jpg');
  if (!ext) throw new Error('ikke et bilde');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 10 * 1024 * 1024) throw new Error('bildet er over 10 MB');
  await fs.writeFile(path.join(OUT, 'data', 'img', `${base}.${ext}`), buf);
  return `data/img/${base}.${ext}`;
}
async function posts() {
  const repo = process.env.GITHUB_REPOSITORY;
  const owner = process.env.GITHUB_REPOSITORY_OWNER || repo?.split('/')[0];
  if (!repo) { log('Ikke på GitHub – hopper over innlegg.'); return []; }
  const H = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const list = await (await get(`https://api.github.com/repos/${repo}/issues?labels=innlegg&state=open&creator=${encodeURIComponent(owner)}&per_page=50&sort=created&direction=desc`, { headers: H })).json();
  const out = [];
  for (const is of list) {
    if (is.pull_request || is.user?.login?.toLowerCase() !== owner.toLowerCase()) continue; // bare eieren kan legge ut
    const body = is.body || '';
    const urls = [...body.matchAll(/!\[[^\]]*\]\((https:[^)\s]+)\)|<img[^>]+src="(https:[^"]+)"/gi)].map(m => m[1] || m[2]);
    const images = [];
    for (const [i, u] of urls.slice(0, 4).entries()) { try { images.push(await saveImage(u, `innlegg-${is.number}-${i}`)); } catch (e) { warn(`Bilde i innlegg #${is.number}: ${e.message}`); } }
    const text = body.replace('Skriv innlegget her. Dra inn bilder hvis du vil.', '')
      .replace(/!\[[^\]]*\]\([^)]*\)|<img[^>]*>/gi, '')
      .replace(/^#{1,6}\s*/gm, '').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1').replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/^\s*[-*]\s+/gm, '• ').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 5000);
    out.push({ id: String(is.number), title: is.title, created: is.created_at, text, images });
  }
  log(`Innlegg: ${out.length}`);
  return out;
}

// ---------------------------------------------------------------- bygg
const SITE = await readConfig();
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(path.join(OUT, 'data', 'img'), { recursive: true });
for (const f of await fs.readdir(ROOT)) if (/^(index\.html|config\.js)$|\.(png|jpe?g|webp|gif|svg)$/i.test(f)) await fs.copyFile(path.join(ROOT, f), path.join(OUT, f));
await fs.cp(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true }).catch(() => {});
await fs.writeFile(path.join(OUT, '.nojekyll'), '');

const prev = await previous();
const feed = { updated: new Date().toISOString(), channelId: prev?.channelId || null, stats: prev?.stats || {}, videos: prev?.videos || [], posts: [], repo: process.env.GITHUB_REPOSITORY || '' };
const yt = SITE.youtube || {};

if (yt.handle || yt.channelId) {
  try {
    const r = yt.apiKey ? await viaApi(yt, yt.apiKey).catch(e => { warn(`YouTube-API feilet (${e.message}) – bruker RSS i stedet.`); return viaRss(yt, prev); }) : await viaRss(yt, prev);
    Object.assign(feed, r);
    feed.videos.sort((a, b) => new Date(b.published) - new Date(a.published));
    log(`YouTube: ${feed.videos.length} videoer, ${feed.stats.subs ?? '?'} abonnenter`);
  } catch (e) { warn(`Klarte ikke å hente videoer: ${e.message} – beholder de forrige.`); }
} else log('Ingen YouTube-kanal i config.js ennå.');

try { feed.posts = await posts(); }
catch (e) {
  warn(`Klarte ikke å hente innlegg: ${e.message}`);
  feed.posts = prev?.posts || [];
  for (const p of feed.posts) p.images = (await Promise.all((p.images || []).map(async img => {
    try { await fs.writeFile(path.join(OUT, img), Buffer.from(await (await get(`${PAGES}/${img}`, {}, 1)).arrayBuffer())); return img; } catch { return null; }
  }))).filter(Boolean);
}

// Discord: navn og hvor mange som er pålogget (fra invitasjonslenken)
const inv = (SITE.lenker?.discord || '').match(/discord(?:\.gg|(?:app)?\.com\/invite)\/([\w-]+)/i);
if (inv) {
  try {
    const j = await (await get(`https://discord.com/api/v10/invites/${inv[1]}?with_counts=true`, {}, 2)).json();
    feed.discord = { name: j.guild?.name || '', members: j.approximate_member_count ?? j.profile?.member_count ?? 0, online: j.approximate_presence_count ?? j.profile?.online_count ?? 0 };
    log(`Discord: ${feed.discord.name} – ${feed.discord.members} medlemmer, ${feed.discord.online} pålogget`);
  } catch (e) { warn(`Discord: ${e.message}`); if (prev?.discord) feed.discord = prev.discord; }
}

await fs.writeFile(path.join(OUT, 'data', 'feed.js'), `// Lages automatisk av oppdater.mjs – ikke rediger.\nwindow.FEED = ${JSON.stringify(feed).replace(/</g, '\\u003c')};\n`);
log(`Ferdig: ${feed.videos.length} videoer, ${feed.posts.length} innlegg → _site/`);
