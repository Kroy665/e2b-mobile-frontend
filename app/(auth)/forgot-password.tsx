import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import * as authApi from '@/api/auth';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { errorMessage } from '@/utils/errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>Reset password</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 6 }}>
          We'll email you a link to reset your password.
        </Text>
      </View>

      <ErrorBanner message={error} />

      {sent ? (
        <View>
          <Text style={{ color: '#111827', fontSize: 16, marginBottom: 24 }}>
            If an account exists for {email}, a reset link has been sent.
          </Text>
          <Button title="Back to login" onPress={() => router.replace('/(auth)/login')} />
        </View>
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
            textContentType="emailAddress"
          />
          <Button title="Send reset link" onPress={onSubmit} loading={loading} disabled={!email} />
        </>
      )}
    </Screen>
  );
}
