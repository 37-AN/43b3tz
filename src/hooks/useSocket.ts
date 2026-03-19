'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Match, Odds, ValueBet } from '@/types';

// ==================== TYPES ====================

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export interface LiveMatchUpdate {
  matchId: string;
  match: Match;
  type: 'score' | 'status' | 'minute' | 'odds';
  timestamp: Date;
}

export interface OddsUpdate {
  matchId: string;
  odds: Odds;
  previousOdds?: Partial<Odds>;
  movement: 'up' | 'down' | 'stable';
  timestamp: Date;
}

export interface ValueBetAlert {
  id: string;
  valueBet: ValueBet;
  priority: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'bet_won' | 'bet_lost' | 'value_bet' | 'tip_posted' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export interface SocketEvents {
  'live-matches:update': (data: LiveMatchUpdate) => void;
  'odds:update': (data: OddsUpdate) => void;
  'value-bets:new': (data: ValueBetAlert) => void;
  'notification:new': (data: Notification) => void;
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;
  reconnect: (attempt: number) => void;
  reconnect_attempt: (attempt: number) => void;
  reconnect_failed: () => void;
}

// ==================== SOCKET CONFIGURATION ====================

const SOCKET_URL = '/';
const SOCKET_PORT = '3003';
const RECONNECTION_ATTEMPTS = 10;
const RECONNECTION_DELAY = 1000;
const RECONNECTION_DELAY_MAX = 5000;
const TIMEOUT = 10000;

// ==================== SINGLETON SOCKET MANAGER ====================

let socketInstance: Socket | null = null;
let connectionCount = 0;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(`/?XTransformPort=${SOCKET_PORT}`, {
      transports: ['websocket', 'polling'],
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX,
      timeout: TIMEOUT,
      autoConnect: true,
    });
  }
  return socketInstance;
}

function cleanupSocket() {
  connectionCount = Math.max(0, connectionCount - 1);
  if (connectionCount === 0 && socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// ==================== MAIN SOCKET HOOK ====================

export interface UseSocketReturn {
  socket: Socket | null;
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  emit: <T>(event: string, data?: T) => void;
}

export function useSocket(): UseSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: true,
    error: null,
    reconnectAttempts: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const statusRef = useRef(status);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    connectionCount++;
    const socket = getSocket();
    socketRef.current = socket;

    // Connection handlers
    const handleConnect = () => {
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
      }));
    };

    const handleDisconnect = () => {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: null,
      }));
    };

    const handleConnectError = (error: Error) => {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: true,
        error: error.message,
      }));
    };

    const handleReconnect = (attempt: number) => {
      setStatus(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempts: attempt,
      }));
    };

    const handleReconnectAttempt = (attempt: number) => {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: true,
        reconnectAttempts: attempt,
      }));
    };

    const handleReconnectFailed = () => {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: 'Failed to reconnect after maximum attempts',
        reconnectAttempts: RECONNECTION_ATTEMPTS,
      }));
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_failed', handleReconnectFailed);

    // Set initial connection status
    setStatus(prev => ({
      ...prev,
      isConnected: socket.connected,
      isConnecting: !socket.connected,
    }));

    // If not connected, attempt connection
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect_failed', handleReconnectFailed);
      cleanupSocket();
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const emit = useCallback(<T,>(event: string, data?: T) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    socket: socketRef.current,
    status,
    connect,
    disconnect,
    emit,
  };
}

// ==================== LIVE MATCHES HOOK ====================

export interface UseLiveMatchesOptions {
  enabled?: boolean;
  leagues?: string[];
}

export interface UseLiveMatchesReturn {
  matches: Match[];
  updates: LiveMatchUpdate[];
  isLoading: boolean;
  error: string | null;
  subscribe: (leagueIds?: string[]) => void;
  unsubscribe: () => void;
}

export function useLiveMatches(options: UseLiveMatchesOptions = {}): UseLiveMatchesReturn {
  const { enabled = true, leagues } = options;

  const [matches, setMatches] = useState<Match[]>([]);
  const [updates, setUpdates] = useState<LiveMatchUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { socket, status } = useSocket();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !status.isConnected || !socket) return;

    const handleLiveMatchesUpdate = (data: LiveMatchUpdate) => {
      setUpdates(prev => [data, ...prev].slice(0, 100)); // Keep last 100 updates

      setMatches(prev => {
        const index = prev.findIndex(m => m.id === data.matchId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data.match;
          return updated;
        }
        return [...prev, data.match];
      });
    };

    const handleLiveMatchesInitial = (data: { matches: Match[] }) => {
      setMatches(data.matches);
      setIsLoading(false);
      setError(null);
    };

    const handleError = (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    };

    // Subscribe to live matches
    socket.emit('live-matches:subscribe', { leagues });
    isSubscribedRef.current = true;

    socket.on('live-matches:update', handleLiveMatchesUpdate);
    socket.on('live-matches:initial', handleLiveMatchesInitial);
    socket.on('live-matches:error', handleError);

    return () => {
      socket.off('live-matches:update', handleLiveMatchesUpdate);
      socket.off('live-matches:initial', handleLiveMatchesInitial);
      socket.off('live-matches:error', handleError);

      if (isSubscribedRef.current) {
        socket.emit('live-matches:unsubscribe');
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, status.isConnected, socket, leagues]);

  const subscribe = useCallback((leagueIds?: string[]) => {
    if (socket && status.isConnected) {
      socket.emit('live-matches:subscribe', { leagues: leagueIds });
      isSubscribedRef.current = true;
    }
  }, [socket, status.isConnected]);

  const unsubscribe = useCallback(() => {
    if (socket && status.isConnected && isSubscribedRef.current) {
      socket.emit('live-matches:unsubscribe');
      isSubscribedRef.current = false;
    }
  }, [socket, status.isConnected]);

  return {
    matches,
    updates,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

// ==================== ODDS UPDATES HOOK ====================

export interface UseOddsUpdatesOptions {
  enabled?: boolean;
  matchIds?: string[];
  minMovement?: number; // Minimum odds movement to trigger update
}

export interface UseOddsUpdatesReturn {
  oddsUpdates: Map<string, OddsUpdate>;
  latestUpdates: OddsUpdate[];
  isLoading: boolean;
  error: string | null;
  subscribe: (matchIds: string[]) => void;
  unsubscribe: () => void;
}

export function useOddsUpdates(options: UseOddsUpdatesOptions = {}): UseOddsUpdatesReturn {
  const { enabled = true, matchIds, minMovement = 0.01 } = options;

  const [oddsUpdates, setOddsUpdates] = useState<Map<string, OddsUpdate>>(new Map());
  const [latestUpdates, setLatestUpdates] = useState<OddsUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { socket, status } = useSocket();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !status.isConnected || !socket) return;

    const handleOddsUpdate = (data: OddsUpdate) => {
      // Check minimum movement threshold
      if (data.movement === 'stable') return;

      setOddsUpdates(prev => {
        const next = new Map(prev);
        next.set(data.matchId, data);
        return next;
      });

      setLatestUpdates(prev => [data, ...prev].slice(0, 50)); // Keep last 50 updates
    };

    const handleInitialOdds = (data: { updates: OddsUpdate[] }) => {
      const newMap = new Map<string, OddsUpdate>();
      data.updates.forEach(update => newMap.set(update.matchId, update));
      setOddsUpdates(newMap);
      setIsLoading(false);
      setError(null);
    };

    const handleError = (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    };

    // Subscribe to odds updates
    socket.emit('odds:subscribe', { matchIds, minMovement });
    isSubscribedRef.current = true;

    socket.on('odds:update', handleOddsUpdate);
    socket.on('odds:initial', handleInitialOdds);
    socket.on('odds:error', handleError);

    return () => {
      socket.off('odds:update', handleOddsUpdate);
      socket.off('odds:initial', handleInitialOdds);
      socket.off('odds:error', handleError);

      if (isSubscribedRef.current) {
        socket.emit('odds:unsubscribe');
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, status.isConnected, socket, matchIds, minMovement]);

  const subscribe = useCallback((ids: string[]) => {
    if (socket && status.isConnected) {
      socket.emit('odds:subscribe', { matchIds: ids, minMovement });
      isSubscribedRef.current = true;
    }
  }, [socket, status.isConnected, minMovement]);

  const unsubscribe = useCallback(() => {
    if (socket && status.isConnected && isSubscribedRef.current) {
      socket.emit('odds:unsubscribe');
      isSubscribedRef.current = false;
    }
  }, [socket, status.isConnected]);

  return {
    oddsUpdates,
    latestUpdates,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

// ==================== VALUE BETS HOOK ====================

export interface UseValueBetsOptions {
  enabled?: boolean;
  minEdge?: number; // Minimum edge percentage
  riskLevels?: Array<'low' | 'medium' | 'high'>;
}

export interface UseValueBetsReturn {
  valueBets: ValueBetAlert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export function useValueBets(options: UseValueBetsOptions = {}): UseValueBetsReturn {
  const { enabled = true, minEdge = 0, riskLevels } = options;

  const [valueBets, setValueBets] = useState<ValueBetAlert[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { socket, status } = useSocket();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !status.isConnected || !socket) return;

    const handleValueBet = (data: ValueBetAlert) => {
      // Filter by edge and risk level
      if (data.valueBet.edge < minEdge) return;
      if (riskLevels && !riskLevels.includes(data.valueBet.riskLevel)) return;

      setValueBets(prev => [data, ...prev]);
      setUnreadIds(prev => new Set([...prev, data.id]));
    };

    const handleInitialValueBets = (data: { alerts: ValueBetAlert[] }) => {
      const filtered = data.alerts.filter(alert => {
        if (alert.valueBet.edge < minEdge) return false;
        if (riskLevels && !riskLevels.includes(alert.valueBet.riskLevel)) return false;
        return true;
      });

      setValueBets(filtered);
      setUnreadIds(new Set(filtered.map(a => a.id)));
      setIsLoading(false);
      setError(null);
    };

    const handleError = (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    };

    // Subscribe to value bets
    socket.emit('value-bets:subscribe', { minEdge, riskLevels });
    isSubscribedRef.current = true;

    socket.on('value-bets:new', handleValueBet);
    socket.on('value-bets:initial', handleInitialValueBets);
    socket.on('value-bets:error', handleError);

    return () => {
      socket.off('value-bets:new', handleValueBet);
      socket.off('value-bets:initial', handleInitialValueBets);
      socket.off('value-bets:error', handleError);

      if (isSubscribedRef.current) {
        socket.emit('value-bets:unsubscribe');
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, status.isConnected, socket, minEdge, riskLevels]);

  const markAsRead = useCallback((id: string) => {
    setUnreadIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setUnreadIds(new Set());
  }, []);

  const clearAll = useCallback(() => {
    setValueBets([]);
    setUnreadIds(new Set());
  }, []);

  return {
    valueBets,
    unreadCount: unreadIds.size,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}

// ==================== NOTIFICATIONS HOOK ====================

export interface UseNotificationsOptions {
  enabled?: boolean;
  userId?: string;
  types?: Notification['type'][];
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { enabled = true, userId, types } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { socket, status } = useSocket();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !status.isConnected || !socket || !userId) return;

    const handleNewNotification = (data: Notification) => {
      // Filter by notification type
      if (types && !types.includes(data.type)) return;

      setNotifications(prev => [data, ...prev]);
    };

    const handleInitialNotifications = (data: { notifications: Notification[] }) => {
      const filtered = types
        ? data.notifications.filter(n => types.includes(n.type))
        : data.notifications;

      setNotifications(filtered);
      setIsLoading(false);
      setError(null);
    };

    const handleError = (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    };

    // Subscribe to notifications
    socket.emit('notifications:subscribe', { userId, types });
    isSubscribedRef.current = true;

    socket.on('notification:new', handleNewNotification);
    socket.on('notifications:initial', handleInitialNotifications);
    socket.on('notifications:error', handleError);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notifications:initial', handleInitialNotifications);
      socket.off('notifications:error', handleError);

      if (isSubscribedRef.current) {
        socket.emit('notifications:unsubscribe', { userId });
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, status.isConnected, socket, userId, types]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );

    if (socket && status.isConnected && userId) {
      socket.emit('notification:read', { id, userId });
    }
  }, [socket, status.isConnected, userId]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    if (socket && status.isConnected && userId) {
      socket.emit('notifications:read-all', { userId });
    }
  }, [socket, status.isConnected, userId]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));

    if (socket && status.isConnected && userId) {
      socket.emit('notification:delete', { id, userId });
    }
  }, [socket, status.isConnected, userId]);

  const clearAll = useCallback(() => {
    setNotifications([]);

    if (socket && status.isConnected && userId) {
      socket.emit('notifications:clear', { userId });
    }
  }, [socket, status.isConnected, userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}

// ==================== UTILITY EXPORTS ====================

// Export the socket getter for testing purposes
export { getSocket as getSocketInstance };
