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
const BGG_USER    = process.env.BGG_USERNAME        ?? ''
const TOGGL_TOKEN  = process.env.TOGGL_API_TOKEN     ?? ''
const WAKA_KEY    = process.env.WAKATIME_API_KEY    ?? ''
const ANILIST_USER  = process.env.ANILIST_USERNAME   ?? 'chirag127'
const OL_USER       = process.env.OL_USERNAME        ?? 'chirag127'
const PI_KEY        = process.env.PODCASTINDEX_API_KEY    ?? ''
const PI_SECRET     = process.env.PODCASTINDEX_API_SECRET ?? ''
const IGDB_CLIENT_ID     = process.env.IGDB_CLIENT_ID     ?? ''
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET ?? ''
const NOTION_TOKEN  = process.env.NOTION_TOKEN            ?? ''
const NOTION_DB_ID  = process.env.NOTION_JOURNAL_DB_ID    ?? ''
const STEAM_KEY     = process.env.STEAM_API_KEY           ?? ''
const STEAM_ID      = process.env.STEAM_ID                ?? ''
const DEVTO_USER    = process.env.DEVTO_USERNAME          ?? 'chirag127'
const HN_USER       = process.env.HASHNODE_USERNAME       ?? 'chirag127'
const PH_TOKEN      = process.env.PRODUCTHUNT_TOKEN       ?? ''
const SPOTIFY_CLIENT_ID      = process.env.SPOTIFY_CLIENT_ID      ?? ''
const SPOTIFY_REFRESH_TOKEN  = process.env.SPOTIFY_REFRESH_TOKEN  ?? ''
const SPOTIFY_CLIENT_SECRET  = process.env.SPOTIFY_CLIENT_SECRET  ?? ''

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
  // Goodreads XML API deprecated since 2020. Use RSS shelf feed instead (still works).
  const url = `https://www.goodreads.com/review/list_rss/${GR_ID}?shelf=currently-reading`
  const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  try {
    const r = await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) })
    if (!r.ok) { console.warn(`    ⚠ Goodreads RSS HTTP ${r.status}`); save('goodreads-rss.json', []); return }
    const xml = await r.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
    const books = items.map(item => ({
      title:     item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '',
      link:      item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '',
      author:    item.match(/<author_name>([\s\S]*?)<\/author_name>/)?.[1]?.trim() ?? '',
      cover:     item.match(/<book_large_image_url>([\s\S]*?)<\/book_large_image_url>/)?.[1]?.trim() ?? item.match(/<book_image_url>([\s\S]*?)<\/book_image_url>/)?.[1]?.trim() ?? '',
      rating:    item.match(/<user_rating>([\s\S]*?)<\/user_rating>/)?.[1]?.trim() ?? '',
      pages:     item.match(/<num_pages>([\s\S]*?)<\/num_pages>/)?.[1]?.trim() ?? '',
      pubDate:   item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? '',
    }))
    save('goodreads-rss.json', books)
    // Keep stale compat files
    save('goodreads-currently-reading.json', books)
    save('goodreads-read.json', [])
    save('goodreads-to-read.json', [])
  } catch (e: any) {
    console.warn(`  ⚠ Goodreads RSS: ${e.message}`)
    save('goodreads-rss.json', [])
    save('goodreads-currently-reading.json', [])
    save('goodreads-read.json', [])
    save('goodreads-to-read.json', [])
  }
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

async function fetchBGG() {
  if (!BGG_USER) { console.log('  ⚠ BGG_USERNAME not set — skipping BGG'); return }

  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${BGG_USER}&own=1&stats=1`
  const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }

  // BGG returns 202 on first request — retry up to 5x with 3s delay
  let xml: string | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) })
      if (r.status === 202) { await new Promise(res => setTimeout(res, 3000)); continue }
      if (!r.ok) { console.warn(`    ⚠ BGG HTTP ${r.status}`); break }
      xml = await r.text(); break
    } catch (e: any) { console.warn(`    ⚠ BGG: ${e.message}`); break }
  }

  if (!xml) { save('bgg-collection.json', []); return }

  // Parse XML manually (avoid adding fast-xml-parser dep for now)
  const items: any[] = []
  const itemBlocks = xml.match(/<item[^>]*>[\s\S]*?<\/item>/g) ?? []
  for (const block of itemBlocks) {
    const id    = block.match(/objectid="(\d+)"/)?.[1] ?? ''
    const name  = block.match(/<name sortindex[^>]*>([\s\S]*?)<\/name>/)?.[1]?.trim() ?? ''
    const year  = block.match(/<yearpublished>([\s\S]*?)<\/yearpublished>/)?.[1]?.trim() ?? ''
    const image = block.match(/<image>([\s\S]*?)<\/image>/)?.[1]?.trim() ?? ''
    const thumb = block.match(/<thumbnail>([\s\S]*?)<\/thumbnail>/)?.[1]?.trim() ?? ''
    const minP  = block.match(/minplayers value="(\d+)"/)?.[1] ?? ''
    const maxP  = block.match(/maxplayers value="(\d+)"/)?.[1] ?? ''
    const avg   = block.match(/average value="([\d.]+)"/)?.[1] ?? ''
    const numPlays = block.match(/<numplays>([\s\S]*?)<\/numplays>/)?.[1]?.trim() ?? '0'
    if (name) items.push({ id, name, year, image: image.startsWith('//') ? 'https:'+image : image, thumb: thumb.startsWith('//') ? 'https:'+thumb : thumb, minPlayers: minP, maxPlayers: maxP, avgRating: avg, numPlays })
  }
  save('bgg-collection.json', items)
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
  const jikanUA: Record<string,string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  }
  const jikanBase = 'https://api.jikan.moe/v4'

  // MAL direct API as fallback (requires MAL_CLIENT_ID)
  const malH = MAL_ID ? { 'X-MAL-CLIENT-ID': MAL_ID, 'User-Agent': jikanUA['User-Agent'] } : null
  const malBase = `https://api.myanimelist.net/v2/users/${user}`
  const animeFields = 'fields=list_status,main_picture,mean,num_episodes,media_type'
  const mangaFields = 'fields=list_status,main_picture,mean,media_type'

  // Normalize MAL direct format to match Jikan format for pages
  const malToJikan = (items: any[], type: 'anime' | 'manga') =>
    items.map(item => ({
      entry: {
        mal_id: item.node?.id,
        title: item.node?.title ?? '',
        images: { jpg: { image_url: item.node?.main_picture?.medium ?? '', large_image_url: item.node?.main_picture?.large ?? '' } },
        type: item.node?.media_type ?? '',
        num_episodes: item.node?.num_episodes ?? 0,
      },
      score: item.list_status?.score ?? 0,
      status: item.list_status?.status ?? '',
      num_episodes_watched: item.list_status?.num_episodes_watched ?? 0,
      num_chapters_read: item.list_status?.num_chapters_read ?? 0,
    }))

  const fetchWithFallback = async (jikanUrl: string, malUrl: string | null, file: string) => {
    // Try Jikan first
    const jikanData = await safeFetch(jikanUrl, jikanUA)
    const jikanItems = (jikanData as any)?.data
    if (Array.isArray(jikanItems) && jikanItems.length > 0) {
      save(file, jikanItems); return
    }
    // Jikan miss — fall back to MAL direct
    if (malUrl && malH) {
      const malData = await safeFetch(malUrl, malH)
      const malItems = (malData as any)?.data ?? []
      const type = file.includes('manga') ? 'manga' : 'anime'
      save(file, malToJikan(malItems, type)); return
    }
    save(file, [])
  }

  const calls = [
    { jikan: `${jikanBase}/users/${user}/animelist?status=1`, mal: malH ? `${malBase}/animelist?${animeFields}&status=watching&limit=200&sort=list_updated_at` : null, file: 'jikan-anime-watching.json' },
    { jikan: `${jikanBase}/users/${user}/animelist?status=2`, mal: malH ? `${malBase}/animelist?${animeFields}&status=completed&limit=500&sort=list_updated_at` : null, file: 'jikan-anime-completed.json' },
    { jikan: `${jikanBase}/users/${user}/animelist?status=6`, mal: malH ? `${malBase}/animelist?${animeFields}&status=plan_to_watch&limit=200` : null, file: 'jikan-anime-plan.json' },
    { jikan: `${jikanBase}/users/${user}/mangalist?status=1`, mal: malH ? `${malBase}/mangalist?${mangaFields}&status=reading&limit=200&sort=list_updated_at` : null, file: 'jikan-manga-reading.json' },
    { jikan: `${jikanBase}/users/${user}/mangalist?status=2`, mal: malH ? `${malBase}/mangalist?${mangaFields}&status=completed&limit=500&sort=list_updated_at` : null, file: 'jikan-manga-completed.json' },
    { jikan: `${jikanBase}/users/${user}/mangalist?status=6`, mal: malH ? `${malBase}/mangalist?${mangaFields}&status=plan_to_read&limit=200` : null, file: 'jikan-manga-plan.json' },
  ]

  for (const { jikan, mal, file } of calls) {
    await fetchWithFallback(jikan, mal, file)
    await new Promise(r => setTimeout(r, 400))
  }
}

async function fetchAniList() {
  // API: https://graphql.anilist.co (POST, no auth for public queries)
  // User chirag127 confirmed: id 6510015, 4 anime, 211 episodes watched
  const base = 'https://graphql.anilist.co'

  const query = `
    query($name: String, $status: MediaListStatus) {
      MediaListCollection(userName: $name, type: ANIME, status: $status) {
        lists { entries {
          media { id title { romaji english } coverImage { medium large } episodes status }
          score progress status
        }}
      }
    }
  `
  const mangaQuery = `
    query($name: String, $status: MediaListStatus) {
      MediaListCollection(userName: $name, type: MANGA, status: $status) {
        lists { entries {
          media { id title { romaji english } coverImage { medium large } chapters }
          score progress status
        }}
      }
    }
  `
  const statsQuery = `
    query($name: String) {
      User(name: $name) {
        id name
        statistics {
          anime { count episodesWatched minutesWatched meanScore }
          manga { count chaptersRead volumesRead meanScore }
        }
        favourites {
          anime { nodes { id title { romaji } coverImage { medium } } }
        }
      }
    }
  `

  const post = async (q: string, vars: Record<string,unknown>) => {
    const r = await safePost(base, { 'Content-Type': 'application/json' }, { query: q, variables: vars })
    return (r as any)?.data
  }

  const [watching, completed, planning, mangaReading, mangaCompleted, mangaPlan, stats] = await Promise.all([
    post(query, { name: ANILIST_USER, status: 'CURRENT' }),
    post(query, { name: ANILIST_USER, status: 'COMPLETED' }),
    post(query, { name: ANILIST_USER, status: 'PLANNING' }),
    post(mangaQuery, { name: ANILIST_USER, status: 'CURRENT' }),
    post(mangaQuery, { name: ANILIST_USER, status: 'COMPLETED' }),
    post(mangaQuery, { name: ANILIST_USER, status: 'PLANNING' }),
    post(statsQuery, { name: ANILIST_USER }),
  ])

  const entries = (d: any) => d?.MediaListCollection?.lists?.flatMap((l: any) => l.entries) ?? []

  save('anilist-anime-watching.json',   entries(watching))
  save('anilist-anime-completed.json',  entries(completed))
  save('anilist-anime-plan.json',       entries(planning))
  save('anilist-manga-reading.json',    entries(mangaReading))
  save('anilist-manga-completed.json',  entries(mangaCompleted))
  save('anilist-manga-plan.json',       entries(mangaPlan))
  save('anilist-stats.json',            stats?.User ?? {})
}


async function fetchPodcasts() {
  if (!PI_KEY || !PI_SECRET) {
    console.log('  ⚠ PODCASTINDEX_API_KEY not set — skipping Podcast Index')
    const manual = loadStale('podcasts-manual.json') as any[] ?? []
    save('podcasts-enriched.json', manual)
    return
  }

  // HMAC-SHA1 auth
  const { createHmac } = await import('crypto')
  const now = Math.floor(Date.now() / 1000).toString()
  const hash = createHmac('sha1', PI_SECRET).update(PI_KEY + PI_SECRET + now).digest('hex')
  const h = {
    'X-Auth-Key':    PI_KEY,
    'X-Auth-Date':   now,
    'Authorization': `Podcastindex key="${PI_KEY}", name="chirag127", hash="${hash}"`,
    'User-Agent':    'me.oriz.in/1.0',
  }

  const manual: any[] = (loadStale('podcasts-manual.json') as any[] ?? [])
  const enriched = await Promise.all(manual.map(async (pod) => {
    if (!pod.feedUrl && !pod.title) return pod
    const query = pod.feedUrl
      ? `https://api.podcastindex.org/api/1.0/podcasts/byfeedurl?url=${encodeURIComponent(pod.feedUrl)}`
      : `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(pod.title)}&max=1`
    const data = await safeFetch(query, h)
    const feed = (data as any)?.feed ?? (data as any)?.feeds?.[0]
    if (!feed) return pod
    return { ...pod, title: feed.title, image: feed.image || feed.artwork, description: feed.description, episodeCount: feed.episodeCount, itunesId: feed.itunesId }
  }))

  save('podcasts-enriched.json', enriched)
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

async function fetchOpenLibrary() {
  const base = `https://openlibrary.org/people/${OL_USER}/books`
  const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' }

  const [read, reading, want] = await Promise.all([
    safeFetch(`${base}/already-read.json?limit=100`, h),
    safeFetch(`${base}/currently-reading.json?limit=100`, h),
    safeFetch(`${base}/want-to-read.json?limit=100`, h),
  ])

  const shape = (d: any) => (d?.reading_log_entries ?? []).map((e: any) => ({
    title:      e.work?.title ?? '',
    author:     e.work?.author_names?.[0] ?? '',
    year:       e.work?.first_publish_year ?? '',
    cover:      e.work?.cover_id ? `https://covers.openlibrary.org/b/id/${e.work.cover_id}-M.jpg` : '',
    key:        e.work?.key ?? '',
    loggedDate: e.logged_date ?? '',
  }))

  save('ol-read.json',    shape(read))
  save('ol-reading.json', shape(reading))
  save('ol-want.json',    shape(want))
}

async function fetchNotion() {
  const token = process.env.NOTION_TOKEN ?? NOTION_TOKEN
  const dbId  = process.env.NOTION_JOURNAL_DB_ID ?? NOTION_DB_ID
  if (!token || !dbId) { console.log('  ⚠ NOTION_TOKEN/DB not set — skipping Notion'); return }

  const data = await safePost(
    `https://api.notion.com/v1/databases/${dbId}/query`,
    { 'Authorization': `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
    { page_size: 50, sorts: [{ timestamp: 'created_time', direction: 'descending' }] }
  )

  const pages = (data as any)?.results ?? []
  const entries = pages.map((p: any) => {
    const props = p.properties ?? {}
    return {
      id:      p.id,
      date:    props.Date?.date?.start ?? props.Created?.created_time?.slice(0,10) ?? '',
      title:   props.Title?.title?.[0]?.plain_text ?? props.Name?.title?.[0]?.plain_text ?? '',
      mood:    props.Mood?.select?.name ?? '',
      energy:  props.Energy?.select?.name ?? '',
      tags:    (props.Tags?.multi_select ?? []).map((t: any) => t.name),
      notes:   (props.Notes?.rich_text ?? []).map((t: any) => t.plain_text).join(''),
      url:     p.url ?? '',
    }
  })

  save('notion-journal.json', entries)
  save('notion-stats.json', {
    total: entries.length,
    moods: entries.reduce((acc: any, e: any) => { if (e.mood) acc[e.mood] = (acc[e.mood]||0)+1; return acc }, {}),
    last_entry: entries[0]?.date ?? '',
  })
}


async function fetchIGDB() {
  const CLIENT_ID     = IGDB_CLIENT_ID
  const CLIENT_SECRET = IGDB_CLIENT_SECRET
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log('  ⚠ IGDB_CLIENT_ID not set — skipping IGDB enrichment')
    // Fall back: enrich games-manual.json with whatever we have
    const manual = (loadStale('games-manual.json') as any[]) ?? []
    save('games-enriched.json', manual)
    return
  }

  // 1. Get/refresh Twitch access token (cache in games-igdb-token.json)
  let token = ''
  const cached = loadStale('games-igdb-token.json') as any
  if (cached?.access_token && cached?.expires_at > Date.now()) {
    token = cached.access_token
  } else {
    const t = await safePost(
      `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
      {}, {}
    ) as any
    if (!t?.access_token) { console.warn('    ⚠ IGDB token exchange failed'); return }
    token = t.access_token
    save('games-igdb-token.json', { access_token: t.access_token, expires_at: Date.now() + (t.expires_in - 300) * 1000 })
  }

  const h = { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}` }

  // 2. Enrich games-manual.json with IGDB metadata
  const manual: any[] = (loadStale('games-manual.json') as any[]) ?? []
  const enriched = await Promise.all(manual.map(async (game) => {
    if (!game.title) return game
    const results = await safePost('https://api.igdb.com/v4/games', h,
      { query: `search "${game.title}"; fields name,cover.url,genres.name,rating,first_release_date,platforms.name; limit 1;` }
    ) as any[]
    const match = Array.isArray(results) ? results[0] : null
    if (!match) return game
    return {
      ...game,
      igdb_id:      match.id,
      cover:        match.cover?.url?.replace('t_thumb','t_cover_big').replace('//',  'https://') ?? '',
      genres:       (match.genres ?? []).map((g: any) => g.name),
      rating:       match.rating ? Math.round(match.rating) : null,
      release_year: match.first_release_date ? new Date(match.first_release_date * 1000).getFullYear() : null,
      platforms:    (match.platforms ?? []).map((p: any) => p.name),
    }
  }))

  save('games-enriched.json', enriched)

  // 3. Also fetch trending/popular games (catalog data, no user needed)
  const trending = await safePost('https://api.igdb.com/v4/games', h,
    { query: 'fields name,cover.url,genres.name,rating,first_release_date; sort rating_count desc; where rating_count > 1000 & rating > 80; limit 20;' }
  ) as any[]
  if (Array.isArray(trending)) {
    save('igdb-trending.json', trending.map(g => ({
      id: g.id, name: g.name,
      cover: g.cover?.url?.replace('t_thumb','t_cover_big').replace('//', 'https://') ?? '',
      rating: g.rating ? Math.round(g.rating) : null,
      year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
      genres: (g.genres ?? []).map((x: any) => x.name),
    })))
  }
}

async function fetchReddit() {
  const h = { 'User-Agent': 'me.oriz.in/1.0 (by /u/chirag127)' }
  const [profile, posts] = await Promise.all([
    safeFetch('https://www.reddit.com/user/chirag127/about.json', h),
    safeFetch('https://www.reddit.com/user/chirag127/submitted.json?limit=10', h),
  ])
  save('reddit-profile.json', (profile as any)?.data ?? {})
  save('reddit-posts.json',   ((posts as any)?.data?.children ?? []).map((c: any) => c.data))
}

async function fetchSteam() {
  if (!STEAM_KEY || !STEAM_ID) { console.log('  ⚠ STEAM_API_KEY/STEAM_ID not set — skipping Steam'); return }
  const data = await safeFetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_KEY}&steamids=${STEAM_ID}`)
  save('steam-profile.json', (data as any)?.response?.players?.[0] ?? {})
}

async function fetchDevTo() {
  const data = await safeFetch(`https://dev.to/api/articles?username=${DEVTO_USER}&per_page=10`)
  save('devto-articles.json', Array.isArray(data) ? data : [])
}

async function fetchHashnode() {
  const query = `{ user(username:"${HN_USER}") { posts(page:0,pageSize:10) { nodes { title brief url publishedAt } } } }`
  try {
    const r = await fetch('https://gql.hashnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'me.oriz.in/1.0' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) { console.warn(`    ⚠ Hashnode HTTP ${r.status}`); save('hashnode-articles.json', []); return }
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { console.warn(`    ⚠ Hashnode non-JSON response`); save('hashnode-articles.json', []); return }
    save('hashnode-articles.json', data?.data?.user?.posts?.nodes ?? [])
  } catch (e: any) {
    console.warn(`    ⚠ Hashnode: ${e.message}`)
    save('hashnode-articles.json', [])
  }
}

async function fetchProductHunt() {
  if (!PH_TOKEN) { console.log('  ⚠ PRODUCTHUNT_TOKEN not set — skipping ProductHunt'); return }
  const query = `{ user(username:"chirag127") { madePosts(first:10) { edges { node { name tagline url votesCount createdAt thumbnail { url } } } } } }`
  const data = await safePost('https://api.producthunt.com/v2/api/graphql', { Authorization: `Bearer ${PH_TOKEN}` }, { query })
  const products = ((data as any)?.data?.user?.madePosts?.edges ?? []).map((e: any) => e.node)
  save('producthunt-products.json', products)
}

async function fetchSpotify() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REFRESH_TOKEN) { console.log('  ⚠ SPOTIFY_CLIENT_ID/SPOTIFY_REFRESH_TOKEN not set — skipping Spotify'); return }

  // Refresh access token
  const secret = SPOTIFY_CLIENT_SECRET
  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${secret}`).toString('base64')
  let accessToken = ''
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(SPOTIFY_REFRESH_TOKEN)}`,
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) { console.warn(`    ⚠ Spotify token refresh HTTP ${r.status}`); return }
    const t = await r.json() as any
    accessToken = t.access_token
  } catch (e: any) { console.warn(`    ⚠ Spotify token refresh: ${e.message}`); return }

  const h = { Authorization: `Bearer ${accessToken}` }
  const [artists, tracks] = await Promise.all([
    safeFetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term', h),
    safeFetch('https://api.spotify.com/v1/me/top/tracks?limit=10', h),
  ])
  save('spotify-top-artists.json', (artists as any)?.items ?? [])
  save('spotify-top-tracks.json',  (tracks as any)?.items ?? [])
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
  console.log(`  BGG_USERNAME:          ${BGG_USER || '✗ missing'}`)
  console.log(`  TOGGL_API_TOKEN:       ${TOGGL_TOKEN ? '✓ set' : '✗ missing'}`)
  console.log(`  ANILIST_USERNAME:      ${ANILIST_USER}`)
  console.log(`  OL_USERNAME:           ${OL_USER}`)
  console.log(`  PODCASTINDEX_API_KEY:  ${PI_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`  NOTION_TOKEN:          ${NOTION_TOKEN ? '✓ set' : '✗ missing'}`)
  console.log(`  NOTION_JOURNAL_DB_ID:  ${NOTION_DB_ID ? '✓ set' : '✗ missing'}`)
  console.log(`  IGDB_CLIENT_ID:        ${IGDB_CLIENT_ID ? '✓ set' : '✗ missing'}`)
  console.log(`  STEAM_API_KEY:         ${STEAM_KEY ? '✓ set' : '✗ missing'}`)
  console.log(`  STEAM_ID:              ${STEAM_ID || '✗ missing'}`)
  console.log(`  DEVTO_USERNAME:        ${DEVTO_USER}`)
  console.log(`  HASHNODE_USERNAME:     ${HN_USER}`)
  console.log(`  PRODUCTHUNT_TOKEN:     ${PH_TOKEN ? '✓ set' : '✗ missing'}`)
  console.log(`  SPOTIFY_CLIENT_ID:     ${SPOTIFY_CLIENT_ID ? '✓ set' : '✗ missing'}`)
  console.log(`  SPOTIFY_REFRESH_TOKEN: ${SPOTIFY_REFRESH_TOKEN ? '✓ set' : '✗ missing'}`)
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
    fetchBGG().then(() => console.log('✅ BGG done')).catch(e => console.error('❌ BGG', e.message)),
    fetchToggl().then(() => console.log('✅ Toggl done')).catch(e => console.error('❌ Toggl', e.message)),
    fetchJikan().then(() => console.log('✅ Jikan done')).catch(e => console.error('❌ Jikan', e.message)),
    fetchAniList().then(() => console.log('✅ AniList done')).catch(e => console.error('❌ AniList', e.message)),
    fetchPodcasts().then(() => console.log('✅ Podcast Index done')).catch(e => console.error('❌ Podcast Index', e.message)),
    fetchOpenLibrary().then(() => console.log('✅ OpenLibrary done')).catch(e => console.error('❌ OpenLibrary', e.message)),
    fetchNotion().then(() => console.log('✅ Notion done')).catch(e => console.error('❌ Notion', e.message)),
    fetchIGDB().then(() => console.log('✅ IGDB done')).catch(e => console.error('❌ IGDB', e.message)),
    fetchReddit().then(() => console.log('✅ Reddit done')).catch(e => console.error('❌ Reddit', e.message)),
    fetchSteam().then(() => console.log('✅ Steam done')).catch(e => console.error('❌ Steam', e.message)),
    fetchDevTo().then(() => console.log('✅ Dev.to done')).catch(e => console.error('❌ Dev.to', e.message)),
    fetchHashnode().then(() => console.log('✅ Hashnode done')).catch(e => console.error('❌ Hashnode', e.message)),
    fetchProductHunt().then(() => console.log('✅ ProductHunt done')).catch(e => console.error('❌ ProductHunt', e.message)),
    fetchSpotify().then(() => console.log('✅ Spotify done')).catch(e => console.error('❌ Spotify', e.message)),
  ])
  // Trakt first, then TMDB (enrichment reads trakt-*.json)
  await fetchTrakt().then(() => console.log('✅ Trakt done')).catch(e => console.error('❌ Trakt', e.message))
  await fetchTMDB().then(() => console.log('✅ TMDB done')).catch(e => console.error('❌ TMDB', e.message))

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const files = (await import('fs')).readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`\n✅ ${files.length} data files in public/data/ (${elapsed}s)\n`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
