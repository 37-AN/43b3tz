// 43V3R BET AI - Real-time Service
// Socket.io server for live odds, scores, and notifications

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';

const PORT = 3003;
const SERVICE_VERSION = '1.0.0';

// Service state for health checks
const serviceState = {
  startTime: Date.now(),
  connections: 0,
  messagesSent: 0,
  lastUpdate: new Date().toISOString(),
};

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url?.split('?')[0] || '/';
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'realtime-service',
      version: SERVICE_VERSION,
      uptime: Math.floor((Date.now() - serviceState.startTime) / 1000),
      connections: serviceState.connections,
      messagesSent: serviceState.messagesSent,
      lastUpdate: serviceState.lastUpdate,
    }));
    return;
  }
  
  // Readiness probe
  if (url === '/ready' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ready: true,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // Liveness probe
  if (url === '/live' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      alive: true,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'https://43v3r.bet'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ==================== TYPES ====================

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'live' | 'finished';
  odds: {
    home: number;
    draw: number;
    away: number;
  };
}

interface OddsUpdate {
  matchId: string;
  bookmaker: string;
  odds: {
    home: number;
    draw: number;
    away: number;
    over25?: number;
    under25?: number;
  };
  timestamp: number;
}

// ==================== MOCK DATA GENERATORS ====================

function generateLiveMatches(): LiveMatch[] {
  return [
    {
      id: 'live-1',
      homeTeam: 'Chelsea',
      awayTeam: 'Tottenham',
      homeScore: 1,
      awayScore: 0,
      minute: 45,
      status: 'live',
      odds: {
        home: 1.75,
        draw: 3.80,
        away: 4.50,
      },
    },
    {
      id: 'live-2',
      homeTeam: 'Real Madrid',
      awayTeam: 'Barcelona',
      homeScore: 2,
      awayScore: 2,
      minute: 67,
      status: 'live',
      odds: {
        home: 2.10,
        draw: 3.50,
        away: 3.20,
      },
    },
    {
      id: 'live-3',
      homeTeam: 'Kaizer Chiefs',
      awayTeam: 'Orlando Pirates',
      homeScore: 0,
      awayScore: 1,
      minute: 23,
      status: 'live',
      odds: {
        home: 3.10,
        draw: 3.30,
        away: 2.25,
      },
    },
  ];
}

function simulateOddsMovement(currentOdds: { home: number; draw: number; away: number }) {
  // Small random odds movements
  const movement = () => (Math.random() - 0.5) * 0.05;
  return {
    home: Math.max(1.01, currentOdds.home + movement()),
    draw: Math.max(1.01, currentOdds.draw + movement()),
    away: Math.max(1.01, currentOdds.away + movement()),
  };
}

// ==================== CONNECTION HANDLING ====================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  serviceState.connections++;

  // Send initial data
  socket.emit('live-matches', generateLiveMatches());
  serviceState.messagesSent++;

  // Join specific rooms
  socket.on('join-room', (room: string) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  // Leave room
  socket.on('leave-room', (room: string) => {
    socket.leave(room);
    console.log(`Client ${socket.id} left room: ${room}`);
  });

  // Subscribe to specific match updates
  socket.on('subscribe-match', (matchId: string) => {
    socket.join(`match:${matchId}`);
    console.log(`Client subscribed to match: ${matchId}`);
  });

  // Unsubscribe from match
  socket.on('unsubscribe-match', (matchId: string) => {
    socket.leave(`match:${matchId}`);
  });

  // Handle bet notifications
  socket.on('place-bet', (betData: any) => {
    console.log('Bet placed:', betData);
    // Broadcast to user's room
    socket.emit('bet-confirmed', {
      success: true,
      betId: `bet-${Date.now()}`,
      ...betData,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    serviceState.connections--;
  });
});

// ==================== PERIODIC UPDATES ====================

// Live match updates every 30 seconds
let liveMatches = generateLiveMatches();

setInterval(() => {
  // Update match minutes and scores randomly
  liveMatches = liveMatches.map(match => {
    if (match.status === 'live') {
      const newMinute = Math.min(90, match.minute + 1);
      
      // Simulate goals
      let newHomeScore = match.homeScore;
      let newAwayScore = match.awayScore;
      
      if (Math.random() < 0.02) {
        newHomeScore++;
      }
      if (Math.random() < 0.02) {
        newAwayScore++;
      }

      return {
        ...match,
        minute: newMinute,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        odds: simulateOddsMovement(match.odds),
        status: newMinute >= 90 ? 'finished' as const : 'live' as const,
      };
    }
    return match;
  });

  // Broadcast updates
  io.emit('live-matches', liveMatches);
  serviceState.messagesSent++;
  serviceState.lastUpdate = new Date().toISOString();

  // Broadcast individual match updates
  liveMatches.forEach(match => {
    io.to(`match:${match.id}`).emit('match-update', match);
    serviceState.messagesSent++;
  });

}, 30000);

// Odds updates every 5 seconds
setInterval(() => {
  liveMatches.forEach(match => {
    const oddsUpdate: OddsUpdate = {
      matchId: match.id,
      bookmaker: 'aggregate',
      odds: simulateOddsMovement(match.odds),
      timestamp: Date.now(),
    };

    io.to(`match:${match.id}`).emit('odds-update', oddsUpdate);
  });
}, 5000);

// Value bet alerts
setInterval(() => {
  // Simulate AI detecting value bets
  if (Math.random() < 0.1) {
    const valueBet = {
      id: `vb-${Date.now()}`,
      matchId: liveMatches[Math.floor(Math.random() * liveMatches.length)]?.id,
      prediction: ['home', 'draw', 'away'][Math.floor(Math.random() * 3)],
      edge: (Math.random() * 0.15 + 0.05).toFixed(3),
      odds: (Math.random() * 2 + 1.5).toFixed(2),
      confidence: Math.floor(Math.random() * 30 + 60),
    };

    io.emit('value-bet-alert', valueBet);
  }
}, 60000);

// ==================== START SERVER ====================

httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   🚀 43V3R BET AI - Real-time Service                       ║
  ║                                                              ║
  ║   Socket.io Server running on port ${PORT}                      ║
  ║                                                              ║
  ║   Features:                                                  ║
  ║   • Live match updates (30s intervals)                       ║
  ║   • Real-time odds movements (5s intervals)                  ║
  ║   • Value bet alerts (1 min intervals)                       ║
  ║   • User notifications                                       ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});

export { io };
