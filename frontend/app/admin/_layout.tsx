import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}