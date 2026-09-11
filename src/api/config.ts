import Constants from 'expo-constants';
import { Platform } from 'react-native';

function inferDevHost(): string | null {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  return host || null;
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const port = 2345;
  if (Platform.OS === 'android') {
    const host = inferDevHost();
    return `http://${host ?? '10.0.2.2'}:${port}`;
  }
  const host = inferDevHost();
  return `http://${host ?? 'localhost'}:${port}`;
}

export const API_BASE_URL = resolveBaseUrl();
export const API_V1 = `${API_BASE_URL}/api/v1`;

export function wsUrlFor(path: string, token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  const sep = path.includes('?') ? '&' : '?';
  return `${wsBase}${path}${sep}token=${encodeURIComponent(token)}`;
}
