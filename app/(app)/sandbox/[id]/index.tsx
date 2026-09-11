import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToolCallCard } from '@/components/ToolCallCard';
import { useOpencodeChat, type ChatMessage, type MessagePart } from '@/hooks/useOpencodeChat';

function StepFinishFooter({ tokens, cost }: { tokens?: { total: number; input: number; output: number }; cost?: number }) {
  if (!tokens && cost === undefined) return null;
  return (
    <View style={styles.stepFinish}>
      <Ionicons name="flash-outline" size={12} color="#94a3b8" />
      <Text style={styles.stepFinishText}>
        {tokens ? `${tokens.total} tokens` : ''}
        {tokens && cost !== undefined ? ' · ' : ''}
        {cost !== undefined ? `$${cost.toFixed(4)}` : ''}
      </Text>
    </View>
  );
}

function MessagePartView({ part, isUser }: { part: MessagePart; isUser: boolean }) {
  if (part.kind === 'text') {
    if (!part.text) return null;
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{part.text}</Text>
        </View>
      </View>
    );
  }
  if (part.kind === 'tool') {
    return <ToolCallCard part={part} />;
  }
  return <StepFinishFooter tokens={part.tokens} cost={part.cost} />;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const hasContent = message.parts.some((p) => p.kind !== 'text' || p.text);

  return (
    <View style={styles.messageGroup}>
      {message.parts.map((part, index) => (
        // Parts within one message have no natural unique key of their own.
        <MessagePartView key={index} part={part} isUser={isUser} />
      ))}
      {message.pending && (
        // Shown for the whole duration of the turn — not just before the
        // first token/tool call — since opencode keeps working (more tool
        // calls, more steps) after streaming some content, right up until
        // the "done" message actually arrives.
        <View style={hasContent ? styles.workingRow : [styles.bubbleRow, isUser && styles.bubbleRowUser]}>
          {hasContent ? (
            <>
              <ActivityIndicator size="small" color="#9ca3af" />
              <Text style={styles.workingText}>Working…</Text>
            </>
          ) : (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator size="small" color="#6b7280" />
            </View>
          )}
        </View>
      )}
      {message.error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{message.error}</Text>
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  // useLocalSearchParams doesn't inherit the parent [id] dynamic segment here
  // — this screen is a Tabs.Screen child below the [id] segment (the Tabs
  // layout itself). useGlobalSearchParams does.
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { messages, connectionState, closeReason, sendMessage, reconnect } = useOpencodeChat(id);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();

  const onSend = () => {
    const prompt = input.trim();
    if (!prompt) return;
    sendMessage(prompt);
    setInput('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
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

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>Ask opencode to make changes to your repo</Text>
          </View>
        }
      />

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message opencode…"
          placeholderTextColor="#9ca3af"
          multiline
        />
        <Pressable
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!input.trim() || connectionState !== 'open'}
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  connectionBanner: { backgroundColor: '#fef9c3', padding: 8, alignItems: 'center' },
  connectionText: { color: '#854d0e', fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, flexGrow: 1 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 80 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  messageGroup: { marginBottom: 12 },
  bubbleRow: { flexDirection: 'row', marginBottom: 6 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  stepFinish: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: 6 },
  stepFinishText: { fontSize: 11, color: '#94a3b8' },
  workingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  workingText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  errorRow: { marginTop: 2 },
  errorText: { color: '#dc2626', fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#93c5fd' },
});
