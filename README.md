# Namespace documentation

This repository contains the documentation for [Namespace](https://namespace.ninja), a platform for ENS subname management and development tools.

## Local development

The repository uses Node.js 22 and a pinned version of the Mintlify CLI. If you use `nvm`, select the correct Node.js version before installing dependencies:

```bash
nvm use
npm ci
npm run dev
```

Open the local URL printed by Mintlify. Changes to MDX files and `docs.json` reload automatically.

## Quality checks

Run the complete documentation test suite:

```bash
npm run check
```

The suite validates the Mintlify build, checks links and accessibility, enforces repository content conventions, and type-checks the SDK examples.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding or moving pages. Writing and terminology conventions live in [STYLE_GUIDE.md](STYLE_GUIDE.md), and new guides should start from [the documentation page template](templates/documentation-page.md).

## Publishing

The Mintlify GitHub App deploys changes from the default branch. Before merging a documentation change:

- Preview it locally.
- Run `npm run check`.
- Confirm new pages appear in `docs.json` navigation.
- Add redirects for moved or retired routes.
- Review screenshots, alternative text, and external links.
