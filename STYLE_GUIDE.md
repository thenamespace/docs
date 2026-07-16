# Namespace documentation style guide

Use this guide for product, developer, API, and changelog documentation.

## Voice

- Be direct, practical, and calm.
- Address the reader as “you.”
- Lead with the outcome, then explain the steps.
- Prefer concrete verbs: “create,” “check,” “mint,” and “resolve.”
- Avoid promotional filler in technical instructions.

## Terminology

Use these forms consistently:

| Preferred | Avoid |
| --- | --- |
| subname, subnames | Subname, Subnames in body copy |
| offchain, onchain | Offchain, Onchain in body copy |
| web3 | Web3, web 3 |
| app | dApp, Dapp; use “decentralized app” when the distinction matters |
| GitHub | Github |
| npm | Npm |
| mainnet, testnet | Mainnet, Testnet unless part of a proper name |
| API key | API Key in body copy |

Keep official product names capitalized: Namespace App, Offchain Manager, Mint Manager, Indexer Manager, ENS Components, ENS Widget, and Resolvio.

## Headings and titles

- Use sentence case: “Create an offchain subname,” not “Create an Offchain Subname.”
- Use “How to,” not “How To.”
- Do not add bold formatting inside headings.
- Give every section a descriptive heading; do not use empty headings.

## Page subtitles

- Treat the frontmatter `description` as the subtitle below the page title.
- Keep it to one short line, usually 5–10 words.
- Use it to frame the page; do not repeat the first paragraph.
- Put scope, mechanics, examples, and qualifications in the introduction.

## Procedures

- State the result in the introduction.
- List prerequisites before the steps.
- Use numbered steps for ordered work.
- Put one action in each step.
- Show expected output after commands when it helps readers verify progress.
- End with next steps and troubleshooting links.

## Code

- Prefer TypeScript for SDK examples.
- Use single quotes in TypeScript unless an existing project standard requires otherwise.
- Await every Promise.
- Validate required environment variables before use.
- Use obvious placeholders such as `YOUR_NAMESPACE_API_KEY`; never use real credentials.
- Pin major package versions in reproducible tutorials. Reference pages may show the currently supported version from `package.json`.
- Keep examples in the docs aligned with the type-checked files in `examples/`.

## Links and images

- Use root-relative internal routes: `/developer-guide/quickstart`.
- Do not include `.mdx` in links.
- Use descriptive link text instead of “click here.”
- Describe the useful information in image alternative text. Do not use a filename as alternative text.

## Claims and evidence

- Avoid absolute security claims such as “prevents phishing.” Say what a feature helps reduce.
- Link technical protocol claims to primary sources.
- Add an “as of” date to changing metrics, or link to a live dashboard instead of copying the number.
- Do not use “leading,” “best,” or “industry-leading” without independent evidence.

## Freshness

- Review product pages every quarter.
- Review SDK and API pages when packages or OpenAPI specifications change.
- Review evergreen concepts at least annually.
- Remove “coming soon” promises unless they have an owner and a planned release.
