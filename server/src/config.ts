export const CONFIG = {
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  // En prod, mettre l'URL Netlify dans la variable d'env CLIENT_URL sur Railway
  // ex: https://beatblind.netlify.app
  // Accepte aussi plusieurs origines séparées par une virgule
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  MAX_ROOMS: parseInt(process.env.MAX_ROOMS ?? '100', 10),
  MAX_PLAYERS_PER_ROOM: 16,
  ROOM_CLEANUP_DELAY_MS: 5 * 60 * 1000, // 5 min après fin de partie
  BETWEEN_ROUNDS_DELAY_MS: 5000,         // 5s entre les rounds
  DEFAULT_SETTINGS: {
    mode: 'classic' as const,
    genres: ['pop', 'hiphop', 'electronic', 'rnb', 'french', 'latin'] as const,
    decades: ['2000s', '2010s', '2020s'] as const,
    rounds: 10,
    difficulty: 'medium' as const,
    answerMode: 'text' as const,
    playDuration: 20,
    maxPlayers: 8,
  },
}
