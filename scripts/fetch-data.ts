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

// Load .env from workspace root (two levels up: me-site → webs → repos → ws)
// Walks up until it finds a .env or hits the root
;(function loadDotEnv() {
  let dir = join(__dirname, '..')
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, '.env')
    if (existsSync(candidate)) {
      const lines = readFileSync(candidate, 'utf-8').split('\n')
      for (const line of lines) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
      break
    }
    dir = join(dir, '..')
  }
})()

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
const HC_TOKEN    = process.env.HARDCOVER_TOKEN    ?? ''
const HC_USER     = process.env.HARDCOVER_USERNAME ?? 'chirag127'
const GH_USER     = process.env.GH_USERNAME        ?? 'chirag127'
const TMDB_TOKEN  = process.env.TMDB_READ_ACCESS_TOKEN ?? ''  // Bearer read-access token
const HAB_USER    = process.env.HABITICA_USER_ID    ?? ''
const HAB_TOKEN   = process.env.HABITICA_API_TOKEN  ?? ''
const TOGGL_TOKEN  = process.env.TOGGL_API_TOKEN     ?? ''
const WAKA_KEY    = process.env.WAKATIME_API_KEY    ?? ''

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

async function safePost(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) { console.warn(`    ⚠ HTTP ${r.status}: ${url}`) ; return null }
    return r.json()
  } catch (e: any) {
    console.warn(`    ⚠ Post failed: ${url} — ${e.message}`)
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
  // Client-id only — profile is public so no Bearer needed.
  // User-Agent required: Cloudflare blocks Node's default undici UA with 403.
  const h: Record<string,string> = {
    'trakt-api-version': '2',
    'trakt-api-key': TRAKT_ID,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  }
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
  save('trakt-stats.json',     stats ?? {})
}

// TMDB base image URL
const TMDB_IMG = 'https://image.tmdb.org/t/p'

async function fetchTMDB() {
  // API: https://api.themoviedb.org/3
  // Docs: https://developer.themoviedb.org/reference/intro/getting-started
  // Fetches: trending movies + TV, popular movies + TV, now playing, on the air
  // Also enriches trakt-movies/shows with poster/backdrop/overview if Trakt data exists
  if (!TMDB_TOKEN) { console.log('  ⚠ TMDB_READ_ACCESS_TOKEN not set — skipping TMDB'); return }

  const h = { Authorization: `Bearer ${TMDB_TOKEN}` }
  const base = 'https://api.themoviedb.org/3'

  // Fetch trending + popular + now playing in parallel
  const [
    trendingMovies, trendingTV,
    popularMovies, popularTV,
    nowPlaying, onTheAir,
    topRatedMovies, topRatedTV,
  ] = await Promise.all([
    safeFetch(`${base}/trending/movie/week?language=en-US`, h),
    safeFetch(`${base}/trending/tv/week?language=en-US`, h),
    safeFetch(`${base}/movie/popular?language=en-US&page=1`, h),
    safeFetch(`${base}/tv/popular?language=en-US&page=1`, h),
    safeFetch(`${base}/movie/now_playing?language=en-US&page=1`, h),
    safeFetch(`${base}/tv/on_the_air?language=en-US&page=1`, h),
    safeFetch(`${base}/movie/top_rated?language=en-US&page=1`, h),
    safeFetch(`${base}/tv/top_rated?language=en-US&page=1`, h),
  ])

  const shape = (item: any, type: 'movie' | 'tv') => ({
    id:        item.id,
    tmdb_id:   item.id,
    type,
    title:     item.title ?? item.name ?? '',
    overview:  item.overview ?? '',
    poster:    item.poster_path    ? `${TMDB_IMG}/w342${item.poster_path}` : '',
    backdrop:  item.backdrop_path  ? `${TMDB_IMG}/w780${item.backdrop_path}` : '',
    rating:    item.vote_average ?? 0,
    votes:     item.vote_count ?? 0,
    release:   item.release_date ?? item.first_air_date ?? '',
    genres:    item.genre_ids ?? [],
    popularity: item.popularity ?? 0,
  })

  save('tmdb-trending-movies.json',  ((trendingMovies as any)?.results ?? []).map((i: any) => shape(i, 'movie')))
  save('tmdb-trending-tv.json',      ((trendingTV as any)?.results ?? []).map((i: any) => shape(i, 'tv')))
  save('tmdb-popular-movies.json',   ((popularMovies as any)?.results ?? []).map((i: any) => shape(i, 'movie')))
  save('tmdb-popular-tv.json',       ((popularTV as any)?.results ?? []).map((i: any) => shape(i, 'tv')))
  save('tmdb-now-playing.json',      ((nowPlaying as any)?.results ?? []).map((i: any) => shape(i, 'movie')))
  save('tmdb-on-the-air.json',       ((onTheAir as any)?.results ?? []).map((i: any) => shape(i, 'tv')))
  save('tmdb-top-rated-movies.json', ((topRatedMovies as any)?.results ?? []).map((i: any) => shape(i, 'movie')))
  save('tmdb-top-rated-tv.json',     ((topRatedTV as any)?.results ?? []).map((i: any) => shape(i, 'tv')))

  // Enrich trakt history with TMDB poster/backdrop/overview
  // Trakt returns ids.tmdb on each item — batch lookup the ones we have
  await enrichTraktWithTMDB(h, base)
}

async function enrichTraktWithTMDB(h: Record<string,string>, base: string) {
  for (const [traktFile, tmdbType, enrichedFile] of [
    ['trakt-movies.json',   'movie', 'trakt-movies-enriched.json'],
    ['trakt-shows.json',    'tv',    'trakt-shows-enriched.json'],
    ['trakt-watchlist.json','movie', 'trakt-watchlist-enriched.json'],
  ] as const) {
    const items: any[] = (loadStale(traktFile) as any[]) ?? []
    if (!items.length) { save(enrichedFile, []); continue }

    // Deduplicate by tmdb id — Trakt history repeats items for multiple watches
    const seen = new Set<number>()
    const unique = items.filter(i => {
      const id = i.movie?.ids?.tmdb ?? i.show?.ids?.tmdb
      if (!id || seen.has(id)) return false
      seen.add(id); return true
    }).slice(0, 50) // cap at 50 to stay within rate limits

    // Fetch TMDB details in parallel batches of 10
    const enriched: any[] = []
    for (let i = 0; i < unique.length; i += 10) {
      const batch = unique.slice(i, i + 10)
      const details = await Promise.all(batch.map(item => {
        const media = item.movie ?? item.show
        const tmdbId = media?.ids?.tmdb
        if (!tmdbId) return Promise.resolve(null)
        return safeFetch(`${base}/${tmdbType}/${tmdbId}?language=en-US&append_to_response=credits`, h)
      }))
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j]
        const d = details[j] as any
        const media = item.movie ?? item.show
        enriched.push({
          ...item,
          _tmdb: d ? {
            poster:    d.poster_path   ? `${TMDB_IMG}/w342${d.poster_path}` : '',
            backdrop:  d.backdrop_path ? `${TMDB_IMG}/w780${d.backdrop_path}` : '',
            overview:  d.overview ?? '',
            rating:    d.vote_average ?? 0,
            votes:     d.vote_count ?? 0,
            runtime:   d.runtime ?? d.episode_run_time?.[0] ?? 0,
            genres:    (d.genres ?? []).map((g: any) => g.name),
            cast:      (d.credits?.cast ?? []).slice(0, 5).map((c: any) => ({ name: c.name, character: c.character, photo: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : '' })),
            tagline:   d.tagline ?? '',
            status:    d.status ?? '',
            homepage:  d.homepage ?? '',
          } : null,
        })
      }
    }
    save(enrichedFile, enriched)
  }
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
  // Replaced by Hardcover (Goodreads XML API deprecated since 2020, returns 401)
  console.log('  ℹ Goodreads deprecated — use Hardcover instead')
  save('goodreads-currently-reading.json', [])
  save('goodreads-read.json', [])
  save('goodreads-to-read.json', [])
}

async function fetchHardcover() {
  // API: https://api.hardcover.app/v1/graphql
  // GraphQL — status_id: 1=want-to-read, 2=currently-reading, 3=read, 4=did-not-finish
  if (!HC_TOKEN) { console.log('  ⚠ HARDCOVER_TOKEN not set — skipping Hardcover'); return }

  const query = `query {
    me {
      user_books(limit: 500, order_by: {updated_at: desc}) {
        status_id
        rating
        updated_at
        book {
          title
          slug
          image { url }
          isbn_13
          contributions(limit: 1) { author { name } }
        }
      }
    }
  }`

  const result = await safePost(
    'https://api.hardcover.app/v1/graphql',
    { authorization: `Bearer ${HC_TOKEN}` },
    { query }
  )

  const books: any[] = (result as any)?.data?.me?.[0]?.user_books ?? []

  const shape = (b: any) => {
    const cover = b.book?.image?.url
      || (b.book?.isbn_13 ? `https://covers.openlibrary.org/b/isbn/${b.book.isbn_13}-M.jpg` : '')
    return {
      title:   b.book?.title ?? '',
      slug:    b.book?.slug ?? '',
      cover,
      author:  b.book?.contributions?.[0]?.author?.name ?? '',
      rating:  b.rating,
      updated: b.updated_at,
    }
  }

  save('hardcover-reading.json',  books.filter(b => b.status_id === 2).map(shape))
  save('hardcover-read.json',     books.filter(b => b.status_id === 3).map(shape))
  save('hardcover-want.json',     books.filter(b => b.status_id === 1).map(shape))
  save('hardcover-dnf.json',      books.filter(b => b.status_id === 4).map(shape))
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

async function fetchHabitica() {
  if (!HAB_USER || !HAB_TOKEN) { console.log('  ⚠ HABITICA_USER_ID or HABITICA_API_TOKEN not set — skipping Habitica'); return }
  const h: Record<string,string> = {
    'x-api-user': HAB_USER,
    'x-api-key': HAB_TOKEN,
    'x-client': `${HAB_USER}-me.oriz.in`,
  }
  const base = 'https://habitica.com/api/v3'

  const [user, habits, dailies, todos] = await Promise.all([
    safeFetch(`${base}/user`, h),
    safeFetch(`${base}/tasks/user?type=habits`, h),
    safeFetch(`${base}/tasks/user?type=dailys`, h),
    safeFetch(`${base}/tasks/user?type=todos`, h),
  ])

  save('habitica-user.json',    (user as any)?.data ?? {})
  save('habitica-habits.json',  (habits as any)?.data ?? [])
  save('habitica-dailies.json', (dailies as any)?.data ?? [])
  save('habitica-todos.json',   (todos as any)?.data ?? [])
}

async function fetchToggl() {
  if (!TOGGL_TOKEN) { console.log('  ⚠ TOGGL_API_TOKEN not set — skipping Toggl'); return }
  const auth = Buffer.from(`${TOGGL_TOKEN}:api_token`).toString('base64')
  const h: Record<string,string> = { Authorization: `Basic ${auth}` }

  const me = await safeFetch('https://api.track.toggl.com/api/v9/me', h)
  if (!me) return

  const workspaceId = (me as any).default_workspace_id
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [recent, summary] = await Promise.all([
    safeFetch(`https://api.track.toggl.com/api/v9/me/time_entries?start_date=${thirtyDaysAgo}`, h),
    safePost(
      `https://api.track.toggl.com/reports/api/v3/workspace/${workspaceId}/summary/time_entries`,
      h,
      { start_date: thirtyDaysAgo, end_date: today }
    ),
  ])

  save('toggl-recent.json',  Array.isArray(recent) ? recent : [])
  save('toggl-summary.json', summary ?? {})
}

async function fetchJikan() {
  const user = process.env.MAL_USERNAME ?? 'chirag127'
  const h: Record<string,string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  }
  const base = 'https://api.jikan.moe/v4'

  // Jikan rate limit: 3 req/s — sequential with 400ms gap
  const calls: Array<{ url: string; file: string }> = [
    { url: `${base}/users/${user}/animelist?status=1`, file: 'jikan-anime-watching.json' },
    { url: `${base}/users/${user}/animelist?status=2`, file: 'jikan-anime-completed.json' },
    { url: `${base}/users/${user}/animelist?status=6`, file: 'jikan-anime-plan.json' },
    { url: `${base}/users/${user}/mangalist?status=1`, file: 'jikan-manga-reading.json' },
    { url: `${base}/users/${user}/mangalist?status=2`, file: 'jikan-manga-completed.json' },
    { url: `${base}/users/${user}/mangalist?status=6`, file: 'jikan-manga-plan.json' },
  ]

  for (const { url, file } of calls) {
    const data = await safeFetch(url, h)
    save(file, (data as any)?.data ?? [])
    await new Promise(r => setTimeout(r, 400))
  }
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

async function fetchWakaTime() {
  // API: https://wakatime.com/api/v1
  // Docs: https://wakatime.com/developers
  // Auth: Basic auth with base64(api_key) — static token, no OAuth
  if (!WAKA_KEY) { console.log('  ⚠ WAKATIME_API_KEY not set — skipping WakaTime'); return }
  const auth = Buffer.from(WAKA_KEY).toString('base64')
  const h = { Authorization: `Basic ${auth}` }
  const base = 'https://wakatime.com/api/v1'

  const [stats7d, statsAllTime, langs, editors, projects] = await Promise.all([
    safeFetch(`${base}/users/current/stats/last_7_days`, h),
    safeFetch(`${base}/users/current/stats/all_time`, h),
    safeFetch(`${base}/users/current/stats/last_30_days`, h),
    safeFetch(`${base}/users/current/all_time_since_today`, h),
    safeFetch(`${base}/users/current/projects?order=total_seconds_desc`, h),
  ])

  const shape7d  = (stats7d as any)?.data ?? {}
  const shapeAll = (statsAllTime as any)?.data ?? {}
  const shape30  = (langs as any)?.data ?? {}

  save('wakatime-stats-7d.json', {
    total_seconds:     shape7d.total_seconds ?? 0,
    human_readable:    shape7d.human_readable_total ?? '',
    daily_average:     shape7d.human_readable_daily_average ?? '',
    languages:         (shape7d.languages ?? []).slice(0, 10),
    editors:           (shape7d.editors ?? []).slice(0, 5),
    projects:          (shape7d.projects ?? []).slice(0, 10),
    operating_systems: (shape7d.operating_systems ?? []).slice(0, 5),
    categories:        (shape7d.categories ?? []).slice(0, 5),
  })
  save('wakatime-stats-30d.json', {
    total_seconds:  shape30.total_seconds ?? 0,
    human_readable: shape30.human_readable_total ?? '',
    languages:      (shape30.languages ?? []).slice(0, 15),
    editors:        (shape30.editors ?? []).slice(0, 5),
    projects:       (shape30.projects ?? []).slice(0, 15),
  })
  save('wakatime-all-time.json', {
    total_seconds:  (editors as any)?.data?.total_seconds ?? shapeAll.total_seconds ?? 0,
    human_readable: (editors as any)?.data?.text ?? shapeAll.human_readable_total ?? '',
    is_up_to_date:  (editors as any)?.data?.is_up_to_date ?? false,
  })
  save('wakatime-projects.json', Array.isArray((projects as any)?.data) ? (projects as any).data.slice(0, 30) : [])
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
  console.log(`  HARDCOVER_TOKEN:       ${HC_TOKEN ? '✓ set' : '✗ missing'}`)
  console.log(`  TMDB_READ_ACCESS_TOKEN:${TMDB_TOKEN ? '✓ set' : '✗ missing'}`)
  console.log(`  WAKATIME_API_KEY:      ${WAKA_KEY  ? '✓ set' : '✗ missing'}`)
  console.log(`  DISCORD_USER_ID:       ${DISCORD_ID}`)
  console.log(`  HABITICA_USER_ID:      ${HAB_USER ? '✓ set' : '✗ missing'}`)
  console.log(`  HABITICA_API_TOKEN:    ${HAB_TOKEN ? '✓ set' : '✗ missing'}`)
  console.log(`  TOGGL_API_TOKEN:       ${TOGGL_TOKEN ? '✓ set' : '✗ missing'}`)
  console.log()

  // Trakt must complete before TMDB enrichment reads its output files
  await Promise.allSettled([
    fetchLastfm().then(() => console.log('✅ Last.fm done')).catch(e => console.error('❌ Last.fm', e.message)),
    fetchListenBrainz().then(() => console.log('✅ ListenBrainz done')).catch(e => console.error('❌ ListenBrainz', e.message)),
    fetchMAL().then(() => console.log('✅ MAL done')).catch(e => console.error('❌ MAL', e.message)),
    fetchHardcover().then(() => console.log('✅ Hardcover done')).catch(e => console.error('❌ Hardcover', e.message)),
    fetchGitHub().then(() => console.log('✅ GitHub done')).catch(e => console.error('❌ GitHub', e.message)),
    fetchNpm().then(() => console.log('✅ npm done')).catch(e => console.error('❌ npm', e.message)),
    fetchLanyard().then(() => console.log('✅ Lanyard done')).catch(e => console.error('❌ Lanyard', e.message)),
    fetchBlog().then(() => console.log('✅ Blog RSS done')).catch(e => console.error('❌ Blog', e.message)),
    fetchWakaTime().then(() => console.log('✅ WakaTime done')).catch(e => console.error('❌ WakaTime', e.message)),
    fetchHabitica().then(() => console.log('✅ Habitica done')).catch(e => console.error('❌ Habitica', e.message)),
    fetchToggl().then(() => console.log('✅ Toggl done')).catch(e => console.error('❌ Toggl', e.message)),
    fetchJikan().then(() => console.log('✅ Jikan done')).catch(e => console.error('❌ Jikan', e.message)),
  ])
  // Trakt first, then TMDB (enrichment reads trakt-*.json)
  await fetchTrakt().then(() => console.log('✅ Trakt done')).catch(e => console.error('❌ Trakt', e.message))
  await fetchTMDB().then(() => console.log('✅ TMDB done')).catch(e => console.error('❌ TMDB', e.message))

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const files = (await import('fs')).readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`\n✅ ${files.length} data files in public/data/ (${elapsed}s)\n`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
