/**
 * For every software tool with a GitHub repository URL, fetches stars,
 * contributor count, last push date, and license from the GitHub REST API.
 * Writes src/data/generated/github-stats.json (keyed by repo full_name).
 *
 * Resilient: on API failure (rate limit, 404, ...) skips that repo with a warning.
 *
 * Optional: GITHUB_TOKEN env var lifts the rate limit from 60/h to 5000/h.
 * For 2-3 SWEN tools we are well under 60/h, so the token is truly optional.
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'src/data/generated');
mkdirSync(OUT_DIR, { recursive: true });

type SoftwareRow = {
  id: string;
  name: string;
  repository: string | null;
};

type GitHubStats = {
  stars: number;
  contributors: number;
  lastPush: string | null;
  license: string | null;
  openIssues: number;
  description: string | null;
};

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

async function ghFetch(path: string): Promise<any | null> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'SWEN-website-builder/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (!res.ok) {
      console.warn(`  × GH ${path}: HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    console.warn(`  × GH ${path}: ${e.message}`);
    return null;
  }
}

async function countContributors(owner: string, repo: string): Promise<number> {
  // GitHub does not give a count directly; we approximate via /contributors?per_page=1
  // and parse the Link header's last page number.
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'SWEN-website-builder/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`,
      { headers },
    );
    if (!res.ok) return 0;
    const link = res.headers.get('link') ?? '';
    const lastPageMatch = link.match(/page=(\d+)[^>]*>; rel="last"/);
    if (lastPageMatch) return parseInt(lastPageMatch[1], 10);
    const body = await res.json();
    return Array.isArray(body) ? body.length : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const softwarePath = resolve(OUT_DIR, 'software.json');
  if (!existsSync(softwarePath)) {
    console.error('✗ src/data/generated/software.json not found. Run `pnpm fetch:notion` first.');
    process.exit(1);
  }
  const software: SoftwareRow[] = JSON.parse(readFileSync(softwarePath, 'utf8'));
  const withRepo = software
    .map((s) => ({ ...s, gh: s.repository ? parseGitHubUrl(s.repository) : null }))
    .filter((s) => s.gh !== null);

  if (withRepo.length === 0) {
    console.log('⚠ No software rows have a GitHub repository URL. Skipping.');
    writeFileSync(resolve(OUT_DIR, 'github-stats.json'), '{}', 'utf8');
    return;
  }

  console.log(`→ Fetching GitHub stats for ${withRepo.length} repos...\n`);
  const stats: Record<string, GitHubStats> = {};

  for (const s of withRepo) {
    const { owner, repo } = s.gh!;
    const info = await ghFetch(`/repos/${owner}/${repo}`);
    if (!info) continue;
    const contributors = await countContributors(owner, repo);
    const key = `${owner}/${repo}`;
    stats[key] = {
      stars: info.stargazers_count ?? 0,
      contributors,
      lastPush: info.pushed_at ?? null,
      license: info.license?.spdx_id ?? null,
      openIssues: info.open_issues_count ?? 0,
      description: info.description ?? null,
    };
    console.log(`  ✓ ${key.padEnd(40)} ★ ${stats[key].stars}  ${contributors} contributors`);
  }

  writeFileSync(resolve(OUT_DIR, 'github-stats.json'), JSON.stringify(stats, null, 2), 'utf8');
  console.log(`\n✓ Wrote github-stats.json with ${Object.keys(stats).length} entries.`);
}

main().catch((e) => {
  console.error('✗ fetch-github failed:', e);
  // Do NOT fail the build for GitHub stats — write empty file and continue
  writeFileSync(resolve(OUT_DIR, 'github-stats.json'), '{}', 'utf8');
  process.exit(0);
});
