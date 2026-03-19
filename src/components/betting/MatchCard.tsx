'use client';

import { Match } from '@/types';
import { useBetSlipStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { 
  Clock, 
  TrendingUp, 
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchCardProps {
  match: Match;
  showValueIndicator?: boolean;
  valueEdge?: number;
}

export function MatchCard({ match, showValueIndicator, valueEdge }: MatchCardProps) {
  const { items, addItem, removeItem } = useBetSlipStore();
  const [expanded, setExpanded] = useState(false);

  const isInSlip = (betType: string) => 
    items.some(item => item.matchId === match.id && item.betType === betType);

  const handleOddsClick = (betType: string, odds: number, selection: string) => {
    if (isInSlip(betType)) {
      removeItem(match.id);
    } else {
      addItem({
        matchId: match.id,
        match,
        betType,
        odds,
        selection
      });
    }
  };

  const isLive = match.status === 'live';
  const kickoffTime = new Date(match.kickoffTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
    >
      {/* Value Bet Indicator */}
      {showValueIndicator && valueEdge && valueEdge > 0.05 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400" />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={`
              ${isLive 
                ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' 
                : 'bg-white/10 text-muted-foreground border-white/10'
              }
            `}>
              {isLive ? `LIVE ${match.minute}'` : format(kickoffTime, 'HH:mm')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {match.league.name}
            </span>
          </div>
          
          {showValueIndicator && valueEdge && valueEdge > 0.05 && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
              <Zap className="w-3 h-3" />
              +{(valueEdge * 100).toFixed(1)}% Edge
            </Badge>
          )}
        </div>

        {/* Teams */}
        <div className="space-y-3">
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                ⚽
              </div>
              <div>
                <p className="font-medium text-white">{match.homeTeam.name}</p>
                {match.homeTeam.form && (
                  <div className="flex gap-0.5 mt-0.5">
                    {match.homeTeam.form.split('').map((r, i) => (
                      <span
                        key={i}
                        className={`
                          text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-sm
                          ${r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 
                            r === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-red-500/20 text-red-400'}
                        `}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isLive && (
              <span className="text-xl font-bold text-white">{match.homeScore}</span>
            )}
          </div>

          {/* VS / Time */}
          <div className="flex items-center justify-center">
            <div className="px-3 py-1 rounded-full bg-white/5 text-xs text-muted-foreground">
              {isLive ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {match.minute}'
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(kickoffTime, 'dd MMM')}
                </span>
              )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                ⚽
              </div>
              <div>
                <p className="font-medium text-white">{match.awayTeam.name}</p>
                {match.awayTeam.form && (
                  <div className="flex gap-0.5 mt-0.5">
                    {match.awayTeam.form.split('').map((r, i) => (
                      <span
                        key={i}
                        className={`
                          text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-sm
                          ${r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 
                            r === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-red-500/20 text-red-400'}
                        `}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isLive && (
              <span className="text-xl font-bold text-white">{match.awayScore}</span>
            )}
          </div>
        </div>

        {/* 1X2 Odds */}
        {match.odds && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <OddsButton
              label="1"
              odds={match.odds.homeWin}
              isSelected={isInSlip('home')}
              onClick={() => handleOddsClick('home', match.odds!.homeWin, `${match.homeTeam.name} Win`)}
              openingOdds={match.odds.homeWinOpen}
            />
            <OddsButton
              label="X"
              odds={match.odds.draw}
              isSelected={isInSlip('draw')}
              onClick={() => handleOddsClick('draw', match.odds!.draw, 'Draw')}
              openingOdds={match.odds.drawOpen}
            />
            <OddsButton
              label="2"
              odds={match.odds.awayWin}
              isSelected={isInSlip('away')}
              onClick={() => handleOddsClick('away', match.odds!.awayWin, `${match.awayTeam.name} Win`)}
              openingOdds={match.odds.awayWinOpen}
            />
          </div>
        )}

        {/* Expand for more markets */}
        {match.odds && (match.odds.over25 || match.odds.bttsYes) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Less markets
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                More markets
              </>
            )}
          </button>
        )}
      </div>

      {/* Expanded Markets */}
      <AnimatePresence>
        {expanded && match.odds && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-3">
              {/* Goals Over/Under */}
              {match.odds.over25 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Goals</p>
                  <div className="grid grid-cols-2 gap-2">
                    <OddsButton
                      label="Over 2.5"
                      odds={match.odds.over25}
                      isSelected={isInSlip('over25')}
                      onClick={() => handleOddsClick('over25', match.odds!.over25!, 'Over 2.5 Goals')}
                    />
                    <OddsButton
                      label="Under 2.5"
                      odds={match.odds.under25!}
                      isSelected={isInSlip('under25')}
                      onClick={() => handleOddsClick('under25', match.odds!.under25!, 'Under 2.5 Goals')}
                    />
                  </div>
                </div>
              )}

              {/* Both Teams to Score */}
              {match.odds.bttsYes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Both Teams to Score</p>
                  <div className="grid grid-cols-2 gap-2">
                    <OddsButton
                      label="Yes"
                      odds={match.odds.bttsYes}
                      isSelected={isInSlip('btts_yes')}
                      onClick={() => handleOddsClick('btts_yes', match.odds!.bttsYes!, 'BTTS Yes')}
                    />
                    <OddsButton
                      label="No"
                      odds={match.odds.bttsNo!}
                      isSelected={isInSlip('btts_no')}
                      onClick={() => handleOddsClick('btts_no', match.odds!.bttsNo!, 'BTTS No')}
                    />
                  </div>
                </div>
              )}

              {/* Double Chance */}
              {match.odds.homeDraw && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Double Chance</p>
                  <div className="grid grid-cols-3 gap-2">
                    <OddsButton
                      label="1X"
                      odds={match.odds.homeDraw}
                      isSelected={isInSlip('homeDraw')}
                      onClick={() => handleOddsClick('homeDraw', match.odds!.homeDraw!, 'Home or Draw')}
                      size="sm"
                    />
                    <OddsButton
                      label="12"
                      odds={match.odds.homeAway!}
                      isSelected={isInSlip('homeAway')}
                      onClick={() => handleOddsClick('homeAway', match.odds!.homeAway!, 'Home or Away')}
                      size="sm"
                    />
                    <OddsButton
                      label="X2"
                      odds={match.odds.drawAway!}
                      isSelected={isInSlip('drawAway')}
                      onClick={() => handleOddsClick('drawAway', match.odds!.drawAway!, 'Draw or Away')}
                      size="sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OddsButton({ 
  label, 
  odds, 
  isSelected, 
  onClick, 
  openingOdds,
  size = 'default'
}: { 
  label: string; 
  odds: number; 
  isSelected: boolean; 
  onClick: () => void;
  openingOdds?: number;
  size?: 'default' | 'sm';
}) {
  const oddsMovement = openingOdds ? ((openingOdds - odds) / openingOdds) : 0;
  const oddsDropped = oddsMovement > 0.02;
  const oddsRose = oddsMovement < -0.02;

  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 rounded-lg border transition-all
        ${isSelected 
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
          : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
        }
        ${size === 'sm' ? 'py-1.5' : 'py-2'}
      `}
    >
      <p className={`text-[10px] text-muted-foreground ${size === 'sm' ? 'text-[9px]' : ''}`}>
        {label}
      </p>
      <p className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {odds.toFixed(2)}
      </p>
      
      {/* Odds movement indicator */}
      {oddsDropped && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" title="Odds dropped" />
      )}
      {oddsRose && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" title="Odds increased" />
      )}
    </button>
  );
}
