import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export interface DropdownMenuItem {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface DropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  items: DropdownMenuItem[];
}

// A lightweight, dependency-free dropdown anchored under the header's "..."
// button. Native context-menu libraries need a custom dev client (not
// available in Expo Go), so this uses only core React Native primitives.
export function DropdownMenu({ visible, onClose, items }: DropdownMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.menuAnchor}>
          <View style={styles.menu}>
            {items.map((item, index) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [
                  styles.item,
                  index < items.length - 1 && styles.itemDivider,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                <Text style={[styles.itemText, item.destructive && styles.itemTextDestructive]}>
                  {item.label}
                </Text>
                {item.icon && (
                  <Ionicons name={item.icon} size={18} color={item.destructive ? '#dc2626' : '#374151'} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  menuAnchor: {
    position: 'absolute',
    top: 56,
    right: 16,
    alignItems: 'flex-end',
  },
  menu: {
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  itemDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  itemPressed: { backgroundColor: '#f3f4f6' },
  itemText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  itemTextDestructive: { color: '#dc2626' },
});
