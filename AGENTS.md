# Working in this repository

Read this before changing anything. It applies to people and to coding agents
(Claude Code, Codex, Gemini CLI, GitHub Copilot, others) alike: this file is the
single source of the rules, and `CLAUDE.md`, `GEMINI.md` and
`.github/copilot-instructions.md` only point here.

## What this is

my-skills: Agent skills. project-foundation bootstraps a repository with one AGENTS.md for every coding agent, hooks, CI and releases.

`README.md` explains the product, `CONTRIBUTING.md` how to contribute,
`docs/ENGINEERING.md` how it is built, `docs/EVOLVING.md` the path every change
follows from idea to release, and `docs/adr/` why it is shaped this way.

## Rules

1. **Branch, then pull request.** Never commit to `main`. Branch names:
   `feat/...`, `fix/...`, `docs/...`, `build/...`, `ci/...`, `chore/...`.
2. **Conventional Commits, strictly.** `<type>(<scope>): <subject>` with the
   types `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`,
   `chore`, `style`, `revert`; kebab-case scope; imperative subject; header at
   most 100 characters, body lines at most 120; one concern per commit. The
   commit-msg hook and CI reject anything else (`CONTRIBUTING.md`, "Commits").
3. **Decide before coding when the shape of the system changes.** A new
   dependency, data store, service, or a rule that cuts across features gets a
   decision record in `docs/adr/` (read the existing ones first).
4. **Tests with the code.** Deterministic logic gets unit tests; tests never call
   a paid or external service for real.
5. **Quality gate before pushing:** `npm test` must pass.
6. **Docs with the change.** The README when the overview changes,
   `docs/ENGINEERING.md` when the architecture changes, `ROADMAP.md` when an
   idea is done or added, a decision record in `docs/adr/` for a significant
   architectural choice (a record is superseded, never rewritten).
7. **Pull request** with the template: summary, decision and spec, what was
   verified, what was not. The maintainer reviews and merges.
8. **No attribution trailers** or generated-by footers in commits, pull request
   descriptions or comments.

## Starting and delivering a change

Before the first edit of any task, **including running a tool that writes files** (a generator, a formatter, an upgrade
command), look at where you are:

1. Run `git branch --show-current`.
2. **On `main`**: do not edit there. Update it (`git pull --ff-only`), create a branch from it named
   `<type>/<short-topic>` (`feat/`, `fix/`, `docs/`, `chore/`, ...), tell the user its name, and go on. Do not ask first:
   starting a branch is part of the task. Uncommitted changes you find come along to the new branch; say so.
3. **On another branch**: ask once, "You are on `<branch>`: is this the right place for this change, or should I start a new
   branch from `main`?", and keep the answer for the whole task. Do not ask when the user already said where to
   work, or when the change plainly continues the pull request of this branch.

When the work is done and the gate passes: commit (one concern per commit), push **the branch**, never `main`, open the pull
request with the template (`gh pr create`), report its URL, and stop. Never merge it.
**Stage only the files of your task**: `git add <paths>`, never `git add -A` or `git commit -a`. Anything else in the working
tree is not yours: leave it, and mention it to the user.

Git refuses a commit on `main` and a push to it (`ALLOW_DEFAULT_BRANCH=1` for the rare exception), but that is a backstop: by
then the edit is already done. The check above comes first.

## How an agent works here

- **Smallest change that solves the request.** Do not refactor, rename or
  "improve" what was not asked. Say what you noticed and let the owner decide.
- **Verify, then claim.** Run the gate and the relevant tests; report what
  passed, what failed and what you did not run, with the output. Never write
  "done" for something unverified.
- **Ask before anything hard to reverse or visible to others**: pushing to
  `main`, force-pushing, merging, deleting, publishing, spending money, changing
  settings. Pushing your own branch and opening its pull request is part of the
  task (see above), not something to ask about. Approval for one action is not
  approval for the next.
- **Secrets stay secret.** Never read, print, log or commit `.env`, keys or
  tokens. Tests run without real credentials.
- **Hooks and CI are the rules, not obstacles.** Never skip a hook
  (`--no-verify`) or weaken a check to get green; fix the cause, or say why a
  rule should change and propose that in its own pull request.
- **Do not merge your own pull request**, and do not rewrite shared history.
- **Leave a trail.** When a choice was non-obvious, put the reason in the
  commit body or a decision record, not only in a chat.

## Code conventions

- Language and tools: Node.js (ES modules, no build step, no dependencies), POSIX shell for the generated hooks.
- The skill lives in `skills/project-foundation/`: `scripts/` is the engine, `assets/` the templates, profiles and manifest,
  `references/` what an agent reads when it needs detail. The site is `site/`, built by `scripts/build-site.mjs`.
- A template and its test change together; bump `skills/project-foundation/VERSION` when either the engine or a template changes.
- An unknown template variable is an error, never an empty string; an existing file is never overwritten.
- The generated files must say the same thing everywhere: change a rule in `AGENTS.md`, `CONTRIBUTING.md`, the Copilot digest and the
  hook that enforces it in the same commit.

## Useful commands

```
npm test    # the gate
npm test       # tests only
sh scripts/setup-hooks.sh   # install the git hooks (once per clone)
```
