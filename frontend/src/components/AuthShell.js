import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, shadow } from '../theme';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.primary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="receipt" size={30} color={colors.primary} />
          </View>
          <Text style={styles.brandName}>Gesti-Fact</Text>
          <Text style={styles.brandTag}>Gestion de factures professionnelle</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brand: { alignItems: 'center', marginBottom: 22 },
  logo: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 4, borderBottomColor: colors.gold,
  },
  brandName: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 12, letterSpacing: 0.5 },
  brandTag: { color: '#C8D3E1', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 440, alignSelf: 'center', ...shadow },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4, marginBottom: 18 },
});
