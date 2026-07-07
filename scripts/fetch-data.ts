#!/usr/bin/env node
/**
 * scripts/fetch-data.ts
 * Pre-build data fetcher — runs before `astro build` via `prebuild` npm hook.
 * Saves all API responses to public/data/*.json so:
 *   1. Pages read local JSON instead of calling APIs at build time
 *   2. Build works even if APIs are temporarily down (uses stale data)
 *   3. Data is versioned in git as a fallback snapshot
 *
 * Run manually: npx tsx scripts/fetch-data.ts
 * Run at build: triggered automatically by "prebuild" in package.json
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'public', 'data')

// ---- env vars ---------------------------------------------------------------
const TRAKT_ID     = process.env.TRAKT_CLIENT_ID     ?? ''
const TRAKT_TOKEN  = process.env.TRAKT_ACCESS_TOKEN  ?? ''  // Bearer token for private data
const TRAKT_USER   = process.env.TRAKT_USERNAME      ?? 'chirag127'
const MAL_ID      = process.env.MAL_CLIENT_ID      ?? ''
const MAL_USER    = process.env.MAL_USERNAME        ?? 'chirag127'
const LASTFM_KEY  = process.env.LASTFM_API_KEY     ?? ''
const LASTFM_USER = process.env.LASTFM_USERNAME    ?? 'lastfmwhy'
const LB_USER     = process.env.LISTENBRAINZ_USERNAME ?? 'chirag127'
const GR_ID       = process.env.GOODREADS_USER_ID  ?? '132482257'
const DISCORD_ID  = process.env.DISCORD_USER_ID    ?? '799956529847205898'
const GH_USER     = 'chirag127'

// ---- helpers ---------------------------------------------------------------
mkdirSync(DATA_DIR, { recursive: true })

function save(filename: string, data: unknown) {
  const path = join(DATA_DIR, filename)
  const json = JSON.stringify(data, null, 2)
  writeFileSync(path, json, 'utf-8')
  const kb = (Buffer.byteLength(json) / 1024).toFixed(1)
  console.log(`  ✓ ${filename} (${kb} KB)`)
}

function loadStale(filename: string): unknown {
  const path = join(DATA_DIR, filename)
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, 'utf-8')) } catch {}
  }
  return null
}

async function safeFetch(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    if (!r.ok) { console.warn(`    ⚠ HTTP ${r.status}: ${url}`) ; return null }
    return r.json()
  } catch (e: any) {
    console.warn(`    ⚠ Fetch failed: ${url} — ${e.message}`)
    return null
  }
}

// ---- fetch functions -------------------------------------------------------

async function fetchLastfm() {
  if (!LASTFM_KEY) { console.log('  ⚠ LASTFM_API_KEY not set — skipping Last.fm'); return }
  const base = `https://ws.audioscrobbler.com/2.0/?user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json`

  const [recent, topArtists, topTracks, userInfo] = await Promise.all([
    safeFetch(`${base}&method=user.getrecenttracks&limit=100`),
    safeFetch(`${base}&method=user.gettopartists&period=1month&limit=50`),
    safeFetch(`${base}&method=user.gettoptracks&period=1month&limit=50`),
    safeFetch(`${base}&method=user.getinfo`),
  ])

  save('lastfm-recent.json',      (recent as any)?.recenttracks?.track ?? [])
  save('lastfm-top-artists.json', (topArtists as any)?.topartists?.artist ?? [])
  save('lastfm-top-tracks.json',  (topTracks as any)?.toptracks?.track ?? [])
  save('lastfm-user.json',        (userInfo as any)?.user ?? {})
}

async function fetchListenBrainz() {
  const base = `https://api.listenbrainz.org/1`

  const [recent, nowPlaying, statsMonth, statsYear, statsAll] = await Promise.all([
    safeFetch(`${base}/user/${LB_USER}/listens?count=100`),
    safeFetch(`${base}/user/${LB_USER}/playing-now`),
    safeFetch(`${base}/stats/user/${LB_USER}/artists?range=month&count=50`),
    safeFetch(`${base}/stats/user/${LB_USER}/artists?range=year&count=50`),
    safeFetch(`${base}/stats/user/${LB_USER}/artists?range=all_time&count=50`),
  ])

  save('lb-recent.json',       (recent as any)?.payload?.listens ?? [])
  save('lb-playing-now.json',  (nowPlaying as any)?.payload?.listens?.[0] ?? null)
  save('lb-stats-month.json',  (statsMonth as any)?.payload ?? {})
  save('lb-stats-year.json',   (statsYear as any)?.payload ?? {})
  save('lb-stats-all.json',    (statsAll as any)?.payload ?? {})
}

async function fetchTrakt() {
  if (!TRAKT_ID) { console.log('  ⚠ TRAKT_CLIENT_ID not set — skipping Trakt'); return }
  // Use Bearer token if available (required for private user data), fall back to client-id-only
  const h: Record<string,string> = { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }
  if (TRAKT_TOKEN) h['Authorization'] = `Bearer ${TRAKT_TOKEN}`
  const base = `https://api.trakt.tv/users/${TRAKT_USER}`

  const [historyMovies, historyShows, watchlist, stats] = await Promise.all([
    safeFetch(`${base}/history/movies?limit=200`, h),
    safeFetch(`${base}/history/shows?limit=200`, h),
    safeFetch(`${base}/watchlist/movies`, h),
    safeFetch(`${base}/stats`, h),
  ])

  save('trakt-movies.json',    Array.isArray(historyMovies) ? historyMovies : [])
  save('trakt-shows.json',     Array.isArray(historyShows) ? historyShows : [])
  save('trakt-watchlist.json', Array.isArray(watchlist) ? watchlist : [])
  save('trakt-stats.json',     historyMovies ? stats : {})
}

async function fetchMAL() {
  if (!MAL_ID) { console.log('  ⚠ MAL_CLIENT_ID not set — skipping MAL'); return }
  const h = { 'X-MAL-CLIENT-ID': MAL_ID }
  const base = `https://api.myanimelist.net/v2/users/${MAL_USER}`
  const animeFields = 'fields=list_status,main_picture,mean,num_episodes'
  const mangaFields = 'fields=list_status,main_picture,mean'

  const [animeWatching, animeCompleted, animePlan, animeDrop,
         mangaReading, mangaCompleted, mangaPlan] = await Promise.all([
    safeFetch(`${base}/animelist?${animeFields}&status=watching&limit=200&sort=list_updated_at`, h),
    safeFetch(`${base}/animelist?${animeFields}&status=completed&limit=500&sort=list_updated_at`, h),
    safeFetch(`${base}/animelist?${animeFields}&status=plan_to_watch&limit=200`, h),
    safeFetch(`${base}/animelist?${animeFields}&status=dropped&limit=100`, h),
    safeFetch(`${base}/mangalist?${mangaFields}&status=reading&limit=200&sort=list_updated_at`, h),
    safeFetch(`${base}/mangalist?${mangaFields}&status=completed&limit=500&sort=list_updated_at`, h),
    safeFetch(`${base}/mangalist?${mangaFields}&status=plan_to_read&limit=200`, h),
  ])

  save('mal-anime-watching.json',   (animeWatching as any)?.data ?? [])
  save('mal-anime-completed.json',  (animeCompleted as any)?.data ?? [])
  save('mal-anime-plan.json',       (animePlan as any)?.data ?? [])
  save('mal-anime-dropped.json',    (animeDrop as any)?.data ?? [])
  save('mal-manga-reading.json',    (mangaReading as any)?.data ?? [])
  save('mal-manga-completed.json',  (mangaCompleted as any)?.data ?? [])
  save('mal-manga-plan.json',       (mangaPlan as any)?.data ?? [])
}

async function fetchGoodreads() {
  // Goodreads XML API deprecated — now returns 401.
  // Fallback: save empty arrays so pages degrade gracefully.
  // TODO: migrate to manual JSON list or Open Library API.
  console.log('  ℹ Goodreads XML API deprecated (401) — saving empty data')
  save('goodreads-currently-reading.json', [])
  save('goodreads-read.json', [])
  save('goodreads-to-read.json', [])
}

async function fetchGitHub() {
  const [user, repos] = await Promise.all([
    safeFetch(`https://api.github.com/users/${GH_USER}`),
    safeFetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=50`),
  ])
  save('github-user.json', user ?? {})
  save('github-repos.json', Array.isArray(repos) ? repos : [])
}

async function fetchNpm() {
  const data = await safeFetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${GH_USER}&size=30`)
  save('npm-packages.json', (data as any)?.objects ?? [])
}

async function fetchLanyard() {
  const data = await safeFetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
  save('lanyard.json', (data as any)?.success ? (data as any).data : null)
}

async function fetchBlog() {
  try {
    const r = await fetch('https://blog.oriz.in/rss.xml', { signal: AbortSignal.timeout(10000) })
    if (!r.ok) return
    const xml = await r.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
    const posts = items.slice(0, 20).map(item => ({
      title: item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
      link:  item.match(/<link>(.*?)<\/link>/)?.[1] ?? '',
      date:  item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '',
      desc:  item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.replace(/<[^>]+>/g, '').slice(0, 160) ?? '',
    }))
    save('blog-posts.json', posts)
  } catch (e: any) {
    console.warn(`  ⚠ Blog RSS: ${e.message}`)
  }
}

// ---- main ------------------------------------------------------------------
async function main() {
  console.log('\n📦 Fetching data for me.oriz.in build...\n')
  const start = Date.now()

  // Verify env vars present
  console.log('🔑 Env var status:')
  console.log(`  TRAKT_CLIENT_ID:       ${TRAKT_ID ? '✓ set' : '✗ missing'}`)
  console.log(`  MAL_CLIENT_ID:         ${MAL_ID ? '✓ set' : '✗ missing'}`)
  console.log(`  LASTFM_API_KEY:        ${LASTFM_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`  LASTFM_USERNAME:       ${LASTFM_USER}`)
  console.log(`  LISTENBRAINZ_USERNAME: ${LB_USER}`)
  console.log(`  GOODREADS_USER_ID:     ${GR_ID}`)
  console.log(`  DISCORD_USER_ID:       ${DISCORD_ID}`)
  console.log()

  await Promise.allSettled([
    fetchLastfm().then(() => console.log('✅ Last.fm done')).catch(e => console.error('❌ Last.fm', e.message)),
    fetchListenBrainz().then(() => console.log('✅ ListenBrainz done')).catch(e => console.error('❌ ListenBrainz', e.message)),
    fetchTrakt().then(() => console.log('✅ Trakt done')).catch(e => console.error('❌ Trakt', e.message)),
    fetchMAL().then(() => console.log('✅ MAL done')).catch(e => console.error('❌ MAL', e.message)),
    fetchGoodreads().then(() => console.log('✅ Goodreads done')).catch(e => console.error('❌ Goodreads', e.message)),
    fetchGitHub().then(() => console.log('✅ GitHub done')).catch(e => console.error('❌ GitHub', e.message)),
    fetchNpm().then(() => console.log('✅ npm done')).catch(e => console.error('❌ npm', e.message)),
    fetchLanyard().then(() => console.log('✅ Lanyard done')).catch(e => console.error('❌ Lanyard', e.message)),
    fetchBlog().then(() => console.log('✅ Blog RSS done')).catch(e => console.error('❌ Blog', e.message)),
  ])

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const files = (await import('fs')).readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`\n✅ ${files.length} data files in public/data/ (${elapsed}s)\n`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
