# Contributing to Namespace documentation

Thank you for helping improve the Namespace documentation. Documentation changes are deployed from the default branch, so every change should be previewed and validated before it is merged.

## Local setup

1. Install Node.js 22. If you use `nvm`, run `nvm use` from the repository root.
2. Install the pinned dependencies:

   ```bash
   npm ci
   ```

3. Start the local preview:

   ```bash
   npm run dev
   ```

4. Open the local URL printed by Mintlify.

## Quality checks

Run all documentation checks before requesting review:

```bash
npm run check
```

This command validates the Mintlify build, internal links, accessibility, navigation and frontmatter conventions, and the TypeScript examples in `examples/`.

## Adding or moving a page

1. Start with [the documentation page template](templates/documentation-page.md).
2. Add the route to `docs.json` so readers can find it in navigation.
3. If an existing route moves, add a redirect in `docs.json`.
4. Use root-relative internal links such as `/developer-guide/quickstart`.
5. Add a descriptive `title` and `description` to frontmatter.
6. Run `npm run check`.

## Updating code examples

- Use the package versions pinned in `package.json`.
- Keep complete, runnable examples in `examples/` and type-check them with `npm run check:examples`.
- Include prerequisites, environment variables, expected output, and common errors in the accompanying guide.
- Never put a real API key, RPC token, or private key in documentation.

## Editorial conventions

Follow [the Namespace documentation style guide](STYLE_GUIDE.md). Prefer direct, task-oriented language and sentence-case headings. Explain technical terms at first use and qualify security or performance claims.

## Review checklist

- [ ] The page has one clear audience and outcome.
- [ ] Commands and code examples have been tested.
- [ ] Internal links are root-relative and work in the local preview.
- [ ] Images have descriptive alternative text.
- [ ] Product claims are sourced, qualified, or linked to live data.
- [ ] Moved pages have redirects.
- [ ] `npm run check` passes.
