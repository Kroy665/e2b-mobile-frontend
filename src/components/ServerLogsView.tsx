import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useServerLogs } from '@/hooks/useServerLogs';

export function ServerLogsView({ sandboxId, port, onClose }: { sandboxId: string; port: number; onClose: () => void }) {
  const { lines, connectionState, closeReason, exitCode } = useServerLogs(sandboxId, port);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#e5e7eb" />
        </Pressable>
        <Text style={styles.title}>Logs · port {port}</Text>
        <View style={{ width: 22 }} />
      </View>

      {connectionState !== 'open' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {connectionState === 'connecting' && 'Connecting…'}
            {connectionState === 'closed' && `Disconnected${closeReason ? `: ${closeReason}` : ''}`}
            {connectionState === 'error' && `Connection error${closeReason ? `: ${closeReason}` : ''}`}
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.logs}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {lines.length === 0 ? (
          <Text style={styles.emptyText}>Waiting for output…</Text>
        ) : (
          lines.map((line) => (
            <Text key={line.id} style={[styles.line, line.stream === 'stderr' && styles.lineStderr]}>
              {line.text}
            </Text>
          ))
        )}
        {exitCode !== undefined && (
          <Text style={styles.exitText}>
            {exitCode === null ? 'Process exited' : `Process exited with code ${exitCode}`}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  title: { color: '#e5e7eb', fontSize: 15, fontWeight: '600' },
  banner: { backgroundColor: '#422006', padding: 8, alignItems: 'center' },
  bannerText: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  logs: { flex: 1 },
  emptyText: { color: '#6b7280', fontSize: 13, fontFamily: 'Menlo' },
  line: { color: '#e5e7eb', fontFamily: 'Menlo', fontSize: 12, lineHeight: 17 },
  lineStderr: { color: '#fca5a5' },
  exitText: { color: '#94a3b8', fontSize: 12, fontFamily: 'Menlo', marginTop: 8 },
});
