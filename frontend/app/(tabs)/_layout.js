import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAuth } from '../../src/auth';
import { colors } from '../../src/theme';

const icon = (name) => ({ color, size }) => <Ionicons name={name} size={size} color={color} />;

export default function TabsLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8A94A3',
        tabBarStyle: { borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tableau de bord', tabBarLabel: 'Accueil', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="invoices" options={{ title: 'Factures', tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Entreprise', tabBarLabel: 'Paramètres', tabBarIcon: icon('business-outline') }} />
      <Tabs.Screen
        name="developer"
        options={{
          title: 'Espace développeur',
          tabBarLabel: 'Développeur',
          tabBarIcon: icon('code-slash-outline'),
          href: user?.is_developer ? '/developer' : null,
        }}
      />
    </Tabs>
  );
}
