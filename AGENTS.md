# AGENTS.md

This file is for agentic coding assistants working in `vite-plugin-istanbul`.
Follow repository conventions exactly unless the user explicitly asks otherwise.

## Project Snapshot

- Package manager: `pnpm` (lockfile: `pnpm-lock.yaml`)
- Runtime baseline: Node from `.node-version` (`v24.14.0`)
- Language: TypeScript (`strict: true`)
- Build tool: `unbuild`
- Primary source directory: `src/`
- Output directory: `dist/`
- CI currently validates build only (no test job configured)

## Setup Commands

- Install dependencies: `pnpm install --frozen-lockfile`
- Prepare git hooks (normally automatic after install): `pnpm run prepare`
- Verify Node version: `node -v`

## Build, Lint, Test Commands

### Build

- Standard build: `pnpm run build`
- Dev/stub build: `pnpm run dev`
- Prepublish path: `pnpm run prepublishOnly` (runs build)

### Lint / Formatting

- Lint check (no writes): `pnpm run lint` (`ultracite check`)
- Lint + autofix: `pnpm run lint:fix` (`ultracite fix`)
- Format whole repo: `pnpm run format` (`oxfmt`)
- Format check (CI-friendly): `pnpm run format:check` (`oxfmt --check`)
- Pre-commit hook runs `pnpm exec ultracite fix`

### Tests

- There is currently no test script in `package.json`.
- There are currently no `test/` or `tests/` directories in this repo.
- CI (`.github/workflows/build.yml`) does not execute tests.

### Running a Single Test (Important)

- Not available right now because no test framework is configured.
- If you add a test framework, add both of these scripts immediately:
  - A full suite command (example: `test`)
  - A single-test command by file/name (example patterns below)
- Example patterns for future use (do not assume they exist yet):
  - Vitest file: `pnpm vitest run path/to/file.test.ts`
  - Vitest by test name: `pnpm vitest run -t "name"`

## CI/CD and Release Workflow

- PR workflow (`.github/workflows/build.yml`): install deps + `pnpm run build`
- Push workflow (`.github/workflows/deploy.yml`): install deps + build + `pnpm dlx semantic-release`
- Release branch targets: `main`, `next`
- Required release env vars in CI: `GITHUB_TOKEN`, `NPM_TOKEN`

## Commit and Hook Rules

- Commit messages are validated by Husky `commit-msg` hook:
  - `pnpm dlx commitlint --edit ${1}`
- Commitlint extends `@commitlint/config-conventional`
- Follow Conventional Commits / Angular-style types:
  - `build`, `ci`, `docs`, `break`, `feat`, `fix`, `perf`, `refactor`, `style`, `test`
- Keep subject imperative and lowercase start, no trailing period.

## Code Style: Formatting and Layout

Formatting is Oxfmt-driven; do not hand-format against these rules.

- Indentation: 2 spaces
- Line endings: LF
- Charset: UTF-8
- Final newline: required
- Trim trailing whitespace (except Markdown)
- Preferred max line length: 80 (`.editorconfig`)
- Semicolons: required
- Strings: single quotes by default
- Trailing commas: ES5 style
- Arrow functions: always include parens
- Bracket spacing: enabled

## Import Rules

Imports should stay clear and stable; do not churn import order unnecessarily.

- Order block 1: third-party packages
- Order block 2: local imports (`^[./]`)
- Keep one blank line between import groups
- Avoid manual import-order churn unless touching nearby imports
- Use `import type` for type-only imports when applicable

## TypeScript Rules

- Keep `strict`-mode compatible code
- Prefer explicit interfaces for public plugin options and external contracts
- Use narrow unions for options where known
- Avoid `any`; if unavoidable, constrain scope and document reason in code review notes
- Preserve declaration output compatibility (`declaration` and `declarationMap` are enabled)
- Keep module output compatible with existing build config and exports map

## Naming and API Conventions

- Constants: `UPPER_SNAKE_CASE` for true constants (`PLUGIN_NAME`, etc.)
- Functions and variables: `camelCase`
- Types/interfaces: `PascalCase`
- Keep plugin-facing option names stable and descriptive
- Favor descriptive booleans (`requireEnv`, `checkProd`, `forceBuildInstrument`)

## Error Handling and Logging Conventions

- Prefer graceful plugin behavior over hard throws for config usability issues
- Use Vite logger (`createLogger`) for user-facing warnings
- Include actionable warning text when auto-correcting config
- In middleware, pass unexpected errors to `next(error)` rather than swallowing
- Preserve existing behavior around source-map safety and instrumentation gating

## Source-Map and Instrumentation Guardrails

- Do not remove sourcemap enforcement logic without replacement
- Preserve checks for:
  - build vs serve mode
  - SSR transforms
  - Vite internal/module-prefixed IDs
  - Vue SFC chunk handling (`src/vue-sfc.ts`)
- Maintain compatibility with nyc include/exclude/extension behavior

## Repository-Specific Practices

- Prefer minimal, focused changes; avoid opportunistic refactors
- Keep README/API docs in sync when changing plugin options or behavior
- Update ambient type declarations in `src/types.d.ts` when dependency API typing changes
- Keep external dependency additions intentional; this is a library package

## Cursor / Copilot Rules

Checked for additional AI-assistant rule files:

- `.cursorrules`: not present
- `.cursor/rules/`: not present
- `.github/copilot-instructions.md`: not present

If any of these files are later added, treat them as higher-priority agent instructions and merge them into this document.

## Safe Agent Workflow for This Repo

When asked to implement a change, default sequence:

1. Read relevant files under `src/` and config files.
2. Implement minimal code edits.
3. Run `pnpm run format`.
4. Run `pnpm run lint` and `pnpm run format:check`.
5. Run `pnpm run build`.
6. If tests are introduced later, run full tests and single-test target.
7. Summarize behavior changes and any follow-up documentation updates.
