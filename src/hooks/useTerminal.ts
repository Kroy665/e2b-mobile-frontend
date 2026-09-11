import { useCallback, useEffect, useRef, useState } from 'react';

import { wsUrlFor } from '@/api/config';
import { getStoredTokens } from '@/utils/storage';

type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

export function useTerminal(sandboxId: string, onData: (chunk: string) => void) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const reconnect = useCallback(() => setReconnectNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    (async () => {
      if (!sandboxId) return;
      const { accessToken } = await getStoredTokens();
      if (!accessToken || cancelled) return;

      ws = new WebSocket(wsUrlFor(`/api/v1/sandboxes/${sandboxId}/terminal`, accessToken));
      // React Native's Blob shim has no .text()/.arrayBuffer() methods (unlike
      // the web spec) — requesting arraybuffer frames directly avoids that gap.
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
      setConnectionState('connecting');

      ws.onopen = () => {
        setCloseReason(null);
        setConnectionState('open');
      };
      ws.onerror = (event) => {
        // RN's WebSocket error event carries little detail (usually just
        // "message" on the underlying error), but it's better than nothing.
        const message = (event as unknown as { message?: string })?.message;
        setCloseReason(message ?? null);
        setConnectionState('error');
      };
      ws.onclose = (event) => {
        // The server closes with a code + human-readable reason on auth/
        // sandbox-state failures (see wsAuth.ts) — surface it so "why is the
        // terminal disconnected" is answerable from the UI, not just guessed.
        setCloseReason(event.reason || (event.code ? `code ${event.code}` : null));
        setConnectionState('closed');
      };
      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          onDataRef.current(event.data);
          return;
        }
        // With binaryType set to 'arraybuffer', event.data is an ArrayBuffer.
        const text = new TextDecoder().decode(event.data as ArrayBuffer);
        onDataRef.current(text);
      };
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [sandboxId, reconnectNonce]);

  const sendInput = useCallback((data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Keystrokes go over the wire as binary frames, per the terminal protocol.
      const bytes = new TextEncoder().encode(data);
      ws.send(bytes.buffer);
    }
  }, []);

  const resize = useCallback((cols: number, rows: number) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  return { connectionState, closeReason, sendInput, resize, reconnect };
}
