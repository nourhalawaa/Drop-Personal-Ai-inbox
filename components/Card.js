import { View, Text, StyleSheet } from 'react-native';
import { StarButton } from './StarButton';
import { StateSelector } from './StateSelector';
import { CATEGORY_COLORS } from '../lib/constants';

export function Card({ entry, onToggleStar, onSetState }) {
  const { text, category, score, starred, state } = entry;
  const isProcessing = category === null;

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
        <StarButton starred={starred} onToggle={() => onToggleStar(entry.id)} />
      </View>

      <Text style={styles.body} numberOfLines={4}>{text}</Text>

      <StateSelector currentState={state} onSelect={(s) => onSetState(entry.id, s)} />
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
});
