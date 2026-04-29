import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(path.join(DATA_DIR, 'beatblind.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS dynamic_songs (
    id          TEXT    PRIMARY KEY,          -- 'deezer-{trackId}'
    title       TEXT    NOT NULL,
    artist      TEXT    NOT NULL,
    year        INTEGER NOT NULL,
    genre       TEXT    NOT NULL DEFAULT 'chartsweekly',
    decade      TEXT    NOT NULL,
    preview_url TEXT    NOT NULL,
    cover_url   TEXT,
    deezer_id   INTEGER NOT NULL,
    position    INTEGER,
    source      TEXT    NOT NULL DEFAULT 'top_france',
    synced_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    rank        INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS chart_sync_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    source    TEXT    NOT NULL,
    synced_at INTEGER NOT NULL DEFAULT (unixepoch()),
    count     INTEGER NOT NULL,
    status    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS song_previews (
    song_id     TEXT    PRIMARY KEY,
    preview_url TEXT    NOT NULL DEFAULT '',
    cover_url   TEXT,
    fetched_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('require_room_password', '1');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('room_password', 'buzzyquizpitchounes');

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT    NOT NULL,
    username    TEXT    NOT NULL,
    avatar_color TEXT   NOT NULL DEFAULT '#7c3aed',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    last_login  INTEGER
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS user_stats (
    user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    games_played   INTEGER NOT NULL DEFAULT 0,
    games_won      INTEGER NOT NULL DEFAULT 0,
    total_score    INTEGER NOT NULL DEFAULT 0,
    best_score     INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    best_streak    INTEGER NOT NULL DEFAULT 0
  );
`)

// Migration : ajouter rank si la colonne n'existe pas encore
try { db.exec('ALTER TABLE dynamic_songs ADD COLUMN rank INTEGER NOT NULL DEFAULT 0') } catch {}

console.log('[DB] SQLite initialisée')
