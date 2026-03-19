'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBetSlipStore, useValueBetsStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight,
  Filter,
  RefreshCw,
  Sparkles,
  Target,
  Percent,
  Brain,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// API Response type for predictions
interface PredictionResponse {
  id: string;
  matchId: string;
  match: {
    id: string;
    homeTeam: {
      id: string;
      name: string;
      logo: string | null;
      form: string | null;
    };
    awayTeam: {
      id: string;
      name: string;
      logo: string | null;
      form: string | null;
    };
    league: {
      id: string;
      name: string;
      country: string;
      logo: string | null;
    };
    kickoffTime: string;
    status: string;
  };
  odds: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number | null;
    under25: number | null;
    bttsYes: number | null;
    bttsNo: number | null;
  } | null;
  aiPrediction: {
    homeWin: number;
    draw: number;
    awayWin: number;
    confidence: number;
  };
  edges: {
    home: number;
    draw: number;
    away: number;
  };
  valueBetAnalysis: Array<{
    prediction: string;
    odds: number;
    edge: number;
    kellyFraction: number;
    riskLevel: 'low' | 'medium' | 'high';
    expectedValue: number;
  }>;
  isValueBet: boolean;
  isPremium: boolean;
  price: number | null;
  result: string | null;
  createdAt: string;
}

// Value bet type for internal use
interface ValueBetItem {
  id: string;
  matchId: string;
  match: PredictionResponse['match'];
  prediction: string;
  odds: number;
  edge: number;
  kellyFraction: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  expectedValue: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  impliedProb: number;
  aiProb: number;
  recommendation: string;
}

// Skeleton Components
function StatCardSkeleton() {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
        </div>
        <Skeleton className="h-7 w-16 mt-3 bg-white/10" />
        <Skeleton className="h-3 w-20 mt-2 bg-white/10" />
      </CardContent>
    </Card>
  );
}

function ValueBetSkeleton() {
  return (
    <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 border border-emerald-500/20 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl bg-white/10" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 bg-white/10" />
            <Skeleton className="h-3 w-32 bg-white/10" />
          </div>
        </div>
        <Skeleton className="h-5 w-20 bg-white/10" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16 bg-white/10" />
          <Skeleton className="h-6 w-32 bg-white/10" />
        </div>
        <div className="text-center px-4 border-l border-white/10 space-y-2">
          <Skeleton className="h-3 w-12 bg-white/10" />
          <Skeleton className="h-6 w-16 bg-white/10" />
        </div>
        <div className="text-center px-4 border-l border-white/10 space-y-2">
          <Skeleton className="h-3 w-16 bg-white/10" />
          <Skeleton className="h-6 w-12 bg-white/10" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg bg-white/10" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-lg bg-white/10" />
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-10 rounded-lg bg-white/10" />
        <Skeleton className="w-24 h-10 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

export function AIPredictionsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [valueBets, setValueBets] = useState<ValueBetItem[]>([]);
  const { minEdge, setMinEdge, maxOdds, setMaxOdds } = useValueBetsStore();
  const { addItem } = useBetSlipStore();

  const loadValueBets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/predictions?isValueBet=true&limit=50');
      
      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform API response to value bets
        const transformedBets: ValueBetItem[] = [];
        
        for (const pred of data.data as PredictionResponse[]) {
          // Add value bet analysis items
          for (const analysis of pred.valueBetAnalysis) {
            const impliedProb = 1 / analysis.odds;
            const aiProb = analysis.prediction === 'home' 
              ? pred.aiPrediction.homeWin 
              : analysis.prediction === 'draw' 
                ? pred.aiPrediction.draw 
                : pred.aiPrediction.awayWin;
            
            transformedBets.push({
              id: `${pred.id}-${analysis.prediction}`,
              matchId: pred.matchId,
              match: pred.match,
              prediction: analysis.prediction,
              odds: analysis.odds,
              edge: analysis.edge,
              kellyFraction: analysis.kellyFraction,
              riskLevel: analysis.riskLevel,
              confidence: pred.aiPrediction.confidence,
              expectedValue: analysis.expectedValue,
              homeWinProb: pred.aiPrediction.homeWin,
              drawProb: pred.aiPrediction.draw,
              awayWinProb: pred.aiPrediction.awayWin,
              impliedProb,
              aiProb,
              recommendation: generateRecommendation(analysis, pred.match),
            });
          }
        }
        
        // Sort by edge (highest first)
        transformedBets.sort((a, b) => b.edge - a.edge);
        setValueBets(transformedBets);
      } else {
        throw new Error(data.error || 'Failed to load predictions');
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading predictions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValueBets();
  }, [loadValueBets]);

  const filteredBets = valueBets.filter(bet => 
    bet.edge * 100 >= minEdge && 
    bet.odds <= maxOdds
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-emerald-400" />
            AI Value Bets
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Our AI analyzes odds to find mispriced markets
          </p>
        </div>
        <Button
          variant="outline"
          className="border-white/10 text-white hover:bg-white/10"
          onClick={loadValueBets}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Target className="w-5 h-5 text-emerald-400" />}
            label="Value Bets Found"
            value={filteredBets.length.toString()}
            trend="+12%"
          />
          <StatCard
            icon={<Percent className="w-5 h-5 text-cyan-400" />}
            label="Avg Edge"
            value={filteredBets.length > 0 
              ? `${(filteredBets.reduce((acc, b) => acc + b.edge, 0) / filteredBets.length * 100).toFixed(1)}%` 
              : '0%'
            }
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            label="Best Edge"
            value={filteredBets.length > 0 
              ? `${(filteredBets[0]?.edge * 100 || 0).toFixed(1)}%` 
              : '0%'
            }
          />
          <StatCard
            icon={<Sparkles className="w-5 h-5 text-yellow-400" />}
            label="Confidence"
            value={filteredBets.length > 0 
              ? `${Math.round(filteredBets.reduce((acc, b) => acc + b.confidence, 0) / filteredBets.length)}%` 
              : '0%'
            }
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={loadValueBets}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Minimum Edge</span>
                <span className="text-white font-medium">{minEdge}%</span>
              </div>
              <Slider
                value={[minEdge]}
                onValueChange={([value]) => setMinEdge(value)}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Maximum Odds</span>
                <span className="text-white font-medium">{maxOdds.toFixed(1)}</span>
              </div>
              <Slider
                value={[maxOdds * 10]}
                onValueChange={([value]) => setMaxOdds(value / 10)}
                min={15}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <ValueBetSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Value Bets List */}
      {!isLoading && !error && filteredBets.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-muted-foreground">No value bets found with current filters</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Try adjusting the minimum edge or maximum odds</p>
        </div>
      )}

      {!isLoading && !error && filteredBets.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredBets.map((bet, index) => (
              <ValueBetCard 
                key={bet.id} 
                bet={bet} 
                index={index}
                onAddToSlip={() => {
                  addItem({
                    matchId: bet.matchId,
                    match: {
                      id: bet.matchId,
                      league: {
                        id: bet.match.league.id,
                        name: bet.match.league.name,
                        country: bet.match.league.country,
                        isActive: true,
                      },
                      homeTeam: {
                        id: bet.match.homeTeam.id,
                        name: bet.match.homeTeam.name,
                        goalsScored: 0,
                        goalsConceded: 0,
                      },
                      awayTeam: {
                        id: bet.match.awayTeam.id,
                        name: bet.match.awayTeam.name,
                        goalsScored: 0,
                        goalsConceded: 0,
                      },
                      kickoffTime: new Date(bet.match.kickoffTime),
                      status: bet.match.status as 'scheduled' | 'live' | 'finished' | 'postponed',
                    },
                    betType: bet.prediction,
                    odds: bet.odds,
                    selection: `${bet.match.homeTeam.name} vs ${bet.match.awayTeam.name} - ${bet.prediction === 'home' ? 'Home Win' : bet.prediction === 'draw' ? 'Draw' : 'Away Win'}`
                  });
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Generate recommendation text
function generateRecommendation(analysis: { edge: number; odds: number; riskLevel: string }, match: PredictionResponse['match']): string {
  const selectionText = analysis.prediction === 'home' 
    ? `${match.homeTeam.name} to win` 
    : analysis.prediction === 'draw' 
      ? 'Draw' 
      : `${match.awayTeam.name} to win`;
  
  const riskAdvice = analysis.riskLevel === 'low' 
    ? 'This is a low-risk value bet with good potential.' 
    : analysis.riskLevel === 'medium' 
      ? 'Moderate risk - consider smaller stakes.' 
      : 'High risk - proceed with caution and use strict bankroll management.';
  
  return `${selectionText} at ${analysis.odds.toFixed(2)} shows a ${(analysis.edge * 100).toFixed(1)}% edge. ${riskAdvice}`;
}

function StatCard({ icon, label, value, trend }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            {icon}
          </div>
          {trend && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {trend}
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-white mt-3">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function getEdgeColorClass(edge: number): string {
  if (edge >= 0.1) return 'text-emerald-400';
  if (edge >= 0.05) return 'text-cyan-400';
  return 'text-yellow-400';
}

function getRiskColorClass(riskLevel: string): string {
  switch (riskLevel) {
    case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-white/10 text-white border-white/10';
  }
}

function formatEdge(edge: number): string {
  return `+${(edge * 100).toFixed(1)}%`;
}

function ValueBetCard({ bet, index, onAddToSlip }: { 
  bet: ValueBetItem; 
  index: number;
  onAddToSlip: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className="relative rounded-xl bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 border border-emerald-500/20 overflow-hidden hover:border-emerald-500/40 transition-colors"
    >
      {/* Edge indicator bar */}
      <div 
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400"
        style={{ width: `${Math.min(bet.edge * 500, 100)}%` }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-white">
                {bet.match?.homeTeam?.name} vs {bet.match?.awayTeam?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {bet.match?.league?.name} • {bet.match?.kickoffTime ? format(new Date(bet.match.kickoffTime), 'dd MMM HH:mm') : ''}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <Badge className={getRiskColorClass(bet.riskLevel)}>
              {bet.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
        </div>

        {/* Prediction & Odds */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Selection</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                {bet.prediction === 'home' ? 'Home Win' : bet.prediction === 'draw' ? 'Draw' : 'Away Win'}
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                @ {bet.odds.toFixed(2)}
              </Badge>
            </div>
          </div>
          
          <div className="text-center px-4 border-l border-white/10">
            <p className="text-xs text-muted-foreground mb-1">Edge</p>
            <p className={`text-xl font-bold ${getEdgeColorClass(bet.edge)}`}>
              {formatEdge(bet.edge)}
            </p>
          </div>
          
          <div className="text-center px-4 border-l border-white/10">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <p className="text-xl font-bold text-white">
              {bet.confidence}%
            </p>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-[10px] text-muted-foreground">AI Home</p>
            <p className="text-sm font-medium text-white">{(bet.homeWinProb * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-[10px] text-muted-foreground">AI Draw</p>
            <p className="text-sm font-medium text-white">{(bet.drawProb * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-[10px] text-muted-foreground">AI Away</p>
            <p className="text-sm font-medium text-white">{(bet.awayWinProb * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-[10px] text-muted-foreground">Kelly %</p>
            <p className="text-sm font-medium text-emerald-400">{(bet.kellyFraction * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-3 rounded-lg bg-black/20 border border-white/5 mb-4">
          <p className="text-sm text-white">{bet.recommendation}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold hover:from-emerald-600 hover:to-cyan-600"
            onClick={onAddToSlip}
          >
            Add to Bet Slip
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            className="border-white/10 text-white hover:bg-white/10"
            onClick={() => setExpanded(!expanded)}
          >
            Details
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-white">Analysis Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Bookmaker Implied Probability</p>
                  <p className="text-lg font-bold text-white">{(bet.impliedProb * 100).toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-muted-foreground mb-1">AI True Probability</p>
                  <p className="text-lg font-bold text-emerald-400">{(bet.aiProb * 100).toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-muted-foreground mb-1">Expected Value</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-emerald-400">
                    {bet.expectedValue > 0 ? '+' : ''}{(bet.expectedValue * 100).toFixed(1)}%
                  </p>
                  <span className="text-xs text-muted-foreground">
                    (Expected return per unit staked)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 font-medium mb-1">💡 Kelly Criterion Suggestion</p>
                <p className="text-sm text-white">
                  Based on the Kelly Criterion, the optimal stake is <strong>{(bet.kellyFraction * 100).toFixed(1)}%</strong> of your bankroll for this bet.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
