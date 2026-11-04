# Add it to a repository you already have

**Use this when** the repository has history, files and maybe its own CONTRIBUTING, CI or hooks. You want the shared rules without
losing anything.

## What is guaranteed

- An existing file is **never overwritten**. It is skipped and listed, so you can merge by hand.
- `.gitignore` only **gains** the lines it lacks. Your lines stay where they are.
- Your README is never replaced.
- Nothing is committed. You review everything with `git status` and `git diff` first.

## 1. Work on a branch

```bash
git switch main && git pull
git switch -c chore/project-foundation
```

The rules this project installs ask every agent to branch before editing; do the same.

## 2. Preview, and read the skipped list

```bash
npx github:bhoudebert/my-skills init --dry-run
```

Three lists matter:

| List | Meaning |
| --- | --- |
| **would be created** | new files |
| **would be merged into** | `.gitignore` (and `.env.example` with spec-driven): lines are appended |
| **already exist and were left alone** | your files. Decide what to do with each one after the run |

## 3. Generate

```bash
npx github:bhoudebert/my-skills init
```

It detects your stacks from your manifests (`package.json`, `Cargo.toml`, `pom.xml`, `build.gradle`, `pyproject.toml`, `go.mod`) and
your owner and repository from `git remote`. If it finds stacks in several folders, it treats the repository as a
[monorepo](monorepo.md) and asks you to name each component.

## 4. Reconcile the files it left alone

For each skipped file, compare it with what the templates would give you: copy the template's content (in a scratch repository, or from
the [file list](../generated-files.md)) and merge what you want. Typical cases:

- **Your `README.md`**: keep it. Add the badges with `project-foundation badges --apply` if you like.
- **Your CI workflow**: keep yours, or replace it with the generated `ci.yml` (one job per component and one required check,
  `Quality gate`). Re-run with `--force` only on a file you have not changed.
- **Your hooks** (husky, lefthook, a `pre-commit` config): the generated hooks live in `.githooks/` and are installed by
  `sh scripts/setup-hooks.sh`, which sets `core.hooksPath`. Choose one mechanism; do not run both.

## 5. Make the gate real

The gate is the one command CI and the pre-push hook run. For an existing project it is probably a script you already have. If the
generated command does not fit, set the right one:

```bash
project-foundation upgrade --set quality_cmd="make check"           # preview
project-foundation upgrade --set quality_cmd="make check" --apply   # write, and save the answer
```

(See [change a choice later](keep-up-to-date.md#change-a-choice-later).)

## 6. Check what git tracks

```bash
project-foundation status
```

It tells you if git tracks files that `.gitignore` ignores (a committed `.direnv/`, `.spec-review/`, build output) and gives the
`git rm --cached` command to stop tracking them.

## 7. Commit, push, open the pull request

```bash
sh scripts/setup-hooks.sh
git add -A
git commit -m "chore: bootstrap project foundation"
git push -u origin chore/project-foundation
```

Then [protect main](github-setup.md).

## If something goes wrong

- **The gate fails**: expected until the project's own commands match; see [Troubleshooting](../troubleshooting.md).
- **A tool "is not found" in the pre-push hook**: the hook runs in git's environment; enter your dev shell or virtualenv first.
- **You want to undo it**: delete the files listed in `.project-foundation.json`. Nothing else was changed.

<!-- docs-nav:start -->
---
**Documentation:** [Start here](../start-here.md) · [Guides](./new-project.md) · [Concepts](../concepts.md) · [Reference](../cli.md) · [Glossary](../glossary.md) · [All pages](../README.md)

← [Start a new project](./new-project.md) · [Set up a monorepo with several stacks](./monorepo.md) →
<!-- docs-nav:end -->
