import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as sandboxesApi from '@/api/sandboxes';

export const serverKeys = {
  list: (sandboxId: string) => ['servers', sandboxId] as const,
};

export function useServers(sandboxId: string) {
  return useQuery({
    queryKey: serverKeys.list(sandboxId),
    queryFn: () => sandboxesApi.listServers(sandboxId),
    enabled: !!sandboxId,
    refetchInterval: 8_000,
  });
}

export function useStartServer(sandboxId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ port, command }: { port: number; command?: string }) =>
      sandboxesApi.startServer(sandboxId, port, command),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serverKeys.list(sandboxId) }),
  });
}

export function useStopServer(sandboxId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (port: number) => sandboxesApi.stopServer(sandboxId, port),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: serverKeys.list(sandboxId) }),
  });
}
