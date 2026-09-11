import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ToolPart } from '@/hooks/useOpencodeChat';

function summarize(value: unknown, maxLen = 60): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value;
  if (typeof value === 'object') {
    // Common shapes across tools: a file path, a shell command, a query — show
    // whichever recognizable field is present instead of a raw JSON dump.
    const obj = value as Record<string, unknown>;
    const candidate = obj.path ?? obj.file ?? obj.command ?? obj.cmd ?? obj.query ?? obj.url;
    if (typeof candidate === 'string') return summarize(candidate, maxLen);
    try {
      const json = JSON.stringify(value);
      return json.length > maxLen ? `${json.slice(0, maxLen)}…` : json;
    } catch {
      return null;
    }
  }
  return String(value);
}

function prettyJson(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const STATUS_STYLES: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  running: { color: '#eab308', icon: 'sync-outline' },
  completed: { color: '#22c55e', icon: 'checkmark-circle-outline' },
  error: { color: '#ef4444', icon: 'close-circle-outline' },
};

export function ToolCallCard({ part }: { part: ToolPart }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = (part.status ? STATUS_STYLES[part.status] : undefined) ?? STATUS_STYLES.running;
  const summary = summarize(part.input);

  return (
    <Pressable style={styles.card} onPress={() => setExpanded((e) => !e)}>
      <View style={styles.header}>
        <Ionicons name="construct-outline" size={15} color="#6b7280" />
        <Text style={styles.toolName}>{part.tool}</Text>
        <View style={styles.spacer} />
        <Ionicons name={statusStyle.icon} size={15} color={statusStyle.color} />
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9ca3af" />
      </View>
      {summary && !expanded && (
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
      )}
      {expanded && (
        <View style={styles.details}>
          {part.input !== undefined && (
            <>
              <Text style={styles.detailLabel}>Input</Text>
              <Text style={styles.detailText}>{prettyJson(part.input)}</Text>
            </>
          )}
          {part.output !== undefined && (
            <>
              <Text style={styles.detailLabel}>Output</Text>
              <Text style={styles.detailText}>{prettyJson(part.output)}</Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolName: { fontSize: 13, fontWeight: '600', color: '#334155', fontFamily: 'Menlo' },
  spacer: { flex: 1 },
  summary: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontFamily: 'Menlo' },
  details: { marginTop: 8, gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailText: { fontSize: 12, color: '#334155', fontFamily: 'Menlo', lineHeight: 17 },
});
