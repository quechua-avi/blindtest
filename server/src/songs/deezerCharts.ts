/**
 * deezerCharts.ts — synchronisation des playlists Deezer vers la DB SQLite
 *
 * Certains genres sont entièrement alimentés par une playlist Deezer publique
 * plutôt que par la bibliothèque statique. Les previews (30s MP3) et pochettes
 * sont incluses directement dans la réponse — aucune clé API requise.
 */

import { db } from '../db/database'
import type { Song, Genre, Decade } from '../types'

// ─── Types Deezer ─────────────────────────────────────────────────────────────

interface DeezerTrack {
  id: number
  title: string
  artist: { name: string }
  album: { cover_medium: string; release_date?: string }
  preview: string      // URL MP3 30s
  release_date?: string // "YYYY-MM-DD" — absent sur certains endpoints chart
  duration: number
}

interface DeezerListResponse {
  data?: DeezerTrack[]
  error?: { type: string; message: string; code: number }
}

// ─── Genres alimentés par une playlist Deezer ─────────────────────────────────
// Pour ajouter un genre : trouver la playlist sur deezer.com, copier l'ID depuis l'URL.

export const GENRE_PLAYLISTS: Partial<Record<Genre, { url: string; label: string }>> = {
  chartsweekly: {
    url: 'https://api.deezer.com/playlist/1109890291/tracks?limit=100',
    label: 'Top 100 France',
  },
  jul: {
    // Playlist officielle "100% Jul" par Deezer Artist Editor (50 titres)
    url: 'https://api.deezer.com/playlist/6051368644/tracks?limit=100',
    label: '100% Jul',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yearToDecade(year: number): Decade {
  if (year >= 2020) return '2020s'
  if (year >= 2010) return '2010s'
  return '2000s'
}

interface DynamicSongRow {
  id: string
  title: string
  artist: string
  year: number
  genre: string
  decade: string
  preview_url: string
  cover_url: string | null
  deezer_id: number
  position: number | null
  source: string
  synced_at: number
}

function rowToSong(row: DynamicSongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    genre: row.genre as Genre,
    decade: row.decade as Decade,
    previewUrl: row.preview_url,
    coverUrl: row.cover_url ?? undefined,
  }
}

// ─── Lecture DB ───────────────────────────────────────────────────────────────

export function getDynamicSongs(source?: string): Song[] {
  const rows = source
    ? db.prepare('SELECT * FROM dynamic_songs WHERE source = ? ORDER BY position ASC').all(source)
    : db.prepare('SELECT * FROM dynamic_songs ORDER BY position ASC').all()
  return (rows as DynamicSongRow[]).map(rowToSong)
}

export interface SyncInfo {
  source: string
  label: string
  syncedAt: number | null     // timestamp Unix
  count: number
  status: string
}

export function getSyncInfo(genre: Genre): SyncInfo {
  const last = db.prepare(
    'SELECT synced_at, count, status FROM chart_sync_log WHERE source = ? ORDER BY synced_at DESC LIMIT 1'
  ).get(genre) as { synced_at: number; count: number; status: string } | undefined

  const label = GENRE_PLAYLISTS[genre]?.label ?? genre

  return {
    source: genre,
    label,
    syncedAt: last?.synced_at ?? null,
    count: last?.count ?? 0,
    status: last?.status ?? 'never',
  }
}

export function getAllSyncInfos(): SyncInfo[] {
  return (Object.keys(GENRE_PLAYLISTS) as Genre[]).map(getSyncInfo)
}

// ─── Synchronisation ──────────────────────────────────────────────────────────

export interface SyncResult {
  source: string
  count: number
  skipped: number
  error?: string
}

export async function syncCharts(genre: Genre = 'chartsweekly'): Promise<SyncResult> {
  const config = GENRE_PLAYLISTS[genre]
  if (!config) {
    return { source: genre, count: 0, skipped: 0, error: `Genre "${genre}" n'a pas de playlist Deezer configurée` }
  }

  const { url } = config
  console.log(`[Charts] Début sync "${genre}" → ${url}`)

  let tracks: DeezerTrack[]
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as DeezerListResponse
    if (json.error) throw new Error(json.error.message)
    tracks = json.data ?? []
    console.log(`[Charts] ${tracks.length} pistes reçues de Deezer`)
    if (tracks.length > 0) console.log(`[Charts] Exemple piste[0]:`, JSON.stringify(tracks[0]).slice(0, 300))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Charts] Erreur fetch "${genre}":`, message)
    try {
      db.prepare('INSERT INTO chart_sync_log (source, count, status) VALUES (?, 0, ?)').run(genre, `error:${message}`)
    } catch {}
    return { source: genre, count: 0, skipped: 0, error: message }
  }

  // Supprimer les anciennes chansons de cette source
  db.prepare('DELETE FROM dynamic_songs WHERE source = ?').run(genre)

  const insert = db.prepare(`
    INSERT OR REPLACE INTO dynamic_songs
      (id, title, artist, year, genre, decade, preview_url, cover_url, deezer_id, position, source, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `)

  let inserted = 0
  let skipped = 0

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i]
    if (!t.preview) { skipped++; continue }

    // release_date peut être absent sur l'endpoint /chart — fallback sur album ou année en cours
    const rawDate = t.release_date ?? t.album?.release_date ?? String(new Date().getFullYear())
    const year = parseInt(rawDate.slice(0, 4))
    if (isNaN(year)) { skipped++; continue }

    const decade = yearToDecade(year)
    const id = `deezer-${t.id}`

    insert.run(
      id,
      t.title,
      t.artist.name,
      year,
      genre,
      decade,
      t.preview,
      t.album?.cover_medium ?? null,
      t.id,
      i + 1,
      genre,
    )
    inserted++
  }

  db.prepare('INSERT INTO chart_sync_log (source, count, status) VALUES (?, ?, ?)').run(genre, inserted, 'ok')
  console.log(`[Charts] Sync "${genre}" : ${inserted} insérées, ${skipped} ignorées`)

  return { source: genre, count: inserted, skipped }
}

// ─── Scheduler (sans dépendance externe) ─────────────────────────────────────
// Vérifie toutes les heures si un sync est nécessaire (> 7 jours depuis le dernier)

export function startChartScheduler(genres: Genre[] = Object.keys(GENRE_PLAYLISTS) as Genre[]) {
  const INTERVAL_MS   = 60 * 60 * 1000         // vérification toutes les heures
  const SYNC_EVERY_MS = 7 * 24 * 60 * 60 * 1000 // sync si > 7 jours

  async function checkAndSync() {
    for (const genre of genres) {
      const info = getSyncInfo(genre)
      const lastMs = info.syncedAt ? info.syncedAt * 1000 : 0
      const age = Date.now() - lastMs
      if (age >= SYNC_EVERY_MS) {
        console.log(`[Charts] Auto-sync "${genre}" (dernier sync il y a ${Math.round(age / 86400000)}j)`)
        await syncCharts(genre)
      }
    }
  }

  checkAndSync()
  setInterval(checkAndSync, INTERVAL_MS)

  console.log(`[Charts] Scheduler démarré — ${genres.length} genre(s) surveillé(s): ${genres.join(', ')}`)
}
