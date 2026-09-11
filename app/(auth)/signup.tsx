import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { errorMessage } from '@/utils/errors';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const onSubmit = async () => {
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password);
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
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>Create your account</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 6 }}>Start building with e2b sandboxes</Text>
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
        textContentType="newPassword"
      />
      <TextField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="••••••••"
        textContentType="newPassword"
      />

      <Button
        title="Sign up"
        onPress={onSubmit}
        loading={loading}
        disabled={!email || !password || !confirmPassword}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
        <Text style={{ color: '#6b7280' }}>Already have an account? </Text>
        <Link href="/(auth)/login" style={{ color: '#2563eb', fontWeight: '600' }}>
          Log in
        </Link>
      </View>
    </Screen>
  );
}
