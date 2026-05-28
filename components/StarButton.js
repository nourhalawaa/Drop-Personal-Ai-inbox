import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function StarButton({ starred, onToggle }) {
  return (
    <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons
        name={starred ? 'star' : 'star-outline'}
        size={20}
        color={starred ? '#f59e0b' : '#94a3b8'}
      />
    </TouchableOpacity>
  );
}
