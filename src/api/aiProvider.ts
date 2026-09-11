import { api } from './client';
import type { AiProvider, AiProviderEntry } from '@/types/api';

export function setAiProviderKey(provider: AiProvider, apiKey: string) {
  return api.put<{ message: string }>('/integrations/ai-provider', { provider, apiKey });
}

// Only configured providers are returned — absence from the array means unset.
export function listAiProviders() {
  return api.get<AiProviderEntry[]>('/integrations/ai-provider');
}

export function removeAiProviderKey(provider: AiProvider) {
  return api.delete<{ message: string }>(`/integrations/ai-provider/${provider}`);
}
