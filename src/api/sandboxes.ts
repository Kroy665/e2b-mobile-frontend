import { api } from './client';
import type {
  CommitResult,
  CreateSandboxResult,
  FileContent,
  FileEntry,
  GitStatus,
  OpencodeRunResponse,
  PushResult,
  Sandbox,
  SandboxActionResult,
  Server,
  StartServerResult,
  StopServerResult,
} from '@/types/api';

export function createSandbox(repoUrl: string, branch?: string) {
  return api.post<CreateSandboxResult>('/sandboxes', { repoUrl, branch });
}

export function listSandboxes() {
  return api.get<Sandbox[]>('/sandboxes');
}

export function getSandbox(id: string) {
  return api.get<Sandbox>(`/sandboxes/${id}`);
}

export function deleteSandbox(id: string) {
  return api.delete<SandboxActionResult>(`/sandboxes/${id}`);
}

export function pauseSandbox(id: string) {
  return api.post<SandboxActionResult>(`/sandboxes/${id}/pause`);
}

export function runOpencode(id: string, prompt: string, opts?: { model?: string; sessionId?: string }) {
  return api.post<OpencodeRunResponse>(`/sandboxes/${id}/opencode`, {
    prompt,
    model: opts?.model,
    sessionId: opts?.sessionId,
  });
}

// listFiles() used to return each entry's `path` with a leading slash (e.g.
// "/src/index.ts"), which broke round-tripping into these endpoints — see
// HANDOFF.md. Fixed server-side (commit e14a4b6), so this is now a no-op on
// the already-relative paths the API returns, but kept as cheap defense in
// depth in case that ever regresses.
function toRepoRelativePath(path: string): string {
  return path.replace(/^\/+/, '') || '.';
}

export function listFiles(id: string, path = '.') {
  return api.get<FileEntry[]>(`/sandboxes/${id}/files`, { query: { path: toRepoRelativePath(path) } });
}

export function readFile(id: string, path: string) {
  return api.get<FileContent>(`/sandboxes/${id}/files/content`, { query: { path: toRepoRelativePath(path) } });
}

export function writeFile(id: string, path: string, content: string) {
  return api.put<{ path: string; size: number }>(`/sandboxes/${id}/files/content`, {
    path: toRepoRelativePath(path),
    content,
  });
}

export function deleteFile(id: string, path: string) {
  return api.delete<{ path: string }>(`/sandboxes/${id}/files/content`, {
    query: { path: toRepoRelativePath(path) },
  });
}

export function getGitStatus(id: string) {
  return api.get<GitStatus>(`/sandboxes/${id}/git/status`);
}

export function commitChanges(id: string, message: string) {
  return api.post<CommitResult>(`/sandboxes/${id}/git/commit`, { message });
}

export function pushBranch(id: string, branch?: string) {
  return api.post<PushResult>(`/sandboxes/${id}/git/push`, { branch });
}

// `command` is optional — omitting it serves the repo directory as static
// files on that port (the backend runs `python3 -m http.server <port>`).
// The response's `command` always reflects what actually ran.
export function startServer(id: string, port: number, command?: string) {
  return api.post<StartServerResult>(`/sandboxes/${id}/servers`, { command, port });
}

export function listServers(id: string) {
  return api.get<Server[]>(`/sandboxes/${id}/servers`);
}

export function stopServer(id: string, port: number) {
  return api.delete<StopServerResult>(`/sandboxes/${id}/servers/${port}`);
}
