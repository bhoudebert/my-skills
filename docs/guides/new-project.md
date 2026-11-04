# Start a new project

**Use this when** the repository is empty, or nearly: you want the rules in place from the first commit.

**You need** Node 22 or later, and `git`. An account on GitHub is needed later, to push.

## 1. Create the repository

```bash
mkdir acme-billing && cd acme-billing
git init -b main
git remote add origin git@github.com:acme/acme-billing.git   # optional now; it lets init read your owner and repo
```

## 2. Preview

```bash
npx github:bhoudebert/my-skills init --dry-run
```

With no manifest yet (`package.json`, `Cargo.toml`…), it does not know your language and will ask for it. Pick the one you will use:
`node`, `java-maven`, `java-gradle`, `rust`, `python`, `go`, or `other`.

## 3. Generate

```bash
npx github:bhoudebert/my-skills init
```

Answer the questions (Enter takes the proposed answer), read the summary it prints, and confirm. About forty files appear, including
`AGENTS.md`, the hooks, the CI workflow and `.project-foundation.json`.

## 4. Give the project its quality gate

Right after `init`, the gate fails. That is expected: your project has no manifest and no test yet. Create the minimum for your language
([a minimal manifest for each stack](../../skills/project-foundation/references/stacks.md#a-minimal-manifest-per-stack)), then run the
gate command from `AGENTS.md`, section "Useful commands".

## 5. Install the hooks, then make the first commit

```bash
sh scripts/setup-hooks.sh
git add -A
git commit -m "chore: bootstrap project foundation"
```

The very first commit of a repository may go on `main`; every later one belongs on a branch.

## 6. Finish the documents

Every `<!-- … -->` comment in the generated Markdown asks for something only you know. List them:

```bash
grep -rn "<!--" --include="*.md" .
```

## 7. Push and protect

Push, then follow [Protect main on GitHub](github-setup.md): a required check and no direct push.

## Check it worked

- `git commit -m "bad message"` is refused, and tells you why.
- `git switch -c chore/try && git commit --allow-empty -m "chore: try"` works.
- `AGENTS.md` and `CONTRIBUTING.md` read like your project, not like a template.

## If something goes wrong

[Troubleshooting](../troubleshooting.md) covers a gate that fails after `init`, tools not found by the hook, and CodeQL on a private
repository.

<!-- docs-nav:start -->
---
**Documentation:** [Start here](../start-here.md) · [Guides](./new-project.md) · [Concepts](../concepts.md) · [Reference](../cli.md) · [Glossary](../glossary.md) · [All pages](../README.md)

← [Getting started](../getting-started.md) · [Add it to a repository you already have](./existing-repository.md) →
<!-- docs-nav:end -->
