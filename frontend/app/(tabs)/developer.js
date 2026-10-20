import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, errorMessage } from '../../src/api';
import { useAuth } from '../../src/auth';
import { Button, Card, Chip, confirm, Empty, Input, Loader, notify, Screen, StatCard } from '../../src/components/ui';
import { formatAmount, formatDateTime, timeAgo } from '../../src/format';
import { useFocusFetch } from '../../src/hooks';
import { colors } from '../../src/theme';

const REFRESH_MS = 15000;
const EVENT_STYLE = {
  login: { icon: 'log-in-outline', color: colors.success },
  logout: { icon: 'log-out-outline', color: colors.muted },
  failed: { icon: 'alert-circle-outline', color: colors.danger },
};

export default function Developer() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [tab, setTab] = useState('users');

  const { data, loading, refreshing, refresh, reload, error } = useFocusFetch(async () => {
    const [stats, users, events] = await Promise.all([
      api.get('/dev/stats/').then((r) => r.data),
      api.get('/dev/users/', { params: { search: search || undefined, online: onlineOnly ? 1 : undefined } }).then((r) => r.data),
      api.get('/dev/events/').then((r) => r.data),
    ]);
    return { stats, users: users.results || users, events: events.results || events };
  }, [search, onlineOnly]);

  // Rafraîchissement automatique de la présence en ligne
  useEffect(() => {
    const id = setInterval(() => reload(), REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);

  if (!me?.is_developer) return <Empty icon="lock-closed-outline" title="Accès réservé" subtitle="Cet espace est réservé aux développeurs." />;
  if (loading && !data) return <Loader />;
  if (error && !data) return <Empty icon="warning-outline" title="Erreur" subtitle={errorMessage(error)} />;

  const { stats, users, events } = data;

  const update = async (u, patch, message) => {
    if (message && !(await confirm('Confirmation', message))) return;
    try {
      await api.patch(`/dev/users/${u.id}/`, patch);
      reload();
    } catch (e) {
      notify('Erreur', errorMessage(e));
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.banner}>
        <Ionicons name="code-slash" size={22} color={colors.gold} />
        <Text style={styles.bannerText}>
          Supervision en temps réel · actualisation toutes les {REFRESH_MS / 1000} s · « en ligne » = actif depuis moins de {stats.online_window_minutes} min
        </Text>
      </View>

      <View style={styles.stats}>
        <StatCard icon="radio-button-on" label="En ligne" value={String(stats.users_online)} accent={colors.success} hint={`sur ${stats.users_total} utilisateurs`} />
        <StatCard icon="pulse-outline" label="Actifs aujourd'hui" value={String(stats.users_active_today)} hint={`${stats.logins_today} connexion(s)`} />
        <StatCard icon="alert-circle-outline" label="Échecs de connexion" value={String(stats.failed_logins_today)} accent={colors.danger} hint="aujourd'hui" />
        <StatCard icon="receipt-outline" label="Factures (toutes)" value={String(stats.invoices_total)} accent={colors.gold} hint={formatAmount(stats.amount_total)} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Chip label={`Utilisateurs (${users.length})`} active={tab === 'users'} onPress={() => setTab('users')} />
        <Chip label="Journal des connexions" active={tab === 'events'} onPress={() => setTab('events')} />
      </View>

      {tab === 'users' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Input style={{ flex: 1, minWidth: 220 }} placeholder="Rechercher un utilisateur…" value={search} onChangeText={setSearch} />
            <Chip label={onlineOnly ? '● En ligne uniquement' : 'Tous les utilisateurs'} active={onlineOnly} onPress={() => setOnlineOnly((v) => !v)} />
          </View>
          <View style={styles.userGrid}>
            {users.map((u) => (
              <Card key={u.id} style={styles.userCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(u.first_name || u.email).slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.dot, { backgroundColor: u.is_online ? '#22C55E' : '#CBD5E1' }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{`${u.first_name} ${u.last_name}`.trim() || u.username}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: u.is_online ? colors.successSoft : colors.soft }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: u.is_online ? colors.success : colors.muted }}>
                      {u.is_online ? 'En ligne' : 'Hors ligne'}
                    </Text>
                  </View>
                </View>
                <View style={styles.kv}>
                  <KV k="Entreprise" v={u.company_name || '—'} />
                  <KV k="Rôle" v={u.role === 'developer' ? 'Développeur' : 'Utilisateur'} />
                  <KV k="Dernière activité" v={timeAgo(u.last_seen)} />
                  <KV k="Dernière connexion" v={formatDateTime(u.last_login)} />
                  <KV k="Inscrit le" v={formatDateTime(u.date_joined)} />
                  <KV k="Factures" v={`${u.invoice_count} · ${formatAmount(u.total_invoiced)}`} />
                  {!u.is_active && <KV k="Statut" v="Compte désactivé" danger />}
                </View>
                {u.id !== me.id && (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      small
                      variant={u.is_active ? 'danger' : 'outline'}
                      icon={u.is_active ? 'ban-outline' : 'checkmark-circle-outline'}
                      title={u.is_active ? 'Désactiver' : 'Réactiver'}
                      onPress={() => update(u, { is_active: !u.is_active }, u.is_active ? `Désactiver le compte ${u.email} ?` : null)}
                    />
                    <Button
                      small
                      variant="outline"
                      icon="shield-outline"
                      title={u.role === 'developer' ? 'Retirer développeur' : 'Nommer développeur'}
                      onPress={() => update(u, { role: u.role === 'developer' ? 'user' : 'developer' }, `Changer le rôle de ${u.email} ?`)}
                    />
                  </View>
                )}
              </Card>
            ))}
          </View>
          {!users.length && <Empty icon="people-outline" title="Aucun utilisateur" />}
        </>
      ) : (
        <Card padded={false}>
          {events.map((e, i) => {
            const st = EVENT_STYLE[e.kind] || EVENT_STYLE.login;
            return (
              <View key={e.id} style={[styles.event, i < events.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{e.kind_label} · {e.email}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{e.ip_address || '—'} · {e.user_agent || '—'}</Text>
                </View>
                <Text style={styles.meta}>{formatDateTime(e.created_at)}</Text>
              </View>
            );
          })}
          {!events.length && <Empty icon="list-outline" title="Aucun événement" />}
        </Card>
      )}
    </Screen>
  );
}

function KV({ k, v, danger }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 3 }}>
      <Text style={styles.meta}>{k}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: danger ? colors.danger : colors.ink, flexShrink: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primaryDark,
    padding: 14, borderRadius: 12, marginBottom: 14,
  },
  bannerText: { color: '#E2E8F0', flex: 1, fontSize: 13 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  userGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  userCard: { flexGrow: 1, flexBasis: 320, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  dot: { position: 'absolute', right: 0, bottom: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  userName: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12.5 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  kv: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
