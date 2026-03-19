/**
 * 43V3R BET AI - Comprehensive Database Seed File
 * Premier Soccer League (PSL) South Africa Betting Platform
 * 
 * Run with: bun run prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ==================== DATE HELPERS ====================

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function setTime(date: Date, hours: number, minutes: number = 0): Date {
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

// ==================== PSL LEAGUES ====================

const PSL_LEAGUES = [
  {
    name: 'DStv Premiership',
    country: 'South Africa',
    logo: '/leagues/dstv-premiership.png',
  },
  {
    name: 'Nedbank Cup',
    country: 'South Africa',
    logo: '/leagues/nedbank-cup.png',
  },
  {
    name: 'Carling Black Label Cup',
    country: 'South Africa',
    logo: '/leagues/carling-cup.png',
  },
]

// ==================== PSL TEAMS (16 Teams with Locations) ====================

interface TeamData {
  name: string
  location: string
  stadium: string
  form: string
  goalsScored: number
  goalsConceded: number
  founded: number
}

const PSL_TEAMS: TeamData[] = [
  {
    name: 'Kaizer Chiefs',
    location: 'Johannesburg',
    stadium: 'FNB Stadium',
    form: 'WLWDW',
    goalsScored: 28,
    goalsConceded: 18,
    founded: 1970,
  },
  {
    name: 'Orlando Pirates',
    location: 'Johannesburg',
    stadium: 'Orlando Stadium',
    form: 'DWWLW',
    goalsScored: 32,
    goalsConceded: 14,
    founded: 1937,
  },
  {
    name: 'Mamelodi Sundowns',
    location: 'Pretoria',
    stadium: 'Loftus Versfeld',
    form: 'WWWWW',
    goalsScored: 45,
    goalsConceded: 10,
    founded: 1970,
  },
  {
    name: 'Stellenbosch FC',
    location: 'Stellenbosch',
    stadium: 'Danie Craven Stadium',
    form: 'WLDWD',
    goalsScored: 24,
    goalsConceded: 20,
    founded: 2016,
  },
  {
    name: 'Sekhukhune United',
    location: 'Limpopo',
    stadium: 'Peter Mokaba Stadium',
    form: 'LWDWL',
    goalsScored: 19,
    goalsConceded: 22,
    founded: 2021,
  },
  {
    name: 'SuperSport United',
    location: 'Pretoria',
    stadium: 'Lucas Moripe Stadium',
    form: 'WDLWW',
    goalsScored: 22,
    goalsConceded: 17,
    founded: 1994,
  },
  {
    name: 'TS Galaxy',
    location: 'Mpumalanga',
    stadium: 'Mbombela Stadium',
    form: 'DWLWD',
    goalsScored: 21,
    goalsConceded: 23,
    founded: 2017,
  },
  {
    name: 'Cape Town City',
    location: 'Cape Town',
    stadium: 'Cape Town Stadium',
    form: 'WDWLD',
    goalsScored: 26,
    goalsConceded: 19,
    founded: 2016,
  },
  {
    name: 'Cape Town Spurs',
    location: 'Cape Town',
    stadium: 'Athlone Stadium',
    form: 'DLLLD',
    goalsScored: 9,
    goalsConceded: 32,
    founded: 1999,
  },
  {
    name: 'AmaZulu FC',
    location: 'Durban',
    stadium: 'Moses Mabhida Stadium',
    form: 'LDWLL',
    goalsScored: 14,
    goalsConceded: 24,
    founded: 1932,
  },
  {
    name: 'Golden Arrows',
    location: 'Durban',
    stadium: 'Princess Magogo Stadium',
    form: 'WWDLD',
    goalsScored: 18,
    goalsConceded: 21,
    founded: 1943,
  },
  {
    name: 'Richards Bay FC',
    location: 'Richards Bay',
    stadium: 'Richards Bay Stadium',
    form: 'DLLWL',
    goalsScored: 12,
    goalsConceded: 28,
    founded: 1976,
  },
  {
    name: 'Royal AM',
    location: 'KwaZulu-Natal',
    stadium: 'Harry Gwala Stadium',
    form: 'LLWDL',
    goalsScored: 15,
    goalsConceded: 25,
    founded: 2021,
  },
  {
    name: 'Chippa United',
    location: 'Port Elizabeth',
    stadium: 'Nelson Mandela Bay Stadium',
    form: 'WDLDW',
    goalsScored: 17,
    goalsConceded: 20,
    founded: 2010,
  },
  {
    name: 'Moroka Swallows',
    location: 'Johannesburg',
    stadium: 'Dobsonville Stadium',
    form: 'LWDDL',
    goalsScored: 16,
    goalsConceded: 22,
    founded: 1947,
  },
  {
    name: 'Polokwane City',
    location: 'Polokwane',
    stadium: 'Peter Mokaba Stadium',
    form: 'WDWLL',
    goalsScored: 20,
    goalsConceded: 24,
    founded: 2012,
  },
]

// ==================== PLAYERS (5-8 per team with xG, xA) ====================

interface PlayerData {
  name: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  shirtNumber: number
  price: number
  form: number
  totalPoints: number
  goals: number
  assists: number
  cleanSheets: number
  xG: number // Expected Goals
  xA: number // Expected Assists
  minutesPlayed: number
  yellowCards: number
  redCards: number
}

const PLAYERS_BY_TEAM: Record<string, PlayerData[]> = {
  'Kaizer Chiefs': [
    {
      name: 'Bruce Bvuma',
      position: 'GK',
      shirtNumber: 16,
      price: 4.5,
      form: 6.2,
      totalPoints: 45,
      goals: 0,
      assists: 0,
      cleanSheets: 5,
      xG: 0.0,
      xA: 0.1,
      minutesPlayed: 1350,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Given Msimango',
      position: 'DEF',
      shirtNumber: 4,
      price: 5.5,
      form: 6.5,
      totalPoints: 61,
      goals: 2,
      assists: 1,
      cleanSheets: 5,
      xG: 1.8,
      xA: 0.9,
      minutesPlayed: 1420,
      yellowCards: 3,
      redCards: 0,
    },
    {
      name: 'Reeve Frosler',
      position: 'DEF',
      shirtNumber: 22,
      price: 5.2,
      form: 6.8,
      totalPoints: 58,
      goals: 0,
      assists: 4,
      cleanSheets: 5,
      xG: 0.3,
      xA: 3.2,
      minutesPlayed: 1280,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Yusuf Maart',
      position: 'MID',
      shirtNumber: 8,
      price: 6.0,
      form: 7.2,
      totalPoints: 78,
      goals: 3,
      assists: 5,
      cleanSheets: 0,
      xG: 2.8,
      xA: 4.5,
      minutesPlayed: 1450,
      yellowCards: 4,
      redCards: 0,
    },
    {
      name: 'Edson Castillo',
      position: 'MID',
      shirtNumber: 10,
      price: 6.5,
      form: 7.5,
      totalPoints: 85,
      goals: 5,
      assists: 3,
      cleanSheets: 0,
      xG: 4.2,
      xA: 3.8,
      minutesPlayed: 1320,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Mduduzi Shabalala',
      position: 'MID',
      shirtNumber: 20,
      price: 5.8,
      form: 6.9,
      totalPoints: 68,
      goals: 2,
      assists: 6,
      cleanSheets: 0,
      xG: 2.5,
      xA: 5.2,
      minutesPlayed: 1180,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Ranga Chivaviro',
      position: 'FWD',
      shirtNumber: 9,
      price: 7.0,
      form: 7.0,
      totalPoints: 72,
      goals: 8,
      assists: 2,
      cleanSheets: 0,
      xG: 7.5,
      xA: 2.3,
      minutesPlayed: 1100,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Wandile Duba',
      position: 'FWD',
      shirtNumber: 17,
      price: 5.5,
      form: 6.3,
      totalPoints: 55,
      goals: 4,
      assists: 3,
      cleanSheets: 0,
      xG: 3.8,
      xA: 2.1,
      minutesPlayed: 980,
      yellowCards: 0,
      redCards: 0,
    },
  ],
  'Orlando Pirates': [
    {
      name: 'Sipho Chaine',
      position: 'GK',
      shirtNumber: 16,
      price: 5.0,
      form: 7.0,
      totalPoints: 58,
      goals: 0,
      assists: 0,
      cleanSheets: 7,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1440,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Nkosinathi Sibisi',
      position: 'DEF',
      shirtNumber: 4,
      price: 5.5,
      form: 6.8,
      totalPoints: 62,
      goals: 1,
      assists: 2,
      cleanSheets: 7,
      xG: 1.2,
      xA: 1.8,
      minutesPlayed: 1380,
      yellowCards: 3,
      redCards: 0,
    },
    {
      name: 'Paseka Mako',
      position: 'DEF',
      shirtNumber: 21,
      price: 5.8,
      form: 7.2,
      totalPoints: 68,
      goals: 0,
      assists: 5,
      cleanSheets: 6,
      xG: 0.5,
      xA: 4.2,
      minutesPlayed: 1250,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Deon Hotto',
      position: 'MID',
      shirtNumber: 7,
      price: 6.8,
      form: 7.5,
      totalPoints: 88,
      goals: 4,
      assists: 8,
      cleanSheets: 0,
      xG: 3.5,
      xA: 7.8,
      minutesPlayed: 1420,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Patrick Maswanganyi',
      position: 'MID',
      shirtNumber: 10,
      price: 7.2,
      form: 7.8,
      totalPoints: 95,
      goals: 6,
      assists: 7,
      cleanSheets: 0,
      xG: 5.8,
      xA: 6.2,
      minutesPlayed: 1350,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Relebohile Mofokeng',
      position: 'MID',
      shirtNumber: 20,
      price: 6.0,
      form: 7.4,
      totalPoints: 78,
      goals: 3,
      assists: 6,
      cleanSheets: 0,
      xG: 2.9,
      xA: 5.5,
      minutesPlayed: 1180,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Zakhele Lepasa',
      position: 'FWD',
      shirtNumber: 9,
      price: 7.5,
      form: 7.6,
      totalPoints: 92,
      goals: 10,
      assists: 4,
      cleanSheets: 0,
      xG: 9.2,
      xA: 3.8,
      minutesPlayed: 1280,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Evidence Makgopa',
      position: 'FWD',
      shirtNumber: 17,
      price: 6.5,
      form: 6.8,
      totalPoints: 70,
      goals: 5,
      assists: 3,
      cleanSheets: 0,
      xG: 4.5,
      xA: 2.8,
      minutesPlayed: 1050,
      yellowCards: 2,
      redCards: 0,
    },
  ],
  'Mamelodi Sundowns': [
    {
      name: 'Ronwen Williams',
      position: 'GK',
      shirtNumber: 1,
      price: 5.8,
      form: 7.8,
      totalPoints: 72,
      goals: 0,
      assists: 0,
      cleanSheets: 10,
      xG: 0.0,
      xA: 0.2,
      minutesPlayed: 1440,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Khuliso Mudau',
      position: 'DEF',
      shirtNumber: 2,
      price: 6.2,
      form: 7.5,
      totalPoints: 78,
      goals: 1,
      assists: 5,
      cleanSheets: 9,
      xG: 1.1,
      xA: 4.8,
      minutesPlayed: 1380,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Aubrey Modiba',
      position: 'DEF',
      shirtNumber: 21,
      price: 6.0,
      form: 7.4,
      totalPoints: 75,
      goals: 0,
      assists: 6,
      cleanSheets: 8,
      xG: 0.4,
      xA: 5.5,
      minutesPlayed: 1320,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Teboho Mokoena',
      position: 'MID',
      shirtNumber: 8,
      price: 7.5,
      form: 8.0,
      totalPoints: 102,
      goals: 5,
      assists: 8,
      cleanSheets: 0,
      xG: 4.5,
      xA: 7.2,
      minutesPlayed: 1400,
      yellowCards: 3,
      redCards: 0,
    },
    {
      name: 'Lucas Ribeiro Costa',
      position: 'MID',
      shirtNumber: 11,
      price: 8.0,
      form: 8.2,
      totalPoints: 115,
      goals: 8,
      assists: 9,
      cleanSheets: 0,
      xG: 7.8,
      xA: 8.5,
      minutesPlayed: 1350,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Peter Shalulile',
      position: 'FWD',
      shirtNumber: 9,
      price: 8.5,
      form: 8.5,
      totalPoints: 125,
      goals: 14,
      assists: 5,
      cleanSheets: 0,
      xG: 13.2,
      xA: 4.8,
      minutesPlayed: 1280,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Iqraam Rayners',
      position: 'FWD',
      shirtNumber: 17,
      price: 7.2,
      form: 7.8,
      totalPoints: 95,
      goals: 9,
      assists: 4,
      cleanSheets: 0,
      xG: 8.5,
      xA: 3.2,
      minutesPlayed: 1150,
      yellowCards: 2,
      redCards: 0,
    },
  ],
  'Stellenbosch FC': [
    {
      name: 'Sage Stephens',
      position: 'GK',
      shirtNumber: 1,
      price: 4.5,
      form: 6.5,
      totalPoints: 50,
      goals: 0,
      assists: 0,
      cleanSheets: 5,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1350,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Deano van Rooyen',
      position: 'DEF',
      shirtNumber: 2,
      price: 5.2,
      form: 6.8,
      totalPoints: 60,
      goals: 0,
      assists: 4,
      cleanSheets: 5,
      xG: 0.3,
      xA: 3.5,
      minutesPlayed: 1280,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Fawaaz Basadien',
      position: 'DEF',
      shirtNumber: 4,
      price: 5.0,
      form: 6.5,
      totalPoints: 55,
      goals: 1,
      assists: 2,
      cleanSheets: 4,
      xG: 1.0,
      xA: 1.8,
      minutesPlayed: 1320,
      yellowCards: 3,
      redCards: 0,
    },
    {
      name: 'Antonio van Wyk',
      position: 'MID',
      shirtNumber: 8,
      price: 5.8,
      form: 7.0,
      totalPoints: 72,
      goals: 3,
      assists: 5,
      cleanSheets: 0,
      xG: 2.8,
      xA: 4.5,
      minutesPlayed: 1250,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Sihle Nduli',
      position: 'MID',
      shirtNumber: 10,
      price: 6.0,
      form: 6.8,
      totalPoints: 68,
      goals: 2,
      assists: 4,
      cleanSheets: 0,
      xG: 2.2,
      xA: 3.8,
      minutesPlayed: 1180,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Devyn Tanner',
      position: 'FWD',
      shirtNumber: 17,
      price: 5.0,
      form: 6.0,
      totalPoints: 48,
      goals: 3,
      assists: 2,
      cleanSheets: 0,
      xG: 2.8,
      xA: 1.5,
      minutesPlayed: 920,
      yellowCards: 0,
      redCards: 0,
    },
  ],
  'Sekhukhune United': [
    {
      name: 'Badra Ali Sangare',
      position: 'GK',
      shirtNumber: 1,
      price: 4.5,
      form: 6.0,
      totalPoints: 45,
      goals: 0,
      assists: 0,
      cleanSheets: 4,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1300,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Nyiko Mobbie',
      position: 'DEF',
      shirtNumber: 2,
      price: 5.0,
      form: 6.2,
      totalPoints: 52,
      goals: 0,
      assists: 3,
      cleanSheets: 4,
      xG: 0.2,
      xA: 2.8,
      minutesPlayed: 1250,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Sibusiso Vilakazi',
      position: 'MID',
      shirtNumber: 10,
      price: 6.0,
      form: 6.5,
      totalPoints: 68,
      goals: 3,
      assists: 4,
      cleanSheets: 0,
      xG: 2.5,
      xA: 3.8,
      minutesPlayed: 1100,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Jamie Webber',
      position: 'MID',
      shirtNumber: 8,
      price: 5.5,
      form: 6.3,
      totalPoints: 62,
      goals: 2,
      assists: 3,
      cleanSheets: 0,
      xG: 1.8,
      xA: 2.5,
      minutesPlayed: 1050,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Chibuike Ohizu',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.8,
      form: 6.5,
      totalPoints: 65,
      goals: 5,
      assists: 2,
      cleanSheets: 0,
      xG: 4.2,
      xA: 1.8,
      minutesPlayed: 980,
      yellowCards: 1,
      redCards: 0,
    },
  ],
  'SuperSport United': [
    {
      name: 'Ronaldo Nko',
      position: 'GK',
      shirtNumber: 1,
      price: 4.5,
      form: 6.2,
      totalPoints: 48,
      goals: 0,
      assists: 0,
      cleanSheets: 4,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1280,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Onismor Bhasera',
      position: 'DEF',
      shirtNumber: 4,
      price: 5.2,
      form: 6.5,
      totalPoints: 60,
      goals: 1,
      assists: 2,
      cleanSheets: 4,
      xG: 0.8,
      xA: 1.5,
      minutesPlayed: 1350,
      yellowCards: 3,
      redCards: 0,
    },
    {
      name: 'Grant Margeman',
      position: 'MID',
      shirtNumber: 8,
      price: 5.8,
      form: 6.8,
      totalPoints: 68,
      goals: 2,
      assists: 4,
      cleanSheets: 0,
      xG: 1.8,
      xA: 3.5,
      minutesPlayed: 1200,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Sipho Mbule',
      position: 'MID',
      shirtNumber: 10,
      price: 6.2,
      form: 7.0,
      totalPoints: 75,
      goals: 3,
      assists: 5,
      cleanSheets: 0,
      xG: 2.8,
      xA: 4.2,
      minutesPlayed: 1180,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Bradley Grobler',
      position: 'FWD',
      shirtNumber: 9,
      price: 6.8,
      form: 7.2,
      totalPoints: 85,
      goals: 7,
      assists: 3,
      cleanSheets: 0,
      xG: 6.5,
      xA: 2.8,
      minutesPlayed: 1150,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Thamsanqa Gabuza',
      position: 'FWD',
      shirtNumber: 17,
      price: 5.8,
      form: 6.5,
      totalPoints: 65,
      goals: 4,
      assists: 2,
      cleanSheets: 0,
      xG: 3.8,
      xA: 1.5,
      minutesPlayed: 980,
      yellowCards: 2,
      redCards: 0,
    },
  ],
  'TS Galaxy': [
    {
      name: 'Vasilije Kolak',
      position: 'GK',
      shirtNumber: 1,
      price: 4.2,
      form: 5.8,
      totalPoints: 42,
      goals: 0,
      assists: 0,
      cleanSheets: 3,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1250,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Bathusi Aubaas',
      position: 'DEF',
      shirtNumber: 4,
      price: 4.8,
      form: 6.0,
      totalPoints: 50,
      goals: 1,
      assists: 1,
      cleanSheets: 3,
      xG: 0.8,
      xA: 0.5,
      minutesPlayed: 1180,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Siphesihle Ndlovu',
      position: 'MID',
      shirtNumber: 8,
      price: 5.8,
      form: 6.5,
      totalPoints: 65,
      goals: 2,
      assists: 4,
      cleanSheets: 0,
      xG: 1.5,
      xA: 3.2,
      minutesPlayed: 1100,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Lerato Manzini',
      position: 'MID',
      shirtNumber: 10,
      price: 5.5,
      form: 6.2,
      totalPoints: 58,
      goals: 2,
      assists: 3,
      cleanSheets: 0,
      xG: 1.8,
      xA: 2.5,
      minutesPlayed: 1020,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Marks Munyai',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.5,
      form: 6.3,
      totalPoints: 60,
      goals: 4,
      assists: 2,
      cleanSheets: 0,
      xG: 3.5,
      xA: 1.8,
      minutesPlayed: 950,
      yellowCards: 0,
      redCards: 0,
    },
  ],
  'Cape Town City': [
    {
      name: 'Darren Keet',
      position: 'GK',
      shirtNumber: 1,
      price: 4.8,
      form: 6.5,
      totalPoints: 52,
      goals: 0,
      assists: 0,
      cleanSheets: 5,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1320,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Thamsanqa Mkhize',
      position: 'DEF',
      shirtNumber: 2,
      price: 5.5,
      form: 6.8,
      totalPoints: 62,
      goals: 1,
      assists: 4,
      cleanSheets: 5,
      xG: 0.5,
      xA: 3.2,
      minutesPlayed: 1280,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Thabo Nodada',
      position: 'MID',
      shirtNumber: 8,
      price: 6.2,
      form: 7.0,
      totalPoints: 75,
      goals: 3,
      assists: 5,
      cleanSheets: 0,
      xG: 2.5,
      xA: 4.8,
      minutesPlayed: 1350,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Mduduzi Mdantsane',
      position: 'MID',
      shirtNumber: 10,
      price: 6.5,
      form: 7.2,
      totalPoints: 80,
      goals: 4,
      assists: 4,
      cleanSheets: 0,
      xG: 3.8,
      xA: 3.5,
      minutesPlayed: 1200,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Khanyisa Mayo',
      position: 'FWD',
      shirtNumber: 9,
      price: 7.0,
      form: 7.5,
      totalPoints: 90,
      goals: 8,
      assists: 3,
      cleanSheets: 0,
      xG: 7.2,
      xA: 2.5,
      minutesPlayed: 1180,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Jaime Mendes',
      position: 'FWD',
      shirtNumber: 17,
      price: 5.5,
      form: 6.3,
      totalPoints: 58,
      goals: 4,
      assists: 2,
      cleanSheets: 0,
      xG: 3.2,
      xA: 1.8,
      minutesPlayed: 980,
      yellowCards: 0,
      redCards: 0,
    },
  ],
  'Cape Town Spurs': [
    {
      name: 'Mihlali Mayambela',
      position: 'GK',
      shirtNumber: 1,
      price: 3.8,
      form: 4.5,
      totalPoints: 30,
      goals: 0,
      assists: 0,
      cleanSheets: 1,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1180,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Mkhululi Dlamini',
      position: 'DEF',
      shirtNumber: 2,
      price: 4.0,
      form: 4.5,
      totalPoints: 35,
      goals: 0,
      assists: 1,
      cleanSheets: 1,
      xG: 0.1,
      xA: 0.5,
      minutesPlayed: 1100,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Mogamad De Goede',
      position: 'MID',
      shirtNumber: 8,
      price: 4.2,
      form: 4.8,
      totalPoints: 40,
      goals: 1,
      assists: 1,
      cleanSheets: 0,
      xG: 0.8,
      xA: 0.5,
      minutesPlayed: 980,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Thabo Mbhele',
      position: 'MID',
      shirtNumber: 10,
      price: 4.2,
      form: 4.5,
      totalPoints: 38,
      goals: 1,
      assists: 1,
      cleanSheets: 0,
      xG: 0.5,
      xA: 0.8,
      minutesPlayed: 920,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Boipelo Tshemere',
      position: 'FWD',
      shirtNumber: 9,
      price: 4.5,
      form: 4.8,
      totalPoints: 42,
      goals: 2,
      assists: 1,
      cleanSheets: 0,
      xG: 1.8,
      xA: 0.5,
      minutesPlayed: 850,
      yellowCards: 0,
      redCards: 0,
    },
  ],
  'AmaZulu FC': [
    {
      name: 'Veli Mothwa',
      position: 'GK',
      shirtNumber: 1,
      price: 4.2,
      form: 5.5,
      totalPoints: 40,
      goals: 0,
      assists: 0,
      cleanSheets: 3,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1280,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Ramahlwe Mphahlele',
      position: 'DEF',
      shirtNumber: 2,
      price: 4.5,
      form: 5.5,
      totalPoints: 45,
      goals: 0,
      assists: 1,
      cleanSheets: 3,
      xG: 0.2,
      xA: 0.5,
      minutesPlayed: 1200,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Makhehlene Makhaula',
      position: 'MID',
      shirtNumber: 8,
      price: 5.0,
      form: 5.8,
      totalPoints: 52,
      goals: 1,
      assists: 2,
      cleanSheets: 0,
      xG: 0.8,
      xA: 1.5,
      minutesPlayed: 1150,
      yellowCards: 3,
      redCards: 0,
    },
    {
      name: 'George Maluleka',
      position: 'MID',
      shirtNumber: 10,
      price: 5.5,
      form: 6.0,
      totalPoints: 58,
      goals: 2,
      assists: 3,
      cleanSheets: 0,
      xG: 1.5,
      xA: 2.2,
      minutesPlayed: 1080,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Bongi Ntuli',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.8,
      form: 6.2,
      totalPoints: 62,
      goals: 4,
      assists: 1,
      cleanSheets: 0,
      xG: 3.5,
      xA: 0.8,
      minutesPlayed: 980,
      yellowCards: 1,
      redCards: 0,
    },
  ],
  'Golden Arrows': [
    {
      name: 'Nkosingiphile Gumede',
      position: 'GK',
      shirtNumber: 1,
      price: 4.2,
      form: 5.8,
      totalPoints: 42,
      goals: 0,
      assists: 0,
      cleanSheets: 3,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1250,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Blessing Moyo',
      position: 'DEF',
      shirtNumber: 2,
      price: 4.5,
      form: 5.8,
      totalPoints: 48,
      goals: 0,
      assists: 2,
      cleanSheets: 3,
      xG: 0.2,
      xA: 1.2,
      minutesPlayed: 1180,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Ntsako Makhubela',
      position: 'MID',
      shirtNumber: 10,
      price: 5.2,
      form: 6.0,
      totalPoints: 58,
      goals: 2,
      assists: 3,
      cleanSheets: 0,
      xG: 1.5,
      xA: 2.8,
      minutesPlayed: 1100,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Pule Mmodi',
      position: 'MID',
      shirtNumber: 11,
      price: 5.5,
      form: 6.5,
      totalPoints: 68,
      goals: 3,
      assists: 3,
      cleanSheets: 0,
      xG: 2.2,
      xA: 2.5,
      minutesPlayed: 1050,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Ryan Moon',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.5,
      form: 6.2,
      totalPoints: 60,
      goals: 4,
      assists: 2,
      cleanSheets: 0,
      xG: 3.2,
      xA: 1.5,
      minutesPlayed: 980,
      yellowCards: 1,
      redCards: 0,
    },
  ],
  'Richards Bay FC': [
    {
      name: 'Salim Jamal Magoola',
      position: 'GK',
      shirtNumber: 1,
      price: 4.0,
      form: 5.0,
      totalPoints: 35,
      goals: 0,
      assists: 0,
      cleanSheets: 2,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1200,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Sibusiso Mthethwa',
      position: 'DEF',
      shirtNumber: 2,
      price: 4.2,
      form: 5.0,
      totalPoints: 38,
      goals: 0,
      assists: 1,
      cleanSheets: 2,
      xG: 0.1,
      xA: 0.3,
      minutesPlayed: 1150,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Ndiviwe Mdabuka',
      position: 'MID',
      shirtNumber: 8,
      price: 4.5,
      form: 5.2,
      totalPoints: 45,
      goals: 1,
      assists: 2,
      cleanSheets: 0,
      xG: 0.5,
      xA: 1.2,
      minutesPlayed: 1080,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Katlego Appollis',
      position: 'MID',
      shirtNumber: 11,
      price: 4.8,
      form: 5.5,
      totalPoints: 48,
      goals: 1,
      assists: 2,
      cleanSheets: 0,
      xG: 0.8,
      xA: 1.5,
      minutesPlayed: 1020,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Yanela Mbuthuma',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.0,
      form: 5.5,
      totalPoints: 50,
      goals: 3,
      assists: 1,
      cleanSheets: 0,
      xG: 2.2,
      xA: 0.8,
      minutesPlayed: 920,
      yellowCards: 1,
      redCards: 0,
    },
  ],
  'Royal AM': [
    {
      name: 'Xolani Ngcobo',
      position: 'GK',
      shirtNumber: 1,
      price: 4.0,
      form: 5.2,
      totalPoints: 38,
      goals: 0,
      assists: 0,
      cleanSheets: 2,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1180,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Thabo Matlaba',
      position: 'DEF',
      shirtNumber: 4,
      price: 4.5,
      form: 5.3,
      totalPoints: 42,
      goals: 0,
      assists: 2,
      cleanSheets: 2,
      xG: 0.2,
      xA: 1.2,
      minutesPlayed: 1100,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Ruzaigh Gamildien',
      position: 'MID',
      shirtNumber: 10,
      price: 5.2,
      form: 5.8,
      totalPoints: 55,
      goals: 2,
      assists: 2,
      cleanSheets: 0,
      xG: 1.5,
      xA: 1.8,
      minutesPlayed: 1050,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Andre De Jong',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.5,
      form: 6.0,
      totalPoints: 58,
      goals: 4,
      assists: 1,
      cleanSheets: 0,
      xG: 3.2,
      xA: 0.5,
      minutesPlayed: 980,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Motebang Sera',
      position: 'FWD',
      shirtNumber: 17,
      price: 5.0,
      form: 5.5,
      totalPoints: 50,
      goals: 3,
      assists: 1,
      cleanSheets: 0,
      xG: 2.5,
      xA: 0.8,
      minutesPlayed: 920,
      yellowCards: 0,
      redCards: 0,
    },
  ],
  'Chippa United': [
    {
      name: 'Stanley Nwabali',
      position: 'GK',
      shirtNumber: 1,
      price: 4.5,
      form: 6.0,
      totalPoints: 48,
      goals: 0,
      assists: 0,
      cleanSheets: 4,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1320,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Roscoe Pietersen',
      position: 'DEF',
      shirtNumber: 4,
      price: 4.8,
      form: 6.0,
      totalPoints: 52,
      goals: 1,
      assists: 1,
      cleanSheets: 4,
      xG: 0.8,
      xA: 0.5,
      minutesPlayed: 1280,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Thabiso Lebitso',
      position: 'MID',
      shirtNumber: 8,
      price: 5.0,
      form: 6.2,
      totalPoints: 58,
      goals: 2,
      assists: 3,
      cleanSheets: 0,
      xG: 1.2,
      xA: 2.5,
      minutesPlayed: 1180,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Azola Tshobeni',
      position: 'MID',
      shirtNumber: 10,
      price: 5.2,
      form: 6.0,
      totalPoints: 55,
      goals: 1,
      assists: 3,
      cleanSheets: 0,
      xG: 0.8,
      xA: 2.2,
      minutesPlayed: 1120,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Ettiene Ikenne',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.5,
      form: 6.2,
      totalPoints: 60,
      goals: 4,
      assists: 2,
      cleanSheets: 0,
      xG: 3.5,
      xA: 1.5,
      minutesPlayed: 1050,
      yellowCards: 1,
      redCards: 0,
    },
  ],
  'Moroka Swallows': [
    {
      name: 'Daniel Akpeyi',
      position: 'GK',
      shirtNumber: 1,
      price: 4.2,
      form: 5.5,
      totalPoints: 42,
      goals: 0,
      assists: 0,
      cleanSheets: 3,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1250,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Keegan Allan',
      position: 'DEF',
      shirtNumber: 2,
      price: 4.5,
      form: 5.5,
      totalPoints: 45,
      goals: 0,
      assists: 1,
      cleanSheets: 3,
      xG: 0.2,
      xA: 0.5,
      minutesPlayed: 1180,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Dillon Solomons',
      position: 'MID',
      shirtNumber: 8,
      price: 5.0,
      form: 5.8,
      totalPoints: 52,
      goals: 1,
      assists: 2,
      cleanSheets: 0,
      xG: 0.8,
      xA: 1.5,
      minutesPlayed: 1100,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Lebogang Mothiba',
      position: 'MID',
      shirtNumber: 10,
      price: 5.2,
      form: 6.0,
      totalPoints: 55,
      goals: 2,
      assists: 2,
      cleanSheets: 0,
      xG: 1.5,
      xA: 1.2,
      minutesPlayed: 1050,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Kwanda Mngonyama',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.2,
      form: 5.8,
      totalPoints: 55,
      goals: 3,
      assists: 1,
      cleanSheets: 0,
      xG: 2.5,
      xA: 0.8,
      minutesPlayed: 980,
      yellowCards: 1,
      redCards: 0,
    },
  ],
  'Polokwane City': [
    {
      name: 'Oswin Appollis',
      position: 'GK',
      shirtNumber: 1,
      price: 4.2,
      form: 5.8,
      totalPoints: 44,
      goals: 0,
      assists: 0,
      cleanSheets: 3,
      xG: 0.0,
      xA: 0.0,
      minutesPlayed: 1200,
      yellowCards: 0,
      redCards: 0,
    },
    {
      name: 'Bulelani Nikani',
      position: 'DEF',
      shirtNumber: 4,
      price: 4.5,
      form: 5.8,
      totalPoints: 48,
      goals: 0,
      assists: 2,
      cleanSheets: 3,
      xG: 0.3,
      xA: 1.2,
      minutesPlayed: 1150,
      yellowCards: 2,
      redCards: 0,
    },
    {
      name: 'Thabiso Semenya',
      position: 'MID',
      shirtNumber: 8,
      price: 5.0,
      form: 6.0,
      totalPoints: 55,
      goals: 2,
      assists: 3,
      cleanSheets: 0,
      xG: 1.5,
      xA: 2.2,
      minutesPlayed: 1100,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Douglas Mapfumo',
      position: 'MID',
      shirtNumber: 10,
      price: 5.2,
      form: 6.2,
      totalPoints: 58,
      goals: 2,
      assists: 4,
      cleanSheets: 0,
      xG: 1.8,
      xA: 3.5,
      minutesPlayed: 1050,
      yellowCards: 1,
      redCards: 0,
    },
    {
      name: 'Thobile Mthembu',
      position: 'FWD',
      shirtNumber: 9,
      price: 5.5,
      form: 6.3,
      totalPoints: 62,
      goals: 4,
      assists: 2,
      cleanSheets: 0,
      xG: 3.2,
      xA: 1.5,
      minutesPlayed: 980,
      yellowCards: 0,
      redCards: 0,
    },
  ],
}

// ==================== UPCOMING MATCHES (Next 2 Weeks) ====================

interface MatchFixture {
  homeTeam: string
  awayTeam: string
  league: string
  dayOffset: number
  hour: number
  minute: number
}

const UPCOMING_MATCHES: MatchFixture[] = [
  // Week 1 - DStv Premiership
  { homeTeam: 'Kaizer Chiefs', awayTeam: 'Orlando Pirates', league: 'DStv Premiership', dayOffset: 1, hour: 15, minute: 0 },
  { homeTeam: 'Mamelodi Sundowns', awayTeam: 'Stellenbosch FC', league: 'DStv Premiership', dayOffset: 2, hour: 18, minute: 0 },
  { homeTeam: 'Sekhukhune United', awayTeam: 'TS Galaxy', league: 'DStv Premiership', dayOffset: 3, hour: 15, minute: 30 },
  { homeTeam: 'SuperSport United', awayTeam: 'AmaZulu FC', league: 'DStv Premiership', dayOffset: 3, hour: 18, minute: 0 },
  { homeTeam: 'Cape Town City', awayTeam: 'Cape Town Spurs', league: 'DStv Premiership', dayOffset: 4, hour: 19, minute: 30 },
  { homeTeam: 'Golden Arrows', awayTeam: 'Richards Bay FC', league: 'DStv Premiership', dayOffset: 5, hour: 15, minute: 0 },
  { homeTeam: 'Royal AM', awayTeam: 'Chippa United', league: 'DStv Premiership', dayOffset: 5, hour: 17, minute: 30 },
  { homeTeam: 'Moroka Swallows', awayTeam: 'Polokwane City', league: 'DStv Premiership', dayOffset: 6, hour: 15, minute: 0 },
  
  // Week 2 - DStv Premiership
  { homeTeam: 'Orlando Pirates', awayTeam: 'Mamelodi Sundowns', league: 'DStv Premiership', dayOffset: 8, hour: 15, minute: 0 },
  { homeTeam: 'Kaizer Chiefs', awayTeam: 'Cape Town City', league: 'DStv Premiership', dayOffset: 9, hour: 18, minute: 0 },
  { homeTeam: 'Stellenbosch FC', awayTeam: 'SuperSport United', league: 'DStv Premiership', dayOffset: 10, hour: 15, minute: 30 },
  { homeTeam: 'TS Galaxy', awayTeam: 'Golden Arrows', league: 'DStv Premiership', dayOffset: 10, hour: 18, minute: 0 },
  { homeTeam: 'AmaZulu FC', awayTeam: 'Royal AM', league: 'DStv Premiership', dayOffset: 11, hour: 19, minute: 30 },
  { homeTeam: 'Richards Bay FC', awayTeam: 'Moroka Swallows', league: 'DStv Premiership', dayOffset: 12, hour: 15, minute: 0 },
  { homeTeam: 'Chippa United', awayTeam: 'Sekhukhune United', league: 'DStv Premiership', dayOffset: 12, hour: 17, minute: 30 },
  { homeTeam: 'Polokwane City', awayTeam: 'Cape Town Spurs', league: 'DStv Premiership', dayOffset: 13, hour: 15, minute: 0 },
  
  // Nedbank Cup fixtures
  { homeTeam: 'Kaizer Chiefs', awayTeam: 'Moroka Swallows', league: 'Nedbank Cup', dayOffset: 14, hour: 18, minute: 0 },
  { homeTeam: 'Orlando Pirates', awayTeam: 'Polokwane City', league: 'Nedbank Cup', dayOffset: 15, hour: 15, minute: 0 },
  { homeTeam: 'Mamelodi Sundowns', awayTeam: 'Royal AM', league: 'Nedbank Cup', dayOffset: 15, hour: 18, minute: 0 },
  
  // Carling Black Label Cup
  { homeTeam: 'Kaizer Chiefs', awayTeam: 'Orlando Pirates', league: 'Carling Black Label Cup', dayOffset: 7, hour: 15, minute: 0 },
]

// ==================== GAMEWEEKS (Next 5) ====================

interface GameweekData {
  number: number
  name: string
  deadlineDayOffset: number
  isActive: boolean
  isCurrent: boolean
}

const GAMEWEEKS: GameweekData[] = [
  { number: 15, name: 'Gameweek 15', deadlineDayOffset: 1, isActive: true, isCurrent: true },
  { number: 16, name: 'Gameweek 16', deadlineDayOffset: 8, isActive: true, isCurrent: false },
  { number: 17, name: 'Gameweek 17', deadlineDayOffset: 15, isActive: false, isCurrent: false },
  { number: 18, name: 'Gameweek 18', deadlineDayOffset: 22, isActive: false, isCurrent: false },
  { number: 19, name: 'Gameweek 19', deadlineDayOffset: 29, isActive: false, isCurrent: false },
]

// ==================== SAMPLE VALUE BETS ====================

interface ValueBetData {
  matchId: string
  prediction: 'home' | 'draw' | 'away'
  confidence: number
  edge: number
  kellyFraction: number
  isPremium: boolean
}

// ==================== HELPER FUNCTIONS ====================

function generateOdds(team: string, type: 'home' | 'draw' | 'away'): number {
  // Strong teams
  const strongTeams = [
    'Mamelodi Sundowns', 'Orlando Pirates', 'Kaizer Chiefs',
    'Stellenbosch FC', 'SuperSport United', 'Cape Town City'
  ]
  
  const isStrong = strongTeams.includes(team)
  
  if (type === 'home') {
    return isStrong ? Math.random() * 0.8 + 1.3 : Math.random() * 1.5 + 2.0
  } else if (type === 'draw') {
    return Math.random() * 0.5 + 3.0
  } else {
    return isStrong ? Math.random() * 2 + 3.0 : Math.random() * 1.5 + 2.0
  }
}

function calculateImpliedProbability(odds: number): number {
  return 1 / odds
}

// ==================== SEED FUNCTIONS ====================

async function seedLeagues() {
  console.log('🏆 Seeding PSL Leagues...')
  
  const leagueIds: Record<string, string> = {}
  
  for (const leagueData of PSL_LEAGUES) {
    const league = await db.league.create({
      data: {
        name: leagueData.name,
        country: leagueData.country,
        logo: leagueData.logo,
        isActive: true,
      }
    })
    leagueIds[leagueData.name] = league.id
    console.log(`  ✓ Created league: ${leagueData.name}`)
  }
  
  return leagueIds
}

async function seedTeams(leagueIds: Record<string, string>) {
  console.log('⚽ Seeding PSL Teams...')
  
  const teamIds: Record<string, string> = {}
  const dstvLeagueId = leagueIds['DStv Premiership']
  
  for (const teamData of PSL_TEAMS) {
    const team = await db.team.create({
      data: {
        name: teamData.name,
        country: 'South Africa',
        leagueId: dstvLeagueId,
        form: teamData.form,
        goalsScored: teamData.goalsScored,
        goalsConceded: teamData.goalsConceded,
      }
    })
    teamIds[teamData.name] = team.id
    console.log(`  ✓ Created team: ${teamData.name} (${teamData.location})`)
  }
  
  return teamIds
}

async function seedPlayers(teamIds: Record<string, string>) {
  console.log('👥 Seeding Players...')
  
  let totalPlayers = 0
  
  for (const [teamName, players] of Object.entries(PLAYERS_BY_TEAM)) {
    const teamId = teamIds[teamName]
    if (!teamId) {
      console.log(`  ⚠ Team not found: ${teamName}`)
      continue
    }
    
    for (const playerData of players) {
      await db.player.create({
        data: {
          teamId,
          name: playerData.name,
          position: playerData.position,
          shirtNumber: playerData.shirtNumber,
          price: playerData.price,
          priceChange: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)), // Random price change -0.2 to +0.2
          form: playerData.form,
          totalPoints: playerData.totalPoints,
          goals: playerData.goals,
          assists: playerData.assists,
          cleanSheets: playerData.cleanSheets,
          yellowCards: playerData.yellowCards,
          redCards: playerData.redCards,
          minutesPlayed: playerData.minutesPlayed,
          expectedGoals: playerData.xG,
          expectedAssists: playerData.xA,
          ownershipPercent: Math.random() * 50 + 5,
          isActive: true,
        }
      })
      totalPlayers++
    }
    console.log(`  ✓ Created ${players.length} players for ${teamName}`)
  }
  
  console.log(`  📊 Total players created: ${totalPlayers}`)
}

async function seedMatches(
  teamIds: Record<string, string>,
  leagueIds: Record<string, string>
) {
  console.log('📅 Seeding Matches (Next 2 Weeks)...')
  
  const now = new Date()
  const matchIds: string[] = []
  
  for (const fixture of UPCOMING_MATCHES) {
    const homeTeamId = teamIds[fixture.homeTeam]
    const awayTeamId = teamIds[fixture.awayTeam]
    const leagueId = leagueIds[fixture.league]
    
    if (!homeTeamId || !awayTeamId || !leagueId) {
      console.log(`  ⚠ Missing data for: ${fixture.homeTeam} vs ${fixture.awayTeam}`)
      continue
    }
    
    const kickoffTime = setTime(addDays(now, fixture.dayOffset), fixture.hour, fixture.minute)
    
    const match = await db.match.create({
      data: {
        leagueId,
        homeTeamId,
        awayTeamId,
        kickoffTime,
        status: 'scheduled',
      }
    })
    
    // Create odds for the match
    const homeWin = generateOdds(fixture.homeTeam, 'home')
    const draw = generateOdds(fixture.homeTeam, 'draw')
    const awayWin = generateOdds(fixture.awayTeam, 'away')
    
    await db.odds.create({
      data: {
        matchId: match.id,
        homeWin: parseFloat(homeWin.toFixed(2)),
        draw: parseFloat(draw.toFixed(2)),
        awayWin: parseFloat(awayWin.toFixed(2)),
        over25: parseFloat((Math.random() * 0.5 + 1.7).toFixed(2)),
        under25: parseFloat((Math.random() * 0.5 + 1.9).toFixed(2)),
        bttsYes: parseFloat((Math.random() * 0.3 + 1.75).toFixed(2)),
        bttsNo: parseFloat((Math.random() * 0.3 + 1.95).toFixed(2)),
        homeDraw: parseFloat((Math.random() * 0.25 + 1.35).toFixed(2)),
        homeAway: parseFloat((Math.random() * 0.2 + 1.25).toFixed(2)),
        drawAway: parseFloat((Math.random() * 0.25 + 1.45).toFixed(2)),
        bookmaker: 'aggregate',
        homeWinOpen: parseFloat(homeWin.toFixed(2)),
        drawOpen: parseFloat(draw.toFixed(2)),
        awayWinOpen: parseFloat(awayWin.toFixed(2)),
      }
    })
    
    matchIds.push(match.id)
    console.log(`  ✓ Created match: ${fixture.homeTeam} vs ${fixture.awayTeam} (${fixture.league})`)
  }
  
  console.log(`  📊 Total matches created: ${matchIds.length}`)
  return matchIds
}

async function seedGameweeks() {
  console.log('🎮 Seeding Gameweeks (Next 5)...')
  
  const now = new Date()
  
  for (const gwData of GAMEWEEKS) {
    const deadline = setTime(addDays(now, gwData.deadlineDayOffset), 11, 30)
    
    await db.gameweek.create({
      data: {
        number: gwData.number,
        name: gwData.name,
        deadline,
        isActive: gwData.isActive,
        isCurrent: gwData.isCurrent,
      }
    })
    console.log(`  ✓ Created ${gwData.name} (deadline: ${deadline.toISOString()})`)
  }
}

async function seedValueBets(matchIds: string[]) {
  console.log('💎 Seeding Sample Value Bets...')
  
  if (matchIds.length === 0) {
    console.log('  ⚠ No matches available for value bets')
    return
  }
  
  // Create value bets for first few matches
  const valueBetSamples = [
    { prediction: 'home', confidence: 75.5, edge: 8.2, kellyFraction: 0.12, isPremium: false },
    { prediction: 'away', confidence: 62.3, edge: 5.8, kellyFraction: 0.08, isPremium: false },
    { prediction: 'home', confidence: 82.1, edge: 12.5, kellyFraction: 0.18, isPremium: true },
    { prediction: 'draw', confidence: 45.0, edge: 6.5, kellyFraction: 0.05, isPremium: false },
    { prediction: 'home', confidence: 70.8, edge: 7.2, kellyFraction: 0.10, isPremium: false },
  ]
  
  const predictions = ['home', 'draw', 'away']
  
  for (let i = 0; i < Math.min(valueBetSamples.length, matchIds.length); i++) {
    const matchId = matchIds[i]
    const vbData = valueBetSamples[i]
    
    // Get odds for this match
    const odds = await db.odds.findUnique({
      where: { matchId }
    })
    
    if (!odds) continue
    
    // Calculate probabilities
    const homeProb = Math.random() * 30 + 35
    const drawProb = Math.random() * 15 + 20
    const awayProb = 100 - homeProb - drawProb
    
    await db.prediction.create({
      data: {
        matchId,
        userId: null, // AI prediction
        homeWinProb: homeProb / 100,
        drawProb: drawProb / 100,
        awayWinProb: awayProb / 100,
        prediction: vbData.prediction,
        confidence: vbData.confidence,
        isValueBet: true,
        edge: vbData.edge,
        kellyFraction: vbData.kellyFraction,
        result: 'pending',
        isPremium: vbData.isPremium,
        price: vbData.isPremium ? 49.99 : null,
      }
    })
    console.log(`  ✓ Created value bet for match ${i + 1} (${vbData.prediction}, edge: ${vbData.edge}%)`)
  }
}

async function seedAdminUser() {
  console.log('👤 Seeding Admin User...')
  
  const existingAdmin = await db.user.findUnique({
    where: { email: 'admin@43v3rbet.ai' }
  })
  
  if (existingAdmin) {
    console.log('  ⚠ Admin user already exists, skipping...')
    return
  }
  
  const admin = await db.user.create({
    data: {
      email: 'admin@43v3rbet.ai',
      username: 'admin',
      passwordHash: '$2a$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // password: admin123
      name: 'System Administrator',
      role: 'admin',
    }
  })
  
  await db.wallet.create({
    data: {
      userId: admin.id,
      balance: 10000,
      virtualBalance: 10000,
      totalProfit: 0,
      totalBets: 0,
      winRate: 0,
      roi: 0,
    }
  })
  
  console.log('  ✓ Created admin user (email: admin@43v3rbet.ai, password: admin123)')
}

async function seedTipsters() {
  console.log('🌟 Seeding Featured Tipsters...')
  
  const tipsters = [
    {
      username: 'psl_predictor',
      email: 'pslpredictor@43v3rbet.ai',
      name: 'PSL Predictor',
      displayName: 'PSL Predictor',
      bio: 'South African football expert with 8+ years analyzing PSL matches. Specializing in DStv Premiership predictions.',
      isVerified: true,
      isFeatured: true,
      roi: 21.5,
      winRate: 68.2,
      totalTips: 187,
      wins: 128,
      losses: 59,
      profit: 18750.00,
      monthlyPrice: 29.99,
      weeklyPrice: 9.99,
      singleTipPrice: 4.99,
    },
    {
      username: 'safari_tipster',
      email: 'safaritipster@43v3rbet.ai',
      name: 'Safari Tipster',
      displayName: 'Safari Tipster',
      bio: 'African football specialist covering PSL, African Cup of Nations, and CAF competitions.',
      isVerified: true,
      isFeatured: true,
      roi: 18.8,
      winRate: 65.5,
      totalTips: 245,
      wins: 161,
      losses: 84,
      profit: 15200.00,
      monthlyPrice: 24.99,
      weeklyPrice: 7.99,
      singleTipPrice: 3.99,
    },
    {
      username: 'value_hunter_sa',
      email: 'valuehunter@43v3rbet.ai',
      name: 'Value Hunter SA',
      displayName: 'Value Hunter SA',
      bio: 'Finding value bets in South African football. Data-driven approach with Kelly Criterion stake sizing.',
      isVerified: true,
      isFeatured: false,
      roi: 16.2,
      winRate: 62.8,
      totalTips: 312,
      wins: 196,
      losses: 116,
      profit: 12800.00,
      monthlyPrice: 19.99,
      weeklyPrice: 5.99,
      singleTipPrice: 2.99,
    },
  ]
  
  for (const tipsterData of tipsters) {
    const user = await db.user.create({
      data: {
        email: tipsterData.email,
        username: tipsterData.username,
        passwordHash: '$2a$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm',
        name: tipsterData.name,
        role: 'tipster',
      }
    })
    
    await db.tipster.create({
      data: {
        userId: user.id,
        displayName: tipsterData.displayName,
        bio: tipsterData.bio,
        isVerified: tipsterData.isVerified,
        isFeatured: tipsterData.isFeatured,
        totalTips: tipsterData.totalTips,
        wins: tipsterData.wins,
        losses: tipsterData.losses,
        roi: tipsterData.roi,
        yield: tipsterData.roi * 0.8,
        winRate: tipsterData.winRate,
        avgOdds: 2.15,
        profit: tipsterData.profit,
        monthlyPrice: tipsterData.monthlyPrice,
        weeklyPrice: tipsterData.weeklyPrice,
        singleTipPrice: tipsterData.singleTipPrice,
        followersCount: Math.floor(Math.random() * 500) + 100,
      }
    })
    
    await db.wallet.create({
      data: {
        userId: user.id,
        balance: 5000,
        virtualBalance: 5000,
        totalProfit: tipsterData.profit,
        totalBets: tipsterData.totalTips,
        winRate: tipsterData.winRate,
        roi: tipsterData.roi,
      }
    })
    
    console.log(`  ✓ Created tipster: ${tipsterData.displayName}`)
  }
}

// ==================== MAIN SEED FUNCTION ====================

async function main() {
  console.log('\n🚀 Starting 43V3R BET AI Database Seed...\n')
  console.log('=' .repeat(50))
  
  try {
    // Clear existing data (in correct order due to foreign keys)
    console.log('\n🧹 Cleaning existing data...\n')
    
    await db.playerGameweekStat.deleteMany()
    await db.player.deleteMany()
    await db.gameweek.deleteMany()
    await db.oddsHistory.deleteMany()
    await db.odds.deleteMany()
    await db.prediction.deleteMany()
    await db.bet.deleteMany()
    await db.match.deleteMany()
    await db.tip.deleteMany()
    await db.subscription.deleteMany()
    await db.copyBetSetting.deleteMany()
    await db.tipster.deleteMany()
    await db.wallet.deleteMany()
    await db.user.deleteMany()
    await db.leaderboardEntry.deleteMany()
    await db.notification.deleteMany()
    await db.transaction.deleteMany()
    await db.like.deleteMany()
    await db.comment.deleteMany()
    await db.follow.deleteMany()
    await db.betSlip.deleteMany()
    await db.team.deleteMany()
    await db.league.deleteMany()
    await db.cachedData.deleteMany()
    await db.predictionHistory.deleteMany()
    await db.referral.deleteMany()
    await db.notificationTemplate.deleteMany()
    await db.systemConfig.deleteMany()
    await db.payment.deleteMany()
    await db.aPIKey.deleteMany()
    
    console.log('  ✓ All existing data cleared\n')
    
    // Seed data in correct order
    const leagueIds = await seedLeagues()
    console.log('')
    
    const teamIds = await seedTeams(leagueIds)
    console.log('')
    
    await seedPlayers(teamIds)
    console.log('')
    
    const matchIds = await seedMatches(teamIds, leagueIds)
    console.log('')
    
    await seedGameweeks()
    console.log('')
    
    await seedValueBets(matchIds)
    console.log('')
    
    await seedAdminUser()
    console.log('')
    
    await seedTipsters()
    
    // Final summary
    console.log('\n' + '='.repeat(50))
    console.log('✅ Database seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log('  - 3 PSL Leagues (DStv Premiership, Nedbank Cup, Carling Black Label Cup)')
    console.log('  - 16 PSL Teams with locations')
    console.log(`  - ${Object.values(PLAYERS_BY_TEAM).flat().length} Players with xG/xA stats`)
    console.log(`  - ${UPCOMING_MATCHES.length} Upcoming Matches (Next 2 Weeks)`)
    console.log(`  - ${GAMEWEEKS.length} Gameweeks`)
    console.log('  - 5 Sample Value Bets')
    console.log('  - 1 Admin User')
    console.log('  - 3 Featured Tipsters')
    console.log('\n🔐 Admin credentials:')
    console.log('  Email: admin@43v3rbet.ai')
    console.log('  Password: admin123\n')
    
  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    throw error
  }
}

// Run the seed
main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
