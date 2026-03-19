'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUIStore, useMatchesStore, useBetSlipStore, useAuthStore, useWalletStore, useHydrateStores } from '@/store';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BetSlip } from '@/components/betting/BetSlip';
import { MatchCard } from '@/components/betting/MatchCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, Grid3X3, List, Calendar, Clock, Star, Zap, TrendingUp, Radio, 
  Trophy, Shield, AlertCircle, RefreshCw, Wallet, CreditCard, Crown,
  Sparkles, Target, Flame, ArrowUpRight, CheckCircle, Lock, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Match } from '@/types';
import { FantasyTeamBuilder, FantasyLeagues, AIRecommendations } from '@/components/fantasy';

// API Response types
interface ApiMatch {
  id: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  league: { id: string; name: string; country: string; logo: string | null; };
  homeTeam: { id: string; name: string; logo: string | null; country: string | null; form: string | null; goalsScored: number; goalsConceded: number; };
  awayTeam: { id: string; name: string; logo: string | null; country: string | null; form: string | null; goalsScored: number; goalsConceded: number; };
  odds: { id: string; homeWin: number; draw: number; awayWin: number; over25: number | null; under25: number | null; bttsYes: number | null; bttsNo: number | null; bookmaker: string; } | null;
}

interface ValueBet {
  id: string;
  matchId: string;
  match: {
    id: string;
    homeTeam: { id: string; name: string; logo: string | null; form: string | null; };
    awayTeam: { id: string; name: string; logo: string | null; form: string | null; };
    league: { id: string; name: string; country: string; };
    kickoffTime: string;
    status: string;
  };
  odds: { homeWin: number; draw: number; awayWin: number; };
  prediction: 'home' | 'draw' | 'away';
  aiProbability: number;
  impliedProbability: number;
  edge: number;
  confidence: number;
  kellyFraction: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  isPremium: boolean;
}

// Transform API match to frontend Match type
function transformMatch(apiMatch: ApiMatch): Match {
  return {
    id: apiMatch.id,
    league: {
      id: apiMatch.league.id,
      name: apiMatch.league.name,
      country: apiMatch.league.country,
      logo: apiMatch.league.logo || undefined,
      isActive: true,
    },
    homeTeam: {
      id: apiMatch.homeTeam.id,
      name: apiMatch.homeTeam.name,
      logo: apiMatch.homeTeam.logo || undefined,
      country: apiMatch.homeTeam.country || undefined,
      form: apiMatch.homeTeam.form || undefined,
      goalsScored: apiMatch.homeTeam.goalsScored,
      goalsConceded: apiMatch.homeTeam.goalsConceded,
    },
    awayTeam: {
      id: apiMatch.awayTeam.id,
      name: apiMatch.awayTeam.name,
      logo: apiMatch.awayTeam.logo || undefined,
      country: apiMatch.awayTeam.country || undefined,
      form: apiMatch.awayTeam.form || undefined,
      goalsScored: apiMatch.awayTeam.goalsScored,
      goalsConceded: apiMatch.awayTeam.goalsConceded,
    },
    kickoffTime: new Date(apiMatch.kickoffTime),
    status: apiMatch.status as Match['status'],
    homeScore: apiMatch.homeScore ?? undefined,
    awayScore: apiMatch.awayScore ?? undefined,
    minute: apiMatch.minute ?? undefined,
    odds: apiMatch.odds ? {
      id: apiMatch.odds.id,
      homeWin: apiMatch.odds.homeWin,
      draw: apiMatch.odds.draw,
      awayWin: apiMatch.odds.awayWin,
      over25: apiMatch.odds.over25 ?? undefined,
      under25: apiMatch.odds.under25 ?? undefined,
      bttsYes: apiMatch.odds.bttsYes ?? undefined,
      bttsNo: apiMatch.odds.bttsNo ?? undefined,
      bookmaker: apiMatch.odds.bookmaker,
    } : undefined,
  };
}

// Subscription tiers
const SUBSCRIPTION_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['3 value bets/day', 'Basic predictions', 'Limited tipster access'],
    color: 'from-gray-500 to-gray-600',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    features: ['Unlimited value bets', 'AI predictions', 'All tipsters', 'Fantasy tools', 'Priority alerts'],
    color: 'from-emerald-500 to-teal-600',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    features: ['Everything in Pro', 'Copy betting', 'Premium tipsters', 'Telegram alerts', '24/7 support'],
    color: 'from-amber-500 to-orange-600',
    popular: false,
  },
];

export default function Home() {
  useHydrateStores();
  const { activeTab, setActiveTab, theme } = useUIStore();
  const { matches, setMatches, selectedLeague } = useMatchesStore();
  const { items: betSlipItems } = useBetSlipStore();
  const { user } = useAuthStore();
  const { balance, virtualBalance } = useWalletStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [valueBets, setValueBets] = useState<ValueBet[]>([]);
  const [valueBetsLoading, setValueBetsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState({ live: 0, today: 0, valueBets: 0, hotMatches: 0 });
  
  const isAdmin = user?.role === 'admin' || true;

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/matches?limit=50');
      if (!response.ok) throw new Error('Failed to fetch matches');
      const data = await response.json();
      if (data.success && data.data) {
        setMatches(data.data.map(transformMatch));
        const live = data.data.filter((m: ApiMatch) => m.status === 'live').length;
        const today = data.data.filter((m: ApiMatch) => {
          const today = new Date().toDateString();
          return new Date(m.kickoffTime).toDateString() === today;
        }).length;
        setStats(prev => ({ ...prev, live, today }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [setMatches]);

  // Fetch value bets
  const fetchValueBets = useCallback(async () => {
    setValueBetsLoading(true);
    try {
      const response = await fetch('/api/value-bets?minEdge=0.05&minConfidence=0.65&limit=20');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.valueBets) {
          setValueBets(data.data.valueBets);
          setStats(prev => ({ ...prev, valueBets: data.data.total }));
        }
      }
    } catch (err) {
      console.error('Value bets fetch error:', err);
    } finally {
      setValueBetsLoading(false);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/leaderboard?period=weekly&limit=10');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setLeaderboard(data.data);
        }
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    fetchValueBets();
    fetchLeaderboard();
  }, [fetchMatches, fetchValueBets, fetchLeaderboard]);

  // Filter matches
  const filteredMatches = matches.filter(match => {
    const matchesLeague = !selectedLeague || match.league.id === selectedLeague;
    const matchesSearch = !searchQuery || 
      match.homeTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.league.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLeague && matchesSearch;
  });

  const liveMatches = filteredMatches.filter(m => m.status === 'live');
  const scheduledMatches = filteredMatches.filter(m => m.status === 'scheduled');

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 flex">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-64px)]">
              <div className="p-4 md:p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'matches' && (
                    <MatchesView
                      liveMatches={liveMatches}
                      scheduledMatches={scheduledMatches}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                      isLoading={isLoading}
                      error={error}
                      onRetry={fetchMatches}
                      stats={stats}
                    />
                  )}

                  {activeTab === 'ai-predictions' && (
                    <AIPredictionsView
                      valueBets={valueBets}
                      isLoading={valueBetsLoading}
                      onRefresh={fetchValueBets}
                    />
                  )}

                  {activeTab === 'tipsters' && (
                    <TipstersView />
                  )}

                  {activeTab === 'leaderboard' && (
                    <LeaderboardView leaderboard={leaderboard} />
                  )}

                  {activeTab === 'fantasy' && (
                    <FantasyView />
                  )}

                  {activeTab === 'subscriptions' && (
                    <SubscriptionsView />
                  )}

                  {activeTab === 'admin' && isAdmin && (
                    <AdminView />
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          <BetSlip />
        </main>
      </div>

      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />
    </div>
  );
}

// ==================== MATCHES VIEW ====================
function MatchesView({ 
  liveMatches, scheduledMatches, searchQuery, setSearchQuery, viewMode, setViewMode, isLoading, error, onRetry, stats
}: any) {
  return (
    <motion.div key="matches" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-emerald-400" />
            Matches
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {!isLoading && !error && `${scheduledMatches.length + liveMatches.length} matches available`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search matches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-48 md:w-64 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
            />
          </div>
          <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            <Button variant="ghost" size="sm" className={`h-8 ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-muted-foreground'}`} onClick={() => setViewMode('grid')}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className={`h-8 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-muted-foreground'}`} onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Radio className="w-5 h-5 text-red-400" />} label="Live Now" value={stats.live.toString()} highlight />
        <StatCard icon={<Calendar className="w-5 h-5 text-cyan-400" />} label="Today" value={stats.today.toString()} />
        <StatCard icon={<Zap className="w-5 h-5 text-yellow-400" />} label="Value Bets" value={stats.valueBets.toString()} />
        <StatCard icon={<Flame className="w-5 h-5 text-orange-400" />} label="Hot Matches" value="5" />
      </div>

      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-lg font-semibold text-white">Live Now</h2>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{liveMatches.length}</Badge>
          </div>
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-4' : 'space-y-3'}>
            {liveMatches.map((match: Match) => <MatchCard key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {!isLoading && !error && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-white">Upcoming</h2>
            <Badge className="bg-white/10 text-muted-foreground border-white/10">{scheduledMatches.length}</Badge>
          </div>
          {scheduledMatches.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No matches found</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-4' : 'space-y-3'}>
              {scheduledMatches.map((match: Match) => <MatchCard key={match.id} match={match} />)}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ==================== AI PREDICTIONS VIEW ====================
function AIPredictionsView({ valueBets, isLoading, onRefresh }: { valueBets: ValueBet[]; isLoading: boolean; onRefresh: () => void }) {
  return (
    <motion.div key="ai-predictions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-400" />
            AI Value Bets
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ensemble model predictions with edge analysis</p>
        </div>
        <Button onClick={onRefresh} variant="outline" className="border-white/10 text-white hover:bg-white/5">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Model Status */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">AI Engine Status</p>
                <p className="text-xs text-muted-foreground">MiroFish + Logistic + Gradient Boost</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Value Bets List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <Skeleton className="h-20 bg-white/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : valueBets.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No value bets found at this time</p>
            <p className="text-xs text-muted-foreground mt-2">Check back when more matches are available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {valueBets.map((bet, index) => (
            <ValueBetCard key={bet.id} bet={bet} index={index} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ==================== VALUE BET CARD ====================
function ValueBetCard({ bet, index }: { bet: ValueBet; index: number }) {
  const predictionTeam = bet.prediction === 'home' ? bet.match.homeTeam.name : bet.prediction === 'away' ? bet.match.awayTeam.name : 'DRAW';
  const odds = bet.prediction === 'home' ? bet.odds.homeWin : bet.prediction === 'draw' ? bet.odds.draw : bet.odds.awayWin;
  
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className={`bg-white/5 border-white/10 hover:border-white/20 transition-all ${bet.isPremium ? 'ring-1 ring-amber-500/30' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                bet.isPremium ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-white">{bet.match.homeTeam.name} vs {bet.match.awayTeam.name}</p>
                <p className="text-xs text-muted-foreground">{bet.match.league.name} • {new Date(bet.match.kickoffTime).toLocaleString()}</p>
              </div>
            </div>
            {bet.isPremium && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Crown className="w-3 h-3 mr-1" /> Premium
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Prediction</p>
              <p className="font-medium text-white flex items-center gap-1">
                {bet.prediction === 'home' && '🏠'}
                {bet.prediction === 'draw' && '🤝'}
                {bet.prediction === 'away' && '✈️'}
                {predictionTeam}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Odds</p>
              <p className="font-medium text-white">{odds.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Edge</p>
              <p className="font-medium text-emerald-400">+{(bet.edge * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confidence</p>
              <div className="flex items-center gap-2">
                <Progress value={bet.confidence * 100} className="h-2 flex-1" />
                <span className="text-xs text-white">{(bet.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">AI Prob: <span className="text-white">{(bet.aiProbability * 100).toFixed(1)}%</span></span>
              <span className="text-muted-foreground">Kelly: <span className="text-white">{(bet.kellyFraction * 100).toFixed(1)}%</span></span>
            </div>
            <Badge className={`${
              bet.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              bet.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
              'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {bet.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>

          <div className="mt-3 p-2 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground">{bet.recommendation}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== TIPSTERS VIEW ====================
function TipstersView() {
  const tipsters = [
    { id: '1', name: 'ProPunter SA', winRate: 78, roi: 45, followers: 1250, verified: true },
    { id: '2', name: 'Sundowns Expert', winRate: 72, roi: 38, followers: 890, verified: true },
    { id: '3', name: 'PSL Master', winRate: 68, roi: 32, followers: 650, verified: true },
  ];

  return (
    <motion.div key="tipsters" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="w-7 h-7 text-yellow-400" />
          Tipster Marketplace
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Follow verified tipsters or become one</p>
      </div>

      <div className="grid gap-4">
        {tipsters.map((tipster, i) => (
          <Card key={tipster.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {tipster.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-white flex items-center gap-2">
                      {tipster.name}
                      {tipster.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{tipster.followers} followers</p>
                  </div>
                </div>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Follow</Button>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{tipster.winRate}%</p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">+{tipster.roi}%</p>
                  <p className="text-xs text-muted-foreground">ROI</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">R99</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ==================== LEADERBOARD VIEW ====================
function LeaderboardView({ leaderboard }: { leaderboard: any[] }) {
  const mockLeaderboard = [
    { rank: 1, username: 'ProBettor99', profit: 15420, winRate: 78, bets: 156 },
    { rank: 2, username: 'SundownsKing', profit: 12850, winRate: 74, bets: 142 },
    { rank: 3, username: 'ValueHunter', profit: 9750, winRate: 71, bets: 128 },
    { rank: 4, username: 'PSL Expert', profit: 8200, winRate: 68, bets: 115 },
    { rank: 5, username: 'ChiefsFan', profit: 6500, winRate: 65, bets: 98 },
  ];

  return (
    <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-purple-400" />
          Weekly Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Top performers this week</p>
      </div>

      <div className="space-y-3">
        {mockLeaderboard.map((entry, i) => (
          <Card key={entry.rank} className={`bg-white/5 border-white/10 ${i < 3 ? 'ring-1 ring-amber-500/20' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  i === 0 ? 'bg-amber-500/20 text-amber-400' :
                  i === 1 ? 'bg-gray-400/20 text-gray-300' :
                  i === 2 ? 'bg-orange-600/20 text-orange-400' :
                  'bg-white/10 text-white'
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{entry.username}</p>
                  <p className="text-xs text-muted-foreground">{entry.bets} bets placed</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400">+R{entry.profit.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{entry.winRate}% win rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// ==================== FANTASY VIEW ====================
function FantasyView() {
  const [fantasyTab, setFantasyTab] = useState('team');

  return (
    <motion.div key="fantasy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-7 h-7 text-purple-400" />
          Fantasy Football
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Build your dream team and compete for prizes</p>
      </div>

      <Tabs value={fantasyTab} onValueChange={setFantasyTab}>
        <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
          <TabsTrigger value="team" className="data-[state=active]:bg-white/10 text-white">
            <Users className="w-4 h-4 mr-2" />
            My Team
          </TabsTrigger>
          <TabsTrigger value="leagues" className="data-[state=active]:bg-white/10 text-white">
            <Trophy className="w-4 h-4 mr-2" />
            Leagues
          </TabsTrigger>
          <TabsTrigger value="tips" className="data-[state=active]:bg-white/10 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Tips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-6">
          <FantasyTeamBuilder />
        </TabsContent>

        <TabsContent value="leagues" className="mt-6">
          <FantasyLeagues />
        </TabsContent>

        <TabsContent value="tips" className="mt-6">
          <AIRecommendations />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ==================== SUBSCRIPTIONS VIEW ====================
function SubscriptionsView() {
  return (
    <motion.div key="subscriptions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Crown className="w-7 h-7 text-amber-400" />
          Subscription Plans
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Unlock premium features and AI predictions</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {SUBSCRIPTION_TIERS.map((tier) => (
          <Card key={tier.id} className={`bg-white/5 border-white/10 relative ${tier.popular ? 'ring-2 ring-emerald-500' : ''}`}>
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-500 text-white">Most Popular</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-white">{tier.name}</CardTitle>
              <CardDescription className="text-3xl font-bold text-white">
                {tier.price === 0 ? 'Free' : `R${tier.price}`}
                {tier.price > 0 && <span className="text-sm font-normal text-muted-foreground">/month</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className={`w-full bg-gradient-to-r ${tier.color} hover:opacity-90 text-white`}>
                {tier.price === 0 ? 'Current Plan' : 'Subscribe'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Methods */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['PayFast', 'Ozow', 'USDT (TRC-20)', 'Bitcoin'].map((method) => (
              <div key={method} className="p-3 rounded-lg bg-white/5 border border-white/10 text-center hover:border-white/20 cursor-pointer transition-colors">
                <p className="text-sm text-white">{method}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== ADMIN VIEW ====================
function AdminView() {
  return (
    <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-400" />
          Admin Dashboard
        </h1>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard icon={<Wallet className="w-5 h-5 text-emerald-400" />} label="Total Revenue" value="R125,450" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-400" />} label="Active Users" value="1,234" />
        <StatCard icon={<Target className="w-5 h-5 text-purple-400" />} label="Total Bets" value="8,567" />
        <StatCard icon={<Crown className="w-5 h-5 text-amber-400" />} label="Subscribers" value="456" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Service Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'AI Engine', status: 'running', port: 3006 },
              { name: 'Telegram Bot', status: 'running', port: 3007 },
              { name: 'Scraper Service', status: 'running', port: 3005 },
              { name: 'Realtime Service', status: 'running', port: 3003 },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-2 rounded bg-white/5">
                <span className="text-white">{service.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">:{service.port}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{service.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white justify-start">
              <RefreshCw className="w-4 h-4 mr-2" /> Trigger Scrape
            </Button>
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white justify-start">
              <Sparkles className="w-4 h-4 mr-2" /> Run AI Predictions
            </Button>
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white justify-start">
              <Zap className="w-4 h-4 mr-2" /> Post Value Bets
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// ==================== SHARED COMPONENTS ====================
function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function MobileNavigation({ activeTab, setActiveTab, isAdmin }: { activeTab: string; setActiveTab: (t: string) => void; isAdmin: boolean }) {
  const tabs = [
    { id: 'matches', label: 'Matches', icon: <Trophy className="w-5 h-5" /> },
    { id: 'ai-predictions', label: 'AI', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'fantasy', label: 'Fantasy', icon: <Users className="w-5 h-5" /> },
    { id: 'subscriptions', label: 'Plans', icon: <Crown className="w-5 h-5" /> },
  ];
  if (isAdmin) tabs.push({ id: 'admin', label: 'Admin', icon: <Shield className="w-5 h-5" /> });

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${activeTab === tab.id ? 'text-emerald-400' : 'text-muted-foreground hover:text-white'}`}>
            {tab.icon}
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
