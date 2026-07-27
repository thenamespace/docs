# Namespace documentation improvement report

Date: 2026-07-14
Repository: `namespace-docs`

## Executive summary

This update improves the documentation's technical accuracy, reader journeys, accessibility, editorial consistency, and contributor workflow. The documentation now has 78 published MDX pages, and every page has a matching navigation entry. Runnable TypeScript examples are pinned to supported SDK versions and checked in CI.

No commit, push, or pull request was created.

## Information architecture and navigation

- Reorganized the Overview introduction so readers encounter Getting started, concepts, use cases, the ecosystem, and company context in a deliberate order.
- Added Ecosystem and the RaaS guide to navigation instead of leaving them discoverable only by direct URL.
- Added Troubleshooting to Developer Guide > Getting Started.
- Consolidated seven duplicate, obsolete, or superseded pages:
  - `/quickstart` → `/developer-guide/quickstart`
  - `/overview/namespace-onchain-subnames` → `/developer-guide/architecture/onchain-subnames`
  - `/overview/offchain-subnames` → `/overview/subnames#offchain-subnames`
  - `/user-guide/overview` → `/getting-started`
  - `/user-guide/app/wizard` → `/user-guide/app`
  - `/user-guide/app/features-list` → `/user-guide/app`
  - `/user-guide/app/widget` → `/user-guide/ens-widget`
- Updated older redirect destinations that still pointed to the retired wizard, feature-list, or architecture pages.
- Fixed the redirect for `/how-to-guides-and-demos`, whose destination did not start with `/`.
- Standardized internal documentation links on root-relative routes without `.mdx` suffixes.

## Reader journey and content changes

- Rewrote `getting-started.mdx` around three reader intents: product integration, no-code onchain management, and offchain issuance.
- Added a concise L1/L2/offchain comparison table covering cost, ownership, and starting workflow.
- Rebuilt the Developer quickstart as an actual runnable offchain workflow instead of a directory of product cards.
- Rewrote About Namespace to explain products and ENS context without repeating use-case lists or embedding changing traction numbers.
- Rewrote the product-team page around product patterns, model selection, integration paths, and production planning.
- Rewrote the SDK and API product page as a practical interface-selection guide.
- Rebuilt the subname concepts page with a direct comparison of L1, L2, and offchain control models.
- Added a troubleshooting guide for authentication, availability, record validation, mint eligibility, transaction simulation, resolution, RPC errors, and support requests.
- Removed repeated use-case lists from overview pages and linked to one canonical Use cases page.

## Technical documentation corrections

### Offchain Manager

- Added missing `await` calls to asynchronous examples.
- Corrected `addAddressRecord`, `deleteAddressRecord`, `addTextRecord`, `deleteTextRecord`, `addDataRecord`, and `deleteDataRecord` examples to use the positional signatures exported by version 1.0.13.
- Corrected `parentNames` from `string` to `string[]`.
- Replaced incomplete addresses with valid example Ethereum addresses where compilation matters.
- Removed a duplicate client-initialization block from the offchain tutorial.
- Pinned tutorial installation commands to `@thenamespace/offchain-manager@1.0.13`.
- Added explicit environment-variable validation and server-side credential guidance.

### Mint Manager

- Rebuilt the L1/L2 minting guide around the package API exported by version 1.1.1.
- Fixed the incorrect `BASE_ID` import and validated the RPC URL and wallet private key before use.
- Removed the duplicated Base address record.
- Corrected mint records from object maps to the exported arrays of `{ key, value }` and `{ chain, value }`.
- Corrected `expiryInYears: number` to a concrete numeric example.
- Added both L1 and L2 availability examples.
- Added eligibility, pricing, parameter generation, simulation, submission, and troubleshooting stages.
- Documented the published v1.1.1 `cursomRpcUrls` spelling so readers are not given a configuration property rejected by the package type.
- Pinned tutorial installation commands to `@thenamespace/mint-manager@1.1.1`.

### API reference

- Added descriptive frontmatter to all 15 OpenAPI-backed operation pages so every page has a useful search and SEO description.

## Type-checked examples

Added complete examples under `examples/`:

- `examples/offchain-subnames.ts`
- `examples/mint-subname.ts`
- `examples/tsconfig.json`

The examples compile in strict mode against the exact SDK and Viem versions pinned in `package.json`. CI runs `npm run check:examples` to catch future package and documentation drift.

## Editorial refresh

- Applied a repository-wide clarity, voice, specificity, and proof sweep.
- Standardized `web3`, `GitHub`, `npm`, `app`, `offchain`, `onchain`, and lowercase `subname` in body copy.
- Converted title-case and bolded headings to sentence case where touched.
- Replaced promotional descriptions such as “easiest” and “production-ready” with concrete outcomes.
- Removed or qualified unsupported claims such as “works everywhere,” “100% unruggable,” “no phishing,” and “fully resolvable across web3.”
- Replaced copied traction figures with a link to the live Namespace statistics dashboard.
- Removed unowned “coming soon” language.
- Clarified that Mint Manager prepares signed parameters offchain while the ownership change occurs in an onchain transaction.
- Improved weak and filename-based image alternative text with descriptions of the visual content.

## Accessibility

- Changed the primary color from `#16A34A` to `#15803D`.
- Improved the primary-on-light contrast ratio from 3.30:1 to 5.02:1, meeting WCAG AA.
- Verified that every checked image and video has alternative text.
- Added a content check that rejects empty or filename-like image alternative text.

## Contributor workflow

Added:

- `.nvmrc` pinned to Node.js 22.
- `package.json` and `package-lock.json` with exact tool and SDK versions.
- Local scripts for development, build validation, link checks, accessibility, content checks, and example compilation.
- `.github/workflows/docs-quality.yml` to run the complete quality suite on relevant pushes and pull requests.
- `CONTRIBUTING.md` with setup, authoring, example, and review instructions.
- `STYLE_GUIDE.md` with voice, terminology, heading, code, link, claim, and freshness rules.
- `templates/documentation-page.md` for new task-based guides.
- `scripts/check-docs.mjs`, which checks:
  - one-to-one navigation coverage;
  - missing navigation files;
  - frontmatter titles and descriptions;
  - redirect formatting;
  - root-relative internal links and local targets;
  - empty headings;
  - terminology errors;
  - weak alternative text; and
  - exact duplicate MDX pages.

The README now uses the pinned local toolchain instead of a global Mintlify installation and documents the complete quality command.

## Repository cleanup

- Removed seven duplicate or obsolete MDX pages after adding redirects.
- Removed 15 confirmed unreferenced image assets totaling 5,499,354 bytes, approximately 5.24 MiB.
- The removed assets included duplicate `Frame1000002828` files, retired ENS Widget screenshots, unused starter screenshots, old logo copies, and superseded L2 diagrams.
- Added `.gitignore` rules for dependencies, Mintlify working files, build output, coverage, and macOS metadata.

## Validation results

All required checks pass:

| Check | Result |
| --- | --- |
| Mintlify build validation | Passed |
| Mintlify broken-link check | Passed; no broken links found |
| Mintlify accessibility check | Passed; WCAG AA contrast achieved and all media has alt text |
| Custom content and navigation check | Passed for 78 pages and 78 navigation routes |
| Strict TypeScript example compilation | Passed |
| Git whitespace check | Passed after cleanup |
| Production dependency audit | Passed; 0 production vulnerabilities |
| Local preview smoke test | Passed with HTTP 200 for the home page, Getting started, Developer quickstart, Troubleshooting, and L1/L2 minting guide |

## Non-blocking observations

- Mintlify reports the primary color as a warning because it does not reach the stricter WCAG AAA threshold. It meets the requested WCAG AA threshold at 5.02:1.
- The installed documentation toolchain contains 12 moderate advisories in development-only transitive dependencies. `npm audit --omit=dev` reports 0 production vulnerabilities. No force upgrade was applied because that could replace the pinned Mintlify toolchain with breaking versions.
- Mintlify does not support the machine's global Node.js 25 runtime. The repository now pins Node.js 22, and validation is run with Node.js 22.
- During hot reload, the Mintlify CLI intermittently logs an internal `transformAlgorithm` TypeError, but it continues serving the preview and all requested routes return HTTP 200. Strict build validation also passes.

## Local preview

The documentation was kept running during implementation at:

`http://localhost:4323`

No deployment or remote repository operation was performed.
