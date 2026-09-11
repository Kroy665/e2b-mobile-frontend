import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ProviderKeyRow } from '@/components/ProviderKeyRow';
import { useAuth } from '@/context/AuthContext';
import { useAiProviders, useRemoveAiProvider, useSetAiProvider } from '@/hooks/useAiProviders';
import { useDisconnectGithub, useGithubStatus } from '@/hooks/useGithub';
import { errorMessage } from '@/utils/errors';
import type { AiProvider } from '@/types/api';

const PROVIDERS: AiProvider[] = ['anthropic', 'openai', 'openrouter', 'google'];

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { data: githubStatus } = useGithubStatus();
  const disconnectGithub = useDisconnectGithub();
  const { data: providers } = useAiProviders();
  const setProvider = useSetAiProvider();
  const removeProvider = useRemoveAiProvider();
  const [error, setError] = useState<string | null>(null);

  const configuredSet = new Set((providers ?? []).map((p) => p.provider));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />

      <Text style={styles.sectionTitle}>AI Providers</Text>
      <Text style={styles.sectionSubtitle}>
        Bring your own API key so opencode uses your provider instead of the free tier.
      </Text>
      {PROVIDERS.map((provider) => (
        <ProviderKeyRow
          key={provider}
          provider={provider}
          configured={configuredSet.has(provider)}
          saving={setProvider.isPending}
          removing={removeProvider.isPending}
          onSave={async (apiKey) => {
            setError(null);
            try {
              await setProvider.mutateAsync({ provider, apiKey });
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
          onRemove={async () => {
            setError(null);
            try {
              await removeProvider.mutateAsync(provider);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        />
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>GitHub</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          {githubStatus?.connected ? `Connected as ${githubStatus.login ?? 'your account'}` : 'Not connected'}
        </Text>
        {githubStatus?.connected && (
          <Button
            title="Disconnect"
            variant="destructive"
            loading={disconnectGithub.isPending}
            onPress={async () => {
              setError(null);
              try {
                await disconnectGithub.mutateAsync();
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
            style={{ marginTop: 10 }}
          />
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Account</Text>
      <Button
        title="Log out"
        variant="secondary"
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/login');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  cardText: { fontSize: 14, color: '#374151' },
});
