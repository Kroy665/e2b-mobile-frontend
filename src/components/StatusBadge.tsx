import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  ready: { bg: '#dcfce7', fg: '#166534' },
  creating: { bg: '#fef9c3', fg: '#854d0e' },
  paused: { bg: '#e0e7ff', fg: '#3730a3' },
  failed: { bg: '#fee2e2', fg: '#991b1b' },
  terminated: { bg: '#f3f4f6', fg: '#374151' },
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#f3f4f6', fg: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.fg }]}>{status}</Text>
    </View>
  );
}

const DOT_COLORS: Record<string, string> = {
  ready: '#22c55e',
  creating: '#eab308',
  paused: '#6366f1',
  failed: '#ef4444',
  terminated: '#9ca3af',
  // Background server statuses.
  running: '#22c55e',
  stopped: '#9ca3af',
};

export function StatusDot({ status }: { status: string }) {
  const color = DOT_COLORS[status] ?? '#9ca3af';
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
