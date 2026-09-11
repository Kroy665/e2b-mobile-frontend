import { useCallback, useEffect, useRef, useState } from 'react';

import { getStoredTokens } from '@/utils/storage';
import { wsUrlFor } from '@/api/config';
import type { OpencodeEvent } from '@/types/api';

export interface TextPart {
  kind: 'text';
  text: string;
}

export interface ToolPart {
  kind: 'tool';
  tool: string;
  status?: string;
  input?: unknown;
  output?: unknown;
}

export interface StepFinishPart {
  kind: 'step_finish';
  tokens?: { total: number; input: number; output: number };
  cost?: number;
}

export type MessagePart = TextPart | ToolPart | StepFinishPart;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  pending?: boolean;
  error?: string;
}

type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

// Merges an incoming opencode event into a message's part list, keeping
// consecutive text deltas as one growing part instead of one part per chunk,
// while tool calls and step-finish markers each become their own part in the
// order they actually occurred (a tool call can land in the middle of a
// streamed reply, not just before/after it).
function applyEventToParts(parts: MessagePart[], event: OpencodeEvent): MessagePart[] {
  if (event.type === 'text' && typeof event.text === 'string') {
    const last = parts[parts.length - 1];
    if (last?.kind === 'text') {
      return [...parts.slice(0, -1), { kind: 'text', text: last.text + event.text }];
    }
    return [...parts, { kind: 'text', text: event.text }];
  }

  if (event.type === 'tool_use') {
    const tool = 'tool' in event ? String(event.tool) : 'tool';
    const status = 'status' in event ? (event.status as string | undefined) : undefined;
    const input = 'input' in event ? event.input : undefined;
    const output = 'output' in event ? event.output : undefined;

    // A running tool call is followed later by a completion event for the
    // same tool — update the existing part in place rather than duplicating it.
    const existingIndex = parts.findIndex(
      (p) => p.kind === 'tool' && p.tool === tool && p.status !== 'completed' && p.status !== 'error',
    );
    if (existingIndex !== -1) {
      const updated: ToolPart = { kind: 'tool', tool, status, input, output };
      return [...parts.slice(0, existingIndex), updated, ...parts.slice(existingIndex + 1)];
    }
    return [...parts, { kind: 'tool', tool, status, input, output }];
  }

  if (event.type === 'step_finish') {
    const tokens = 'tokens' in event ? (event.tokens as StepFinishPart['tokens']) : undefined;
    const cost = 'cost' in event ? (event.cost as number | undefined) : undefined;
    return [...parts, { kind: 'step_finish', tokens, cost }];
  }

  return parts;
}

export function useOpencodeChat(sandboxId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingAssistantId = useRef<string | null>(null);

  const reconnect = useCallback(() => setReconnectNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    (async () => {
      if (!sandboxId) return;
      const { accessToken } = await getStoredTokens();
      if (!accessToken || cancelled) return;

      ws = new WebSocket(wsUrlFor(`/api/v1/sandboxes/${sandboxId}/opencode/stream`, accessToken));
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
        // The server closes with a code + reason on auth/sandbox-state
        // failures (same wsAuth.ts handshake the terminal socket uses) —
        // surface it instead of a bare "Disconnected".
        setCloseReason(event.reason || (event.code ? `code ${event.code}` : null));
        setConnectionState('closed');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'done') {
            setSessionId(data.sessionId ?? undefined);
            const assistantId = pendingAssistantId.current;
            if (assistantId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
              );
            }
            pendingAssistantId.current = null;
            return;
          }

          const assistantId = pendingAssistantId.current;
          if (!assistantId) return;

          const opencodeEvent = data as OpencodeEvent;

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const parts = applyEventToParts(m.parts, opencodeEvent);
              const errorMsg =
                opencodeEvent.type === 'error'
                  ? String((opencodeEvent as { message?: unknown }).message ?? 'opencode error')
                  : m.error;
              return { ...m, parts, error: errorMsg };
            }),
          );
        } catch {
          // ignore malformed frames
        }
      };
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [sandboxId, reconnectNonce]);

  const sendMessage = useCallback(
    (prompt: string, model?: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', parts: [{ kind: 'text', text: prompt }] };
      const assistantId = `a-${Date.now()}`;
      pendingAssistantId.current = assistantId;
      const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', parts: [], pending: true };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      ws.send(JSON.stringify({ type: 'run', prompt, model, sessionId }));
    },
    [sessionId],
  );

  return { messages, connectionState, closeReason, sendMessage, sessionId, reconnect };
}
