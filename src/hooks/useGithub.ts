import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as githubApi from '@/api/github';

export const githubKeys = {
  status: ['github', 'status'] as const,
  repos: ['github', 'repos'] as const,
};

export function useGithubStatus() {
  return useQuery({
    queryKey: githubKeys.status,
    queryFn: githubApi.getGithubStatus,
  });
}

export function useGithubRepos(enabled: boolean) {
  return useQuery({
    queryKey: githubKeys.repos,
    queryFn: githubApi.listGithubRepos,
    enabled,
  });
}

export function useDisconnectGithub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: githubApi.disconnectGithub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: githubKeys.status });
      queryClient.invalidateQueries({ queryKey: githubKeys.repos });
    },
  });
}
