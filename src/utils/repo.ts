function normalizeRepoUrl(url: string): string {
  return url.trim().replace(/\.git$/i, '').replace(/\/+$/, '').toLowerCase();
}

export function repoNameFromUrl(url: string): string {
  const segments = normalizeRepoUrl(url).split('/').filter(Boolean);
  return segments[segments.length - 1] ?? url;
}

// GitHub's cloneUrl ("https://github.com/owner/repo.git") and a sandbox's
// stored repo_url ("https://github.com/owner/repo") refer to the same repo
// but differ by the .git suffix — compare normalized forms, not raw strings.
export function isSameRepo(urlA: string, urlB: string): boolean {
  return normalizeRepoUrl(urlA) === normalizeRepoUrl(urlB);
}
