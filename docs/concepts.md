# Concepts

The ideas behind the files, in the order you will meet them.

## One rulebook, thin adapters

Coding agents read different files: Codex and Copilot's agents read `AGENTS.md`, Claude Code reads `CLAUDE.md`, Gemini CLI reads
`GEMINI.md`, and Copilot's code review reads `.github/copilot-instructions.md`. Four copies of the rules drift apart, and an agent
that follows a stale copy breaks the workflow.

So `AGENTS.md` is the only place the rules are written:

| File | What it is |
| --- | --- |
| `AGENTS.md` | the rules, the agent working agreements, the conventions, the commands |
| `CLAUDE.md` | one line, `@AGENTS.md`, plus room for Claude-only notes |
| `GEMINI.md` | one line, `@./AGENTS.md`, plus room for Gemini-only notes |
| `.github/copilot-instructions.md` | a short, self-contained digest, because Copilot does not expand imports |
| `.github/instructions/*.instructions.md` | short path-specific rules (tests, docs, one per component) |

Two limits shape the design: Codex stops reading project instructions at 32 KiB, and Copilot code review reads only the first
~4,000 characters of its file. The tests that guard this repository check both. The reasons are in
[ADR 0003](adr/0003-one-agent-instruction-file.md); the current behaviour of each agent is in
[`references/agent-instructions.md`](../skills/project-foundation/references/agent-instructions.md).

## Enforcement lives in git and CI

An instruction is a request. A hook or a required check is a rule. Anything that has to hold is enforced where every agent and
every person meets it, not in one tool's settings:

| Where | What is enforced |
| --- | --- |
| `commit-msg` | Conventional Commits; no attribution trailers when you chose that |
| `pre-commit` | no commit on the default branch (the repository's first commit excepted) |
| `pre-push` | no push to the default branch; the quality gate, or `quality.sh --changed` in a monorepo |
| CI | the quality gate per component, the commit messages, the pull request title, CodeQL |
| GitHub branch protection | the final rule: required checks, no direct push (you enable it) |

The hooks are POSIX shell, written once, so they behave the same for every stack and every agent. They can be skipped
(`--no-verify`), which is why CI checks the same things again. `ALLOW_DEFAULT_BRANCH=1` is the explicit one-off exception for the
branch guards.

## Branch before the first edit

Hooks cannot see an edit, only a commit. So the rule that keeps work off `main` has to run first, as an instruction. Before the
first edit of any task, including running a generator, an agent checks `git branch --show-current`:

- On the default branch: it creates `<type>/<short-topic>` and carries on, without asking.
- On another branch: it asks once whether that is the right place.

When the work is done and the gate passes, it commits only the files of its task (`git add <paths>`, never `git add -A`), pushes the
branch, opens the pull request with the template, reports the URL and stops. It never merges. You can choose "stop after the
commit" instead of "open the pull request" when you run `init`.

## Provenance and upgrades

`init` writes `.project-foundation.json`: the skill version and source commit, the answers, and a SHA-256 of every file it
generated. That record is what lets `upgrade` be safe. For each generated file it compares three things: the hash recorded at
`init`, the file as it is now, and what the current templates would produce.

| The file is… | The templates… | `upgrade` |
| --- | --- | --- |
| as generated | changed | **updates** it (`--apply`) |
| as generated | the same | nothing to do |
| edited by you | the same | **keeps** it |
| edited by you | changed | **conflict**: your file stays, the new version lands beside it as `<file>.upstream` |
| deleted by you | any | stays deleted |
| not there before | now produce it | **creates** it (`--apply`) |

Files that existed before the foundation was applied (your `README.md`) are yours and are never touched. `.gitignore` and
`.env.example` are only ever added to: lines are appended when the answers need them, and yours are never removed.

To change a choice, run `upgrade --config new-answers.json --apply`: the new answers are saved in the record, so later runs start
from them. A developer who does not use `ruff` changes `quality_cmd` this way, and the rules, the CI and the docs follow together;
editing only the hook would leave them saying `ruff`.

## Monorepos

A repository is a list of components, each with a name, a path and a stack. The shared rules, hooks, decision records and one CI
workflow live at the root. Each component adds its own `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` (agents read the nearest one), a
path-specific Copilot file, a toolchain pin, a CI job, a Dependabot entry and a release package.

CI runs only the components a pull request touches, and one final job, `Quality gate`, waits for them. Make that the only required
check: a path filter on the workflow itself would leave a required check pending forever on a pull request that does not touch its
paths. Locally, `sh scripts/quality.sh --changed` runs the gates of the components a branch changed. Commit scopes are the
component names. [`references/monorepo.md`](../skills/project-foundation/references/monorepo.md) has the design and its limits.

## What it never does

- It never overwrites a file, unless you pass `--force`.
- It never changes git state: it only reads `git ls-files`, to warn about files git tracks although `.gitignore` ignores them.
- It never uses the network, and no model takes part in generating files.
- It never changes GitHub settings. It lists the commands, and you run them.
