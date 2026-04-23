/**
 * StreamClash — catalogue rap français avec streams Spotify approximatifs
 * Sources : classements Spotify France, charts officiels (chiffres en millions, arrondis)
 */

export interface StreamClashSong {
  id: string
  title: string
  artist: string
  year: number
  streams: number   // millions de streams Spotify (approximatif)
  coverUrl?: string // rempli dynamiquement via Deezer
}

export const STREAMCLASH_SONGS: StreamClashSong[] = [
  // ─── ANNÉES 2000 ──────────────────────────────────────────────────────────
  { id: 'sc-iam-mia',              title: 'Je danse le Mia',         artist: 'IAM',                    year: 1994, streams: 28  },
  { id: 'sc-rohff-authentique',    title: "Qui est l'authentique ?", artist: 'Rohff',                  year: 2002, streams: 14  },
  { id: 'sc-booba-tombola',        title: 'Tombola',                 artist: 'Booba',                  year: 2006, streams: 35  },
  { id: 'sc-soprano-soleil',       title: 'Coup de soleil',          artist: 'Soprano',                year: 2007, streams: 22  },
  { id: 'sc-kery-lettre',          title: 'Lettre à la République',  artist: 'Kery James',             year: 2007, streams: 11  },

  // ─── 2010-2014 ────────────────────────────────────────────────────────────
  { id: 'sc-booba-kaaris-kalash',  title: 'Kalash',                  artist: 'Booba feat. Kaaris',     year: 2012, streams: 72  },
  { id: 'sc-gradur-charo',         title: 'Charo',                   artist: 'Gradur',                 year: 2014, streams: 65  },
  { id: 'sc-sadek-glacons',        title: 'Glaçons',                 artist: 'Sadek',                  year: 2014, streams: 48  },

  // ─── 2015 ─────────────────────────────────────────────────────────────────
  { id: 'sc-nekfeu-conquete',      title: 'Conquête',                artist: 'Nekfeu',                 year: 2015, streams: 38  },
  { id: 'sc-kaaris-tchoin',        title: 'Tchoin',                  artist: 'Kaaris',                 year: 2015, streams: 60  },
  { id: 'sc-lacrim-riparo',        title: 'Riparo',                  artist: "Lacrim feat. Rim'K",     year: 2015, streams: 85  },
  { id: 'sc-sofiane-amis',         title: 'Amis ou Frères',          artist: 'Sofiane',                year: 2015, streams: 55  },

  // ─── 2016 ─────────────────────────────────────────────────────────────────
  { id: 'sc-sch-blanka',           title: 'Blanka',                  artist: 'SCH',                    year: 2016, streams: 120 },
  { id: 'sc-niska-reseaux',        title: 'Réseaux',                 artist: 'Niska',                  year: 2016, streams: 162 },
  { id: 'sc-damso-batterie',       title: 'Batterie Faible',         artist: 'Damso',                  year: 2016, streams: 40  },
  { id: 'sc-jul-sur-ma-route',     title: 'Sur ma route',            artist: 'Jul',                    year: 2016, streams: 42  },
  { id: 'sc-sch-rooftop',          title: 'Rooftop',                 artist: 'SCH',                    year: 2016, streams: 44  },

  // ─── 2017 ─────────────────────────────────────────────────────────────────
  { id: 'sc-ninho-lova',           title: 'Lova',                    artist: 'Ninho',                  year: 2017, streams: 44  },
  { id: 'sc-booba-pilon',          title: 'Pilon',                   artist: 'Booba',                  year: 2017, streams: 28  },

  // ─── 2018 ─────────────────────────────────────────────────────────────────
  { id: 'sc-alonzo-fais-le-tour',  title: 'Fais le tour',            artist: 'Alonzo',                 year: 2018, streams: 32  },
  { id: 'sc-naps-fuego',           title: 'Fuego',                   artist: 'Naps',                   year: 2018, streams: 52  },
  { id: 'sc-hamza-all-black',      title: 'All Black',               artist: 'Hamza',                  year: 2018, streams: 26  },

  // ─── 2019 ─────────────────────────────────────────────────────────────────
  { id: 'sc-gambi-chocolat',       title: 'Chocolat',                artist: 'Gambi',                  year: 2019, streams: 115 },
  { id: 'sc-plk-double-g',         title: 'Double G',                artist: 'PLK',                    year: 2019, streams: 122 },
  { id: 'sc-ninho-millions',       title: 'Millions',                artist: 'Ninho feat. Alonzo',     year: 2019, streams: 152 },
  { id: 'sc-koba-rakal',           title: 'RAKA L',                  artist: 'Koba LaD',               year: 2019, streams: 82  },
  { id: 'sc-ninho-drc',            title: 'DRC',                     artist: 'Ninho',                  year: 2019, streams: 78  },
  { id: 'sc-niska-ouais',          title: 'Ouais Ouais',             artist: 'Niska',                  year: 2019, streams: 40  },
  { id: 'sc-hamza-tanger',         title: 'Tanger',                  artist: 'Hamza',                  year: 2019, streams: 30  },
  { id: 'sc-sch-pablo',            title: 'Pablo',                   artist: 'SCH',                    year: 2019, streams: 50  },

  // ─── 2020 ─────────────────────────────────────────────────────────────────
  { id: 'sc-jul-bande-org',        title: 'Bande Organisée',         artist: 'Jul feat. SCH & Niro',  year: 2020, streams: 248 },
  { id: 'sc-freeze-214',           title: '214',                     artist: 'Freeze Corleone',        year: 2020, streams: 102 },
  { id: 'sc-heuss-notorious',      title: 'Notorious BIG',           artist: "Heuss L'Enfoiré",       year: 2020, streams: 62  },
  { id: 'sc-plk-jvlivs',           title: 'JVLIVS',                  artist: 'PLK',                    year: 2020, streams: 35  },
  { id: 'sc-freeze-lamborghini',   title: 'Lamborghini',             artist: 'Freeze Corleone',        year: 2020, streams: 28  },

  // ─── 2021 ─────────────────────────────────────────────────────────────────
  { id: 'sc-hamza-la-cherche',     title: 'LA Cherché',              artist: 'Hamza',                  year: 2021, streams: 98  },
  { id: 'sc-sch-dentier',          title: 'Dentier',                 artist: 'SCH',                    year: 2021, streams: 34  },
  { id: 'sc-heuss-ramdam',         title: 'RAMDAM',                  artist: "Heuss L'Enfoiré",       year: 2021, streams: 40  },
  { id: 'sc-ninho-million2x',      title: 'Million 2x',              artist: 'Ninho',                  year: 2021, streams: 46  },

  // ─── 2022-2023 ────────────────────────────────────────────────────────────
  { id: 'sc-koba-drko',            title: 'DRKO',                    artist: 'Koba LaD',               year: 2022, streams: 38  },
  { id: 'sc-hamza-opp',            title: 'Opp',                     artist: 'Hamza',                  year: 2022, streams: 36  },
  { id: 'sc-sch-pyramide',         title: 'Pyramide',                artist: 'SCH',                    year: 2022, streams: 30  },
  { id: 'sc-freeze-eclipse',       title: 'Eclipse',                 artist: 'Freeze Corleone',        year: 2022, streams: 24  },
  { id: 'sc-ninho-chaque-jour',    title: 'Chaque Jour',             artist: 'Ninho',                  year: 2023, streams: 42  },
  { id: 'sc-hamza-dubai',          title: 'Dubai',                   artist: 'Hamza',                  year: 2023, streams: 32  },
]
