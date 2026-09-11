import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import * as githubApi from '@/api/github';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { StatusDot } from '@/components/StatusBadge';
import { useGithubRepos, useGithubStatus } from '@/hooks/useGithub';
import { queryClient } from '@/context/queryClient';
import { githubKeys } from '@/hooks/useGithub';
import { useCreateSandbox, useSandboxes } from '@/hooks/useSandboxes';
import { errorMessage } from '@/utils/errors';
import { isSameRepo } from '@/utils/repo';
import type { GithubRepo, Sandbox } from '@/types/api';

const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  creating: 'Creating…',
  paused: 'Paused',
  failed: 'Failed',
  terminated: 'Terminated',
};

function findSandboxForRepo(sandboxes: Sandbox[], repo: GithubRepo): Sandbox | undefined {
  // A repo may have multiple sandboxes (e.g. an old terminated one plus a
  // fresh one) — prefer the most recently created live one.
  const matches = sandboxes
    .filter((s) => isSameRepo(s.repo_url, repo.cloneUrl) && s.status !== 'terminated')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return matches[0];
}

function RepoRow({
  repo,
  sandbox,
  onPress,
  creating,
}: {
  repo: GithubRepo;
  sandbox: Sandbox | undefined;
  onPress: () => void;
  creating: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={creating}>
      <Ionicons name={repo.private ? 'lock-closed' : 'logo-github'} size={18} color="#6b7280" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.repoName}>{repo.fullName}</Text>
        {sandbox ? (
          <View style={styles.metaRow}>
            <StatusDot status={sandbox.status} />
            <Text style={styles.repoMeta}>{STATUS_LABELS[sandbox.status] ?? sandbox.status}</Text>
          </View>
        ) : (
          <Text style={styles.repoMeta}>{repo.defaultBranch}</Text>
        )}
      </View>
      {creating ? (
        <ActivityIndicator size="small" color="#2563eb" />
      ) : (
        <Ionicons
          name={sandbox ? 'chevron-forward' : 'add-circle-outline'}
          size={20}
          color={sandbox ? '#c1c7d0' : '#2563eb'}
        />
      )}
    </Pressable>
  );
}

export default function ReposScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useGithubStatus();
  const connected = !!status?.connected;
  const { data: repos, isLoading: reposLoading, isRefetching, refetch } = useGithubRepos(connected);
  const { data: sandboxes } = useSandboxes();
  const createSandbox = useCreateSandbox();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingRepoId, setCreatingRepoId] = useState<number | null>(null);

  const onConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const { url } = await githubApi.connectGithub();
      // The backend's callback renders a plain "connected, you can close this"
      // HTML page rather than redirecting anywhere (no app scheme to watch for
      // — see HANDOFF.md), so we just wait for the user to dismiss the sheet
      // and re-check connection status.
      const result = await WebBrowser.openAuthSessionAsync(url);
      if (result.type === 'success' || result.type === 'dismiss') {
        await queryClient.invalidateQueries({ queryKey: githubKeys.status });
        await refetchStatus();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setConnecting(false);
    }
  };

  const onRepoPress = async (repo: GithubRepo) => {
    const existing = findSandboxForRepo(sandboxes ?? [], repo);
    if (existing) {
      router.push({ pathname: '/(app)/sandbox/[id]', params: { id: existing.id } });
      return;
    }

    setCreatingRepoId(repo.id);
    try {
      const sandbox = await createSandbox.mutateAsync({ repoUrl: repo.cloneUrl, branch: repo.defaultBranch });
      router.push({ pathname: '/(app)/sandbox/[id]', params: { id: sandbox.id } });
    } catch (err) {
      Alert.alert('Failed to create sandbox', errorMessage(err));
    } finally {
      setCreatingRepoId(null);
    }
  };

  if (statusLoading) return null;

  if (!connected) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="logo-github" size={56} color="#111827" />
        <Text style={styles.connectTitle}>Connect GitHub</Text>
        <Text style={styles.connectSubtitle}>
          Link your GitHub account to clone repos into sandboxes and push commits.
        </Text>
        <ErrorBanner message={error} />
        <Button title="Connect GitHub" onPress={onConnect} loading={connecting} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <FlatList
      data={repos ?? []}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <RepoRow
          repo={item}
          sandbox={findSandboxForRepo(sandboxes ?? [], item)}
          onPress={() => onRepoPress(item)}
          creating={creatingRepoId === item.id}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListEmptyComponent={
        !reposLoading ? (
          <View style={styles.centeredContainer}>
            <Text style={styles.connectSubtitle}>No repositories found on this GitHub account.</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  connectTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16 },
  connectSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  listContent: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  repoName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  repoMeta: { fontSize: 12, color: '#9ca3af' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
});
