<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.svg">
    <img src="docs/images/logo.svg" width="96" alt="project-foundation: three dots, like ants, walking into one document">
  </picture>
</p>

<h1 align="center">project-foundation</h1>

<p align="center"><strong>One rules file for every coding agent.</strong><br>
Claude, Codex, Gemini and Copilot follow it. Git and CI hold them to it.</p>

<p align="center">

<!-- badges:start -->
[![CI](https://github.com/bhoudebert/project-foundation/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bhoudebert/project-foundation/actions/workflows/ci.yml) [![CodeQL](https://github.com/bhoudebert/project-foundation/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/bhoudebert/project-foundation/actions/workflows/codeql.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
<!-- badges:end -->

</p>

<p align="center">
  <a href="docs/start-here.md"><strong>Start here</strong></a> ·
  <a href="docs/getting-started.md">Quickstart</a> ·
  <a href="docs/README.md">Guides</a> ·
  <a href="docs/cli.md">Reference</a> ·
  <a href="docs/glossary.md">Glossary</a> ·
  <a href="https://bhoudebert.github.io/project-foundation/">Site</a>
</p>

---

AI coding assistants read **different files** to learn how your project works, so without shared rules each one guesses how to name
a branch, word a commit, run the tests, or whether it may change `main`. `project-foundation` gives the repository **one** rulebook,
`AGENTS.md`, and the guards that make it binding. Think of ants: a trail is laid once, and every ant follows it.

<p align="center"><img src="docs/images/one-trail.svg" alt="Claude Code, Codex, Gemini CLI and GitHub Copilot each read their own file; every file leads to one AGENTS.md" width="860"></p>

![Claude Code](https://img.shields.io/badge/Claude_Code-0b0c0e?style=flat-square&logo=claude&logoColor=white)
![Codex](https://img.shields.io/badge/Codex-0b0c0e?style=flat-square)
![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-0b0c0e?style=flat-square&logo=googlegemini&logoColor=white)
![GitHub Copilot](https://img.shields.io/badge/GitHub_Copilot-0b0c0e?style=flat-square&logo=githubcopilot&logoColor=white)
&nbsp;&nbsp;
![Node.js](https://img.shields.io/badge/Node.js-0b0c0e?style=flat-square&logo=nodedotjs&logoColor=white)
![Java](https://img.shields.io/badge/Java-0b0c0e?style=flat-square&logo=openjdk&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-0b0c0e?style=flat-square&logo=rust&logoColor=white)
![Python](https://img.shields.io/badge/Python-0b0c0e?style=flat-square&logo=python&logoColor=white)
![Go](https://img.shields.io/badge/Go-0b0c0e?style=flat-square&logo=go&logoColor=white)
![Nix](https://img.shields.io/badge/Nix-0b0c0e?style=flat-square&logo=nixos&logoColor=white)

## Try it in a minute

You need [Node](https://nodejs.org) 22 or later. From your repository:

```bash
npx github:bhoudebert/project-foundation init --dry-run    # shows what it would write; writes nothing
npx github:bhoudebert/project-foundation init              # asks a few questions, shows a summary, writes
```

It **looks** at your repository, **asks** only what it cannot see, **previews** every file, and **writes** them. It never overwrites a
file. This is its real output:

<p align="center"><img src="docs/images/init-session.png" alt="The questions project-foundation asks, with the answers it proposes" width="640"></p>

Prefer your agent to do it? Install the skill and say *"use project-foundation to bootstrap this repository"*:

```bash
npx skills add bhoudebert/project-foundation
```

## Choose your path

| You are… | Go to |
| --- | --- |
| **New to this** | [Start here](docs/start-here.md): the idea in plain words, then the [quickstart](docs/getting-started.md) |
| **Starting a project** | [Start a new project](docs/guides/new-project.md) |
| **Adding it to an existing repository** | [Add it without losing anything](docs/guides/existing-repository.md) |
| **Keeping several languages in one repository** | [Set up a monorepo](docs/guides/monorepo.md) |
| **Wondering what your agents will do** | [How your agents will behave](docs/guides/working-with-agents.md) |
| **Someone who reads every sentence** | [Concepts](docs/concepts.md), the [command reference](docs/cli.md), [every generated file](docs/generated-files.md) |

## What you get

About forty files, depending on your answers. [Each one is explained](docs/generated-files.md).

| | |
| --- | --- |
| **Agent rules** | `AGENTS.md` as the single source; `CLAUDE.md` and `GEMINI.md` import it; a short digest for Copilot; per-component files in a monorepo |
| **Workflow** | `CONTRIBUTING.md` with the drawing from need to release, pull request and issue templates, decision records |
| **Enforcement** | tool-neutral shell hooks and the same checks in CI, with one required check, `Quality gate` |
| **Automation** | Dependabot, CodeQL, release-please when you want it |
| **Community files** | `SECURITY`, `SUPPORT`, `CODE_OF_CONDUCT`, `LICENSE`, `ROADMAP` |
| **Options** | a Nix dev shell with direnv; spec-driven development with a drift reviewer |

<details>
<summary>See the files it writes for a Node project</summary>
<p align="center"><img src="docs/images/generated-tree.png" alt="The list of files project-foundation init would create" width="520"></p>
</details>

## Enforced, not advised

An instruction is a request; a hook or a required check is a rule. Hooks can be skipped on one machine, so CI checks the same things,
and GitHub branch protection (which you switch on) is the final rule.

<p align="center"><img src="docs/images/enforcement.svg" alt="Five layers from git hooks to branch protection, and whether each can be skipped" width="860"></p>

An agent is also told to **check the branch before its first edit**: on `main` it branches without asking, on another branch it asks
once, it stages only its own files, opens the pull request and never merges. [How agents behave](docs/guides/working-with-agents.md)

## Kept up to date, without losing your edits

`init` records its answers and a fingerprint of every file it wrote. `upgrade` later compares that record, your files and the new
templates: files you did not touch are updated, files you edited are never overwritten, and when both changed the new version lands
next to yours as `<file>.upstream`.

<p align="center"><img src="docs/images/lifecycle.svg" alt="init records the files; upgrade compares three things and updates, keeps or sets aside each file" width="860"></p>

```bash
project-foundation status                            # which version made this; did the templates change since
project-foundation upgrade                           # what differs; nothing is written
project-foundation upgrade --set nix=true --apply    # change a choice, update the files, save the answer
```

## Questions people ask

**Does it overwrite my files?** No. A file that exists is skipped and listed; `.gitignore` only gains lines.
**Do contributors need the skill?** No. The rules, hooks and CI are plain files in the repository.
**Is a model involved?** Not in generating: it is a Node script with no dependencies and no network.
**Does it change GitHub settings?** No. It lists the commands and you run them.

More in the [site](https://bhoudebert.github.io/project-foundation/) and in [Troubleshooting](docs/troubleshooting.md).

## Contributing

This repository follows the rules it generates. Read [CONTRIBUTING.md](CONTRIBUTING.md), then:

```bash
sh scripts/setup-hooks.sh   # once per clone
npm test                    # the quality gate
```

## Licence

[MIT](LICENSE).
