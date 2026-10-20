import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/auth';
import { Loader } from '../src/components/ui';
import { colors } from '../src/theme';

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Gesti-Fact' }} />
        <Stack.Screen name="invoice/new" options={{ title: 'Nouvelle facture' }} />
        <Stack.Screen name="invoice/[id]/index" options={{ title: 'Facture' }} />
        <Stack.Screen name="invoice/[id]/edit" options={{ title: 'Modifier la facture' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false, title: 'Connexion' }} />
        <Stack.Screen name="register" options={{ headerShown: false, title: 'Créer un compte' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
