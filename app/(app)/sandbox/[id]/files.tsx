import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useDeleteFile, useFileContent, useFileList, useWriteFile } from '@/hooks/useFiles';
import { errorMessage } from '@/utils/errors';
import type { FileEntry } from '@/types/api';

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const parts = path === '.' ? [] : path.split('/');
  return (
    <View style={styles.breadcrumb}>
      <Pressable onPress={() => onNavigate('.')}>
        <Text style={styles.breadcrumbText}>root</Text>
      </Pressable>
      {parts.map((part, idx) => {
        const segmentPath = parts.slice(0, idx + 1).join('/');
        return (
          <View key={segmentPath} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.breadcrumbSep}> / </Text>
            <Pressable onPress={() => onNavigate(segmentPath)}>
              <Text style={styles.breadcrumbText}>{part}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function FileEditor({
  sandboxId,
  path,
  onClose,
}: {
  sandboxId: string;
  path: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useFileContent(sandboxId, path, true);
  const writeFile = useWriteFile(sandboxId);
  const [content, setContent] = useState<string | null>(null);

  const currentContent = content ?? data?.content ?? '';
  const dirty = content !== null && content !== data?.content;

  const onSave = async () => {
    try {
      await writeFile.mutateAsync({ path, content: currentContent });
      Alert.alert('Saved', `${path} updated.`);
    } catch (err) {
      Alert.alert('Failed to save', errorMessage(err));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.editorHeader}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.editorPath} numberOfLines={1}>
          {path}
        </Text>
        <Pressable onPress={onSave} disabled={!dirty || writeFile.isPending} hitSlop={12}>
          {writeFile.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={[styles.saveText, !dirty && styles.saveTextDisabled]}>Save</Text>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{errorMessage(error)}</Text>
      ) : (
        <TextInput
          style={styles.editorInput}
          multiline
          value={currentContent}
          onChangeText={setContent}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
    </View>
  );
}

export default function FilesScreen() {
  // useLocalSearchParams doesn't inherit the parent [id] dynamic segment from
  // here — this screen is a Tabs.Screen child, one level below the [id]
  // segment itself (which is the Tabs layout). useGlobalSearchParams does.
  const { id } = useGlobalSearchParams<{ id: string }>();
  const [path, setPath] = useState('.');
  const [openFile, setOpenFile] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useFileList(id, path);
  const deleteFile = useDeleteFile(id);

  if (openFile) {
    return <FileEditor sandboxId={id} path={openFile} onClose={() => setOpenFile(null)} />;
  }

  const onEntryPress = (entry: FileEntry) => {
    if (entry.type === 'dir') {
      setPath(entry.path);
    } else {
      setOpenFile(entry.path);
    }
  };

  const onEntryLongPress = (entry: FileEntry) => {
    if (entry.type === 'dir') return;
    Alert.alert('Delete file?', entry.path, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteFile.mutate(entry.path, {
            onError: (err) => Alert.alert('Failed to delete', errorMessage(err)),
          });
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <Breadcrumb path={path} onNavigate={setPath} />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{errorMessage(error)}</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.path}
          contentContainerStyle={{ padding: 12 }}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <Pressable
              style={styles.entryRow}
              onPress={() => onEntryPress(item)}
              onLongPress={() => onEntryLongPress(item)}
            >
              <Ionicons
                name={item.type === 'dir' ? 'folder' : 'document-outline'}
                size={20}
                color={item.type === 'dir' ? '#f59e0b' : '#6b7280'}
              />
              <Text style={styles.entryName}>{item.name}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Empty directory</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  breadcrumbText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  breadcrumbSep: { color: '#9ca3af', fontSize: 13 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  entryName: { fontSize: 14, color: '#111827' },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  errorText: { color: '#dc2626', textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  editorPath: { flex: 1, marginHorizontal: 12, fontSize: 13, color: '#374151' },
  saveText: { color: '#2563eb', fontWeight: '700', fontSize: 14 },
  saveTextDisabled: { color: '#9ca3af' },
  editorInput: {
    flex: 1,
    padding: 16,
    fontSize: 13,
    fontFamily: 'Courier',
    color: '#111827',
    textAlignVertical: 'top',
  },
});
