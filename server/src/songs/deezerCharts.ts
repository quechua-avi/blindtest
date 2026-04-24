/**
 * deezerCharts.ts — synchronisation des charts Deezer vers la DB SQLite
 *
 * Sources disponibles :
 *  - top_france : https://api.deezer.com/chart/0/tracks  (Top 100 France, se renouvelle le vendredi)
 *  - playlist:{id} : n'importe quelle playlist publique Deezer
 *
 * L'API Deezer est publique et ne nécessite aucune clé.
 * Les previews (30s MP3) et les pochettes sont incluses directement dans la réponse.
 */

import { db } from '../db/database'
import type { Song, Genre, Decade } from '../types'

// ─── Types Deezer ─────────────────────────────────────────────────────────────

interface DeezerTrack {
  id: number
  title: string
  artist: { name: string }
  album: { cover_medium: string }
  preview: string      // URL MP3 30s
  release_date: string // "YYYY-MM-DD"
  duration: number
}

interface DeezerListResponse {
  data?: DeezerTrack[]
  error?: { type: string; message: string; code: number }
}

// ─── Sources connues ───────────────────────────────────────────────────────────

export const CHART_SOURCES: Record<string, { url: string; label: string }> = {
  top_france: {
    url: 'https://api.deezer.com/chart/0/tracks?limit=100',
    label: 'Top 100 France',
  },
}

export function getSourceUrl(source: string): string {
  if (CHART_SOURCES[source]) return CHART_SOURCES[source].url
  // Support playlist:{id}
  const m = source.match(/^playlist:(\d+)$/)
  if (m) return `https://api.deezer.com/playlist/${m[1]}/tracks?limit=100`
  throw new Error(`Source inconnue : ${source}`)
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

export function getSyncInfo(source: string): SyncInfo {
  const last = db.prepare(
    'SELECT synced_at, count, status FROM chart_sync_log WHERE source = ? ORDER BY synced_at DESC LIMIT 1'
  ).get(source) as { synced_at: number; count: number; status: string } | undefined

  const label = CHART_SOURCES[source]?.label ?? source

  return {
    source,
    label,
    syncedAt: last?.synced_at ?? null,
    count: last?.count ?? 0,
    status: last?.status ?? 'never',
  }
}

export function getAllSyncInfos(): SyncInfo[] {
  // Récupère toutes les sources présentes dans la DB + les sources connues
  const dbSources = db.prepare('SELECT DISTINCT source FROM dynamic_songs').all() as { source: string }[]
  const allSources = new Set([...Object.keys(CHART_SOURCES), ...dbSources.map((r) => r.source)])
  return [...allSources].map(getSyncInfo)
}

// ─── Synchronisation ──────────────────────────────────────────────────────────

export interface SyncResult {
  source: string
  count: number
  skipped: number
  error?: string
}

export async function syncCharts(source: string = 'top_france'): Promise<SyncResult> {
  let url: string
  try {
    url = getSourceUrl(source)
  } catch (err) {
    return { source, count: 0, skipped: 0, error: String(err) }
  }

  console.log(`[Charts] Début sync "${source}" → ${url}`)

  let tracks: DeezerTrack[]
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json() as DeezerListResponse
    if (json.error) throw new Error(json.error.message)
    tracks = json.data ?? []
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Charts] Erreur fetch "${source}":`, message)
    try {
      db.prepare('INSERT INTO chart_sync_log (source, count, status) VALUES (?, 0, ?)').run(source, `error:${message}`)
    } catch {}
    return { source, count: 0, skipped: 0, error: message }
  }

  // Supprimer les anciennes chansons de cette source
  db.prepare('DELETE FROM dynamic_songs WHERE source = ?').run(source)

  const insert = db.prepare(`
    INSERT OR REPLACE INTO dynamic_songs
      (id, title, artist, year, genre, decade, preview_url, cover_url, deezer_id, position, source, synced_at)
    VALUES (?, ?, ?, ?, 'chartsweekly', ?, ?, ?, ?, ?, ?, unixepoch())
  `)

  let inserted = 0
  let skipped = 0

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i]
    if (!t.preview) { skipped++; continue }

    const yearStr = t.release_date?.slice(0, 4)
    const year = parseInt(yearStr)
    if (isNaN(year)) { skipped++; continue }

    const decade = yearToDecade(year)
    const id = `deezer-${t.id}`

    insert.run(
      id,
      t.title,
      t.artist.name,
      year,
      decade,
      t.preview,
      t.album?.cover_medium ?? null,
      t.id,
      i + 1,
      source,
    )
    inserted++
  }

  db.prepare('INSERT INTO chart_sync_log (source, count, status) VALUES (?, ?, ?)').run(source, inserted, 'ok')
  console.log(`[Charts] Sync "${source}" : ${inserted} insérées, ${skipped} ignorées (sans preview)`)

  return { source, count: inserted, skipped }
}

// ─── Scheduler (sans dépendance externe) ─────────────────────────────────────
// Vérifie toutes les heures si un sync est nécessaire (> 7 jours depuis le dernier)

export function startChartScheduler(sources: string[] = ['top_france']) {
  const INTERVAL_MS   = 60 * 60 * 1000  // vérification toutes les heures
  const SYNC_EVERY_MS = 7 * 24 * 60 * 60 * 1000  // sync si > 7 jours

  async function checkAndSync() {
    for (const source of sources) {
      const info = getSyncInfo(source)
      const lastMs = info.syncedAt ? info.syncedAt * 1000 : 0
      const age = Date.now() - lastMs
      if (age >= SYNC_EVERY_MS) {
        console.log(`[Charts] Auto-sync "${source}" (dernier sync il y a ${Math.round(age / 86400000)}j)`)
        await syncCharts(source)
      }
    }
  }

  // Vérification immédiate au démarrage
  checkAndSync()
  // Puis toutes les heures
  setInterval(checkAndSync, INTERVAL_MS)

  console.log(`[Charts] Scheduler démarré — ${sources.length} source(s) surveillée(s)`)
}
