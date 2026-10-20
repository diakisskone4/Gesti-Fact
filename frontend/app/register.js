import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '../src/api';
import { useAuth } from '../src/auth';
import AuthShell from '../src/components/AuthShell';
import { Button, Input } from '../src/components/ui';
import { colors } from '../src/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.email || !form.password) return setError('Email et mot de passe obligatoires.');
    setLoading(true);
    setError('');
    try {
      await register({ ...form, email: form.email.trim().toLowerCase(), username: form.first_name || form.email.split('@')[0] });
    } catch (e) {
      setError(errorMessage(e, 'Inscription impossible.'));
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Créer un compte" subtitle="Commencez à facturer en quelques minutes">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input style={{ flex: 1 }} label="Prénom" value={form.first_name} onChangeText={set('first_name')} />
        <Input style={{ flex: 1 }} label="Nom" value={form.last_name} onChangeText={set('last_name')} />
      </View>
      <Input label="Email *" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
      <Input label="Téléphone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Input label="Mot de passe * (6 caractères min.)" value={form.password} onChangeText={set('password')} secureTextEntry />
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title="Créer mon compte" icon="person-add-outline" onPress={submit} loading={loading} />
      <Text style={{ textAlign: 'center', marginTop: 18, color: colors.muted }}>
        Déjà inscrit ?{' '}
        <Link href="/login" style={{ color: colors.primary, fontWeight: '700' }}>Se connecter</Link>
      </Text>
    </AuthShell>
  );
}
