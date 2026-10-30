// Keeps every copy of the universal usernames contract in this repository in
// step with one source: snippets/universal-usernames/profile-v1.schema.json.
//
// Fails when:
// - a copy of profile schema v1 (the docs snippet, the adapter template, or any
//   JSON code block titled "Universal Usernames profile v1") differs from it;
// - an example profile in the docs or the template README doesn't validate
//   against it (code blocks whose title says "invalid" or "wrong" are skipped);
// - a code block on the adapter template page that is titled with a template
//   file path differs from that file;
// - the issue codes on the troubleshooting page differ from the
//   ValidationIssueCode enum in the OpenAPI spec.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Ajv2020 } from 'ajv/dist/2020.js';

const root = process.cwd();
const SCHEMA_PATH = 'snippets/universal-usernames/profile-v1.schema.json';
const SCHEMA_SNIPPET = 'snippets/universal-usernames/profile-v1-schema.mdx';
const TEMPLATE_DIR = 'examples/universal-usernames-adapter';
const TEMPLATE_SCHEMA = `${TEMPLATE_DIR}/schema/profile-v1.schema.json`;
const TEMPLATE_PAGE = 'developer-guide/universal-usernames/adapter-template.mdx';
const TROUBLESHOOTING_PAGE = 'developer-guide/universal-usernames/troubleshooting.mdx';
const OPENAPI_PATH = 'openapi/offchain-openapi.json';
const ignoredDirectories = new Set(['.git', 'node_modules', '.mintlify', 'dist']);

const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : walk(path);
    return /\.mdx?$/.test(entry.name) ? [relative(root, path)] : [];
  });
}

// Code fences, including ones indented inside components such as <Step>.
function codeBlocks(content) {
  const blocks = [];
  for (const match of content.matchAll(/^( *)```(\w*)([^\n]*)\n([\s\S]*?)^\1```/gm)) {
    const [, indent, language, meta, body] = match;
    const code = body
      .split('\n')
      .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
      .join('\n');
    blocks.push({ language, title: meta.trim(), code });
  }
  return blocks;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const schema = JSON.parse(read(SCHEMA_PATH));
const validateProfile = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

if (!isDeepStrictEqual(JSON.parse(read(TEMPLATE_SCHEMA)), schema)) {
  failures.push(`${TEMPLATE_SCHEMA}: differs from ${SCHEMA_PATH}`);
}

let snippetShowsSchema = false;
let examplesChecked = 0;

for (const file of walk(root)) {
  for (const block of codeBlocks(read(file))) {
    if (block.language !== 'json') continue;
    const value = parseJson(block.code);
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

    if (value.title === schema.title) {
      if (file === SCHEMA_SNIPPET) snippetShowsSchema = true;
      if (!isDeepStrictEqual(value, schema)) {
        failures.push(`${file}: profile schema v1 differs from ${SCHEMA_PATH}`);
      }
      continue;
    }

    const looksLikeProfile = value.version === 1 && 'username' in value;
    if (!looksLikeProfile || /\b(invalid|wrong)\b/i.test(block.title)) continue;
    examplesChecked += 1;
    if (!validateProfile(value)) {
      const errors = validateProfile.errors
        .map((error) => `${error.instancePath || '/'} ${error.message}`)
        .join('; ');
      failures.push(`${file}: example profile "${block.title}" is not valid schema v1: ${errors}`);
    }
  }
}

if (!snippetShowsSchema) {
  failures.push(`${SCHEMA_SNIPPET}: no JSON code block with the profile schema v1`);
}

for (const block of codeBlocks(read(TEMPLATE_PAGE))) {
  if (!/^(src|tests|schema)\//.test(block.title)) continue;
  const source = join(TEMPLATE_DIR, block.title);
  if (!existsSync(join(root, source))) {
    failures.push(`${TEMPLATE_PAGE}: code block "${block.title}" has no file at ${source}`);
  } else if (read(source).trimEnd() !== block.code.trimEnd()) {
    failures.push(`${TEMPLATE_PAGE}: code block "${block.title}" differs from ${source}`);
  }
}

const issueCodes = JSON.parse(read(OPENAPI_PATH)).components.schemas.ValidationIssueCode.enum;
const documentedCodes = [...read(TROUBLESHOOTING_PAGE).matchAll(/^### `([A-Z_]+)`$/gm)].map(
  (match) => match[1],
);
for (const code of issueCodes.filter((code) => !documentedCodes.includes(code))) {
  failures.push(`${TROUBLESHOOTING_PAGE}: issue code ${code} is not documented`);
}
for (const code of documentedCodes.filter((code) => !issueCodes.includes(code))) {
  failures.push(`${TROUBLESHOOTING_PAGE}: ${code} is not in the ValidationIssueCode enum in ${OPENAPI_PATH}`);
}

if (failures.length > 0) {
  console.error(`Universal usernames contract checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Universal usernames contract checks passed: schema copies match, ${examplesChecked} example profiles are valid, ${issueCodes.length} issue codes are documented.`,
);
