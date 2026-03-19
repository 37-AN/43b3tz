'use client';

import { useAuthStore, useWalletStore, useUIStore } from '@/store';
import { 
  Wallet, 
  User, 
  Bell, 
  Menu, 
  X, 
  TrendingUp,
  LogOut,
  Settings,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { virtualBalance, balance } = useWalletStore();
  const { toggleSidebar, setActiveTab } = useUIStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left - Logo & Menu */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-white hover:bg-white/10"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab('matches')}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp className="h-6 w-6 text-black" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                43V3R BET AI
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-1">Betting Intelligence</p>
            </div>
          </div>
        </div>

        {/* Center - Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {['matches', 'ai-predictions', 'tipsters', 'leaderboard'].map((tab) => (
            <NavTab key={tab} tab={tab} />
          ))}
        </nav>

        {/* Right - User & Wallet */}
        <div className="flex items-center gap-3">
          {/* Balance Display */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <span className="text-xs">🎮</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Virtual</p>
                <p className="text-sm font-semibold text-white">
                  R{virtualBalance.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Balance</p>
                <p className="text-sm font-semibold text-emerald-400">
                  R{balance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-emerald-500/30">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-black font-bold">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-900 border-white/10" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-white">{user.name || user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="text-white hover:bg-white/10 cursor-pointer"
                  onClick={() => setActiveTab('profile')}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-white/10 cursor-pointer"
                  onClick={() => setActiveTab('tipster-profile')}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Become a Tipster
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              className="bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-semibold hover:from-emerald-500 hover:to-cyan-600"
              onClick={() => {}}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavTab({ tab }: { tab: string }) {
  const { activeTab, setActiveTab } = useUIStore();
  const isActive = activeTab === tab;
  
  const labels: Record<string, string> = {
    'matches': 'Matches',
    'ai-predictions': 'AI Predictions',
    'tipsters': 'Tipsters',
    'leaderboard': 'Leaderboard'
  };
  
  const icons: Record<string, React.ReactNode> = {
    'matches': '⚽',
    'ai-predictions': '🤖',
    'tipsters': '👑',
    'leaderboard': '🏆'
  };
  
  return (
    <button
      onClick={() => setActiveTab(tab)}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${isActive 
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
          : 'text-muted-foreground hover:text-white hover:bg-white/5'
        }
      `}
    >
      <span className="mr-1.5">{icons[tab]}</span>
      {labels[tab]}
    </button>
  );
}
