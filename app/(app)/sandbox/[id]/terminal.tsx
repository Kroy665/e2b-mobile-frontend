import { useGlobalSearchParams } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TerminalView, type TerminalViewHandle } from '@/components/TerminalView';
import { useTerminal } from '@/hooks/useTerminal';

export default function TerminalScreen() {
  // useLocalSearchParams doesn't inherit the parent [id] dynamic segment here
  // — this screen is a Tabs.Screen child below the [id] segment (the Tabs
  // layout itself). useGlobalSearchParams does.
  const { id } = useGlobalSearchParams<{ id: string }>();
  const terminalRef = useRef<TerminalViewHandle>(null);

  const onData = useCallback((chunk: string) => {
    terminalRef.current?.write(chunk);
  }, []);

  const { connectionState, closeReason, sendInput, resize, reconnect } = useTerminal(id, onData);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0f19' }}>
      {connectionState !== 'open' && (
        <Pressable
          style={styles.connectionBanner}
          onPress={connectionState !== 'connecting' ? reconnect : undefined}
        >
          <Text style={styles.connectionText}>
            {connectionState === 'connecting' && 'Connecting…'}
            {connectionState === 'closed' && `Disconnected${closeReason ? `: ${closeReason}` : ''} — tap to retry`}
            {connectionState === 'error' && `Connection error${closeReason ? `: ${closeReason}` : ''} — tap to retry`}
          </Text>
        </Pressable>
      )}

      <TerminalView ref={terminalRef} onInput={sendInput} onResize={resize} />
    </View>
  );
}

const styles = StyleSheet.create({
  connectionBanner: { backgroundColor: '#422006', padding: 8, alignItems: 'center' },
  connectionText: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
});
