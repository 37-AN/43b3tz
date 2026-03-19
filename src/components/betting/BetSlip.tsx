'use client';

import { useBetSlipStore, useWalletStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Trash2, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export function BetSlip() {
  const { 
    items, 
    stake, 
    totalOdds, 
    potentialWin, 
    isSimulation,
    setStake, 
    removeItem, 
    clearSlip,
    toggleSimulation 
  } = useBetSlipStore();
  const { virtualBalance, balance, updateVirtualBalance, updateBalance } = useWalletStore();
  const [isPlacing, setIsPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const handlePlaceBet = async () => {
    if (items.length === 0) return;
    
    const currentBalance = isSimulation ? virtualBalance : balance;
    if (stake > currentBalance) return;
    
    setIsPlacing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (isSimulation) {
      updateVirtualBalance(-stake);
    } else {
      updateBalance(-stake);
    }
    
    setIsPlacing(false);
    setPlaced(true);
    setTimeout(() => {
      setPlaced(false);
      clearSlip();
    }, 2000);
  };

  const currentBalance = isSimulation ? virtualBalance : balance;

  return (
    <div className="w-80 border-l border-white/10 bg-black/60 backdrop-blur-sm flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Bet Slip</h3>
            {items.length > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {items.length}
              </Badge>
            )}
          </div>
          {items.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-white h-7"
              onClick={clearSlip}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        {/* Mode Toggle */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => toggleSimulation()}
            className={`
              flex-1 py-2 rounded-lg text-sm font-medium transition-all
              ${isSimulation 
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'bg-white/5 text-muted-foreground hover:text-white'
              }
            `}
          >
            🎮 Simulation
          </button>
          <button
            onClick={() => toggleSimulation()}
            className={`
              flex-1 py-2 rounded-lg text-sm font-medium transition-all
              ${!isSimulation 
                ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-white/5 text-muted-foreground hover:text-white'
              }
            `}
          >
            💰 Real Money
          </button>
        </div>
      </div>

      {/* Bet Items */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                Your bet slip is empty
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Click on odds to add selections
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <motion.div
                  key={item.matchId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative p-3 rounded-xl bg-white/5 border border-white/10 group"
                >
                  <button
                    onClick={() => removeItem(item.matchId)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-white" />
                  </button>
                  
                  <p className="text-xs text-muted-foreground mb-1">
                    {item.match.homeTeam.name} vs {item.match.awayTeam.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{item.selection}</p>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {item.odds.toFixed(2)}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Footer */}
      {items.length > 0 && (
        <div className="p-4 border-t border-white/10 space-y-4">
          {/* Stake Input */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Stake (ZAR)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                className="bg-white/5 border-white/10 text-white"
                min={1}
                max={isSimulation ? virtualBalance : balance}
              />
              <Button 
                variant="outline" 
                size="sm"
                className="shrink-0 border-white/10 text-white hover:bg-white/10"
                onClick={() => setStake(currentBalance * 0.5)}
              >
                50%
              </Button>
            </div>
            
            {/* Quick stakes */}
            <div className="flex gap-2">
              {[10, 50, 100, 500].map((amount) => (
                <Button
                  key={amount}
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs text-muted-foreground hover:text-white"
                  onClick={() => setStake(amount)}
                >
                  R{amount}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Odds</span>
              <span className="text-white font-medium">{totalOdds.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Potential Win</span>
              <span className="text-emerald-400 font-semibold">R{potentialWin.toFixed(2)}</span>
            </div>
          </div>

          {/* Balance Warning */}
          {stake > currentBalance && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-400">Insufficient balance</p>
            </div>
          )}

          {/* Place Bet Button */}
          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50"
            disabled={stake > currentBalance || stake <= 0 || isPlacing || placed}
            onClick={handlePlaceBet}
          >
            {isPlacing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Bet...
              </>
            ) : placed ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Bet Placed!
              </>
            ) : (
              `Place Bet • R${stake}`
            )}
          </Button>
          
          {isSimulation && (
            <p className="text-center text-xs text-muted-foreground">
              🎮 Simulation mode - no real money involved
            </p>
          )}
        </div>
      )}
    </div>
  );
}
