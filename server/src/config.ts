export const CONFIG = {
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  ADMIN_SECRET: process.env.ADMIN_SECRET ?? 'blindtest-admin-2024',
  JWT_SECRET: process.env.JWT_SECRET ?? 'beatblind-jwt-dev-secret-change-in-prod',
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
    genres: ['complet'] as const,
    rounds: 10,
    answerMode: 'text' as const,
    playDuration: 20,
    maxPlayers: 8,
  },
}
