# Namespace Documentation

This repository contains the documentation for [Namespace](https://namespace.ninja), a platform for ENS subname management and development tools.

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview the documentation changes locally:

```
npm i -g mint
mint dev
```

## Publishing Changes

Install our Github App to auto propagate changes from your repo to your deployment. Changes will be deployed to production automatically after pushing to the default branch.

## Pre-deployment Checklist

### ✅ 1. Run Locally
- [ ] Run `mint dev` and verify the site loads correctly
- [ ] Test navigation links and assets

### ✅ 2. Check docs.json Configuration
- [ ] Confirm navigation paths match file structure
- [ ] Check new files are referenced in navigation

### ✅ 3. Review Redirects
- [ ] Check if existing redirects will be affected
- [ ] Add redirects for moved/renamed pages
- [ ] Test redirects locally