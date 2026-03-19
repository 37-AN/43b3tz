# 43V3R BET AI - Complete System Documentation

> **Version:** 2.0.0 | **Last Updated:** 2025 | **Target Market:** South Africa PSL

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Mini Services](#mini-services)
6. [API Reference](#api-reference)
7. [AI/ML Engine](#aiml-engine)
8. [Payment Integration](#payment-integration)
9. [Fantasy Sports System](#fantasy-sports-system)
10. [Tipster Marketplace](#tipster-marketplace)
11. [Subscription System](#subscription-system)
12. [Real-time Features](#real-time-features)
13. [Frontend Components](#frontend-components)
14. [Security](#security)
15. [Deployment](#deployment)
16. [Configuration](#configuration)
17. [Development Guidelines](#development-guidelines)

---

## 🎯 Executive Summary

**43V3R BET AI** is a comprehensive sports betting intelligence platform designed for the South African Premier Soccer League (PSL) market. The platform combines AI-powered predictions, value bet detection, fantasy sports, and a tipster marketplace into a unified betting intelligence ecosystem.

### Key Features

| Feature | Description |
|---------|-------------|
| **AI Predictions** | Ensemble ML model (MiroFish + Logistic Regression + Gradient Boosting) |
| **Value Bet Detection** | Edge >5%, Kelly Criterion stake sizing, CLV tracking |
| **Fantasy Sports** | Full FPL-style game with live scoring, transfers, leagues |
| **Tipster Marketplace** | Verified tipsters with copy-betting functionality |
| **Real-time Updates** | Socket.io powered live odds and match updates |
| **Payment Integration** | PayFast, Ozow, USDT/BTC cryptocurrency |

### Business Model

```
┌─────────────────────────────────────────────────────────────┐
│                    REVENUE STREAMS                          │
├─────────────────────────────────────────────────────────────┤
│  Subscription Plans:                                        │
│  ├── Free (R0)      → Basic predictions, 1 tipster follow   │
│  ├── Pro (R199/mo)  → AI predictions, 5 tipsters, copy bet  │
│  └── Premium (R499) → Unlimited tipsters, VIP support       │
│                                                             │
│  Tipster Commissions: 10% of subscription revenue           │
│  Premium Tips: Individual tip purchases (R10-R50)           │
│  Fantasy Leagues: Private league entry fees                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                 Next.js 16 App Router (Port 3000)               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │   Pages     │  │ Components  │  │   State Management     │  │    │
│  │  │  (React 19) │  │  (shadcn)   │  │      (Zustand)         │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js API Routes                             │   │
│  │  /api/auth │ /api/bets │ /api/predictions │ /api/fantasy/*       │   │
│  │  /api/wallet │ /api/tipsters │ /api/payments │ /api/matches      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────────┐
│    DATABASE     │      │     CACHE       │      │   MINI SERVICES     │
│  ┌───────────┐  │      │  ┌───────────┐  │      │  ┌───────────────┐  │
│  │  SQLite   │  │      │  │Mock Redis │  │      │  │ AI Engine     │  │
│  │ (Prisma)  │  │      │  │ (In-Mem)  │  │      │  │ Port: 3006    │  │
│  └───────────┘  │      │  └───────────┘  │      │  ├───────────────┤  │
│                 │      │                 │      │  │ Scraper       │  │
│  35+ Models     │      │  TTL Caching    │      │  │ Port: 3005    │  │
│  PSL Data       │      │  Rate Limiting  │      │  ├───────────────┤  │
│                 │      │                 │      │  │ Realtime      │  │
│                 │      │                 │      │  │ Port: 3003    │  │
│                 │      │                 │      │  ├───────────────┤  │
│                 │      │                 │      │  │ Telegram Bot  │  │
│                 │      │                 │      │  │ Port: 3007    │  │
│                 │      │                 │      │  └───────────────┘  │
└─────────────────┘      └─────────────────┘      └─────────────────────┘
```

---

## 💻 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | Latest | Component library (New York style) |
| Zustand | 5.0.6 | State management |
| Framer Motion | 12.23.2 | Animations |
| Socket.io Client | 4.8.3 | Real-time communication |
| React Hook Form | 7.60.0 | Form handling |
| Zod | 4.0.2 | Schema validation |
| Recharts | 2.15.4 | Charts |
| date-fns | 4.1.0 | Date utilities |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Prisma | 6.11.1 | ORM |
| SQLite | - | Database (upgradable to PostgreSQL) |
| NextAuth.js | 4.24.11 | Authentication |
| Socket.io | 4.8.3 | Real-time server |

### Mini Services
| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| AI Engine | 3006 | Bun, TypeScript | Ensemble ML predictions |
| Scraper | 3005 | Bun, TypeScript | Data collection |
| Realtime | 3003 | Bun, Socket.io | Live updates |
| Telegram Bot | 3007 | Bun, TypeScript | Channel notifications |

### Payments
| Provider | Type | Environment |
|----------|------|-------------|
| PayFast | South African Gateway | Production/Testing |
| Ozow | Instant EFT | Production/Testing |
| USDT (TRC-20) | Stablecoin | Production |
| Bitcoin | Cryptocurrency | Production |

---

## 🗄️ Database Schema

### Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER SYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  User ──┬── Wallet (1:1)                                                │
│         ├── APIKey (1:N)                                                │
│         ├── Subscription (1:N)                                          │
│         ├── Tipster (1:1, optional)                                     │
│         ├── Bet (1:N)                                                   │
│         ├── Prediction (1:N)                                            │
│         ├── Transaction (1:N)                                           │
│         ├── FantasyTeam (1:N)                                           │
│         └── Referral (1:N)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                        SPORTS DATA                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  League ──── Match (1:N)                                                │
│  Team ──────┬── homeMatches (1:N)                                       │
│             └── awayMatches (1:N)                                       │
│  Match ─────┬── Odds (1:1)                                              │
│             ├── Prediction (1:N)                                        │
│             └── Bet (1:N)                                               │
│  Odds ────── OddsHistory (1:N, tracking)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                        FANTASY SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Player ────┬── Team (N:1)                                              │
│             └── PlayerGameweekStat (1:N)                                │
│  Gameweek ── PlayerGameweekStat (1:N)                                   │
│  FantasyTeam ─┬── Transfer (1:N)                                        │
│               └── FantasyLeagueMember (1:N)                             │
│  FantasyLeague ─── FantasyLeagueMember (1:N)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                       TIPSTER MARKETPLACE                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Tipster ───┬── Tip (1:N)                                               │
│             └── Subscription (1:N)                                      │
│  Tip ───────┬── Like (1:N)                                              │
│             └── Comment (1:N)                                           │
│  CopyBetSetting ─── User (1:1)                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Models

#### User System
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  username      String   @unique
  passwordHash  String
  name          String?
  avatar        String?
  role          String   @default("user") // user, tipster, admin
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  wallet        Wallet?
  tipsterProfile Tipster?
  bets          Bet[]
  predictions   Prediction[]
  subscriptions Subscription[]
  apiKeys       APIKey[]
  payments      Payment[]
  fantasyTeams  FantasyTeam[]
}

model Wallet {
  id              String   @id @default(cuid())
  userId          String   @unique
  balance         Float    @default(0)
  virtualBalance  Float    @default(1000)
  totalProfit     Float    @default(0)
  totalBets       Int      @default(0)
  winRate         Float    @default(0)
  roi             Float    @default(0)
}
```

#### Match & Odds
```prisma
model Match {
  id              String      @id @default(cuid())
  leagueId        String
  homeTeamId      String
  awayTeamId      String
  kickoffTime     DateTime
  status          String      @default("scheduled") // scheduled, live, finished
  homeScore       Int?
  awayScore       Int?
  minute          Int?
  
  odds           Odds?
  predictions    Prediction[]
  bets           Bet[]
}

model Odds {
  id              String   @id @default(cuid())
  matchId         String   @unique
  
  // 1X2 Odds
  homeWin         Float
  draw            Float
  awayWin         Float
  
  // Over/Under 2.5
  over25          Float?
  under25         Float?
  
  // Both Teams to Score
  bttsYes         Float?
  bttsNo          Float?
  
  // Opening odds for CLV calculation
  homeWinOpen     Float?
  drawOpen        Float?
  awayWinOpen     Float?
}
```

#### AI Prediction
```prisma
model Prediction {
  id              String   @id @default(cuid())
  matchId         String
  userId          String?  // null for AI predictions
  
  // AI Model Predictions
  homeWinProb     Float
  drawProb        Float
  awayWinProb     Float
  
  prediction      String   // home, draw, away
  confidence      Float    // 0-100
  
  // Value Bet Analysis
  isValueBet      Boolean  @default(false)
  edge            Float    @default(0)
  kellyFraction   Float    @default(0)
  
  result          String?  // win, loss, pending
  isPremium       Boolean  @default(false)
}

model PredictionHistory {
  id               String    @id @default(cuid())
  matchId          String
  modelVersion     String
  homeWinProb      Float
  drawProb         Float
  awayWinProb      Float
  predictedOutcome String
  actualOutcome    String?
  isCorrect        Boolean?
}
```

#### Fantasy Sports
```prisma
model Player {
  id              String   @id @default(cuid())
  teamId          String
  name            String
  position        String   // GK, DEF, MID, FWD
  shirtNumber     Int
  price           Float    @default(0)
  form            Float    @default(0)
  totalPoints     Int      @default(0)
  goals           Int      @default(0)
  assists         Int      @default(0)
  expectedGoals   Float    @default(0)  // xG
  expectedAssists Float    @default(0)  // xA
  ownershipPercent Float   @default(0)
}

model FantasyTeam {
  id              String   @id @default(cuid())
  userId          String
  name            String
  players         String   // JSON array of player IDs
  captainId       String
  viceCaptainId   String
  budget          Float    @default(100.0)
  totalPoints     Int      @default(0)
  freeTransfers   Int      @default(1)
}

model FantasyLeague {
  id            String   @id @default(cuid())
  name          String
  code          String   @unique  // Join code
  isPublic      Boolean  @default(false)
  maxMembers    Int      @default(20)
  prizePool     Float    @default(0)
}
```

### Database Statistics (Seeded Data)

| Entity | Count |
|--------|-------|
| Leagues | 3 (DStv Premiership, Nedbank Cup, Carling Black Label Cup) |
| Teams | 16 PSL teams |
| Players | 91 (with xG/xA data) |
| Matches | 20 upcoming fixtures |
| Gameweeks | 5 (GW15-GW19) |
| Tipsters | 3 featured |
| Admin User | 1 (admin@43v3rbet.ai) |

---

## 🚀 Mini Services

### 1. AI Engine Service (Port 3006)

The core prediction engine using an ensemble ML model.

#### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    ENSEMBLE MODEL                           │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐     │
│  │  MiroFish   │  │  Logistic   │  │    Gradient     │     │
│  │   Model     │  │ Regression  │  │    Boosting     │     │
│  │   (35%)     │  │   (35%)     │  │     (30%)       │     │
│  └─────────────┘  └─────────────┘  └─────────────────┘     │
│         │                │                   │              │
│         └────────────────┼───────────────────┘              │
│                          ▼                                  │
│              ┌─────────────────────┐                        │
│              │  Weighted Average   │                        │
│              │   + Normalization   │                        │
│              └─────────────────────┘                        │
│                          │                                  │
│                          ▼                                  │
│              ┌─────────────────────┐                        │
│              │  Value Bet Detector │                        │
│              │   + Kelly Criterion │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

#### Model Components

**MiroFish Model (Naive Bayesian)**
- Weighted signals: Odds (35%), Form (25%), H2H (20%), Market (20%)
- Probability estimation from odds patterns
- Historical matchup analysis

**Logistic Regression Model**
- Linear combination of features with sigmoid activation
- Learned coefficients for all input features
- Confidence based on prediction decisiveness

**Gradient Boosting Model**
- 50 decision stumps with learning rate 0.1
- Iteratively improves predictions by focusing on residuals
- Sigmoid transformation for final probabilities

#### Feature Engineering

```typescript
interface MatchFeatures {
  // Odds features
  oddsMovement: number;      // Opening vs closing line (-1 to 1)
  marketVolatility: number;  // Market instability (0 to 1)
  closingLineValue: number;  // CLV percentage (-1 to 1)
  
  // Team form
  homeRecentForm: number;    // Weighted last 5 games
  awayRecentForm: number;
  
  // Head-to-head
  h2hHomeWins: number;
  h2hDraws: number;
  h2hAwayWins: number;
  
  // Context
  leagueStrength: number;    // League quality factor
  homeAdvantage: number;     // Standard 0.15
  
  // Goals
  homeGoalsScored: number;
  awayGoalsScored: number;
}
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict/match` | Single match prediction |
| POST | `/batch-predict` | Multiple matches |
| POST | `/value-bet` | Value bet analysis |
| POST | `/outcome` | Update prediction outcome |
| POST | `/retrain` | Trigger model retraining |
| GET | `/stats` | Model performance stats |
| GET | `/health` | Health check |

#### Value Bet Criteria

```typescript
// Minimum thresholds
const MIN_EDGE_THRESHOLD = 0.05;        // 5%
const MIN_CONFIDENCE_THRESHOLD = 0.65;  // 65%
const MIN_CLOSING_LINE_VALUE = 0;       // 0%

// Kelly Criterion (Half Kelly)
const kellyFraction = (odds - 1) * probability - (1 - probability) / (odds - 1);
const safeKelly = kellyFraction * 0.5;
```

#### Self-Learning System

- Stores all predictions in `PredictionHistory` table
- Records outcomes when matches settle
- Updates ensemble weights based on model performance
- Daily retraining capability

---

### 2. Scraper Service (Port 3005)

Data collection and validation service.

#### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SCRAPER SERVICE                          │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Sources   │───▶│  Validator  │───▶│  Database   │     │
│  │             │    │             │    │             │     │
│  │ • API-Foot  │    │ • Match Val │    │ • Prisma    │     │
│  │ • Odds API  │    │ • Odds Val  │    │ • SQLite    │     │
│  │ • Sportmonk │    │ • Dedupe    │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  Features:                                                  │
│  • Exponential backoff retry                                │
│  • Match deduplication                                      │
│  • Odds change detection                                    │
│  • Configurable intervals                                   │
└─────────────────────────────────────────────────────────────┘
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with DB status |
| GET | `/stats` | Scraper statistics |
| POST | `/scrape` | Manual scrape trigger |
| POST | `/start` | Start scraper |
| POST | `/stop` | Stop scraper |

---

### 3. Real-time Service (Port 3003)

Socket.io server for live updates.

#### Event Channels

| Event | Frequency | Description |
|-------|-----------|-------------|
| `live-matches` | 30 seconds | Match scores and status |
| `odds-update` | 5 seconds | Real-time odds changes |
| `value-bet-alert` | 1 minute | New value bet notifications |
| `match:update` | 30 seconds | Specific match updates |

#### Connection Handling

```typescript
// Client connection
socket.on('connection', () => {
  socket.emit('live-matches', currentMatches);
});

// Room subscription
socket.on('subscribe-match', (matchId) => {
  socket.join(`match:${matchId}`);
});

// Bet placement
socket.on('place-bet', (betData) => {
  socket.emit('bet-confirmed', { success: true, betId });
});
```

---

### 4. Telegram Bot Service (Port 3007)

Automated channel notifications.

#### Scheduled Posts

| Post Type | Time (SAST) | Frequency |
|-----------|-------------|-----------|
| Daily Value Bets | 10:00 | Daily |
| Value Bet Alerts | Every 2 hours | 8 AM - 10 PM |
| Fantasy Captain Picks | 09:00 | Match days |
| Results Summary | 08:00 | Daily |

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/status` | Bot status |
| POST | `/start` | Start bot |
| POST | `/stop` | Stop bot |
| POST | `/daily` | Post daily bets |
| POST | `/value` | Post value bets |
| POST | `/fantasy` | Post fantasy tips |
| POST | `/results` | Post results |
| POST | `/send` | Send custom message |

#### Message Format

```html
🔥 <b>43V3R BET AI - Daily Value Bets</b>
📅 Friday, January 17, 2025

<b>Top 5 AI Value Bets:</b>

<b>1. Kaizer Chiefs vs Orlando Pirates</b>
🏠 <b>Prediction: HOME WIN</b>
📊 League: DStv Premiership
⏰ Kickoff: 15:00 SAST

💰 Odds: <b>2.45</b>
🎯 AI Probability: <b>48.2%</b>
⚡ Edge: <b>+8.7%</b>
🟢 Risk: LOW
📈 Kelly Stake: 4.2%
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| GET | `/api/auth/session` | Get session |

### Matches & Odds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | List matches with filters |
| GET | `/api/matches?id=xxx` | Single match details |

### Predictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/predictions` | AI predictions |
| GET | `/api/predictions?isValueBet=true` | Value bets only |
| POST | `/api/predictions` | Create prediction (admin) |

### Betting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bets` | User's bets |
| POST | `/api/bets` | Place a bet |
| GET | `/api/value-bets` | Current value bets |

### Wallet

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet` | Get wallet balance |
| POST | `/api/wallet` | Deposit/withdraw |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Initiate payment |
| POST | `/api/payments/create-intent` | Create payment intent |
| POST | `/api/payments/callback/[method]` | Payment webhooks |

### Tipsters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tipsters` | List tipsters |
| GET | `/api/tipsters?id=xxx` | Tipster details |
| POST | `/api/subscribe/[tipsterId]` | Subscribe |
| POST | `/api/unsubscribe/[tipsterId]` | Unsubscribe |

### Fantasy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fantasy/players` | List players |
| GET | `/api/fantasy/team` | User's team |
| POST | `/api/fantasy/team` | Create team |
| PUT | `/api/fantasy/team` | Update team |
| GET | `/api/fantasy/leagues` | List leagues |
| POST | `/api/fantasy/leagues` | Create/join league |
| GET | `/api/fantasy/gameweek` | Current gameweek |
| GET | `/api/fantasy/transfers` | Transfer history |
| POST | `/api/fantasy/transfers` | Make transfer |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| PUT | `/api/admin/users` | Update user |
| GET | `/api/admin/stats` | Platform statistics |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/cache` | Cache statistics |
| DELETE | `/api/cache` | Invalidate cache |
| GET | `/api/leaderboard` | Leaderboard data |
| GET | `/api/subscriptions` | Subscription tiers |

---

## 🧠 AI/ML Engine

### Value Bet Detection Algorithm

```typescript
// Step 1: Calculate implied probability with margin removal
const margin = (1/homeOdds) + (1/drawOdds) + (1/awayOdds) - 1;
const homeImplied = (1/homeOdds) / (1 + margin);

// Step 2: Calculate edge
const edge = aiProbability - impliedProbability;

// Step 3: Value bet criteria
const isValueBet = 
  edge > 0.05 &&           // >5% edge
  confidence > 0.65 &&     // >65% confidence
  closingLineValue > 0;    // Beat closing line

// Step 4: Kelly Criterion
const b = odds - 1;
const q = 1 - probability;
const kelly = (b * probability - q) / b;
const safeKelly = kelly * 0.5; // Half Kelly
```

### Risk Assessment Matrix

| Edge | Odds | Confidence | Risk Level | Color |
|------|------|------------|------------|-------|
| >10% | <2.5 | >75% | Low | 🟢 |
| 5-10% | Any | 65-75% | Medium | 🟡 |
| 5-7% | >2.5 | <65% | High | 🔴 |

### League Strength Factors

```typescript
const leagueStrengths = {
  'Premier League': 1.0,
  'La Liga': 0.95,
  'Bundesliga': 0.93,
  'Serie A': 0.92,
  'Ligue 1': 0.88,
  'Champions League': 1.0,
  'DStv Premiership': 0.75,
  'Nedbank Cup': 0.7,
};
```

---

## 💳 Payment Integration

### Supported Methods

#### PayFast (Primary)
```typescript
// Payment flow
1. User selects subscription
2. Generate signature with passphrase
3. Redirect to PayFast
4. ITN callback to /api/payments/callback/payfast
5. Verify signature
6. Update subscription
```

#### Ozow (Instant EFT)
```typescript
// Payment flow
1. Generate hash with API key
2. Redirect to Ozow
3. Callback with success/failure
4. Verify hash
5. Update subscription
```

#### Cryptocurrency
```typescript
// Supported currencies
- USDT (TRC-20)
- Bitcoin

// Process
1. Display wallet address
2. User sends crypto
3. Blockchain confirmation
4. Manual/Admin verification
```

### Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | R0 | Basic predictions, 1 tipster |
| Pro | R199/mo | AI predictions, 5 tipsters, copy betting |
| Premium | R499/mo | Unlimited tipsters, VIP support, premium tips |

---

## ⚽ Fantasy Sports System

### Scoring System

| Action | GK | DEF | MID | FWD |
|--------|-----|-----|-----|-----|
| Goal | 10 | 6 | 5 | 4 |
| Assist | 3 | 3 | 3 | 3 |
| Clean Sheet | 4 | 4 | 1 | 0 |
| Save (GK) | 0.5 | - | - | - |
| Yellow Card | -1 | -1 | -1 | -1 |
| Red Card | -3 | -3 | -3 | -3 |
| 60+ mins | 2 | 2 | 2 | 2 |
| 30-59 mins | 1 | 1 | 1 | 1 |

### Team Constraints

```typescript
const constraints = {
  budget: 100,        // R100 million
  squadSize: 15,      // 15 players
  positions: {
    GK: { min: 1, max: 2 },
    DEF: { min: 3, max: 5 },
    MID: { min: 3, max: 5 },
    FWD: { min: 1, max: 3 },
  },
  maxPerTeam: 3,      // Max 3 players from same club
};
```

### Transfer System

- 1 free transfer per gameweek
- Additional transfers cost 4 points each ("hits")
- Transfers roll over (max 2)
- Captain/vice-captain selection
- Price change tracking

---

## 👑 Tipster Marketplace

### Tipster Profile

```typescript
interface Tipster {
  id: string;
  displayName: string;
  isVerified: boolean;
  isFeatured: boolean;
  
  // Stats
  totalTips: number;
  wins: number;
  losses: number;
  roi: number;         // Return on Investment
  yield: number;       // Profit/Loss percentage
  winRate: number;
  avgOdds: number;
  profit: number;
  
  // Pricing
  monthlyPrice: number;
  weeklyPrice: number;
  singleTipPrice: number;
  
  followersCount: number;
}
```

### Copy Betting

```typescript
interface CopyBetSetting {
  stakeMultiplier: number;   // 0.5 - 3.0
  maxStake: number;          // R100
  minStake: number;          // R10
  maxDailySpend: number;     // R500
  maxOdds: number;           // 10.0
  minOdds: number;           // 1.2
  stopLoss: number;          // R1000
  allowedBetTypes: string[]; // ["1X2", "O/U", "BTTS"]
  isActive: boolean;
}
```

---

## 📡 Real-time Features

### Socket.io Integration

```typescript
// Frontend connection
import { io } from 'socket.io-client';

const socket = io('/?XTransformPort=3003', {
  transports: ['websocket'],
});

// Subscribe to events
socket.on('live-matches', (matches) => {
  updateLiveMatches(matches);
});

socket.on('value-bet-alert', (bet) => {
  showNotification(bet);
});

// Subscribe to specific match
socket.emit('subscribe-match', matchId);
socket.on('match-update', (match) => {
  updateMatch(match);
});
```

---

## 🧩 Frontend Components

### Betting Components

| Component | Location | Description |
|-----------|----------|-------------|
| `MatchCard` | `/components/betting/` | Match display with odds |
| `AIPredictionsPanel` | `/components/betting/` | Value bets list |
| `BetSlip` | `/components/betting/` | Betting cart |
| `Leaderboard` | `/components/betting/` | Top performers |

### Fantasy Components

| Component | Location | Description |
|-----------|----------|-------------|
| `FantasyTeamBuilder` | `/components/fantasy/` | Team creation |
| `FantasyLeagues` | `/components/fantasy/` | League management |
| `AIRecommendations` | `/components/fantasy/` | AI player picks |

### Tipster Components

| Component | Location | Description |
|-----------|----------|-------------|
| `TipsterMarketplace` | `/components/tipster/` | Tipster discovery |

### Admin Components

| Component | Location | Description |
|-----------|----------|-------------|
| `AdminPanel` | `/components/admin/` | Admin dashboard |

---

## 🔐 Security

### Authentication

- **NextAuth.js** with JWT sessions
- 30-day session expiry
- Google OAuth support
- Credentials provider

### Authorization

```typescript
// Role-based access
const roles = {
  user: ['view_predictions', 'place_bets', 'fantasy'],
  tipster: ['post_tips', 'manage_followers'],
  admin: ['manage_users', 'manage_matches', 'analytics'],
};
```

### Rate Limiting

```typescript
const rateLimits = {
  DEFAULT: { requests: 100, window: 60 },
  API_PREDICTIONS: { requests: 50, window: 60 },
  API_BETS: { requests: 30, window: 60 },
  API_AUTH: { requests: 10, window: 60 },
};
```

### Input Validation

- Zod schemas for all inputs
- SQL injection prevention via Prisma
- XSS prevention via React
- CSRF protection via NextAuth

---

## 🚢 Deployment

### Development

```bash
# Start main app
bun run dev

# Start mini services
cd mini-services/ai-engine && bun index.ts &
cd mini-services/realtime-service && bun index.ts &
cd mini-services/scraper-service && bun index.ts &
cd mini-services/telegram-bot && bun index.ts &
```

### Production

```bash
# Build
bun run build

# Start
bun run start
```

### Environment Variables

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Payments
PAYFAST_MERCHANT_ID=""
PAYFAST_MERCHANT_KEY=""
PAYFAST_PASSPHRASE=""
OZOW_SITE_CODE=""
USDT_WALLET=""
BTC_WALLET=""

# Telegram
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Services
AI_ENGINE_PORT=3006
SCRAPER_PORT=3005
REALTIME_PORT=3003
TELEGRAM_PORT=3007
```

---

## ⚙️ Configuration

### Cache TTL

```typescript
const cacheTTL = {
  MATCHES: 5 * 60,        // 5 minutes
  ODDS: 1 * 60,           // 1 minute
  PREDICTIONS: 10 * 60,   // 10 minutes
  VALUE_BETS: 5 * 60,     // 5 minutes
  PLAYER_STATS: 60 * 60,  // 1 hour
  LEADERBOARDS: 1 * 60,   // 1 minute
  TIPSTERS: 15 * 60,      // 15 minutes
};
```

### Gateway Configuration

The system uses a Caddy gateway with port transformation:

```typescript
// API requests to different ports
fetch('/api/predictions?XTransformPort=3006');

// WebSocket connections
io('/?XTransformPort=3003');
```

---

## 📝 Development Guidelines

### Code Style

- TypeScript strict mode
- Functional components with hooks
- Server Components by default
- `'use client'` for client components

### API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

### Error Codes

```typescript
enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
}
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/fantasy-team-builder

# Commit
git commit -m "feat: add fantasy team builder component"

# Push
git push origin feature/fantasy-team-builder
```

---

## 📊 Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # Authentication
│   │   ├── admin/              # Admin endpoints
│   │   ├── bets/               # Betting
│   │   ├── cache/              # Cache management
│   │   ├── fantasy/            # Fantasy sports
│   │   ├── health/             # Health check
│   │   ├── leaderboard/        # Leaderboard
│   │   ├── matches/            # Match data
│   │   ├── payments/           # Payments
│   │   ├── predictions/        # AI predictions
│   │   ├── subscribe/          # Tipster subscribe
│   │   ├── subscriptions/      # User subscriptions
│   │   ├── tipsters/           # Tipster marketplace
│   │   ├── value-bets/         # Value bets
│   │   └── wallet/             # Wallet
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── admin/                  # Admin components
│   ├── betting/                # Betting components
│   ├── fantasy/                # Fantasy components
│   ├── layout/                 # Layout components
│   ├── tipster/                # Tipster components
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── auth.ts                 # NextAuth config
│   ├── redis.ts                # Cache utilities
│   └── ...                     # Other utilities
├── store/                      # Zustand stores
├── types/                      # TypeScript types
└── prisma/
    ├── schema.prisma           # Database schema
    └── seed.ts                 # Seed data

mini-services/
├── ai-engine/                  # AI prediction engine
│   ├── index.ts
│   └── package.json
├── realtime-service/           # Socket.io server
│   ├── index.ts
│   └── package.json
├── scraper-service/            # Data collection
│   ├── index.ts
│   ├── lib/
│   └── package.json
└── telegram-bot/               # Telegram notifications
    ├── index.ts
    └── package.json
```

---

## 📈 Performance Metrics

### Target SLAs

| Metric | Target |
|--------|--------|
| API Response Time | <200ms |
| Prediction Generation | <500ms |
| Real-time Update Latency | <100ms |
| Database Query Time | <50ms |
| Cache Hit Rate | >90% |

### Monitoring

- Health check endpoints on all services
- Uptime tracking
- Error rate monitoring
- Response time logging

---

## 🔮 Future Roadmap

### Phase 1 (Current)
- [x] Core database schema
- [x] AI Engine ensemble model
- [x] Value bet detection
- [x] Payment integration
- [x] Fantasy sports basics
- [x] Telegram bot

### Phase 2
- [ ] PostgreSQL migration
- [ ] Real API integrations (API-Football, Odds API)
- [ ] Advanced AI features
- [ ] Mobile app

### Phase 3
- [ ] Multi-sport support
- [ ] Social features
- [ ] Advanced analytics
- [ ] White-label solution

---

## 📞 Support

**Technical Issues:** admin@43v3rbet.ai  
**Business Inquiries:** business@43v3rbet.ai

---

*Documentation Version: 2.0.0 | Last Updated: 2025*
