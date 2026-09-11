import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useGithubRepos, useGithubStatus } from '@/hooks/useGithub';
import { useCreateSandbox } from '@/hooks/useSandboxes';
import { errorMessage } from '@/utils/errors';
import type { GithubRepo } from '@/types/api';

export default function NewSandboxScreen() {
  const { data: status } = useGithubStatus();
  const connected = !!status?.connected;
  const { data: repos } = useGithubRepos(connected);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createSandbox = useCreateSandbox();

  const repoUrl = selectedRepo?.cloneUrl ?? customUrl.trim();

  const onCreate = async () => {
    setError(null);
    if (!repoUrl) return;
    try {
      const sandbox = await createSandbox.mutateAsync({
        repoUrl,
        branch: selectedRepo?.defaultBranch,
      });
      router.replace({ pathname: '/(app)/sandbox/[id]', params: { id: sandbox.id } });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Screen>
      <ErrorBanner message={error} />

      {connected && repos && repos.length > 0 && (
        <>
          <Text style={styles.label}>Your repositories</Text>
          <FlatList
            data={repos}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 260, marginBottom: 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedRepo(item);
                  setCustomUrl('');
                }}
                style={[styles.repoRow, selectedRepo?.id === item.id && styles.repoRowSelected]}
              >
                <Text style={styles.repoName}>{item.fullName}</Text>
              </Pressable>
            )}
          />
        </>
      )}

      <Text style={styles.label}>Or paste a repo URL</Text>
      <TextField
        placeholder="https://github.com/owner/repo"
        value={customUrl}
        onChangeText={(text) => {
          setCustomUrl(text);
          setSelectedRepo(null);
        }}
        autoCapitalize="none"
      />

      <Button
        title="Create sandbox"
        onPress={onCreate}
        loading={createSandbox.isPending}
        disabled={!repoUrl}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  repoRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  repoRowSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  repoName: { fontSize: 14, color: '#111827', fontWeight: '500' },
});
