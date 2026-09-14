<p align="center">
  <img src="https://img.shields.io/badge/expo-57-000020?logo=expo&logoColor=white" alt="Expo 57">
  <img src="https://img.shields.io/badge/react%20native-0.86-61DAFB?logo=react&logoColor=white" alt="React Native 0.86">
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict">
</p>

<p align="center">
  A phone-native client for E2B cloud sandboxes — clone a GitHub repo into an<br>
  isolated dev environment, then edit files, run git, use a real terminal, and<br>
  talk to an AI coding agent, all from your pocket.
</p>

## Why this exists

A code sandbox is normally a browser tab on a laptop. This is the same idea
compressed onto a phone screen: pick a GitHub repo, get a live E2B sandbox
with your code cloned in, and drive it — terminal, file editor, git, running
dev servers, AI pair-programming — without a laptop in reach.

The interesting engineering problem isn't the CRUD screens (repo list,
sandbox list, login) — it's that a phone has no native terminal emulator, no
native git client, and no framework blessing for a long-lived streaming AI
chat. Each of those needed a real solution, not a stub:

- **A real ANSI terminal, on a phone.** React Native has no port of `xterm.js`
  and no native widget that understands cursor movement, in-place line
  redraws, or 256-color escape codes. `TerminalView` embeds `xterm.js` inside
  a `WebView` and bridges keystrokes/output across the JS↔native boundary
  with `injectJavaScript` and `postMessage` — the same rendering engine a
  desktop terminal app would use, just hosted differently.
- **A resumable WebSocket terminal session**, not a fire-and-forget
  connection — `useTerminal` tracks connection state explicitly
  (`connecting` / `open` / `closed` / `error`), surfaces the server's actual
  close reason instead of a generic "disconnected," and offers a manual
  reconnect rather than silently giving up.
- **A streaming AI chat that survives out-of-order events.** The backend's
  opencode relay can emit a tool call in the middle of a text stream, then
  a completion event for that same tool later — `useOpencodeChat` merges
  events into an ordered part list per message (text deltas coalesce into
  one growing part; a tool call's "running" and "completed" states update
  the same part in place instead of duplicating it) so the UI shows what
  actually happened, in the order it happened.
- **Token refresh that can't race itself.** Every authenticated request can
  independently discover an expired access token; `refreshAccessToken()` in
  `src/api/client.ts` memoizes the in-flight refresh call so five concurrent
  401s trigger one refresh, not five, and a hard failure clears the stored
  session and notifies every screen via a listener set rather than a global
  redirect.

### What this is *not*

- Not a general-purpose mobile IDE — there's no autocomplete, no LSP, no
  syntax-aware diffing. The file editor is a plain text editor; the "smart"
  part of the workflow is deliberately pushed to the AI chat and the
  terminal, not reimplemented client-side.
- The terminal and AI chat both require the companion backend
  ([e2b-mobile-backend](../backend)) to be reachable over WebSocket — this
  app has no offline mode and no local execution path.

## What it can do

- **GitHub → sandbox, one tap.** Connect GitHub via OAuth (`expo-web-browser`
  auth session against the backend's OAuth flow), browse your repos, and tap
  one to either open its existing sandbox or provision a fresh one with that
  repo cloned in.
- **Live terminal.** A full xterm.js terminal over a WebSocket relay to the
  sandbox's shell — real keystrokes, real ANSI rendering, reconnect on drop.
- **File browser + editor.** List and read any file in the sandbox, edit it,
  write it back — backed by React Query so file lists and content
  invalidate correctly after a write.
- **Git from your phone.** Check status, commit, and push a branch straight
  from the sandbox's working tree, no laptop required.
- **Running-server visibility.** See dev servers the sandbox has started
  (polled every 8s), start a new one on a given port/command, stop one —
  useful for checking "is the app actually running" without opening the
  terminal.
- **AI pair programming.** Chat with an opencode-backed coding agent scoped
  to the sandbox, with tool calls, token counts, and cost rendered inline as
  they stream in — not just a plain text transcript.
- **Bring your own model key.** Store your own Anthropic/OpenAI/OpenRouter/
  Google API key (encrypted server-side, per the backend) so the AI chat
  runs against a provider and key you control.

## Architecture

```
app/                              Expo Router file-based routes
  _layout.tsx                       Root layout — wraps everything in AuthProvider + QueryClientProvider
  (auth)/                           Unauthenticated stack
    login.tsx, signup.tsx, forgot-password.tsx
  (app)/                            Authenticated stack (redirects to (auth) if signed out)
    (tabs)/
      repos.tsx                       GitHub connect + repo list → tap to open/create a sandbox
      sandboxes.tsx                   All sandboxes across repos, regardless of origin
      settings.tsx                    AI provider keys, account, sign out
    new-sandbox.tsx                  Manual sandbox creation (repo URL + branch)
    sandbox/[id]/
      _layout.tsx                    Per-sandbox tab bar: overview / files / git / servers / terminal
      index.tsx                      Sandbox overview — status, repo, actions
      files.tsx                      File browser + editor
      git.tsx                        Status / commit / push
      servers.tsx                    Running dev servers, start/stop
      terminal.tsx                   Live terminal (see below)
src/
  api/
    client.ts                      fetch wrapper: auth header injection, single-flight token refresh, typed ApiError
    config.ts                      Base URL + ws:// URL derivation (wsUrlFor)
    auth.ts, users.ts               Login/signup/refresh/logout, profile
    github.ts                       OAuth connect flow, repo listing
    sandboxes.ts                    Sandbox CRUD, files, git, servers — the core REST surface
    aiProvider.ts                   Store/list/delete a user's own AI provider keys
  hooks/                           One React Query hook module per resource (useSandboxes, useFiles, useGit,
                                    useServers, useGithub, useAiProviders) — query keys colocated with the hook
    useTerminal.ts                  WebSocket terminal session: connection state, reconnect, binary I/O
    useOpencodeChat.ts              Streaming AI chat: event→message-part reducer (see above)
  components/
    TerminalView.tsx                xterm.js-in-WebView terminal widget (see above)
    ServerLogsView.tsx              Live server log viewer
    ToolCallCard.tsx                Renders one AI tool-call part (input/output/status)
    Button.tsx, TextField.tsx, Screen.tsx, ErrorBanner.tsx, StatusBadge.tsx, DropdownMenu.tsx
  context/
    AuthContext.tsx                 isAuthenticated + sign in/up/out, reacts to a global "unauthorized" event
    queryClient.ts                  Shared React Query client instance
  utils/
    storage.ts                      Token persistence (expo-secure-store)
    errors.ts                       Normalizes ApiError / network errors to a display string
    repo.ts                         Repo URL comparison (matching a sandbox to a GitHub repo across URL formats)
    date.ts                         Relative/formatted timestamps
  types/api.ts                     Shared request/response types matching the backend's API surface
```

The companion backend, [e2b-mobile-backend](../backend), is what this app
actually talks to — it owns Supabase auth, GitHub OAuth token storage,
E2B sandbox lifecycle, and the WebSocket relays for the terminal and AI
chat. This app has no server logic of its own; everything above is client
state, rendering, and the WebSocket/REST wiring to reach it.

## Requirements

| | |
|---|---|
| **Node** | LTS compatible with Expo SDK 57 |
| **Expo CLI** | via `npx expo`, no global install needed |
| **Backend** | A running instance of the companion backend, reachable from your device/simulator |
| **iOS/Android** | Expo Go for quick iteration, or a dev build for the WebView-based terminal/native modules |

## Setup

```bash
npm install
cp .env.example .env   # point at your backend's URL
npx expo start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code
in Expo Go on a physical device.
