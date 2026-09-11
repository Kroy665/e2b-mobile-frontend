import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { StatusDot } from '@/components/StatusBadge';
import { useSandboxes } from '@/hooks/useSandboxes';
import { relativeTime } from '@/utils/date';
import { repoNameFromUrl } from '@/utils/repo';
import type { Sandbox } from '@/types/api';

const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  creating: 'Creating…',
  paused: 'Paused',
  failed: 'Failed',
  terminated: 'Terminated',
};

function SandboxCard({ sandbox }: { sandbox: Sandbox }) {
  const name = repoNameFromUrl(sandbox.repo_url);
  const statusLabel = STATUS_LABELS[sandbox.status] ?? sandbox.status;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/(app)/sandbox/[id]', params: { id: sandbox.id } })}
    >
      <View style={styles.icon}>
        <Ionicons name="cube" size={20} color="#2563eb" />
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.repoUrl} numberOfLines={1}>
          {sandbox.repo_url}
        </Text>
        <View style={styles.metaRow}>
          <StatusDot status={sandbox.status} />
          <Text style={styles.metaText}>{statusLabel}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{relativeTime(sandbox.created_at)}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#c1c7d0" />
    </Pressable>
  );
}

export default function SandboxesScreen() {
  const { data, isLoading, refetch, error } = useSandboxes();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // useQuery's isRefetching is true for the background poll too (refetchInterval),
  // which would flash the pull-to-refresh spinner every 10s with nothing pulled.
  // Tracking the manual refresh separately keeps the spinner tied only to an
  // actual user-initiated pull.
  const onManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SandboxCard sandbox={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isManualRefreshing} onRefresh={onManualRefresh} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No sandboxes yet</Text>
              <Text style={styles.emptySubtitle}>
                {error ? 'Failed to load sandboxes.' : 'Create one from a connected repo to get started.'}
              </Text>
            </View>
          ) : null
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push('/(app)/new-sandbox')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  listContent: { padding: 16, flexGrow: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: { backgroundColor: '#f8fafc' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  repoUrl: { fontSize: 12, color: '#94a3b8' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  metaDot: { fontSize: 12, color: '#cbd5e1' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
