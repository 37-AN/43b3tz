'use client';

import { useMatchesStore, useUIStore } from '@/store';
import { leagues } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  SoccerBall, 
  Star, 
  TrendingUp, 
  Zap,
  ChevronRight,
  Globe,
  Users,
  Trophy,
  Sparkles
} from 'lucide-react';

export function Sidebar() {
  const { selectedLeague, setSelectedLeague } = useMatchesStore();
  const { sidebarOpen, setActiveTab } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm">
      {/* Quick Actions */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={() => setActiveTab('ai-predictions')}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Value Bets</p>
                <p className="text-xs text-muted-foreground">AI detected edges</p>
              </div>
            </div>
            <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              HOT
            </Badge>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={() => setActiveTab('matches')}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Live Now</p>
                <p className="text-xs text-muted-foreground">In-play matches</p>
              </div>
            </div>
            <Badge className="ml-auto bg-red-500/20 text-red-400 border-red-500/30">
              1
            </Badge>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={() => setActiveTab('fantasy')}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Fantasy</p>
                <p className="text-xs text-muted-foreground">Build your team</p>
              </div>
            </div>
            <Badge className="ml-auto bg-purple-500/20 text-purple-400 border-purple-500/30">
              NEW
            </Badge>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={() => setActiveTab('leaderboard')}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Leaderboard</p>
                <p className="text-xs text-muted-foreground">Top bettors</p>
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* Leagues */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Leagues</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs text-muted-foreground hover:text-white"
              onClick={() => setSelectedLeague(null)}
            >
              All
            </Button>
          </h3>
        </div>
        
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="px-2 space-y-1">
            {leagues.map((league) => (
              <LeagueButton
                key={league.id}
                league={league}
                isActive={selectedLeague === league.id}
                onClick={() => setSelectedLeague(selectedLeague === league.id ? null : league.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Pro Banner */}
      <div className="p-4 border-t border-white/10">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-orange-600/20 border border-white/10 p-4">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400">PRO</span>
            </div>
            <p className="text-sm font-medium text-white mb-1">Unlock Premium AI</p>
            <p className="text-xs text-muted-foreground mb-3">
              Get exclusive value bets with higher edges
            </p>
            <Button 
              size="sm"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              onClick={() => setActiveTab('subscriptions')}
            >
              Upgrade Now
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full blur-xl" />
        </div>
      </div>
    </aside>
  );
}

function LeagueButton({ league, isActive, onClick }: { 
  league: { id: string; name: string; country: string }; 
  isActive: boolean;
  onClick: () => void;
}) {
  const getFlag = (country: string) => {
    const flags: Record<string, string> = {
      'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Spain': '🇪🇸',
      'Germany': '🇩🇪',
      'Italy': '🇮🇹',
      'France': '🇫🇷',
      'Netherlands': '🇳🇱',
      'Europe': '🌍',
      'South Africa': '🇿🇦'
    };
    return flags[country] || '🌍';
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
        ${isActive 
          ? 'bg-emerald-500/20 text-white border border-emerald-500/30' 
          : 'text-muted-foreground hover:text-white hover:bg-white/5'
        }
      `}
    >
      <span className="text-lg">{getFlag(league.country)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{league.name}</p>
        <p className="text-xs text-muted-foreground">{league.country}</p>
      </div>
      {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
    </button>
  );
}
