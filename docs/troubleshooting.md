# Troubleshooting

The problems people actually hit, with the cause and the way out.

## The pre-push hook fails right after `init`

You see `Missing script: quality`, `could not find Cargo.toml`, or `ruff: command not found`.

**Cause.** The hook runs your quality gate, and the gate needs the stack's tools and manifests. A new repository has neither yet.

**Fix.** Give the project its manifest and a first test (see
[`references/stacks.md`](../skills/project-foundation/references/stacks.md)). Until then, `SKIP_PRE_PUSH=1 git push` skips the
gate once. The default-branch rule still applies.

## `ruff: command not found` (or `pytest`, `cargo`, …) from a normal shell

**Cause.** The gate runs in whatever environment git runs in. If your tools are in a Nix shell, a virtualenv or a version manager
that your shell loaded but git's environment did not (a GUI, a different terminal), they are not on `PATH`.

**Fix.** Enter the environment first: `direnv allow`, `nix develop`, or activate the virtualenv. The hook is a convenience: CI runs
the same gate and is the rule.

## CodeQL fails with "Code scanning is not enabled for this repository"

**Cause.** The repository is private. Code scanning is free for public repositories and needs GitHub Code Security (paid) on a private
one, which is not sold to every account type.

**Fix.** Remove `.github/workflows/codeql.yml` (or answer `codeql: false`), make the repository public, or move it to an organisation
with Code Security. Do not use GitHub's "Set up → Advanced": it would add a second workflow beside ours. `init` asks about this.

## CodeQL fails with "Resource not accessible by integration"

**Cause.** On a private repository the CodeQL action also needs `actions: read`. Versions 0.1.3 and later of the skill generate it;
an older workflow lacks it. Run `upgrade` to bring the workflow up to date.

## `upgrade` lists a file as a conflict

**Cause.** You edited the file and the templates changed too. Nothing was overwritten: your version is in place and the new one is
next to it as `<file>.upstream`.

**Fix.** Merge what you want from `<file>.upstream` into your file, then delete it. If your edit was a deliberate change of a
choice (say, a different quality gate), change the answer instead: `upgrade --config answers.json --apply` updates the rules, the CI
and the docs together and saves the answer.

## `status` says the templates changed, but `upgrade` finds nothing

The recorded hash is of the templates as a whole; a change that does not alter any file you have (a stack you do not use) moves it
without touching your files. Run `upgrade --apply` once and it is recorded as current.

## `git status` is noisy with generated or tool files

`status` and `init` report files git tracks although `.gitignore` ignores them, with the command to untrack them:

```bash
git rm -r --cached .spec-review     # stays on disk; stops being tracked
```

An ignore line never untracks a file that is already tracked. If the installed skill (`.agents/`, `.claude/skills/`,
`skills-lock.json`) shows as modified after `npx skills update`, that is the update: commit it on its own branch
(`chore/update-project-foundation`), or answer `skill_in_repo: false` and untrack it.

## An agent edits on `main`

The rule that prevents it is an instruction in `AGENTS.md`: check the branch before the first edit. An agent that never read the
file cannot follow it, and git can only refuse at commit and push (`ALLOW_DEFAULT_BRANCH=1` is the exception). The real enforcement is
GitHub branch protection, which you enable: see
[`references/github-settings.md`](../skills/project-foundation/references/github-settings.md). On a private repository it needs a paid plan.

## The skill is not found in my agent

- A project install (`npx skills add …`) is available where the agent was started, not in other folders. Install with `-g` for
  every project, or install in the repository you work in.
- A running session may not reload skills. Start a new session, and check the version on disk:
  `cat .claude/skills/project-foundation/VERSION`.
- Codex, Copilot and Gemini read instruction files at session start; start a new session after changing them.

## `npx skills check` says nothing to update for a local clone

It only checks skills installed from a remote source. Run `npx skills add bhoudebert/project-foundation` to install from GitHub, then
`check` and `update` work.

## The first commit is refused on `main`

It should not be: the pre-commit hook allows the very first commit of a repository. If the repository already has commits, create a
branch (`git switch -c chore/…`) or use `ALLOW_DEFAULT_BRANCH=1 git commit …` once.

## Still stuck

Open an [issue](https://github.com/bhoudebert/project-foundation/issues) with the output of `project-foundation status`, your answers
(from `.project-foundation.json`, without anything private) and what you ran.

<!-- docs-nav:start -->
---
**Documentation:** [Start here](./start-here.md) · [Guides](./guides/new-project.md) · [Concepts](./concepts.md) · [Reference](./cli.md) · [Glossary](./glossary.md) · [All pages](./README.md)

← [Glossary](./glossary.md) · [Stacks: what the project must provide, and how to add one](../skills/project-foundation/references/stacks.md) →
<!-- docs-nav:end -->
