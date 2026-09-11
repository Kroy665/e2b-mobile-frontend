import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as aiProviderApi from '@/api/aiProvider';
import type { AiProvider } from '@/types/api';

export const aiProviderKeys = {
  all: ['ai-providers'] as const,
};

export function useAiProviders() {
  return useQuery({
    queryKey: aiProviderKeys.all,
    queryFn: aiProviderApi.listAiProviders,
  });
}

export function useSetAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: AiProvider; apiKey: string }) =>
      aiProviderApi.setAiProviderKey(provider, apiKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiProviderKeys.all }),
  });
}

export function useRemoveAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: AiProvider) => aiProviderApi.removeAiProviderKey(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiProviderKeys.all }),
  });
}
