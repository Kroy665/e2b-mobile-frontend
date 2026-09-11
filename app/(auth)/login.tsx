import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { errorMessage } from '@/utils/errors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)/(tabs)/sandboxes');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>Welcome back</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 6 }}>Log in to your e2b account</Text>
      </View>

      <ErrorBanner message={error} />

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="you@example.com"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        textContentType="password"
      />

      <Button title="Log in" onPress={onSubmit} loading={loading} disabled={!email || !password} />

      <Link href="/(auth)/forgot-password" style={{ marginTop: 16, textAlign: 'center', color: '#2563eb' }}>
        Forgot password?
      </Link>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
        <Text style={{ color: '#6b7280' }}>Don't have an account? </Text>
        <Link href="/(auth)/signup" style={{ color: '#2563eb', fontWeight: '600' }}>
          Sign up
        </Link>
      </View>
    </Screen>
  );
}
