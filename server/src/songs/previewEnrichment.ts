/**
 * previewEnrichment.ts — cache SQLite des previews Deezer pour la bibliothèque statique.
 *
 * Au démarrage du serveur, on enrichit en arrière-plan toutes les chansons de SONG_LIBRARY
 * qui n'ont pas encore de preview cachée. Les résultats sont stockés en DB pour éviter de
 * re-fetch à chaque redémarrage.
 *
 * preview_url = '' signifie "introuvable sur Deezer" (ne pas re-chercher).
 */

import { db } from '../db/database'
import { SONG_LIBRARY } from './songLibrary'
import { fetchDeezerPreview } from './deezerLookup'

interface PreviewRow {
  preview_url: string
  cover_url: string | null
}

export interface EnrichmentStatus {
  total: number
  cached: number    // avec preview trouvée
  missing: number   // introuvable sur Deezer (preview_url = '')
  pending: number   // pas encore traité
}

export function getCachedPreview(songId: string): { previewUrl: string; coverUrl?: string } | null {
  const row = db
    .prepare('SELECT preview_url, cover_url FROM song_previews WHERE song_id = ?')
    .get(songId) as PreviewRow | undefined

  if (!row) return null                // pas encore cherché
  if (!row.preview_url) return null    // introuvable, signalé comme absent

  return {
    previewUrl: row.preview_url,
    coverUrl: row.cover_url ?? undefined,
  }
}

export function isCachedMissing(songId: string): boolean {
  const row = db
    .prepare('SELECT preview_url FROM song_previews WHERE song_id = ?')
    .get(songId) as { preview_url: string } | undefined
  return row !== undefined && row.preview_url === ''
}

export function upsertPreview(songId: string, previewUrl: string, coverUrl?: string) {
  db.prepare(
    'INSERT OR REPLACE INTO song_previews (song_id, preview_url, cover_url) VALUES (?, ?, ?)'
  ).run(songId, previewUrl, coverUrl ?? null)
}

export function getEnrichmentStatus(): EnrichmentStatus {
  const total = SONG_LIBRARY.length
  const rows = db.prepare('SELECT preview_url FROM song_previews').all() as { preview_url: string }[]
  const cached = rows.filter((r) => r.preview_url !== '').length
  const missing = rows.filter((r) => r.preview_url === '').length
  const pending = total - rows.length
  return { total, cached, missing, pending }
}

export async function startEnrichment() {
  const uncached = SONG_LIBRARY.filter((s) => {
    const row = db
      .prepare('SELECT song_id FROM song_previews WHERE song_id = ?')
      .get(s.id)
    return !row
  })

  if (uncached.length === 0) {
    const { cached, total } = getEnrichmentStatus()
    console.log(`[Enrichment] Cache complet : ${cached}/${total} previews`)
    return
  }

  console.log(`[Enrichment] ${uncached.length} chansons à enrichir (arrière-plan)...`)

  // Traitement par lot de 5 avec 300ms entre les lots pour ménager l'API Deezer
  const BATCH = 5
  const DELAY = 300

  for (let i = 0; i < uncached.length; i += BATCH) {
    const batch = uncached.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (song) => {
        const result = await fetchDeezerPreview(song.title, song.artist)
        upsertPreview(song.id, result?.previewUrl ?? '', result?.coverUrl)
      })
    )
    if (i + BATCH < uncached.length) {
      await new Promise((r) => setTimeout(r, DELAY))
    }
  }

  const { cached, total, missing } = getEnrichmentStatus()
  console.log(`[Enrichment] Terminé : ${cached} previews / ${missing} introuvables / ${total} total`)
}
