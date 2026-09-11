import { useCallback, useEffect, useRef, useState } from 'react';

import { wsUrlFor } from '@/api/config';
import { getStoredTokens } from '@/utils/storage';
import type { ServerLogEvent } from '@/types/api';

export interface LogLine {
  id: string;
  stream: 'stdout' | 'stderr';
  text: string;
}

type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

// Streams a running background server's stdout/stderr live. Unlike the
// terminal socket, closing this connection never stops the server — it's a
// read-only log tail (see backend/src/ws/serverLogs.ts).
export function useServerLogs(sandboxId: string, port: number | null) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const [exitCode, setExitCode] = useState<number | null | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const lineIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    setLines([]);
    setExitCode(undefined);

    (async () => {
      if (!sandboxId || port == null) return;
      const { accessToken } = await getStoredTokens();
      if (!accessToken || cancelled) return;

      ws = new WebSocket(wsUrlFor(`/api/v1/sandboxes/${sandboxId}/servers/${port}/logs`, accessToken));
      wsRef.current = ws;
      setConnectionState('connecting');

      ws.onopen = () => {
        setCloseReason(null);
        setConnectionState('open');
      };
      ws.onerror = (event) => {
        const message = (event as unknown as { message?: string })?.message;
        setCloseReason(message ?? null);
        setConnectionState('error');
      };
      ws.onclose = (event) => {
        setCloseReason(event.reason || (event.code ? `code ${event.code}` : null));
        setConnectionState('closed');
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerLogEvent;
          if (data.type === 'exit') {
            setExitCode(data.exitCode ?? null);
            return;
          }
          lineIdRef.current += 1;
          setLines((prev) => [...prev, { id: String(lineIdRef.current), stream: data.type, text: data.data }]);
        } catch {
          // ignore malformed frames
        }
      };
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [sandboxId, port]);

  const clear = useCallback(() => setLines([]), []);

  return { lines, connectionState, closeReason, exitCode, clear };
}
