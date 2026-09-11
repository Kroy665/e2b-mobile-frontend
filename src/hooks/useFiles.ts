import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as sandboxesApi from '@/api/sandboxes';

export const fileKeys = {
  list: (id: string, path: string) => ['files', id, 'list', path] as const,
  content: (id: string, path: string) => ['files', id, 'content', path] as const,
};

export function useFileList(sandboxId: string, path: string) {
  return useQuery({
    queryKey: fileKeys.list(sandboxId, path),
    queryFn: () => sandboxesApi.listFiles(sandboxId, path),
    enabled: !!sandboxId,
  });
}

export function useFileContent(sandboxId: string, path: string, enabled: boolean) {
  return useQuery({
    queryKey: fileKeys.content(sandboxId, path),
    queryFn: () => sandboxesApi.readFile(sandboxId, path),
    enabled: enabled && !!sandboxId,
  });
}

export function useWriteFile(sandboxId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      sandboxesApi.writeFile(sandboxId, path, content),
    onSuccess: (_data, { path }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.content(sandboxId, path) });
    },
  });
}

export function useDeleteFile(sandboxId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => sandboxesApi.deleteFile(sandboxId, path),
    onSuccess: (_data, path) => {
      const parent = path.split('/').slice(0, -1).join('/') || '.';
      queryClient.invalidateQueries({ queryKey: fileKeys.list(sandboxId, parent) });
    },
  });
}
