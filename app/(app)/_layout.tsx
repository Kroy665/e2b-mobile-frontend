import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sandbox/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="new-sandbox" options={{ presentation: 'modal', headerShown: true, title: 'New Sandbox' }} />
    </Stack>
  );
}
