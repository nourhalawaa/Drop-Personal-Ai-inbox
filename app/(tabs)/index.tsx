import { FlatList, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntries } from '../../hooks/useEntries';
import { Card } from '../../components/Card';
import { DropInput } from '../../components/DropInput';

export default function ListScreen() {
  const { entries, loading, addEntry, setState, toggleStar } = useEntries();

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <DropInput onSubmit={addEntry} />
            {loading && <Text style={styles.hint}>Loading…</Text>}
            {!loading && entries.length === 0 && (
              <Text style={styles.hint}>Drop your first idea above.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Card
            entry={item}
            onToggleStar={toggleStar}
            onSetState={setState}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#020617',
  },
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 4,
  },
  hint: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
