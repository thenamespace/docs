import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', 'node_modules']);

const mintignorePath = join(root, '.mintignore');
const ignoredRoutes = new Set(
  existsSync(mintignorePath)
    ? readFileSync(mintignorePath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => line.replace(/\.mdx$/, ''))
    : [],
);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : walk(file);
    }
    return [file];
  });
}

const files = walk(root);
const mdxFiles = files.filter((file) => file.endsWith('.mdx'));
const routes = new Set(
  mdxFiles.map((file) => relative(root, file).replace(/\.mdx$/, '')),
);
const failures = [];

function fail(file, message) {
  failures.push(`${relative(root, file)}: ${message}`);
}

function collectNavigationRoutes(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectNavigationRoutes(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;

  for (const [key, item] of Object.entries(value)) {
    if (key === 'pages' && Array.isArray(item)) {
      for (const page of item) {
        if (typeof page === 'string') output.add(page);
        else collectNavigationRoutes(page, output);
      }
    } else {
      collectNavigationRoutes(item, output);
    }
  }
  return output;
}

const configPath = join(root, 'docs.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const navigationRoutes = collectNavigationRoutes(config.navigation);

for (const route of routes) {
  if (!navigationRoutes.has(route) && !ignoredRoutes.has(route)) {
    failures.push(`${route}.mdx: page is missing from docs.json navigation`);
  }
}

for (const route of navigationRoutes) {
  if (!routes.has(route)) {
    failures.push(`docs.json: navigation route has no MDX file: ${route}`);
  }
}

for (const redirect of config.redirects ?? []) {
  if (!redirect.source?.startsWith('/')) {
    failures.push(`docs.json: redirect source must start with /: ${redirect.source}`);
  }
  if (!redirect.destination?.startsWith('/')) {
    failures.push(`docs.json: redirect destination must start with /: ${redirect.destination}`);
  }
}

const hashes = new Map();

for (const file of mdxFiles) {
  const content = readFileSync(file, 'utf8');
  const frontmatterEnd = content.startsWith('---\n')
    ? content.indexOf('\n---', 4)
    : -1;
  const frontmatter = frontmatterEnd >= 0 ? content.slice(4, frontmatterEnd) : '';

  if (!frontmatter) fail(file, 'missing frontmatter');
  if (!/^title:\s*.+$/m.test(frontmatter)) fail(file, 'missing title');
  if (!/^description:\s*.+$/m.test(frontmatter)) fail(file, 'missing description');
  if (/^##\s*$/m.test(content)) fail(file, 'contains an empty heading');
  if (/\bGithub\b/.test(content)) fail(file, 'use GitHub');
  if (/\bNpm\b/.test(content)) fail(file, 'use npm');

  const links = [
    ...content.matchAll(/href\s*=\s*["']([^"']+)["']/g),
    ...content.matchAll(/\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g),
  ];

  for (const match of links) {
    const target = match[1];
    if (/^(https?:|mailto:|tel:|#|cursor:|vscode:)/.test(target)) continue;
    if (!target.startsWith('/')) {
      fail(file, `internal link must be root-relative: ${target}`);
      continue;
    }

    const localTarget = target.split('#')[0].split('?')[0];
    if (!localTarget || localTarget === '/llms.txt' || localTarget === '/llms-full.txt') {
      continue;
    }
    const candidate = resolve(root, `.${localTarget}`);
    if (
      !existsSync(candidate) &&
      !existsSync(`${candidate}.mdx`) &&
      !existsSync(join(candidate, 'index.mdx'))
    ) {
      fail(file, `local link target does not exist: ${target}`);
    }
  }

  for (const match of content.matchAll(/alt=["']([^"']*)["']/g)) {
    const alt = match[1].trim();
    if (!alt) fail(file, 'image has empty alternative text');
    if (/^[\d_ .-]+(?:jp|png|jpe?g|svg)?$/i.test(alt)) {
      fail(file, `image alternative text looks like a filename: ${alt}`);
    }
  }

  const normalized = content.trim();
  const hash = createHash('sha256').update(normalized).digest('hex');
  const duplicate = hashes.get(hash);
  if (duplicate) {
    fail(file, `duplicates ${relative(root, duplicate)}`);
  } else {
    hashes.set(hash, file);
  }
}

if (failures.length > 0) {
  console.error(`Documentation content checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Documentation content checks passed for ${mdxFiles.length} pages and ${navigationRoutes.size} navigation routes.`,
);
