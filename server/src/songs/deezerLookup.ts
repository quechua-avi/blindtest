/**
 * Deezer lookup — récupère l'URL de preview 30s pour un titre donné.
 * L'API Deezer est publique et ne nécessite aucune clé.
 * Toutes les previews sont des fichiers MP3 hébergés sur le CDN Deezer.
 */

interface DeezerTrack {
  id: number
  title: string
  artist: { name: string }
  preview: string // URL du MP3 preview 30s
}

interface DeezerSearchResponse {
  data?: DeezerTrack[]
  error?: { message: string }
}

// Cache en mémoire pour éviter les appels répétés
const previewCache = new Map<string, string | null>()

function buildCacheKey(title: string, artist: string): string {
  return `${title.toLowerCase()}|||${artist.toLowerCase()}`
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s*ft\.?\s*.+$/i, '')   // supprimer "ft. XXX"
    .replace(/\s*feat\.?\s*.+$/i, '') // supprimer "feat. XXX"
    .replace(/[^a-z0-9 ]/g, '')      // garder alphanumériques et espaces
    .trim()
}

export async function fetchDeezerPreview(title: string, artist: string): Promise<string | null> {
  const cacheKey = buildCacheKey(title, artist)
  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey)!
  }

  // Nettoyer le titre et l'artiste pour la recherche
  const cleanTitle = normalize(title)
  const cleanArtist = normalize(artist)
  const query = encodeURIComponent(`${cleanTitle} ${cleanArtist}`)

  try {
    const url = `https://api.deezer.com/search?q=${query}&limit=5&output=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) {
      console.warn(`[Deezer] HTTP ${res.status} pour "${title}" - ${artist}`)
      previewCache.set(cacheKey, null)
      return null
    }

    const json = await res.json() as DeezerSearchResponse
    const tracks = json.data ?? []

    // Trouver le meilleur résultat (avec preview non-vide)
    const match = tracks.find((t) => t.preview && t.preview.length > 0)
    if (!match) {
      console.warn(`[Deezer] Aucune preview pour "${title}" - ${artist}`)
      previewCache.set(cacheKey, null)
      return null
    }

    console.log(`[Deezer] ✓ "${match.title}" par ${match.artist.name} → ${match.preview.slice(0, 60)}...`)
    previewCache.set(cacheKey, match.preview)
    return match.preview
  } catch (err) {
    console.warn(`[Deezer] Erreur réseau pour "${title}" - ${artist}:`, err)
    previewCache.set(cacheKey, null)
    return null
  }
}

/** Vider le cache (utile pour les tests) */
export function clearDeezerCache() {
  previewCache.clear()
}
