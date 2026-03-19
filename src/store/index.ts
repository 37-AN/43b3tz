// 43V3R BET AI - Global State Management with Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import type { Match, ValueBet, Tipster, Tip, BetSlipItem, User, Wallet } from '@/types';

// ==================== AUTH STORE ====================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: 'demo-user',
        email: 'demo@43v3r.bet',
        username: 'DemoUser',
        name: 'Demo User',
        role: 'user',
        createdAt: new Date(),
        wallet: {
          id: 'wallet-1',
          balance: 1000,
          virtualBalance: 5000,
          totalProfit: 0,
          totalBets: 0,
          winRate: 0,
          roi: 0
        }
      },
      isAuthenticated: true,
      isLoading: false,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        // Demo login - in production, call API
        await new Promise(resolve => setTimeout(resolve, 500));
        set({ 
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: 'demo-user',
            email,
            username: email.split('@')[0],
            role: 'user',
            createdAt: new Date()
          }
        });
        return true;
      },
      
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      
      updateUser: (userData) => {
        set(state => ({
          user: state.user ? { ...state.user, ...userData } : null
        }));
      }
    }),
    {
      name: '43v3r-auth',
      skipHydration: true
    }
  )
);

// ==================== WALLET STORE ====================

interface WalletState {
  balance: number;
  virtualBalance: number;
  totalProfit: number;
  totalBets: number;
  winRate: number;
  roi: number;
  updateBalance: (amount: number) => void;
  updateVirtualBalance: (amount: number) => void;
  updateStats: (stats: Partial<WalletState>) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      balance: 1000,
      virtualBalance: 5000,
      totalProfit: 0,
      totalBets: 0,
      winRate: 0,
      roi: 0,
      
      updateBalance: (amount) => set(state => ({ balance: state.balance + amount })),
      updateVirtualBalance: (amount) => set(state => ({ virtualBalance: state.virtualBalance + amount })),
      updateStats: (stats) => set(stats)
    }),
    {
      name: '43v3r-wallet',
      skipHydration: true
    }
  )
);

// ==================== BET SLIP STORE ====================

interface BetSlipState {
  items: BetSlipItem[];
  stake: number;
  totalOdds: number;
  potentialWin: number;
  isSimulation: boolean;
  addItem: (item: BetSlipItem) => void;
  removeItem: (matchId: string) => void;
  clearSlip: () => void;
  setStake: (stake: number) => void;
  toggleSimulation: () => void;
  calculateTotals: () => void;
}

export const useBetSlipStore = create<BetSlipState>()(
  persist(
    (set, get) => ({
      items: [],
      stake: 10,
      totalOdds: 1,
      potentialWin: 10,
      isSimulation: true,
      
      addItem: (item) => {
        set(state => {
          const exists = state.items.find(i => i.matchId === item.matchId);
          if (exists) {
            return {
              items: state.items.map(i => 
                i.matchId === item.matchId ? item : i
              )
            };
          }
          return { items: [...state.items, item] };
        });
        get().calculateTotals();
      },
      
      removeItem: (matchId) => {
        set(state => ({
          items: state.items.filter(i => i.matchId !== matchId)
        }));
        get().calculateTotals();
      },
      
      clearSlip: () => set({ items: [], stake: 10, totalOdds: 1, potentialWin: 10 }),
      
      setStake: (stake) => {
        set({ stake });
        get().calculateTotals();
      },
      
      toggleSimulation: () => set(state => ({ isSimulation: !state.isSimulation })),
      
      calculateTotals: () => {
        const { items, stake } = get();
        const totalOdds = items.reduce((acc, item) => acc * item.odds, 1);
        set({
          totalOdds: Math.round(totalOdds * 1000) / 1000,
          potentialWin: Math.round(stake * totalOdds * 100) / 100
        });
      }
    }),
    {
      name: '43v3r-betslip',
      skipHydration: true
    }
  )
);

// ==================== MATCHES STORE ====================

interface MatchesState {
  matches: Match[];
  selectedLeague: string | null;
  isLoading: boolean;
  setMatches: (matches: Match[]) => void;
  setSelectedLeague: (leagueId: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useMatchesStore = create<MatchesState>()((set) => ({
  matches: [],
  selectedLeague: null,
  isLoading: false,
  
  setMatches: (matches) => set({ matches }),
  setSelectedLeague: (leagueId) => set({ selectedLeague: leagueId }),
  setLoading: (loading) => set({ isLoading: loading })
}));

// ==================== VALUE BETS STORE ====================

interface ValueBetsState {
  valueBets: ValueBet[];
  selectedValueBet: ValueBet | null;
  minEdge: number;
  maxOdds: number;
  setMinEdge: (edge: number) => void;
  setMaxOdds: (odds: number) => void;
  setValueBets: (bets: ValueBet[]) => void;
  selectValueBet: (bet: ValueBet | null) => void;
}

export const useValueBetsStore = create<ValueBetsState>()(
  persist(
    (set) => ({
      valueBets: [],
      selectedValueBet: null,
      minEdge: 5,
      maxOdds: 3.5,
      
      setMinEdge: (edge) => set({ minEdge: edge }),
      setMaxOdds: (odds) => set({ maxOdds: odds }),
      setValueBets: (bets) => set({ valueBets: bets }),
      selectValueBet: (bet) => set({ selectedValueBet: bet })
    }),
    {
      name: '43v3r-valuebets',
      skipHydration: true
    }
  )
);

// ==================== TIPSTER STORE ====================

interface TipsterState {
  tipsters: Tipster[];
  selectedTipster: Tipster | null;
  tips: Tip[];
  followedTipsters: string[];
  setTipsters: (tipsters: Tipster[]) => void;
  selectTipster: (tipster: Tipster | null) => void;
  setTips: (tips: Tip[]) => void;
  followTipster: (tipsterId: string) => void;
  unfollowTipster: (tipsterId: string) => void;
}

export const useTipsterStore = create<TipsterState>()(
  persist(
    (set) => ({
      tipsters: [],
      selectedTipster: null,
      tips: [],
      followedTipsters: [],
      
      setTipsters: (tipsters) => set({ tipsters }),
      selectTipster: (tipster) => set({ selectedTipster: tipster }),
      setTips: (tips) => set({ tips }),
      
      followTipster: (tipsterId) => set(state => ({
        followedTipsters: [...state.followedTipsters, tipsterId]
      })),
      
      unfollowTipster: (tipsterId) => set(state => ({
        followedTipsters: state.followedTipsters.filter(id => id !== tipsterId)
      }))
    }),
    {
      name: '43v3r-tipsters',
      skipHydration: true
    }
  )
);

// ==================== UI STORE ====================

interface UIState {
  activeTab: string;
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeTab: 'matches',
      sidebarOpen: true,
      theme: 'dark',
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme })
    }),
    {
      name: '43v3r-ui',
      skipHydration: true
    }
  )
);

// ==================== HYDRATION HOOK ====================
// Must be called once at the top of the app to rehydrate all persisted stores
// This prevents "state update on unmounted component" errors in Next.js SSR

export function useHydrateStores() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useAuthStore.persist.rehydrate();
    useWalletStore.persist.rehydrate();
    useBetSlipStore.persist.rehydrate();
    useValueBetsStore.persist.rehydrate();
    useTipsterStore.persist.rehydrate();
    useUIStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  return hydrated;
}
