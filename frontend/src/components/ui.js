import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { colors, radius, shadow, STATUS } from '../theme';

export function Screen({ children, refreshing, onRefresh, maxWidth = 1100, contentStyle }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <View style={[styles.container, { maxWidth }, contentStyle]}>{children}</View>
    </ScrollView>
  );
}

export function Card({ children, style, padded = true }) {
  return <View style={[styles.card, padded && { padding: 16 }, style]}>{children}</View>;
}

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

const BUTTON_VARIANTS = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  gold: { bg: colors.gold, fg: '#fff', border: colors.gold },
  outline: { bg: '#fff', fg: colors.primary, border: colors.line },
  danger: { bg: '#fff', fg: colors.danger, border: '#F3C4C4' },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
};

export function Button({ title, onPress, icon, variant = 'primary', loading, disabled, style, small }) {
  const v = BUTTON_VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={v.fg} />}
          {title ? <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, error, style, inputStyle, right, ...props }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, error && { borderColor: colors.danger }]}>
        <TextInput
          placeholderTextColor="#9AA3AF"
          style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, inputStyle]}
          {...props}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export function StatCard({ icon, label, value, accent = colors.primary, hint }) {
  return (
    <Card style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Card>
  );
}

export function Empty({ icon = 'document-text-outline', title, subtitle, action }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color="#C3CAD4" />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

export function Loader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/** Confirmation compatible web (window.confirm) et mobile (Alert). */
export function confirm(title, message, confirmLabel = 'Confirmer') {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title, message = '') {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, paddingBottom: 40 },
  container: { width: '100%', alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, ...shadow },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 16, height: 44, borderRadius: radius.md, borderWidth: 1,
  },
  buttonSmall: { height: 36, paddingHorizontal: 12 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink, minHeight: 44 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  stat: { flexGrow: 1, flexBasis: 160, minWidth: 150 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontSize: 13, color: colors.muted },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2 },
  statHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { alignItems: 'center', padding: 36, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 6 },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: colors.bg },
});
