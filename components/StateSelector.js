import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { STATES, STATE_COLORS } from '../lib/constants';

export function StateSelector({ currentState, onSelect }) {
  return (
    <View style={styles.row}>
      {STATES.map((s) => {
        const active = s === currentState;
        return (
          <TouchableOpacity
            key={s}
            onPress={() => onSelect(s)}
            style={[styles.pill, active && { backgroundColor: STATE_COLORS[s] }]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{s}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#fff',
  },
});
