# Glossary

Plain definitions of the words this project uses, in alphabetical order.

**`AGENTS.md`**: the file that holds a repository's working rules for coding assistants. Codex and Copilot's agents read it
directly; Claude Code and Gemini CLI import it with one line. [Concepts](concepts.md#one-rulebook-thin-adapters)

**Answers file**: a JSON file with the answers `init` would otherwise ask for. It lets an agent, or a script, run `init` without
questions. [Reference](cli.md#the-answers-file)

**Branch protection**: a GitHub setting that stops people pushing straight to `main` and makes chosen checks mandatory. You switch it
on; this project only tells you how. [Guide](guides/github-setup.md)

**CI (continuous integration)**: a workflow on GitHub that runs your tests and checks on every pull request. Here it is one file,
`.github/workflows/ci.yml`.

**CodeQL**: GitHub's security scanner. Free for public repositories; on a private one it needs the paid GitHub Code Security.

**Coding agent / coding assistant**: a program that reads and changes your code on your behalf: Claude Code, Codex, Gemini CLI,
GitHub Copilot.

**Component**: one part of a monorepo, with a name, a folder and a language, such as `services/api` in Rust.

**Conflict (in `upgrade`)**: a file you edited that the templates also changed. Yours is left untouched and the new version is
written next to it as `<file>.upstream`. [Guide](guides/keep-up-to-date.md)

**Conventional Commits**: a way to word commit messages (`feat(api): add a time zone`). The type (`feat`, `fix`, `docs`…) lets tools
decide the next version and write the changelog. [Commit rules](../CONTRIBUTING.md#commits)

**Dependabot**: GitHub's service that opens weekly pull requests to update your dependencies.

**Dry run (`--dry-run`)**: show what would happen, write nothing.

**Git hook**: a small script git runs at a set moment: before a commit, before a push. Hooks can be skipped (`--no-verify`), which
is why CI checks the same things again. [Enforcement](concepts.md#enforcement-lives-in-git-and-ci)

**Decision record (ADR)**: a short document saying why a choice was made, with the alternatives that lost. They live in `docs/adr/`.

**Direnv / Nix dev shell**: an optional way to give every contributor the same tools. Nix describes them in `flake.nix`; direnv loads
them when you enter the folder.

**Generated file**: a file `init` wrote. Its fingerprint is recorded in `.project-foundation.json`. [List](generated-files.md)

**Monorepo**: one repository that holds several projects, possibly in different languages.

**Profile**: the built-in description of a language: its commands, tools and conventions. `node`, `java-maven`, `java-gradle`,
`rust`, `python`, `go` and `other`.

**Provenance file (`.project-foundation.json`)**: the record `init` leaves: the skill version, your answers and a hash of each file
it wrote. `upgrade` reads it. Commit it.

**Pull request (PR)**: a proposal to merge a branch into `main`, reviewed before it is merged.

**Quality gate**: the one command that runs everything your project should pass before a push (`npm run quality`,
`cargo clippy … && cargo test`…). The pre-push hook and CI both run it.

**Release-please**: a GitHub action that keeps a release pull request up to date with the next version and the changelog, built from
your commit messages.

**Required check**: a check GitHub will not let you merge without. Here the only one you need is `Quality gate` (plus the pull
request title check).

**Skill**: a folder with a `SKILL.md` that teaches a coding agent how to do one job. This project is a skill, and also a command.
Installed with `npx skills add`.

**Spec-driven development**: describing behaviour as written requirements first, and checking that code and specs agree. An optional
module, suited to TypeScript layouts.

**Squash merge**: merging a pull request as one commit whose message is the pull request title.

**Tracked vs ignored**: git *tracks* files it has been told to version. An ignore line (`.gitignore`) does not untrack a file that is
already tracked; `git rm --cached` does. `status` tells you when that happens.

**Upgrade**: bring the generated files up to date with newer templates, without touching your edits.
[Guide](guides/keep-up-to-date.md)

<!-- docs-nav:start -->
---
**Documentation:** [Start here](./start-here.md) · [Guides](./guides/new-project.md) · [Concepts](./concepts.md) · [Reference](./cli.md) · [Glossary](./glossary.md) · [All pages](./README.md)

← [Every generated file](./generated-files.md) · [Troubleshooting](./troubleshooting.md) →
<!-- docs-nav:end -->
