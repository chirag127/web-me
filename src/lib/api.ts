const TRAKT_ID    = import.meta.env.TRAKT_CLIENT_ID    ?? ''
const TRAKT_USER  = import.meta.env.TRAKT_USERNAME     ?? 'chirag127'
const MAL_ID      = import.meta.env.MAL_CLIENT_ID      ?? ''
const MAL_USER    = import.meta.env.MAL_USERNAME        ?? 'chirag127'
const LASTFM_KEY  = import.meta.env.LASTFM_API_KEY     ?? ''
const LASTFM_USER = import.meta.env.LASTFM_USERNAME    ?? 'lastfmwhy'
const LB_USER     = import.meta.env.LISTENBRAINZ_USERNAME ?? 'chirag127'
const GR_ID       = import.meta.env.GOODREADS_USER_ID  ?? '132482257'
const DISCORD_ID  = import.meta.env.DISCORD_USER_ID    ?? '799956529847205898'
const GH_USER     = 'chirag127'

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch { return fallback }
}

export async function getLanyard() {
  return safe(async () => {
    const r = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
    if (!r.ok) return null
    const d = await r.json()
    return d.success ? d.data : null
  }, null)
}

export async function getTraktMovies(limit = 40) {
  return safe(async () => {
    if (!TRAKT_ID) return []
    const r = await fetch(`https://api.trakt.tv/users/${TRAKT_USER}/history/movies?limit=${limit}`, {
      headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }
    })
    return r.ok ? r.json() : []
  }, [])
}

export async function getTraktShows(limit = 40) {
  return safe(async () => {
    if (!TRAKT_ID) return []
    const r = await fetch(`https://api.trakt.tv/users/${TRAKT_USER}/history/shows?limit=${limit}`, {
      headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }
    })
    return r.ok ? r.json() : []
  }, [])
}

export async function getTraktStats() {
  return safe(async () => {
    if (!TRAKT_ID) return {}
    const r = await fetch(`https://api.trakt.tv/users/${TRAKT_USER}/stats`, {
      headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }
    })
    return r.ok ? r.json() : {}
  }, {})
}

export async function getTraktWatchlist(limit = 100) {
  return safe(async () => {
    if (!TRAKT_ID) return []
    const r = await fetch(`https://api.trakt.tv/users/${TRAKT_USER}/watchlist/movies?limit=${limit}`, {
      headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }
    })
    return r.ok ? r.json() : []
  }, [])
}

export async function getMALAnime(status = 'watching', limit = 30) {
  return safe(async () => {
    if (!MAL_ID) return []
    const r = await fetch(`https://api.myanimelist.net/v2/users/${MAL_USER}/animelist?fields=list_status,main_picture,mean,num_episodes&status=${status}&limit=${limit}&sort=list_updated_at`, {
      headers: { 'X-MAL-CLIENT-ID': MAL_ID }
    })
    if (!r.ok) return []
    const d = await r.json()
    return d.data ?? []
  }, [])
}

export async function getMALManga(status = 'reading', limit = 30) {
  return safe(async () => {
    if (!MAL_ID) return []
    const r = await fetch(`https://api.myanimelist.net/v2/users/${MAL_USER}/mangalist?fields=list_status,main_picture,mean&status=${status}&limit=${limit}&sort=list_updated_at`, {
      headers: { 'X-MAL-CLIENT-ID': MAL_ID }
    })
    if (!r.ok) return []
    const d = await r.json()
    return d.data ?? []
  }, [])
}

export async function getLastfmRecent(limit = 10) {
  return safe(async () => {
    if (!LASTFM_KEY) return []
    const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json&limit=${limit}`)
    if (!r.ok) return []
    const d = await r.json()
    return d.recenttracks?.track ?? []
  }, [])
}

export async function getLastfmTopArtists(period = '1month', limit = 12) {
  return safe(async () => {
    if (!LASTFM_KEY) return []
    const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json&period=${period}&limit=${limit}`)
    if (!r.ok) return []
    const d = await r.json()
    return d.topartists?.artist ?? []
  }, [])
}

export async function getLastfmTopTracks(period = '1month', limit = 12) {
  return safe(async () => {
    if (!LASTFM_KEY) return []
    const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json&period=${period}&limit=${limit}`)
    if (!r.ok) return []
    const d = await r.json()
    return d.toptracks?.track ?? []
  }, [])
}

export async function getLastfmUserInfo() {
  return safe(async () => {
    if (!LASTFM_KEY) return {}
    const r = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json`)
    if (!r.ok) return {}
    const d = await r.json()
    return d.user ?? {}
  }, {})
}

export async function getGoodreadsShelf(shelf = 'currently-reading') {
  // Goodreads XML API deprecated (401). Use Hardcover instead.
  return []
}

export async function getHardcoverBooks(status: 'reading' | 'read' | 'want' | 'dnf' = 'reading') {
  try {
    const r = await fetch(`/data/hardcover-${status}.json`)
    if (!r.ok) return []
    return r.json()
  } catch { return [] }
}

export async function getGitHubStats() {
  return safe(async () => {
    const r = await fetch(`https://api.github.com/users/${GH_USER}`)
    if (!r.ok) return {}
    return r.json()
  }, {})
}

export async function getGitHubRepos(limit = 20) {
  return safe(async () => {
    const r = await fetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=${limit}`)
    if (!r.ok) return []
    return r.json()
  }, [])
}

export async function getNpmPackages() {
  return safe(async () => {
    const r = await fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${GH_USER}&size=20`)
    if (!r.ok) return []
    const d = await r.json()
    return d.objects ?? []
  }, [])
}

export async function getBlogPosts() {
  return safe(async () => {
    const r = await fetch('https://blog.oriz.in/rss.xml')
    if (!r.ok) return []
    const xml = await r.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
    return items.slice(0, 10).map(item => ({
      title: item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? item.match(/<title>(.*?)<\/title>/)?.[1] ?? '',
      link:  item.match(/<link>(.*?)<\/link>/)?.[1] ?? '',
      date:  item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '',
      desc:  item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.slice(0, 120) ?? '',
    }))
  }, [])
}

// ---- ListenBrainz (free, no key needed) ----

export async function getLBRecentTracks(count = 10) {
  return safe(async () => {
    const r = await fetch(`https://api.listenbrainz.org/1/user/${LB_USER}/listens?count=${count}`)
    if (!r.ok) return []
    const d = await r.json()
    return (d.payload?.listens ?? []).map((l: any) => ({
      track:     l.track_metadata?.track_name ?? '',
      artist:    l.track_metadata?.artist_name ?? '',
      release:   l.track_metadata?.release_name ?? '',
      ts:        l.listened_at,
      mbid:      l.track_metadata?.additional_info?.recording_mbid ?? '',
    }))
  }, [])
}

export async function getLBListeningNow() {
  return safe(async () => {
    const r = await fetch(`https://api.listenbrainz.org/1/user/${LB_USER}/playing-now`)
    if (!r.ok) return null
    const d = await r.json()
    const listen = d.payload?.listens?.[0]
    if (!listen) return null
    return {
      track:   listen.track_metadata?.track_name ?? '',
      artist:  listen.track_metadata?.artist_name ?? '',
      release: listen.track_metadata?.release_name ?? '',
    }
  }, null)
}

export async function getLBStats(range: 'week' | 'month' | 'year' | 'all_time' = 'month') {
  return safe(async () => {
    const [artists, recordings] = await Promise.all([
      fetch(`https://api.listenbrainz.org/1/stats/user/${LB_USER}/artists?range=${range}&count=10`).then(r => r.ok ? r.json() : {}),
      fetch(`https://api.listenbrainz.org/1/stats/user/${LB_USER}/recordings?range=${range}&count=10`).then(r => r.ok ? r.json() : {}),
    ])
    return {
      topArtists:   artists.payload?.artists ?? [],
      topTracks:    recordings.payload?.recordings ?? [],
      totalCount:   artists.payload?.total_artist_count ?? 0,
    }
  }, { topArtists: [], topTracks: [], totalCount: 0 })
}
