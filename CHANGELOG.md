# Changelog

Versions are the contents of `skills/project-foundation/VERSION`. This file is written by hand.

## 0.3.2

- The command is called `project-foundation` (`my-skills` stays as an alias). New site, README and documentation.

## 0.3.1

- Stage only the files of a task: agents never use `git add -A` or `git commit -a`.
- `skill_in_repo` answer: the installed skill is committed with the repository by default, and its updates are changes of their own.
- `init`, `upgrade` and `status` report files git tracks although `.gitignore` ignores them.

## 0.3.0

- Branch before the first edit: the rules tell an agent to check `git branch --show-current`, branch from the default branch without
  asking, and ask once on another branch. Delivering a change is spelled out (commit, push the branch, open the pull request, never merge).
- `pre-commit` refuses a commit on the default branch (the first commit excepted); `pre-push` refuses a push to it. `ALLOW_DEFAULT_BRANCH=1`
  is the exception; `SKIP_PRE_PUSH` no longer lifts the rule.
- The generated date is frozen at `init`, so `upgrade` stops reporting the decision records as changed.

## 0.2.1

- `upgrade --config … --apply` saves the new answers, so the next `upgrade` does not offer to undo them.
- `.gitignore` is enriched on `init` and on `upgrade` (`.direnv/` and `result` with Nix, `.spec-review/` with spec-driven).

## 0.2.0

- `badges` command.

## 0.1.4

- `init` asks whether the repository is private, and keeps CodeQL only where it can run.

## 0.1.3

- CodeQL workflow gets `actions: read`, needed on private repositories.

## 0.1.2

- The skill always asks before generating, and previews before it writes.

## 0.1.1

- Empty commands and an unset layout no longer leave blank lines or a wrong layout sentence in the rules.

## 0.1.0

- First version: `init`, `status`, `upgrade`; `AGENTS.md` with adapters for Claude, Gemini and Copilot; hooks, CI, CodeQL, Dependabot,
  release-please; one project or a monorepo; optional Nix shell and spec-driven module.
