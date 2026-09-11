import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { TextField } from '@/components/TextField';
import { useCommitChanges, useGitStatus, usePushBranch } from '@/hooks/useGit';
import { errorMessage } from '@/utils/errors';

export default function GitScreen() {
  // useLocalSearchParams doesn't inherit the parent [id] dynamic segment here
  // — this screen is a Tabs.Screen child below the [id] segment (the Tabs
  // layout itself). useGlobalSearchParams does.
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { data, isLoading, isRefetching, refetch } = useGitStatus(id);
  const commitChanges = useCommitChanges(id);
  const pushBranch = usePushBranch(id);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onCommit = async () => {
    setError(null);
    try {
      const result = await commitChanges.mutateAsync(message.trim());
      setMessage('');
      Alert.alert('Committed', `Commit ${result.commitHash.slice(0, 7)} created.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onPush = async () => {
    setError(null);
    try {
      const result = await pushBranch.mutateAsync(data?.branch);
      Alert.alert('Pushed', `Pushed to ${result.branch}.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <ErrorBanner message={error} />

      <View style={styles.branchRow}>
        <Ionicons name="git-branch-outline" size={18} color="#374151" />
        <Text style={styles.branchName}>{data?.branch ?? 'unknown'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Changed files</Text>
      {(data?.changedFiles ?? []).length === 0 ? (
        <Text style={styles.emptyText}>No changes</Text>
      ) : (
        <FlatList
          data={data?.changedFiles ?? []}
          keyExtractor={(item) => item.path}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.fileRow}>
              <Text style={styles.fileStatus}>{item.status}</Text>
              <Text style={styles.filePath} numberOfLines={1}>
                {item.path}
              </Text>
            </View>
          )}
        />
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Commit</Text>
      <TextField
        placeholder="Commit message"
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <Button
        title="Commit all changes"
        onPress={onCommit}
        loading={commitChanges.isPending}
        disabled={!message.trim()}
      />

      <View style={{ height: 12 }} />

      <Button title={`Push ${data?.branch ?? ''}`} variant="secondary" onPress={onPush} loading={pushBranch.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  branchName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyText: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  fileStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    width: 20,
    textAlign: 'center',
  },
  filePath: { flex: 1, fontSize: 13, color: '#111827' },
});
