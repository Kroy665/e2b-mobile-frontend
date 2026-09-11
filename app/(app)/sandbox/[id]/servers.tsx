import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useGlobalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ServerLogsView } from '@/components/ServerLogsView';
import { StatusDot } from '@/components/StatusBadge';
import { TextField } from '@/components/TextField';
import { useServers, useStartServer, useStopServer } from '@/hooks/useServers';
import { errorMessage } from '@/utils/errors';
import type { Server } from '@/types/api';

function ServerCard({
  server,
  onOpenLogs,
  onStop,
  stopping,
}: {
  server: Server;
  onOpenLogs: () => void;
  onStop: () => void;
  stopping: boolean;
}) {
  const onCopyUrl = async () => {
    await Clipboard.setStringAsync(server.url);
  };

  const onOpenUrl = () => {
    WebBrowser.openBrowserAsync(server.url);
  };

  return (
    <Pressable style={styles.card} onPress={onOpenLogs}>
      <View style={styles.cardHeader}>
        <StatusDot status={server.status} />
        <Text style={styles.command} numberOfLines={1}>
          {server.command}
        </Text>
        <Text style={styles.port}>:{server.port}</Text>
      </View>

      <Pressable onPress={onOpenUrl} hitSlop={4}>
        <Text style={styles.url} numberOfLines={1}>
          {server.url}
        </Text>
      </Pressable>

      {server.status === 'failed' && server.error_message && (
        <Text style={styles.errorText} numberOfLines={2}>
          {server.error_message}
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={onCopyUrl} hitSlop={8}>
          <Ionicons name="copy-outline" size={16} color="#6b7280" />
          <Text style={styles.actionText}>Copy URL</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onOpenUrl} hitSlop={8}>
          <Ionicons name="open-outline" size={16} color="#6b7280" />
          <Text style={styles.actionText}>Open</Text>
        </Pressable>
        {server.status === 'running' && (
          <Pressable style={styles.actionButton} onPress={onStop} hitSlop={8} disabled={stopping}>
            {stopping ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <>
                <Ionicons name="stop-circle-outline" size={16} color="#dc2626" />
                <Text style={[styles.actionText, styles.stopText]}>Stop</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function StartServerForm({
  onStart,
  starting,
}: {
  onStart: (port: number, command?: string) => void;
  starting: boolean;
}) {
  const [command, setCommand] = useState('');
  const [port, setPort] = useState('');

  const portNumber = Number(port);
  const canStart = Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535;

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Start a background server</Text>
      <TextField
        placeholder="npm run dev (optional — leave blank to preview files)"
        value={command}
        onChangeText={setCommand}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        placeholder="Port (e.g. 3000)"
        value={port}
        onChangeText={setPort}
        keyboardType="number-pad"
      />
      <Text style={styles.formHint}>
        Leave the command blank to just serve the repo as static files on that port.
      </Text>
      <Button
        title="Start server"
        onPress={() => onStart(portNumber, command.trim() || undefined)}
        loading={starting}
        disabled={!canStart}
      />
    </View>
  );
}

export default function ServersScreen() {
  // useLocalSearchParams doesn't inherit the parent [id] dynamic segment here
  // — this screen is a Tabs.Screen child below the [id] segment (the Tabs
  // layout itself). useGlobalSearchParams does.
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { data: servers, isLoading, refetch } = useServers(id);
  const startServer = useStartServer(id);
  const stopServer = useStopServer(id);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [logsPort, setLogsPort] = useState<number | null>(null);
  const [stoppingPort, setStoppingPort] = useState<number | null>(null);

  if (logsPort !== null) {
    return <ServerLogsView sandboxId={id} port={logsPort} onClose={() => setLogsPort(null)} />;
  }

  const onManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const onStart = async (port: number, command?: string) => {
    setError(null);
    try {
      await startServer.mutateAsync({ port, command });
      setShowForm(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onStop = (port: number) => {
    Alert.alert('Stop server?', `This stops the process on port ${port}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          setStoppingPort(port);
          try {
            await stopServer.mutateAsync(port);
          } catch (err) {
            Alert.alert('Failed to stop server', errorMessage(err));
          } finally {
            setStoppingPort(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={servers ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isManualRefreshing} onRefresh={onManualRefresh} />}
        ListHeaderComponent={
          <>
            <ErrorBanner message={error} />
            {showForm && <StartServerForm onStart={onStart} starting={startServer.isPending} />}
          </>
        }
        renderItem={({ item }) => (
          <ServerCard
            server={item}
            onOpenLogs={() => setLogsPort(item.port)}
            onStop={() => onStop(item.port)}
            stopping={stoppingPort === item.port}
          />
        )}
        ListEmptyComponent={
          !isLoading && !showForm ? (
            <View style={styles.empty}>
              <Ionicons name="server-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No servers running</Text>
              <Text style={styles.emptySubtitle}>Start one to get a live public preview URL.</Text>
            </View>
          ) : null
        }
      />

      <Pressable style={styles.fab} onPress={() => setShowForm((s) => !s)}>
        <Ionicons name={showForm ? 'close' : 'add'} size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  listContent: { padding: 16, flexGrow: 1 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  formHint: { fontSize: 12, color: '#9ca3af', marginTop: -4, marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  command: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Menlo' },
  port: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  url: { fontSize: 12, color: '#2563eb', marginBottom: 8 },
  errorText: { fontSize: 12, color: '#dc2626', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', paddingTop: 10 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  stopText: { color: '#dc2626' },
  empty: { alignItems: 'center', gap: 6, paddingTop: 60 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
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
