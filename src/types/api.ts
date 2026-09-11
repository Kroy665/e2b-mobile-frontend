export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export interface AuthMeResponse {
  id: string;
  email?: string;
  [key: string]: unknown;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface GithubStatus {
  connected: boolean;
  login?: string;
  scope?: string;
}

export interface GithubRepo {
  id: number;
  fullName: string;
  private: boolean;
  cloneUrl: string;
  defaultBranch: string;
}

export type AiProvider = 'anthropic' | 'openai' | 'openrouter' | 'google';

// Only configured providers are returned — absence from the list means unset.
export interface AiProviderEntry {
  provider: AiProvider;
  created_at: string;
  updated_at: string;
}

export type SandboxStatus = 'creating' | 'ready' | 'paused' | 'failed' | 'terminated' | string;

export interface Sandbox {
  id: string;
  e2b_sandbox_id: string;
  repo_url: string;
  status: SandboxStatus;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
}

// POST /sandboxes returns a differently-shaped (camelCase) summary, not a full row.
export interface CreateSandboxResult {
  id: string;
  sandboxId: string;
  repoUrl: string;
  status: SandboxStatus;
}

export interface SandboxActionResult {
  id: string;
  status: SandboxStatus;
}

// Matches the E2B SDK's FileType enum verbatim ("dir", not "directory") —
// the backend passes it through unmodified (files.service.ts: `type: e.type`).
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface GitChangedFile {
  status: string;
  path: string;
}

export interface GitStatus {
  branch: string;
  changedFiles: GitChangedFile[];
  clean: boolean;
}

export interface CommitResult {
  commitHash: string;
  output: string;
}

export interface PushResult {
  branch: string;
  output: string;
}

export type ServerStatus = 'running' | 'stopped' | 'failed';

// POST /servers returns this partial shape (no timestamps/error_message).
export interface StartServerResult {
  id: string;
  port: number;
  url: string;
  pid: number;
  command: string;
  status: ServerStatus;
}

// GET /servers returns the full row.
export interface Server {
  id: string;
  pid: number;
  port: number;
  command: string;
  url: string;
  status: ServerStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StopServerResult {
  port: number;
  status: ServerStatus;
}

export type ServerLogEvent =
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'exit'; exitCode?: number };

export type OpencodeEvent =
  | { type: 'tool_use'; sessionId: string; tool: string; input?: unknown; output?: unknown; status?: string }
  | { type: 'text'; sessionId: string; text: string }
  | {
      type: 'step_finish';
      sessionId: string;
      tokens?: { total: number; input: number; output: number };
      cost?: number;
    }
  | { type: 'error'; sessionId: string; message: string }
  | { type: string; sessionId?: string; [key: string]: unknown };

export interface OpencodeRunResponse {
  text: string;
  sessionId: string;
  error?: string | null;
  events: OpencodeEvent[];
  exitCode: number;
}
