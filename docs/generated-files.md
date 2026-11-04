# Every generated file

What `project-foundation init` can write, one table per module, and when each file appears. About forty files for a typical project;
the rest depend on your answers. A file that already exists in your repository is never overwritten.

This page is generated from the tool's own manifest, so a file the tool writes cannot be missing from it:
`node scripts/docs.mjs write` rebuilds it.

## agent-instructions

One AGENTS.md that every agent reads, with thin adapters for Claude Code, Gemini CLI and GitHub Copilot.

| File | What it is | When |
| --- | --- | --- |
| `AGENTS.md` | The single source of the rules for every coding agent: workflow, working agreements, conventions, commands. Fill in its "Code conventions" section. | always |
| `CLAUDE.md` | One line, `@AGENTS.md`, that makes Claude Code read the shared rules. Room below it for Claude-only notes. | always |
| `GEMINI.md` | One line, `@./AGENTS.md`, that makes Gemini CLI read the shared rules. Room below it for Gemini-only notes. | always |
| `.github/copilot-instructions.md` | A short, self-contained digest of the rules for Copilot (which does not expand imports). Kept under about 4,000 characters. | always |
| `.github/instructions/tests.instructions.md` | Short Copilot rules that apply only to test files (matched by an `applyTo` pattern). | always |
| `.github/instructions/docs.instructions.md` | Short Copilot rules that apply only to documentation files. | always |
| `<component folder>/AGENTS.md` | The component's own commands and conventions. Agents working in that folder read it as well as the root file. | a monorepo; once per component |
| `<component folder>/CLAUDE.md` | Imports the component's `AGENTS.md` for Claude Code. | a monorepo; once per component |
| `<component folder>/GEMINI.md` | Imports the component's `AGENTS.md` for Gemini CLI. | a monorepo; once per component |
| .github/instructions/<component>.instructions.md` | Short Copilot rules for the component's folder. | a monorepo; once per component |

## community

README, CONTRIBUTING with the workflow drawing, SECURITY, SUPPORT, CODE_OF_CONDUCT, LICENSE, ROADMAP, editor and ignore files.

| File | What it is | When |
| --- | --- | --- |
| `README.md` | A skeleton README. If you already have one, yours is kept and this one is not written. | always |
| `CONTRIBUTING.md` | The workflow from need to release as a drawing, a "what do I do" table, what is checked where, and the commit rules. | always |
| `SECURITY.md` | How to report a vulnerability, and a place to say what the software reaches. | always |
| `SUPPORT.md` | Where to ask for help, and what to include in a bug report. | always |
| `CODE_OF_CONDUCT.md` | The Contributor Covenant 2.1, with your contact. | always |
| `LICENSE` | The MIT licence, with the year and your name. | an MIT licence |
| `ROADMAP.md` | Ideas, not promises: next, later, and set aside with the reason. | always |
| `.editorconfig` | Editor settings (indentation, line endings), with a section where a component's indentation differs. | always |
| `.gitignore` | Your file gains the lines the stack needs (build folders, `.env`); lines of yours are never removed. | always |
| `<component folder>/.nvmrc` | Pins the Node version for the component, read by CI and by version managers. | a Node component; once per component |
| `<component folder>/rust-toolchain.toml` | Pins the Rust channel with rustfmt and clippy, read by CI and by rustup. | a Rust component; once per component |
| `<component folder>/.python-version` | Pins the Python version for the component, read by CI and by version managers. | a Python component; once per component |

## decisions

The path from idea to release (docs/EVOLVING.md), an architecture skeleton, and architecture decision records with a template and two seed records.

| File | What it is | When |
| --- | --- | --- |
| `docs/EVOLVING.md` | The path every change follows, from idea to release, step by step. | always |
| `docs/ENGINEERING.md` | A skeleton for how the project is built: overview, layout, rules the code enforces, services. | always |
| `docs/adr/README.md` | The index of decision records. | always |
| `docs/adr/template.md` | The template for a new decision record. | always |
| `docs/adr/0001-record-architecture-decisions.md` | Why decisions are recorded. | always |
| `docs/adr/0002-conventional-commits-and-automated-releases.md` | Why commits and pull request titles follow Conventional Commits. | always |
| `docs/adr/0003-one-agent-instruction-file.md` | Why `AGENTS.md` is the single source and the other agent files only point to it. | always |

## github

Pull request template, issue templates, CODEOWNERS, Dependabot.

| File | What it is | When |
| --- | --- | --- |
| `.github/pull_request_template.md` | The pull request description: summary, decision, what was verified, what was not, a checklist. | always |
| `.github/ISSUE_TEMPLATE/bug_report.md` | The bug report form. | always |
| `.github/ISSUE_TEMPLATE/feature_request.md` | The feature request form. | always |
| `.github/ISSUE_TEMPLATE/config.yml` | Turns off blank issues and points vulnerability reports to the private advisory page. | always |
| `.github/CODEOWNERS` | Who reviews what: you for everything, and an owner per component when you named one. | always |
| `.github/dependabot.yml` | Weekly dependency updates, one entry per component folder, with pull request titles that pass the commit rules. | Dependabot on |

## ci

One CI workflow with a job per component and a single required check, the pull request title check, CodeQL.

| File | What it is | When |
| --- | --- | --- |
| `.github/workflows/ci.yml` | CI: a job per component that runs only when its folder changed, the commit-message check, and one final job, `Quality gate`, to make required. | always |
| `.github/workflows/pr-title.yml` | Checks that the pull request title follows Conventional Commits (it becomes the squash commit). | always |
| `.github/workflows/codeql.yml` | CodeQL code scanning, one matrix entry per language. Free on public repositories; needs GitHub Code Security on private ones. | CodeQL on |

## release

release-please: a release pull request with the version and the changelog, from Conventional Commits.

| File | What it is | When |
| --- | --- | --- |
| `.github/workflows/release.yml` | release-please: keeps a release pull request up to date with the version and the changelog. | release automation on |
| `release-please-config.json` | release-please settings: one package per component, changelog sections. | release automation on |
| `.release-please-manifest.json` | The current version of each package, which release-please updates. | release automation on |

## hooks

Tool-neutral git hooks (Conventional Commits, quality before push) and the same commit check for CI.

| File | What it is | When |
| --- | --- | --- |
| `.githooks/commit-msg` | Refuses a commit message that is not a Conventional Commit (and, if you chose, one with an attribution trailer). | always |
| `.githooks/pre-commit` | Refuses a commit on the default branch (the very first commit excepted). | always |
| `.githooks/pre-push` | Refuses a push to the default branch, then runs the quality gate (`quality.sh --changed` in a monorepo). | always |
| `scripts/conventional-commit-check.sh` | The commit-message rule, written once; used by the hook and by CI. | always |
| `scripts/check-commit-messages.sh` | Runs that rule over every commit of a pull request, for CI. | always |
| `scripts/setup-hooks.sh` | Installs the hooks once per clone (`git config core.hooksPath .githooks`). | always |
| `scripts/quality.sh` | Runs the quality gate of each component, whole or for what a branch changed. | a monorepo |

## spec-driven

Specs as requirements with scenarios, a code map, and the spec-drift reviewer (deterministic checks in CI and in the push hook, an optional local model).

| File | What it is | When |
| --- | --- | --- |
| `scripts` | The spec reviewer: dependency-free Node scripts that check specs against code (`scripts/spec-review.ts` and `scripts/spec-review/`). | spec-driven on |
| `openspec/README.md` | How to write and change a spec, and when a proposal is worth it. | spec-driven on |
| `openspec/code-map.json` | Ties code and test files to the capabilities they implement. | spec-driven on |
| `openspec/spec-template.md` | The template for a new capability spec. | spec-driven on |
| `.github/workflows/specs.yml` | CI for specs: they validate, and a change to code comes with a change to a spec (or the `no-spec` label). | spec-driven on |
| `docs/adr/0004-specs-are-checked-in-ci.md` | Why specs are checked in CI and how drift is detected. | spec-driven on |
| `.env.example` | Settings for the optional local model of the spec review. Appended to, never replaced. | spec-driven on |

## nix

A Nix flake dev shell with the toolchains of every component, and direnv.

| File | What it is | When |
| --- | --- | --- |
| `flake.nix` | A Nix dev shell with the toolchains of every component plus git, gh and jq. | a Nix shell |
| `.envrc` | `use flake`: direnv loads the dev shell when you enter the folder. | a Nix shell |

`.project-foundation.json` is also written: the skill version, your answers and a hash of each file above, so that `upgrade` can tell a
change in the templates from an edit of yours. Commit it. See [Keep it up to date](guides/keep-up-to-date.md).

<!-- docs-nav:start -->
---
**Documentation:** [Start here](./start-here.md) · [Guides](./guides/new-project.md) · [Concepts](./concepts.md) · [Reference](./cli.md) · [Glossary](./glossary.md) · [All pages](./README.md)

← [Command reference](./cli.md) · [Glossary](./glossary.md) →
<!-- docs-nav:end -->
