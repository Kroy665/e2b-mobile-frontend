import { Ionicons } from '@expo/vector-icons';
import { Href, router, Tabs, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropdownMenu } from '@/components/DropdownMenu';
import { StatusDot } from '@/components/StatusBadge';
import { useDeleteSandbox, usePauseSandbox, useSandbox } from '@/hooks/useSandboxes';
import { errorMessage } from '@/utils/errors';
import { repoNameFromUrl } from '@/utils/repo';

export default function SandboxLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: sandbox } = useSandbox(id);
  const pauseSandbox = usePauseSandbox();
  const deleteSandbox = useDeleteSandbox();
  const [menuVisible, setMenuVisible] = useState(false);

  const onPause = () => {
    pauseSandbox.mutate(id, {
      onError: (err) => Alert.alert('Failed to pause', errorMessage(err)),
    });
  };

  const onDelete = () => {
    Alert.alert('Terminate sandbox?', 'This permanently deletes the sandbox and all its state.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Terminate',
        style: 'destructive',
        onPress: () => {
          deleteSandbox.mutate(id, {
            onSuccess: () => router.replace('/(app)/(tabs)/sandboxes' as Href),
            onError: (err) => Alert.alert('Failed to terminate', errorMessage(err)),
          });
        },
      },
    ]);
  };

  const projectName = sandbox ? repoNameFromUrl(sandbox.repo_url) : 'Sandbox';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
        <View style={styles.titleRow}>
          {sandbox && <StatusDot status={sandbox.status} />}
          <Text style={styles.projectName} numberOfLines={1}>
            {projectName}
          </Text>
        </View>
        <Pressable onPress={() => setMenuVisible(true)} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#374151" />
        </Pressable>
      </View>
      {sandbox?.status === 'failed' && sandbox.error_message && (
        <Text style={styles.errorMessage} numberOfLines={2}>
          {sandbox.error_message}
        </Text>
      )}
      <View style={styles.divider} />

      <DropdownMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={[
          { label: 'Pause', icon: 'pause-circle-outline', onPress: onPause },
          { label: 'Terminate', icon: 'trash-outline', destructive: true, onPress: onDelete },
        ]}
      />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563eb',
          tabBarPosition: 'top',
          // The tab bar unconditionally adds the device's top safe-area inset
          // to both its height and its top padding when positioned at top
          // (React Navigation's bottom-tabs assumes it's the outermost
          // element under the status bar). That inset was already consumed
          // by this screen's own SafeAreaView above, so left as-is it
          // double-counts and shows up as a blank gap below the tab bar.
          // Pinning an explicit height (the UIKit base tab bar height, with
          // no inset) short-circuits that calculation entirely.
          tabBarStyle: { height: 49, paddingTop: 0 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="files"
          options={{
            title: 'Files',
            tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="terminal"
          options={{
            title: 'Terminal',
            tabBarIcon: ({ color, size }) => <Ionicons name="terminal-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="servers"
          options={{
            title: 'Servers',
            tabBarIcon: ({ color, size }) => <Ionicons name="server-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="git"
          options={{
            title: 'Git',
            tabBarIcon: ({ color, size }) => <Ionicons name="git-branch-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12 },
  projectName: { fontSize: 17, fontWeight: '600', color: '#111827', flexShrink: 1 },
  errorMessage: {
    fontSize: 12,
    color: '#dc2626',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb' },
});
