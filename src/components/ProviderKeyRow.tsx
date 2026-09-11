import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import type { AiProvider } from '@/types/api';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  google: 'Google',
};

interface ProviderKeyRowProps {
  provider: AiProvider;
  configured: boolean;
  onSave: (apiKey: string) => Promise<void>;
  onRemove: () => Promise<void>;
  saving: boolean;
  removing: boolean;
}

export function ProviderKeyRow({ provider, configured, onSave, onRemove, saving, removing }: ProviderKeyRowProps) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const save = async () => {
    if (!apiKey.trim()) return;
    await onSave(apiKey.trim());
    setApiKey('');
    setEditing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{PROVIDER_LABELS[provider]}</Text>
        <Text style={[styles.status, configured ? styles.statusOn : styles.statusOff]}>
          {configured ? 'Configured' : 'Not set'}
        </Text>
      </View>

      {editing ? (
        <>
          <TextField
            placeholder="API key"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
          />
          <View style={styles.actions}>
            <Button title="Save" onPress={save} loading={saving} disabled={!apiKey.trim()} />
            <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} />
          </View>
        </>
      ) : (
        <View style={styles.actions}>
          <Button
            title={configured ? 'Update key' : 'Add key'}
            variant="secondary"
            onPress={() => setEditing(true)}
          />
          {configured && (
            <Button title="Remove" variant="destructive" onPress={onRemove} loading={removing} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  status: { fontSize: 12, fontWeight: '600' },
  statusOn: { color: '#166534' },
  statusOff: { color: '#9ca3af' },
  actions: { flexDirection: 'row', gap: 8 },
});
