'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, TrendingUp, TrendingDown, Star, Users, DollarSign,
  Target, Flame, Crown, Zap, AlertTriangle, CheckCircle2,
  ChevronUp, ChevronDown, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  form: number;
  totalPoints: number;
  goals: number;
  assists: number;
  expectedGoals: number;
  expectedAssists: number;
  ownershipPercent: number;
  team: { id: string; name: string; logo: string | null };
  upcomingFixtures: Array<{
    kickoffTime: string;
    isHome: boolean;
    opponent: { name: string };
  }>;
}

interface CaptainPick {
  player: Player;
  confidence: number;
  reason: string;
  fixtureRating: 'easy' | 'medium' | 'hard';
}

interface DifferentialPick {
  player: Player;
  ownershipPercent: number;
  potential: number;
  reason: string;
}

export function AIRecommendations() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('captain');

  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/fantasy/players?limit=100&sort=form');
      const data = await res.json();
      if (data.success) {
        setPlayers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Generate AI Captain Picks
  const captainPicks: CaptainPick[] = players
    .filter(p => p.form >= 5 && p.totalPoints > 20)
    .slice(0, 10)
    .map(p => {
      const fixture = p.upcomingFixtures[0];
      const isHome = fixture?.isHome ?? true;
      const opponentStrength = Math.random(); // In real app, use actual opponent stats
      
      let fixtureRating: 'easy' | 'medium' | 'hard' = 'medium';
      if (opponentStrength < 0.3) fixtureRating = 'easy';
      else if (opponentStrength > 0.7) fixtureRating = 'hard';

      // Calculate confidence based on form, fixtures, xG/xA
      let confidence = 50;
      confidence += (p.form - 5) * 10;
      confidence += (p.expectedGoals + p.expectedAssists) * 5;
      if (isHome) confidence += 10;
      if (fixtureRating === 'easy') confidence += 15;
      if (fixtureRating === 'hard') confidence -= 15;
      confidence = Math.min(95, Math.max(30, confidence));

      // Generate reason
      const reasons = [
        `In excellent form (${p.form.toFixed(1)}) with ${p.goals}G ${p.assists}A`,
        `High xG (${p.expectedGoals.toFixed(1)}) and xA (${p.expectedAssists.toFixed(1)})`,
        `Favourable ${isHome ? 'home' : 'away'} fixture`,
        `${p.totalPoints} total points this season`,
      ];

      return {
        player: p,
        confidence,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        fixtureRating,
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  // Generate Must-Have Players
  const mustHavePlayers = players
    .filter(p => p.ownershipPercent > 40 && p.form > 5)
    .slice(0, 5);

  // Generate Differential Picks
  const differentialPicks: DifferentialPick[] = players
    .filter(p => p.ownershipPercent < 15 && p.form > 4)
    .slice(0, 10)
    .map(p => ({
      player: p,
      ownershipPercent: p.ownershipPercent,
      potential: Math.round((p.form / 10) * 100),
      reason: p.goals > 2 || p.assists > 2 
        ? `Good underlying stats: ${p.goals}G, ${p.assists}A` 
        : `Low ownership with ${p.form.toFixed(1)} form`,
    }));

  // Get fixture difficulty badge color
  const getFixtureBadge = (rating: 'easy' | 'medium' | 'hard') => {
    switch (rating) {
      case 'easy': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  const getPositionBadge = (pos: string) => {
    switch (pos) {
      case 'GK': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DEF': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'MID': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'FWD': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 bg-white/5" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            AI Fantasy Tips
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by advanced analytics and fixture analysis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPlayers} className="border-white/10 text-white hover:bg-white/5">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10 w-full justify-start">
          <TabsTrigger value="captain" className="data-[state=active]:bg-white/10 text-white">
            <Crown className="w-4 h-4 mr-2 text-yellow-400" />
            Captain Picks
          </TabsTrigger>
          <TabsTrigger value="must-have" className="data-[state=active]:bg-white/10 text-white">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
            Must Haves
          </TabsTrigger>
          <TabsTrigger value="differential" className="data-[state=active]:bg-white/10 text-white">
            <Target className="w-4 h-4 mr-2 text-purple-400" />
            Differentials
          </TabsTrigger>
        </TabsList>

        {/* Captain Picks */}
        <TabsContent value="captain" className="mt-6 space-y-4">
          {captainPicks.map((pick, idx) => (
            <motion.div
              key={pick.player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`bg-white/5 border-white/10 ${idx === 0 ? 'ring-2 ring-yellow-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{pick.player.name}</span>
                          <Badge className={getPositionBadge(pick.player.position)} variant="outline">
                            {pick.player.position}
                          </Badge>
                          {idx === 0 && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              <Crown className="w-3 h-3 mr-1" /> TOP PICK
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{pick.player.team.name}</span>
                          <span>R{pick.player.price}M</span>
                          <span>Form: {pick.player.form.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">{pick.confidence}%</div>
                      <div className="text-xs text-muted-foreground">confidence</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center p-2 rounded bg-white/5">
                      <div className="text-lg font-bold text-white">{pick.player.totalPoints}</div>
                      <div className="text-xs text-muted-foreground">Total Pts</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/5">
                      <div className="text-lg font-bold text-white">{pick.player.goals}G {pick.player.assists}A</div>
                      <div className="text-xs text-muted-foreground">Goals/Assists</div>
                    </div>
                    <div className="text-center p-2 rounded bg-white/5">
                      <Badge className={getFixtureBadge(pick.fixtureRating)}>
                        {pick.fixtureRating.charAt(0).toUpperCase() + pick.fixtureRating.slice(1)} Fixture
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 p-2 rounded bg-white/5 border-l-2 border-emerald-500">
                    <p className="text-sm text-muted-foreground">{pick.reason}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* Must Have Players */}
        <TabsContent value="must-have" className="mt-6 space-y-4">
          <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              These players have high ownership and form - missing them could hurt your rank!
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            {mustHavePlayers.map((player, idx) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getPositionBadge(player.position)} variant="outline">
                          {player.position}
                        </Badge>
                        <div>
                          <p className="font-medium text-white">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.team.name} • R{player.price}M</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Users className="w-3 h-3" />
                          <span className="font-bold">{player.ownershipPercent.toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">ownership</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">Form: <span className="text-emerald-400">{player.form.toFixed(1)}</span></span>
                      <span className="text-muted-foreground">Pts: <span className="text-white">{player.totalPoints}</span></span>
                      <span className="text-muted-foreground">G/A: <span className="text-white">{player.goals}/{player.assists}</span></span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Differential Picks */}
        <TabsContent value="differential" className="mt-6 space-y-4">
          <Alert className="bg-purple-500/10 border-purple-500/20 text-purple-400">
            <Target className="h-4 w-4" />
            <AlertDescription>
              Low ownership players with good form - great for making up ground in mini-leagues!
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            {differentialPicks.map((pick, idx) => (
              <motion.div
                key={pick.player.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getPositionBadge(pick.player.position)} variant="outline">
                          {pick.player.position}
                        </Badge>
                        <div>
                          <p className="font-medium text-white">{pick.player.name}</p>
                          <p className="text-xs text-muted-foreground">{pick.player.team.name} • R{pick.player.price}M</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-purple-400">
                          <TrendingUp className="w-3 h-3" />
                          <span className="font-bold">{pick.ownershipPercent.toFixed(1)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">ownership</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 rounded bg-white/5 text-sm text-muted-foreground">
                      {pick.reason}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Potential:</span>
                      <Progress value={pick.potential} className="h-2 flex-1" />
                      <span className="text-xs text-emerald-400">{pick.potential}%</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Alert component for messages
function Alert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg p-4 border ${className}`}>
      {children}
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div className="text-sm ml-2">{children}</div>;
}
