'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, DollarSign, TrendingUp, ArrowRightLeft, Save, RotateCcw,
  Goal, Shield, Zap, User, Star, AlertTriangle, CheckCircle2,
  Plus, Minus, RefreshCw, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  shirtNumber: number;
  price: number;
  priceChange: number;
  form: number;
  totalPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  expectedGoals: number;
  expectedAssists: number;
  ownershipPercent: number;
  team: {
    id: string;
    name: string;
    logo: string | null;
  };
  upcomingFixtures: Array<{
    id: string;
    kickoffTime: string;
    isHome: boolean;
    opponent: { id: string; name: string; logo: string | null };
    league: { id: string; name: string };
  }>;
}

interface FantasyTeam {
  id: string;
  name: string;
  budget: number;
  remainingBudget: number;
  teamValue: number;
  totalPoints: number;
  gameweekPoints: number;
  freeTransfers: number;
  players: Array<Player & { isCaptain?: boolean; isViceCaptain?: boolean }>;
  captain: { id: string; name: string } | null;
  viceCaptain: { id: string; name: string } | null;
  currentGameweek: { number: number; name: string; deadline: string } | null;
}

const BUDGET = 100;
const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-5-1', '5-3-2', '3-4-3'];
const POSITION_COLORS = {
  GK: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DEF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MID: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  FWD: 'bg-red-500/20 text-red-400 border-red-500/30',
};
const POSITION_LIMITS = { GK: { min: 1, max: 2 }, DEF: { min: 3, max: 5 }, MID: { min: 2, max: 5 }, FWD: { min: 1, max: 3 } };
const MAX_PLAYERS_PER_TEAM = 3;

export function FantasyTeamBuilder() {
  const [selectedPlayers, setSelectedPlayers] = useState<(Player | null)[]>(new Array(15).fill(null));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [formation, setFormation] = useState('4-4-2');
  const [teamName, setTeamName] = useState('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingTeam, setExistingTeam] = useState<FantasyTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all players on mount
  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/fantasy/players?limit=200');
      const data = await res.json();
      if (data.success) {
        setAllPlayers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch existing team
  const fetchExistingTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/fantasy/team');
      const data = await res.json();
      if (data.success && data.data) {
        setExistingTeam(data.data);
        setTeamName(data.data.name);
        // Populate selected players
        if (data.data.players) {
          const players = data.data.players.map(p => allPlayers.find(ap => ap.id === p.id) || null);
          setSelectedPlayers(players);
        }
        if (data.data.captain) setCaptainId(data.data.captain.id);
        if (data.data.viceCaptain) setViceCaptainId(data.data.viceCaptain.id);
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
    }
  }, [allPlayers]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    if (allPlayers.length > 0) {
      fetchExistingTeam();
    }
  }, [allPlayers, fetchExistingTeam]);

  // Calculate team value and remaining budget
  const teamValue = selectedPlayers.filter(Boolean).reduce((sum, p) => sum + (p?.price || 0), 0);
  const remainingBudget = BUDGET - teamValue;

  // Count players by position
  const positionCounts = selectedPlayers.filter(Boolean).reduce((acc, p) => {
    if (p) acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count players by team
  const teamCounts = selectedPlayers.filter(Boolean).reduce((acc, p) => {
    if (p) acc[p.team.id] = (acc[p.team.id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check if player can be added
  const canAddPlayer = (player: Player): { allowed: boolean; reason?: string } => {
    const currentCount = selectedPlayers.filter(Boolean).length;
    if (currentCount >= 15) {
      return { allowed: false, reason: 'Team is full (15 players max)' };
    }
    if (remainingBudget < player.price) {
      return { allowed: false, reason: 'Insufficient budget' };
    }
    const posCount = positionCounts[player.position] || 0;
    const posLimit = POSITION_LIMITS[player.position];
    if (posCount >= posLimit.max) {
      return { allowed: false, reason: `Maximum ${posLimit.max} ${player.position} players` };
    }
    const teamCount = teamCounts[player.team.id] || 0;
    if (teamCount >= MAX_PLAYERS_PER_TEAM) {
      return { allowed: false, reason: `Maximum ${MAX_PLAYERS_PER_TEAM} players from ${player.team.name}` };
    }
    if (selectedPlayers.some(p => p?.id === player.id)) {
      return { allowed: false, reason: 'Player already in team' };
    }
    return { allowed: true };
  };

  // Add player to team
  const addPlayer = (player: Player) => {
    const check = canAddPlayer(player);
    if (!check.allowed) {
      setError(check.reason || 'Cannot add player');
      return;
    }

    // Find first empty slot that matches position requirements
    const emptyIdx = selectedPlayers.findIndex(p => p === null);
    if (emptyIdx !== -1) {
      const newPlayers = [...selectedPlayers];
      newPlayers[emptyIdx] = player;
      setSelectedPlayers(newPlayers);
    }
  };

  // Remove player from team
  const removePlayer = (index: number) => {
    const player = selectedPlayers[index];
    const newPlayers = [...selectedPlayers];
    newPlayers[index] = null;
    setSelectedPlayers(newPlayers);

    // Clear captain/vice if removed
    if (player && player.id === captainId) setCaptainId(null);
    if (player && player.id === viceCaptainId) setViceCaptainId(null);
  };

  // Save team
  const saveTeam = async () => {
    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }
    if (selectedPlayers.filter(Boolean).length !== 15) {
      setError('Team must have exactly 15 players');
      return;
    }
    if (!captainId || !viceCaptainId) {
      setError('Please select captain and vice captain');
      return;
    }

    // Check position requirements
    for (const [pos, limits] of Object.entries(POSITION_LIMITS)) {
      const count = positionCounts[pos] || 0;
      if (count < limits.min) {
        setError(`Need at least ${limits.min} ${pos} players`);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      const playerIds = selectedPlayers.filter(Boolean).map(p => p!.id);
      const endpoint = existingTeam ? '/api/fantasy/team' : '/api/fantasy/team';
      const method = existingTeam ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          players: playerIds,
          captainId,
          viceCaptainId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(existingTeam ? 'Team updated successfully!' : 'Team created successfully!');
        fetchExistingTeam();
      } else {
        setError(data.error || 'Failed to save team');
      }
    } catch (err) {
      setError('Failed to save team');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter available players
  const filteredPlayers = allPlayers.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = positionFilter === 'all' || p.position === positionFilter;
    const matchesTeam = teamFilter === 'all' || p.team.id === teamFilter;
    return matchesSearch && matchesPosition && matchesTeam;
  });

  // Get unique teams for filter
  const teams = Array.from(new Set(allPlayers.map(p => p.team.id))).map(id => ({
    id,
    name: allPlayers.find(p => p.team.id === id)?.team.name || '',
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 bg-white/5" />
        <Skeleton className="h-96 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Header */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Enter team name..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="bg-white/5 border-white/10 text-white w-48"
              />
              <Select value={formation} onValueChange={setFormation}>
                <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              {/* Budget */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className={`text-lg font-bold ${remainingBudget < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  R{remainingBudget.toFixed(1)}M
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Team Value</p>
                <p className="text-lg font-bold text-white">R{teamValue.toFixed(1)}M</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Players</p>
                <p className="text-lg font-bold text-white">{selectedPlayers.filter(Boolean).length}/15</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/5" onClick={() => setSelectedPlayers(new Array(15).fill(null))}>
                <RotateCcw className="w-4 h-4 mr-2" /> Reset
              </Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={saveTeam} disabled={isSaving}>
                {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {existingTeam ? 'Update Team' : 'Save Team'}
              </Button>
            </div>
          </div>

          {/* Position counts */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
            {Object.entries(POSITION_LIMITS).map(([pos, limits]) => {
              const count = positionCounts[pos] || 0;
              const isValid = count >= limits.min && count <= limits.max;
              return (
                <div key={pos} className="flex items-center gap-2">
                  <Badge className={POSITION_COLORS[pos as keyof typeof POSITION_COLORS]}>{pos}</Badge>
                  <span className={isValid ? 'text-white' : 'text-red-400'}>{count}/{limits.max}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Team Field View */}
        <div className="md:col-span-2">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Your Team
              </CardTitle>
              <CardDescription>Select captain and vice captain</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="field">
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="field" className="data-[state=active]:bg-white/10 text-white">Field View</TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:bg-white/10 text-white">List View</TabsTrigger>
                </TabsList>

                <TabsContent value="field" className="mt-4">
                  {/* Field visualization */}
                  <div className="relative bg-gradient-to-b from-emerald-900/50 to-emerald-800/30 rounded-xl p-4 min-h-[400px] border border-emerald-500/20">
                    {/* Formation lines */}
                    <div className="absolute inset-4 border-2 border-white/10 rounded-lg">
                      <div className="absolute top-1/4 left-0 right-0 border-t border-white/10" />
                      <div className="absolute top-1/2 left-0 right-0 border-t border-white/10" />
                      <div className="absolute top-3/4 left-0 right-0 border-t border-white/10" />
                    </div>

                    {/* Players by position */}
                    {['GK', 'DEF', 'MID', 'FWD'].map((pos, rowIdx) => {
                      const posPlayers = selectedPlayers.filter(p => p?.position === pos);
                      const formationParts = formation.split('-').map(Number);
                      let rowPlayers: (Player | null)[] = [];
                      
                      if (pos === 'GK') rowPlayers = posPlayers;
                      else if (pos === 'DEF') rowPlayers = posPlayers.slice(0, formationParts[0] || 4);
                      else if (pos === 'MID') rowPlayers = posPlayers.slice(0, formationParts[1] || 4);
                      else rowPlayers = posPlayers.slice(0, formationParts[2] || 2);

                      return (
                        <div key={pos} className="flex justify-center gap-2 my-4 relative z-10">
                          {rowPlayers.map((player, idx) => {
                            return (
                              <motion.div
                                key={idx}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="relative"
                              >
                                {player ? (
                                  <div className={`w-16 h-20 rounded-lg ${POSITION_COLORS[pos as keyof typeof POSITION_COLORS]} border flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-colors`}
                                    onClick={() => {
                                      if (captainId === player.id) setCaptainId(null);
                                      else if (viceCaptainId === player.id) setViceCaptainId(null);
                                    }}
                                  >
                                    {player.id === captainId && <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-[10px] flex items-center justify-center text-black font-bold">C</span>}
                                    {player.id === viceCaptainId && <span className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">V</span>}
                                    <span className="text-[10px] truncate w-14 text-center">{player.name.split(' ').pop()}</span>
                                    <span className="text-[10px] opacity-70">{player.totalPoints}pts</span>
                                  </div>
                                ) : (
                                  <div className="w-16 h-20 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-white/30" />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Captain Selection */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Captain (2x points)</label>
                      <Select value={captainId || ''} onValueChange={setCaptainId}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Select captain" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPlayers.filter(Boolean).map(p => (
                            <SelectItem key={p!.id} value={p!.id}>{p!.name} ({p!.team.name})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Vice Captain</label>
                      <Select value={viceCaptainId || ''} onValueChange={setViceCaptainId}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Select vice captain" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPlayers.filter(Boolean).filter(p => p!.id !== captainId).map(p => (
                            <SelectItem key={p!.id} value={p!.id}>{p!.name} ({p!.team.name})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="list" className="mt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {selectedPlayers.map((player, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                          {player ? (
                            <>
                              <div className="flex items-center gap-3">
                                <Badge className={POSITION_COLORS[player.position]}>{player.position}</Badge>
                                <div>
                                  <p className="text-white text-sm">{player.name}</p>
                                  <p className="text-xs text-muted-foreground">{player.team.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-medium">R{player.price}M</span>
                                {player.id === captainId && <Badge className="bg-yellow-500/20 text-yellow-400">C</Badge>}
                                {player.id === viceCaptainId && <Badge className="bg-blue-500/20 text-blue-400">V</Badge>}
                                <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => removePlayer(idx)}>
                                  <Minus className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-muted-foreground text-sm w-full text-center py-2">Empty slot</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Player Selection */}
        <div className="md:col-span-1">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Add Players</CardTitle>
              <div className="flex flex-col gap-2 mt-2">
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <div className="flex gap-2">
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      <SelectItem value="GK">GK</SelectItem>
                      <SelectItem value="DEF">DEF</SelectItem>
                      <SelectItem value="MID">MID</SelectItem>
                      <SelectItem value="FWD">FWD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                      <SelectValue placeholder="Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredPlayers.slice(0, 50).map(player => {
                    const canAdd = canAddPlayer(player);
                    const isSelected = selectedPlayers.some(p => p?.id === player.id);
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-2 rounded-lg border transition-colors ${
                          isSelected 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : canAdd.allowed 
                              ? 'bg-white/5 border-white/10 hover:border-white/20 cursor-pointer' 
                              : 'bg-white/5 border-white/5 opacity-50'
                        }`}
                        onClick={() => canAdd.allowed && !isSelected && addPlayer(player)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={POSITION_COLORS[player.position]} variant="outline">{player.position}</Badge>
                            <div>
                              <p className="text-white text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">{player.team.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-medium text-sm">R{player.price}M</p>
                            <p className="text-xs text-muted-foreground">{player.totalPoints}pts</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Form: {player.form}</span>
                          <span>xG: {(player.expectedGoals ?? 0).toFixed(1)}</span>
                          <span>Own: {(player.ownershipPercent ?? 0).toFixed(0)}%</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
