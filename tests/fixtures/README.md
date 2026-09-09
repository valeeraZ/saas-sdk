# Frozen Portal compatibility fixture

`portal-baseline.tar` contains only `apps/portal`, `packages/registry-cache`, the root `tsconfig.json` and baseline lockfile from private repository `valeeraZ/portal-multiapps`, commit `8cdc9ae56381dcbde8b8d3c965a75a918897896c`.

This is immutable test input, not a second Portal implementation or an ownership transfer. No .env, node_modules, .next or source checkout Git state is included. The archive and every file are SHA-256 checked against `portal-baseline.json` before use. The fixture lets CI run without source-repository credentials or a sibling checkout.

To reproduce the archive, from the SDK repository with a read-only source checkout path:

```sh
git -C "$BASELINE_REPOSITORY" archive --format=tar 8cdc9ae56381dcbde8b8d3c965a75a918897896c apps/portal packages/registry-cache tsconfig.json package-lock.json > /tmp/portal-baseline.tar
```

Do not regenerate this fixture from HEAD or edit Portal code inside it to make SDK tests pass. Future baseline changes require a new commit, provenance metadata and compatibility review.

The test extracts into a fresh temporary directory, packages the old registry-cache there (it is Portal-owned test support, not an SDK deliverable), deletes its source checkout, installs all SDK tarballs, and builds/types-checks the original Portal. Only package install references, the tsconfig inheritance location, and Next-generated declarations change in the isolated Portal. Every other original Portal file is hash-checked after building. No workspace SDK links remain.
