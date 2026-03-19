'use client';

import { useState } from 'react';
import { generateLeaderboard } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  Target,
  Crown,
  Flame,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Leaderboard() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('weekly');
  const leaderboard = generateLeaderboard();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 via-transparent to-orange-500/20 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/10 via-transparent to-gray-300/10 border-gray-400/20';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/10 via-transparent to-amber-500/10 border-amber-600/20';
    return 'bg-white/5 border-white/10';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            Leaderboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Top performing bettors this season
          </p>
        </div>
      </div>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="daily" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Weekly
          </TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            Monthly
          </TabsTrigger>
          <TabsTrigger value="all_time" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            All Time
          </TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <PodiumCard key={entry.username} entry={entry} position={index + 1} />
            ))}
          </div>

          {/* Rest of Leaderboard */}
          <div className="space-y-2">
            {leaderboard.slice(3).map((entry, index) => (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl border p-4 ${getRankBg(entry.rank)}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <Avatar className="w-10 h-10 border border-white/20">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-black font-bold">
                      {entry.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="font-medium text-white">{entry.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.totalBets} bets • {entry.winRate.toFixed(1)}% win rate
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">
                      R{entry.profit.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.roi.toFixed(1)}% ROI
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Your Position */}
      <Card className="bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Your Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">#42</p>
              <p className="text-xs text-muted-foreground">Current Rank</p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400">R1,250</p>
                <p className="text-xs text-muted-foreground">Profit</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">54.2%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-cyan-400">12.5%</p>
                <p className="text-xs text-muted-foreground">ROI</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <ChevronUp className="w-4 h-4" />
              <span className="text-sm font-medium">+8</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PodiumCard({ entry, position }: { entry: any; position: number }) {
  const heights = ['h-32', 'h-40', 'h-28'];
  const colors = [
    'from-yellow-500/30 to-orange-500/30 border-yellow-500/30',
    'from-gray-400/20 to-gray-300/20 border-gray-400/20',
    'from-amber-600/20 to-amber-500/20 border-amber-600/20'
  ];
  const medals = ['🥇', '🥈', '🥉'];
  
  // Reorder: 2nd, 1st, 3rd
  const order = [1, 0, 2];
  const displayPosition = order[position - 1] + 1;
  const displayEntry = [leaderboard[1], leaderboard[0], leaderboard[2]][position - 1] || entry;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={`
        relative rounded-xl border bg-gradient-to-b ${colors[order[position - 1]]}
        ${position === 1 ? 'md:-mt-4' : ''}
      `}
    >
      <div className="p-4 text-center">
        <div className="text-3xl mb-2">{medals[order[position - 1]]}</div>
        
        <Avatar className={`w-14 h-14 mx-auto border-2 ${position === 1 ? 'border-yellow-400' : 'border-white/20'}`}>
          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-black font-bold text-lg">
            {displayEntry?.username?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        
        <p className="font-semibold text-white mt-2 text-sm truncate">
          {displayEntry?.username || '---'}
        </p>
        
        <div className="mt-2 space-y-1">
          <p className="text-lg font-bold text-emerald-400">
            R{displayEntry?.profit?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-muted-foreground">
            {displayEntry?.winRate?.toFixed(1) || '0'}% win rate
          </p>
        </div>
      </div>
    </motion.div>
  );
}

const leaderboard = generateLeaderboard();
