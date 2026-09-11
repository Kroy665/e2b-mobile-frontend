import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as sandboxesApi from '@/api/sandboxes';

export const sandboxKeys = {
  all: ['sandboxes'] as const,
  detail: (id: string) => ['sandboxes', id] as const,
};

export function useSandboxes() {
  return useQuery({
    queryKey: sandboxKeys.all,
    queryFn: sandboxesApi.listSandboxes,
    refetchInterval: 10_000,
  });
}

export function useSandbox(id: string) {
  return useQuery({
    queryKey: sandboxKeys.detail(id),
    queryFn: () => sandboxesApi.getSandbox(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'creating' ? 3_000 : 15_000;
    },
    enabled: !!id,
  });
}

export function useCreateSandbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repoUrl, branch }: { repoUrl: string; branch?: string }) =>
      sandboxesApi.createSandbox(repoUrl, branch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sandboxKeys.all });
    },
  });
}

export function useDeleteSandbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sandboxesApi.deleteSandbox(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sandboxKeys.all });
    },
  });
}

export function usePauseSandbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sandboxesApi.pauseSandbox(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: sandboxKeys.all });
      queryClient.invalidateQueries({ queryKey: sandboxKeys.detail(id) });
    },
  });
}
