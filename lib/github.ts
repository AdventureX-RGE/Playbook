const OWNER = "AdventureX-RGE";
const REPO = "Playbook";
const BRANCH = "main";
const API = "https://api.github.com";
const TOKEN_KEY = "github_token";

const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

export function captureToken(): string | null {
  const match = window.location.hash.match(/github_token=([^&]+)/);

  if (match) {
    localStorage.setItem(TOKEN_KEY, match[1]);
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return match[1];
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function redirectToLogin(): void {
  window.location.href = `/api/github/login?redirect=${encodeURIComponent(
    window.location.pathname + window.location.search,
  )}`;
}

async function api(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...HEADERS, Authorization: `Bearer ${token}`, ...init?.headers },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("GitHub token expired — please sign in again");
  }

  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `GitHub API ${res.status}`);
  return body;
}

function post(token: string, path: string, data: object) {
  return api(token, path, { method: "POST", body: JSON.stringify(data) });
}

function put(token: string, path: string, data: object) {
  return api(token, path, { method: "PUT", body: JSON.stringify(data) });
}

export async function submitToGitHub(
  token: string,
  filePath: string,
  content: string,
): Promise<{ prUrl: string }> {
  const { login: user } = (await api(token, "/user")) as { login: string };

  await post(token, `/repos/${OWNER}/${REPO}/forks`, { default_branch_only: true });
  await waitForFork(token, user);

  const { object } = (await api(token, `/repos/${user}/${REPO}/git/ref/heads/${BRANCH}`)) as {
    object: { sha: string };
  };

  const branch = `playbook-edit-${Date.now()}`;
  await post(token, `/repos/${user}/${REPO}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha: object.sha,
  });

  const file = (await api(
    token,
    `/repos/${user}/${REPO}/contents/${filePath}?ref=${branch}`,
  )) as { sha: string };

  const fileName = filePath.split("/").pop();
  await put(token, `/repos/${user}/${REPO}/contents/${filePath}`, {
    message: `docs: edit ${fileName}`,
    content: utf8ToBase64(content),
    sha: file.sha,
    branch,
  });

  const pr = (await post(token, `/repos/${OWNER}/${REPO}/pulls`, {
    title: `docs: edit ${fileName}`,
    body: `Submitted from the [Playbook Editor](https://playbook.adventure-x.org) by @${user}.`,
    head: `${user}:${branch}`,
    base: BRANCH,
  })) as { html_url: string };

  return { prUrl: pr.html_url };
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function waitForFork(token: string, user: string, retries = 10): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await api(token, `/repos/${user}/${REPO}`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("Timed out waiting for fork to be created");
}
