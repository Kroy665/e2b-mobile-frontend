import { api } from './client';
import type { GithubRepo, GithubStatus } from '@/types/api';

export function connectGithub() {
  return api.post<{ url: string }>('/integrations/github/connect');
}

export function getGithubStatus() {
  return api.get<GithubStatus>('/integrations/github/status');
}

export function disconnectGithub() {
  return api.delete<{ message: string }>('/integrations/github/disconnect');
}

export function listGithubRepos() {
  return api.get<GithubRepo[]>('/integrations/github/repos');
}
