'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users, Trophy, Plus, Search, Copy, Check, ExternalLink,
  Crown, Medal, User, Lock, Globe, RefreshCw, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface League {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isPublic: boolean;
  memberCount: number;
  maxMembers: number;
  prizePool: number;
  userRank?: number;
  userTotalPoints?: number;
  userRole?: string;
  isFull?: boolean;
}

interface LeagueMember {
  id: string;
  rank: number;
  user: { id: string; name: string; username: string };
  teamName: string;
  totalPoints: number;
  gameweekPoints: number;
}

interface LeagueDetail extends League {
  members?: LeagueMember[];
}

export function FantasyLeagues() {
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<LeagueDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create league form state
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDesc, setNewLeagueDesc] = useState('');
  const [newLeaguePublic, setNewLeaguePublic] = useState(true);
  const [newLeagueMaxMembers, setNewLeagueMaxMembers] = useState(20);

  // Fetch leagues
  const fetchLeagues = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch my leagues
      const myRes = await fetch('/api/fantasy/leagues?type=my');
      const myData = await myRes.json();
      if (myData.success) {
        setMyLeagues(myData.data);
      }

      // Fetch public leagues
      const publicRes = await fetch('/api/fantasy/leagues?type=public');
      const publicData = await publicRes.json();
      if (publicData.success) {
        setPublicLeagues(publicData.data);
      }
    } catch (err) {
      console.error('Failed to fetch leagues:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch league details
  const fetchLeagueDetails = async (leagueId: string) => {
    try {
      const res = await fetch(`/api/fantasy/leagues?leagueId=${leagueId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedLeague(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch league details:', err);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  // Join league by code
  const joinLeague = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a league code');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const res = await fetch('/api/fantasy/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully joined "${data.league.name}"!`);
        setJoinCode('');
        fetchLeagues();
      } else {
        setError(data.error || 'Failed to join league');
      }
    } catch (err) {
      setError('Failed to join league');
    } finally {
      setIsJoining(false);
    }
  };

  // Create new league
  const createLeague = async () => {
    if (!newLeagueName.trim()) {
      setError('Please enter a league name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/fantasy/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeagueName,
          description: newLeagueDesc,
          isPublic: newLeaguePublic,
          maxMembers: newLeagueMaxMembers,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`League "${data.name}" created! Code: ${data.code}`);
        setNewLeagueName('');
        setNewLeagueDesc('');
        fetchLeagues();
      } else {
        setError(data.error || 'Failed to create league');
      }
    } catch (err) {
      setError('Failed to create league');
    } finally {
      setIsCreating(false);
    }
  };

  // Copy code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-white/5" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48 bg-white/5" />
          <Skeleton className="h-48 bg-white/5" />
        </div>
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
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="my-leagues">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="my-leagues" className="data-[state=active]:bg-white/10 text-white">
            <Users className="w-4 h-4 mr-2" />
            My Leagues ({myLeagues.length})
          </TabsTrigger>
          <TabsTrigger value="join" className="data-[state=active]:bg-white/10 text-white">
            <Search className="w-4 h-4 mr-2" />
            Join League
          </TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-white/10 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create League
          </TabsTrigger>
        </TabsList>

        {/* My Leagues */}
        <TabsContent value="my-leagues" className="mt-6">
          {myLeagues.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't joined any leagues yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create one or join with a code to compete!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myLeagues.map((league) => (
                <motion.div
                  key={league.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card 
                    className="bg-white/5 border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                    onClick={() => fetchLeagueDetails(league.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{league.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {league.isPublic ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                <Globe className="w-3 h-3 mr-1" /> Public
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                <Lock className="w-3 h-3 mr-1" /> Private
                              </Badge>
                            )}
                            {league.userRole === 'admin' && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                <Crown className="w-3 h-3 mr-1" /> Admin
                              </Badge>
                            )}
                          </div>
                        </div>
                        {league.code && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCode(league.code!);
                            }}
                          >
                            {copiedCode === league.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{league.memberCount}/{league.maxMembers} members</span>
                        {league.userRank && (
                          <span className="text-emerald-400">Rank #{league.userRank}</span>
                        )}
                      </div>

                      {league.prizePool > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <span className="text-yellow-400 text-sm font-medium">
                            🏆 Prize Pool: R{league.prizePool}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Join League */}
        <TabsContent value="join" className="mt-6">
          <div className="space-y-6">
            {/* Join by code */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Join by Code</CardTitle>
                <CardDescription>Enter the league code shared with you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter league code..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 text-white uppercase"
                    maxLength={10}
                  />
                  <Button 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={joinLeague}
                    disabled={isJoining}
                  >
                    {isJoining ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Join'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Public leagues */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Public Leagues</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {publicLeagues
                  .filter(l => !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((league) => (
                  <Card key={league.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-white">{league.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{league.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-muted-foreground">{league.memberCount}/{league.maxMembers}</span>
                        {league.prizePool > 0 && (
                          <span className="text-yellow-400 text-sm">R{league.prizePool} prize</span>
                        )}
                      </div>
                      <Button
                        className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => {
                          setJoinCode(league.code || '');
                          // Auto-join logic here if needed
                        }}
                        disabled={league.isFull}
                      >
                        {league.isFull ? 'Full' : 'Join League'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Create League */}
        <TabsContent value="create" className="mt-6">
          <Card className="bg-white/5 border-white/10 max-w-lg">
            <CardHeader>
              <CardTitle className="text-white text-lg">Create New League</CardTitle>
              <CardDescription>Start your own fantasy competition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">League Name</Label>
                <Input
                  placeholder="My Fantasy League"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  maxLength={50}
                />
              </div>

              <div>
                <Label className="text-white">Description (optional)</Label>
                <Input
                  placeholder="League description..."
                  value={newLeagueDesc}
                  onChange={(e) => setNewLeagueDesc(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Public League</Label>
                  <p className="text-xs text-muted-foreground">Anyone can find and join</p>
                </div>
                <Switch checked={newLeaguePublic} onCheckedChange={setNewLeaguePublic} />
              </div>

              <div>
                <Label className="text-white">Max Members</Label>
                <Input
                  type="number"
                  value={newLeagueMaxMembers}
                  onChange={(e) => setNewLeagueMaxMembers(parseInt(e.target.value) || 20)}
                  className="bg-white/5 border-white/10 text-white mt-1 w-24"
                  min={2}
                  max={100}
                />
              </div>

              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={createLeague}
                disabled={isCreating}
              >
                {isCreating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create League
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* League Detail Modal */}
      <Dialog open={!!selectedLeague} onOpenChange={() => setSelectedLeague(null)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              {selectedLeague?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedLeague?.memberCount} members • Code: <span className="font-mono text-emerald-400">{selectedLeague?.code}</span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] mt-4">
            {selectedLeague?.members && selectedLeague.members.length > 0 ? (
              <div className="space-y-2">
                {selectedLeague.members.map((member, idx) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      idx < 3 ? 'bg-white/10' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-amber-600 text-white' :
                        'bg-white/10 text-white'
                      }`}>
                        {member.rank}
                      </div>
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground">{member.teamName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">{member.totalPoints} pts</p>
                      <p className="text-xs text-muted-foreground">GW: {member.gameweekPoints}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No members yet
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLeague(null)} className="border-white/10 text-white hover:bg-white/5">
              Close
            </Button>
            {selectedLeague?.code && (
              <Button onClick={() => copyCode(selectedLeague.code)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Share2 className="w-4 h-4 mr-2" />
                Share Code
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
