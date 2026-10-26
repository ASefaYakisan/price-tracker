// Starts the "Pending links" workflow right after the site saves a link it could not read,
// so the reader on GitHub's servers does not wait for its 15-minute schedule.
// Needs GITHUB_DISPATCH_TOKEN (fine-grained, Actions read/write on the repo) and GITHUB_DISPATCH_REPO ("owner/repo");
// without them nothing happens and the schedule stays the only trigger.

const WORKFLOW = "pending.yml";
export const MIN_GAP_MS = 60_000; // at most one start per minute

type Run = { status: string; created_at: string };

// Skips when a run is already waiting (it will pick the new link up) or one began within the last minute.
export function shouldDispatch(runs: Run[], now = Date.now()) {
  return !runs.some((run) => run.status === "queued" || run.status === "waiting" || now - Date.parse(run.created_at) < MIN_GAP_MS);
}

// Never throws: a failed start leaves the link pending for the scheduled run.
export async function dispatchPendingRun(
  env: Record<string, string | undefined> = process.env,
  doFetch: typeof fetch = fetch,
  now = Date.now(),
) {
  const token = env.GITHUB_DISPATCH_TOKEN;
  const repo = env.GITHUB_DISPATCH_REPO;
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return false;
  const base = `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "price-tracker-site",
  };
  try {
    const list = await doFetch(`${base}/runs?per_page=5`, { headers, signal: AbortSignal.timeout(4000) });
    if (list.ok) {
      const { workflow_runs } = (await list.json()) as { workflow_runs?: Run[] };
      if (!shouldDispatch(workflow_runs ?? [], now)) return false;
    }
    const res = await doFetch(`${base}/dispatches`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ ref: env.GITHUB_DISPATCH_REF || "main" }),
      signal: AbortSignal.timeout(4000),
    });
    return res.status === 204;
  } catch {
    return false;
  }
}
