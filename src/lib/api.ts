const TRAKT_ID    = import.meta.env.TRAKT_CLIENT_ID    ?? ''
const TRAKT_USER  = import.meta.env.TRAKT_USERNAME     ?? 'chirag127'
const MAL_ID      = import.meta.env.MAL_CLIENT_ID      ?? ''
const MAL_USER    = import.meta.env.MAL_USERNAME        ?? 'chirag127'
const LASTFM_KEY  = import.meta.env.LASTFM_API_KEY     ?? ''
const LASTFM_USER = import.meta.env.LASTFM_USERNAME    ?? 'lastfmwhy'
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
  return safe(async () => {
    const r = await fetch(`https://www.goodreads.com/review/list/${GR_ID}.xml?shelf=${shelf}&sort=date_updated&per_page=10`)
    if (!r.ok) return []
    const xml = await r.text()
    const books: any[] = []
    const items = xml.match(/<review>[\s\S]*?<\/review>/g) ?? []
    for (const item of items.slice(0, 10)) {
      const title  = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? ''
      const author = item.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)?.[1] ?? ''
      const cover  = item.match(/<image_url>(.*?)<\/image_url>/)?.[1] ?? ''
      const link   = item.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/)?.[1] ?? ''
      const rating = item.match(/<rating>(\d)<\/rating>/)?.[1]
      if (title) books.push({ title, author, cover, shelf, rating, link })
    }
    return books
  }, [])
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
      desc:  item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]?.slice(0,120) ?? '',
    }))
  }, [])
}
