import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { StarButton } from './StarButton';
import { StateSelector } from './StateSelector';
import { CATEGORY_COLORS } from '../lib/constants';

export function Card({ entry, onToggleStar, onSetState, onEdit, onDelete }) {
  const { id, text, category, score, starred, state } = entry;
  const isProcessing = category === null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleEditStart() {
    setDraft(text);
    setEditing(true);
  }

  function handleEditCancel() {
    setDraft(text);
    setEditing(false);
  }

  function handleEditSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === text) {
      setEditing(false);
      return;
    }
    onEdit(id, trimmed);
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {isProcessing ? (
          <Text style={styles.processing}>Processing…</Text>
        ) : (
          <View style={styles.meta}>
            <View style={[styles.categoryPill, { backgroundColor: CATEGORY_COLORS[category] ?? '#6366f1' }]}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          </View>
        )}
        <StarButton starred={starred} onToggle={() => onToggleStar(id)} />
      </View>

      {editing ? (
        <TextInput
          style={styles.editor}
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholderTextColor="#475569"
        />
      ) : (
        <Text style={styles.body}>{text}</Text>
      )}

      <View style={styles.actions}>
        {editing ? (
          <>
            <TouchableOpacity onPress={handleEditCancel} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEditSave} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="checkmark" size={18} color="#10b981" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={handleCopy} style={styles.actionBtn} hitSlop={8}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={copied ? '#10b981' : '#94a3b8'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEditStart} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="pencil-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <StateSelector currentState={state} onSelect={(s) => onSetState(id, s)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  scoreBadge: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  scoreText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  processing: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  body: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  editor: {
    fontSize: 14,
    color: '#f1f5f9',
    lineHeight: 20,
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 8,
    minHeight: 60,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 8,
  },
  actionBtn: {
    padding: 2,
  },
});
