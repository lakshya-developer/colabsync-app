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
  // Mirror socket into state so consumers re-render when it becomes available
  const [socketState, setSocketState] = useState<Socket | null>(null);
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
      setSocketState(null);
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
    // Expose socket via state so consumers re-render
    setSocketState(socket);

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

    // debug code for brodcast emit function

    socket.on("connect", () => {
      console.log("🟢 SOCKET CONNECTED:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 SOCKET DISCONNECTED:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ SOCKET ERROR:", error);
    });

    socket.onAny((event, ...args) => {
      console.log("📨 SOCKET EVENT:", event, args);
    });

    // debug code ends for emit brodcast

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
        setSocketState(null);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      setIsConnected(false);
    };
  }, [status, connect]);

  return (
    <SocketContext.Provider value={{ socket: socketState, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

/**
 * Subscribe to a socket event without managing on/off lifecycle yourself.
 *
 * The latest `handler` is always read from a ref, so:
 *  - No stale closure when handler deps change (e.g. activeRoom)
 *  - The subscription is only torn down when the socket instance itself
 *    changes (token refresh / reconnect), not on every handler update.
 */
export function useSocketEvent<T = any>(
  event: string,
  handler: (payload: T) => void,
) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const wrapped = (payload: T) => handlerRef.current(payload);
    socket.on(event, wrapped);

    return () => {
      socket.off(event, wrapped);
    };
  }, [socket, event]);
}
