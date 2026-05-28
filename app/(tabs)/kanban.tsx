import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntries } from '../../hooks/useEntries';
import { Card } from '../../components/Card';
import { CATEGORIES, CATEGORY_COLORS } from '../../lib/constants';

export default function KanbanScreen() {
  const { entries, editEntry, deleteEntry, setState, toggleStar } = useEntries();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
        {CATEGORIES.map((cat) => {
          const col = entries
            .filter((e) => e.category === cat)
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

          return (
            <View key={cat} style={styles.column}>
              <View style={[styles.colHeader, { borderTopColor: CATEGORY_COLORS[cat] }]}>
                <Text style={styles.colTitle}>{cat}</Text>
                <Text style={styles.colCount}>{col.length}</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {col.length === 0 ? (
                  <Text style={styles.empty}>No entries</Text>
                ) : (
                  col.map((entry) => (
                    <Card
                      key={entry.id}
                      entry={entry}
                      onToggleStar={toggleStar}
                      onSetState={setState}
                      onEdit={editEntry}
                      onDelete={deleteEntry}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#020617',
  },
  board: {
    padding: 12,
    gap: 10,
  },
  column: {
    width: 260,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    maxHeight: '100%',
  },
  colHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 3,
    borderRadius: 2,
    paddingTop: 8,
    marginBottom: 10,
  },
  colTitle: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 13,
  },
  colCount: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    color: '#334155',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});
