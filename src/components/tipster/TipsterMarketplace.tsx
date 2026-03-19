'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTipsterStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  Star, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Target,
  Heart,
  MessageCircle,
  Lock,
  Zap,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

// API Response Types
interface ApiTipster {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  isFeatured: boolean;
  totalTips: number;
  wins: number;
  losses: number;
  roi: number;
  yield: number;
  winRate: number;
  avgOdds: number;
  profit: number;
  monthlyPrice: number;
  weeklyPrice: number;
  singleTipPrice: number;
  followersCount: number;
}

interface ApiTip {
  id: string;
  tipsterId: string;
  tipster?: ApiTipster;
  matchId: string;
  prediction: string;
  odds: number;
  stake: number;
  reasoning?: string;
  isPremium: boolean;
  isFree: boolean;
  result?: 'win' | 'loss' | 'void' | 'pending';
}

// Skeleton Components
function TipsterCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex items-start gap-4">
          <Skeleton className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-white/10`} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32 bg-white/10" />
            <Skeleton className={`h-3 ${compact ? 'w-full' : 'w-48'} bg-white/10`} />
          </div>
        </div>
        <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mt-4`}>
          {[...Array(compact ? 3 : 4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg bg-white/10" />
          ))}
        </div>
        <div className={`flex items-center justify-between ${compact ? 'mt-3' : 'mt-4'}`}>
          <Skeleton className="h-4 w-24 bg-white/10" />
          <Skeleton className="h-9 w-24 rounded-lg bg-white/10" />
        </div>
      </CardContent>
    </Card>
  );
}

function TipCardSkeleton() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="h-3 w-20 bg-white/10" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 bg-white/10" />
      </div>
      <Skeleton className="h-16 rounded-lg bg-white/10" />
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-10 bg-white/10" />
          <Skeleton className="h-4 w-10 bg-white/10" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <Skeleton className="h-8 w-16 mx-auto bg-white/10" />
            <Skeleton className="h-3 w-24 mx-auto mt-2 bg-white/10" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TipsterMarketplace() {
  const [selectedTipster, setSelectedTipster] = useState<ApiTipster | null>(null);
  const [tipsters, setTipsters] = useState<ApiTipster[]>([]);
  const [tips, setTips] = useState<ApiTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { followTipster, unfollowTipster, followedTipsters } = useTipsterStore();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch tipsters
      const tipstersResponse = await fetch('/api/tipsters');
      
      if (!tipstersResponse.ok) {
        throw new Error('Failed to fetch tipsters');
      }
      
      const tipstersData = await tipstersResponse.json();
      
      if (tipstersData.success && tipstersData.data) {
        setTipsters(tipstersData.data);
        
        // Get tips from the first tipster with tips
        const tipsterWithTips = tipstersData.data.find((t: ApiTipster) => t.totalTips > 0);
        if (tipsterWithTips) {
          const tipsResponse = await fetch(`/api/tipsters?id=${tipsterWithTips.id}`);
          if (tipsResponse.ok) {
            const tipsData = await tipsResponse.json();
            if (tipsData.success && tipsData.data?.tips) {
              setTips(tipsData.data.tips);
            }
          }
        }
      } else {
        throw new Error(tipstersData.error || 'Failed to load tipsters');
      }
    } catch (err) {
      console.error('Error fetching tipsters:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading tipsters');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const featuredTipsters = tipsters.filter(t => t.isFeatured);
  const allTipsters = tipsters;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-7 h-7 text-yellow-400" />
            Tipster Marketplace
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Follow top tipsters and copy their winning predictions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-white/10 text-white hover:bg-white/10"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold"
          >
            <Star className="w-4 h-4 mr-2" />
            Become a Tipster
          </Button>
        </div>
      </div>

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
              onClick={fetchData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{tipsters.length}</p>
              <p className="text-xs text-muted-foreground">Active Tipsters</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">R{tipsters.reduce((acc, t) => acc + t.profit, 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Profit Generated</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-cyan-400">{tipsters.length > 0 ? (tipsters.reduce((acc, t) => acc + t.winRate, 0) / tipsters.length).toFixed(1) : 0}%</p>
              <p className="text-xs text-muted-foreground">Avg Win Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{tipsters.reduce((acc, t) => acc + t.followersCount, 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Followers</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="featured" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="featured" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            ⭐ Featured
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            All Tipsters
          </TabsTrigger>
          <TabsTrigger value="tips" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            📊 Recent Tips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="space-y-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <TipsterCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredTipsters.length === 0 ? (
            <div className="text-center py-12">
              <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No featured tipsters at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {featuredTipsters.map((tipster, index) => (
                <TipsterCard 
                  key={tipster.id} 
                  tipster={tipster} 
                  index={index}
                  isFollowed={followedTipsters.includes(tipster.id)}
                  onFollow={() => followTipster(tipster.id)}
                  onUnfollow={() => unfollowTipster(tipster.id)}
                  onClick={() => setSelectedTipster(tipster)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <TipsterCardSkeleton key={i} compact />
              ))}
            </div>
          ) : allTipsters.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tipsters found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTipsters.map((tipster, index) => (
                <TipsterCard 
                  key={tipster.id} 
                  tipster={tipster} 
                  index={index}
                  isFollowed={followedTipsters.includes(tipster.id)}
                  onFollow={() => followTipster(tipster.id)}
                  onUnfollow={() => unfollowTipster(tipster.id)}
                  onClick={() => setSelectedTipster(tipster)}
                  compact
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <TipCardSkeleton key={i} />
              ))}
            </div>
          ) : tips.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tips available at the moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <TipCard key={tip.id} tip={tip} tipsters={tipsters} index={index} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Tipster Modal */}
      {selectedTipster && (
        <TipsterDetailModal 
          tipster={selectedTipster} 
          onClose={() => setSelectedTipster(null)}
          isFollowed={followedTipsters.includes(selectedTipster.id)}
          onFollow={() => followTipster(selectedTipster.id)}
          onUnfollow={() => unfollowTipster(selectedTipster.id)}
        />
      )}
    </div>
  );
}

function TipsterCard({ 
  tipster, 
  index, 
  isFollowed,
  onFollow,
  onUnfollow,
  onClick,
  compact = false 
}: { 
  tipster: ApiTipster; 
  index: number;
  isFollowed: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className={`
          bg-white/5 border-white/10 cursor-pointer hover:border-emerald-500/30 transition-all
          ${tipster.isFeatured ? 'bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10 border-yellow-500/20' : ''}
        `}
        onClick={onClick}
      >
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} border-2 ${tipster.isVerified ? 'border-emerald-500' : 'border-white/20'}`}>
                <AvatarImage src={tipster.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-black font-bold text-lg">
                  {tipster.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {tipster.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
              {tipster.isFeatured && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Star className="w-4 h-4 text-black" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">{tipster.displayName}</h3>
                {tipster.isVerified && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                    VERIFIED
                  </Badge>
                )}
              </div>
              <p className={`text-muted-foreground ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'} mt-1`}>
                {tipster.bio}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mt-4`}>
            <StatItem 
              icon={<TrendingUp className="w-3 h-3" />} 
              label="ROI" 
              value={`${tipster.roi.toFixed(1)}%`}
              positive={tipster.roi > 0}
            />
            <StatItem 
              icon={<Target className="w-3 h-3" />} 
              label="Win Rate" 
              value={`${tipster.winRate.toFixed(1)}%`}
            />
            <StatItem 
              icon={<DollarSign className="w-3 h-3" />} 
              label="Profit" 
              value={`R${tipster.profit.toLocaleString()}`}
              positive={tipster.profit > 0}
            />
            {!compact && (
              <StatItem 
                icon={<Users className="w-3 h-3" />} 
                label="Followers" 
                value={tipster.followersCount.toString()}
              />
            )}
          </div>

          {/* Pricing */}
          <div className={`flex items-center justify-between ${compact ? 'mt-3' : 'mt-4'}`}>
            <div className="text-sm">
              <span className="text-muted-foreground">From </span>
              <span className="text-emerald-400 font-semibold">R{tipster.singleTipPrice.toFixed(0)}</span>
              <span className="text-muted-foreground">/tip</span>
            </div>
            <Button
              size="sm"
              className={isFollowed 
                ? "bg-white/10 text-white hover:bg-white/20" 
                : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-medium"
              }
              onClick={(e) => {
                e.stopPropagation();
                if (isFollowed) {
                  onUnfollow();
                } else {
                  onFollow();
                }
              }}
            >
              {isFollowed ? 'Following' : 'Follow'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatItem({ icon, label, value, positive }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="text-center p-2 rounded-lg bg-white/5">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
      </div>
      <p className={`text-sm font-semibold ${positive ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TipCard({ tip, tipsters, index }: { tip: ApiTip; tipsters: ApiTipster[]; index: number }) {
  const tipster = tipsters.find(t => t.id === tip.tipsterId);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl bg-white/5 border border-white/10 p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-white/20">
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-black font-bold">
              {tipster?.displayName.charAt(0) || 'T'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-white">{tipster?.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {tip.isPremium ? '🔒 Premium Tip' : '🆓 Free Tip'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            @ {tip.odds.toFixed(2)}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            Confidence: {tip.stake}/10
          </p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
        <p className="text-sm font-medium text-white mb-1">
          {tip.prediction.toUpperCase()}
        </p>
        {tip.reasoning && (
          <p className="text-sm text-muted-foreground">{tip.reasoning}</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-muted-foreground hover:text-red-400 transition-colors">
            <Heart className="w-4 h-4" />
            <span className="text-xs">24</span>
          </button>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-cyan-400 transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">8</span>
          </button>
        </div>
        
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-medium"
        >
          {tip.isPremium ? (
            <>
              <Lock className="w-3 h-3 mr-1" />
              Unlock R{tipster?.singleTipPrice.toFixed(0)}
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 mr-1" />
              Add to Slip
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function TipsterDetailModal({ 
  tipster, 
  onClose,
  isFollowed,
  onFollow,
  onUnfollow
}: { 
  tipster: ApiTipster; 
  onClose: () => void;
  isFollowed: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-2 border-emerald-500">
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-black font-bold text-2xl">
                {tipster.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{tipster.displayName}</h2>
                {tipster.isVerified && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    VERIFIED
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">{tipster.bio}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-2xl font-bold text-emerald-400">{tipster.roi.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">ROI</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-2xl font-bold text-white">{tipster.winRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-2xl font-bold text-cyan-400">R{tipster.profit.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Profit</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="p-6 border-t border-white/10">
          <h3 className="font-semibold text-white mb-3">Subscription Plans</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
              <p className="text-xs text-muted-foreground">Single Tip</p>
              <p className="text-lg font-bold text-white">R{tipster.singleTipPrice.toFixed(0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
              <p className="text-xs text-muted-foreground">Weekly</p>
              <p className="text-lg font-bold text-white">R{tipster.weeklyPrice.toFixed(0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center">
              <p className="text-xs text-emerald-400">Monthly</p>
              <p className="text-lg font-bold text-emerald-400">R{tipster.monthlyPrice.toFixed(0)}</p>
              <Badge className="mt-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                BEST VALUE
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold"
          >
            Subscribe Monthly
          </Button>
          <Button
            variant="outline"
            className="border-white/10 text-white hover:bg-white/10"
            onClick={() => isFollowed ? onUnfollow() : onFollow()}
          >
            {isFollowed ? 'Unfollow' : 'Follow'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
