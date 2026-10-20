import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { errorMessage } from '../src/api';
import { useAuth } from '../src/auth';
import AuthShell from '../src/components/AuthShell';
import { Button, Input } from '../src/components/ui';
import { colors } from '../src/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return setError('Renseignez votre email et votre mot de passe.');
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      setError(errorMessage(e, 'Connexion impossible.'));
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre espace de facturation">
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={submit} />
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      <Button title="Se connecter" icon="log-in-outline" onPress={submit} loading={loading} />
      <Text style={{ textAlign: 'center', marginTop: 18, color: colors.muted }}>
        Pas encore de compte ?{' '}
        <Link href="/register" style={{ color: colors.primary, fontWeight: '700' }}>Créer un compte</Link>
      </Text>
    </AuthShell>
  );
}
