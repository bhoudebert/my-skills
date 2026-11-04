# Command reference

```
project-foundation <command> [options]
```

`my-skills` is an alias of the same command. Every command works on the current folder, or on `--target <folder>`. Without
installing anything: `npx github:bhoudebert/project-foundation <command>`. From a clone: `node skills/project-foundation/scripts/foundation.mjs <command>`.

## `init`

Looks at the repository, asks what it cannot see, and writes the files.

| Option | Meaning |
| --- | --- |
| `--config <file>` | use these answers and skip the questions (what an agent does) |
| `--dry-run` | list what would be written; write nothing |
| `--modules a,b` | only these modules (see `list`) |
| `--force` | overwrite files that exist |
| `--yes` | do not ask for confirmation |
| `--interactive` | ask even with no terminal attached; answers are read from standard input |

Writes `.project-foundation.json` and refuses to run in a repository that already has one: use `upgrade`. Without `--config` and
without a terminal it stops with a message, so a script never hangs.

## `status`

Says which skill version generated the repository, and whether the templates changed since. It also reports files git tracks although
`.gitignore` ignores them. Exit code 1 when the templates changed.

## `upgrade`

Compares the generated files with the current templates. See [Provenance and upgrades](concepts.md#provenance-and-upgrades).

| Option | Meaning |
| --- | --- |
| `--apply` | write the safe changes; leave `<file>.upstream` next to a conflicting file |
| `--set key=value` | change one answer on top of the recorded ones; repeatable (`--set nix=true`); `true`, `false` and numbers are read as such |
| `--config <file>` | render with these answers instead of the recorded ones; with `--apply` they are saved |

Without `--apply` nothing is written. Exit code 1 when a conflict is left to merge.

## `badges`

Prints a row of README badges that can say something true, or writes it with `--apply` between `<!-- badges:start -->` and
`<!-- badges:end -->` under the first title (a later run replaces the block).

| Visibility | Badges |
| --- | --- |
| public | CI, CodeQL (if kept), latest release (if release-please is on), licence |
| private, or unknown | the licence only: the others cannot be drawn for people without access |

`--public` or `--private` states the visibility; otherwise the saved answers are used, then `gh`.

## `list` and `version`

`list` prints the modules and the files each can write. `version` prints the skill's version.

## The answers file

A JSON file with the answers `init` would otherwise ask for. A single project:

```json
{
  "project_name": "Acme Billing",
  "project_slug": "acme-billing",
  "description": "Invoicing for small shops.",
  "owner": "acme",
  "repo": "acme-billing",
  "profile": "java-maven"
}
```

A monorepo, with `components` instead of `profile`:

```json
{
  "project_name": "Acme Platform",
  "project_slug": "acme-platform",
  "description": "API, workers and web app.",
  "owner": "acme",
  "repo": "platform",
  "components": [
    { "name": "api", "path": "services/api", "profile": "rust" },
    { "name": "worker", "path": "services/worker", "profile": "python", "owner": "data-team" },
    { "name": "web", "path": "web", "profile": "node" }
  ]
}
```

**Required:** `project_name`, `project_slug`, `description`, `owner`, `repo`, and `profile` or `components`.
**Profiles:** `node`, `java-maven`, `java-gradle`, `rust`, `python`, `go`, `other`.

**Options** (all optional; true or false unless stated):

| Answer | Default | Meaning |
| --- | --- | --- |
| `maintainer_handle` | the owner | CODEOWNERS and the code of conduct contact |
| `license` | `MIT` | only MIT text is generated |
| `default_branch` | `main` | |
| `release_please` | `true` | release-please workflow and config |
| `codeql` | `true` | CodeQL workflow; left out when the stack has no CodeQL language |
| `dependabot` | `true` | |
| `nix` | `false` | `flake.nix`, `.envrc`, `.direnv/` and `result` in `.gitignore` |
| `spec_driven` | `false` | `openspec/` and the spec reviewer; refused for a monorepo |
| `no_attribution` | `true` | the commit hook rejects attribution trailers |
| `agent_opens_prs` | `true` | agents push their branch and open the pull request |
| `skill_in_repo` | `true` | the installed skill is committed; `false` ignores `.agents/` and `.claude/skills/` |
| `header_max`, `body_max` | `100`, `120` | commit header and body line limits |
| `scopes_example` | per profile | the example scopes shown in CONTRIBUTING |

A **component** takes `name` (kebab-case: it is a commit scope and a CI job name), `path`, `profile`, an optional `owner`, and any
profile value to override it for this component: `runtime_version`, `setup_cmd`, `build_cmd`, `lint_cmd`, `format_cmd`,
`format_check_cmd`, `test_cmd`, `quality_cmd`, `precommit_cmd`, `dependabot_ecosystem`, `codeql_language`, `release_type`,
`src_dir`, `test_dir`, `test_globs`, `gitignore_extra`, `indent_size`, `label`, `nix_packages`. In a single project the same
overrides go at the root.

`quality_cmd` is the one that matters: it must run everything CI should require of the component.

## Environment variables

| Variable | Where | Effect |
| --- | --- | --- |
| `PROJECT_FOUNDATION_NO_GH` | the command | never call `gh` to ask whether the repository is private |
| `ALLOW_DEFAULT_BRANCH=1` | the generated hooks | a one-off exception to "no commit or push on the default branch" |
| `SKIP_PRE_PUSH=1` | the generated pre-push hook | skip the quality gate once (the default-branch rule still applies) |

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | done, or nothing to do |
| 1 | a conflict is left to merge (`upgrade`), the templates changed (`status`), or you declined the confirmation (`init`) |
| 2 | an error: a missing answer, an unknown profile, a repository already set up, a bad option |

<!-- docs-nav:start -->
---
**Documentation:** [Start here](./start-here.md) · [Guides](./guides/new-project.md) · [Concepts](./concepts.md) · [Reference](./cli.md) · [Glossary](./glossary.md) · [All pages](./README.md)

← [Concepts](./concepts.md) · [Every generated file](./generated-files.md) →
<!-- docs-nav:end -->
