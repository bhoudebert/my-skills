# Getting started

From an empty folder, or an existing repository, to one that every agent and contributor works in the same way.

## Before you start

- Node 22 or later. The generator is a Node script with no dependencies and no network.
- A git repository. It does not have to be on GitHub yet, but the workflows, templates and links assume GitHub.
- Optional: [`gh`](https://cli.github.com), logged in. It lets `init` read whether the repository is public or private.

## 1. Install

The command line needs no install:

```bash
npx github:bhoudebert/project-foundation init
```

To have an agent run it for you, install the skill (a project install is committed with the repository; `-g` makes it available in
every project):

```bash
npx skills add bhoudebert/project-foundation
```

To keep the `project-foundation` command on your `PATH`, run `npm link` in a clone of this repository.

## 2. Preview

From the repository to set up:

```bash
project-foundation init --dry-run
```

It lists every file it would create, merge into or leave alone. Nothing is written. A file that already exists is always left
alone (your `README.md`, your `flake.nix`), and `.gitignore` only gains the lines it lacks.

## 3. Answer, then write

```bash
project-foundation init
```

It looks first: the stacks (a `package.json`, `Cargo.toml`, `pom.xml`, `build.gradle`, `pyproject.toml` or `go.mod`, at the root or
in component folders), your git remote and, with `gh`, whether the repository is public. Then it asks only the rest:

| Question | Why it matters |
| --- | --- |
| Project name, description, owner, repository | the documents and the CI links |
| Is the repository private? | CodeQL is free on a public repository and needs the paid GitHub Code Security on a private one |
| A Nix dev shell? | adds `flake.nix` and `.envrc` |
| Release automation? | release-please opens the release pull request |
| Spec-driven development? | adds `openspec/` and a reviewer that checks specs against code (TypeScript layouts) |
| Should agents open pull requests themselves? | the rules either say "push the branch and run `gh pr create`" or "stop after the commit" |
| Commit the installed skill into the repository? | every contributor gets the skill, and its updates are changes of their own |
| Forbid attribution trailers? | the commit hook rejects `Co-authored-by` and "Generated with" lines |

It prints your answers and asks to confirm before writing. Pass `--config answers.json` to skip the questions
([the answers file](cli.md#the-answers-file)).

## 4. Make the gate real

The generated CI and the pre-push hook run one command, your **quality gate**: `npm run quality`, `./mvnw -B verify`,
`cargo clippy …`, `ruff check . && pytest`, `go vet ./… && go test ./…`. In an empty repository none of that exists yet, so right
after `init` the gate fails, and so does the pre-push hook. That is correct. Give the project its manifest and a first test
([a minimal manifest for each stack](../skills/project-foundation/references/stacks.md)), or skip the hook once with
`SKIP_PRE_PUSH=1 git push`.

## 5. Finish the documents

Every `<!-- … -->` comment in the generated Markdown asks for something only you know: the product status, what a newcomer gets
wrong in this codebase, what the software reaches. Fill the ones you can answer. `grep -rn "<!--" --include="*.md" .` lists them.
A few are meant to stay: the Claude-only and Gemini-only notes under the import line, and the hints in the pull request template.

## 6. Install the hooks, and commit

```bash
sh scripts/setup-hooks.sh
git switch -c chore/project-foundation
git add -A
git commit -m "chore: bootstrap project foundation"
```

Commit `.project-foundation.json`: it is what lets `upgrade` tell a change in the templates from your own edit. Open the pull request.

## 7. What only you can change on GitHub

`init` writes files only. These are yours to set, and the commands are in
[`references/github-settings.md`](../skills/project-foundation/references/github-settings.md):

- Branch protection on the default branch, with `Quality gate` and `conventional-title` as required checks.
- Squash merging only, with the pull request title as the commit title.
- The `RELEASE_PLEASE_TOKEN` secret, if you use release-please (so the required checks run on the release pull request).
- Code scanning: use the generated `codeql.yml`, and do not also enable "default setup".

Some of this depends on your plan: on a private repository, branch protection needs a paid plan and CodeQL needs GitHub Code Security.

## Next

[Concepts](concepts.md) explains why the files are shaped this way. [Troubleshooting](troubleshooting.md) covers the first things
that go wrong.

<!-- docs-nav:start -->
---
**Documentation:** [Start here](./start-here.md) · [Guides](./guides/new-project.md) · [Concepts](./concepts.md) · [Reference](./cli.md) · [Glossary](./glossary.md) · [All pages](./README.md)

← [Start here](./start-here.md) · [Start a new project](./guides/new-project.md) →
<!-- docs-nav:end -->
