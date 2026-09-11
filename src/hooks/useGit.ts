import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as sandboxesApi from '@/api/sandboxes';

export const gitKeys = {
  status: (id: string) => ['git', id, 'status'] as const,
};

export function useGitStatus(sandboxId: string) {
  return useQuery({
    queryKey: gitKeys.status(sandboxId),
    queryFn: () => sandboxesApi.getGitStatus(sandboxId),
    enabled: !!sandboxId,
  });
}

export function useCommitChanges(sandboxId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => sandboxesApi.commitChanges(sandboxId, message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gitKeys.status(sandboxId) }),
  });
}

export function usePushBranch(sandboxId: string) {
  return useMutation({
    mutationFn: (branch?: string) => sandboxesApi.pushBranch(sandboxId, branch),
  });
}
