'use client';

/**
 * CollabSync — SocketContext
 *
 * Manages the Socket.IO client lifecycle:
 *  1. Waits until the user is authenticated
 *  2. Calls POST /api/socket-token to get a short-lived JWT
 *  3. Connects to the socket server with that token
 *  4. Auto-refreshes the token 30 minutes before expiry
 *  5. Exposes { socket, isConnected } via useSocket()
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:5000';

  // ── Fetch a fresh socket token ─────────────────────────────────────────────
  const getToken = useCallback(async (): Promise<{ token: string; expiresIn: number } | null> => {
    try {
      const res = await fetch('/api/socket-token', { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? { token: data.token, expiresIn: data.expiresIn } : null;
    } catch {
      return null;
    }
  }, []);

  // ── Connect (or reconnect with refreshed token) ───────────────────────────
  const connect = useCallback(async () => {
    // Tear down any existing connection first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const result = await getToken();
    if (!result) return;

    const { token, expiresIn } = result;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[SocketContext] connect_error:', err.message);
      setIsConnected(false);
    });

    // Schedule token refresh 30 minutes before expiry
    const refreshInMs = Math.max((expiresIn - 30 * 60) * 1000, 60_000);
    refreshTimerRef.current = setTimeout(() => {
      connect(); // reconnect with a fresh token
    }, refreshInMs);
  }, [getToken, socketUrl]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') return;

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      setIsConnected(false);
    };
  }, [status, connect]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
