# Documentation

![project-foundation](images/logo.svg)

`project-foundation` gives a repository one rules file that every coding agent follows, git hooks and CI that enforce it, and the
documents that explain it. These pages are written for three kinds of reader. Pick the row that sounds like you.

| You are… | Start with |
| --- | --- |
| **New to all of this** | [Start here](start-here.md): the problem and the idea in plain words, then the [quickstart](getting-started.md) |
| **In a hurry, and know git** | [Quickstart](getting-started.md), then the guide for your case below |
| **Someone who reads every sentence** | [Concepts](concepts.md), the [command reference](cli.md), and [every generated file](generated-files.md) |

## Guides

Task by task: what to do, how to check it, what to do when it goes wrong.

| Guide | Use it when |
| --- | --- |
| [Start a new project](guides/new-project.md) | the repository is empty, or nearly |
| [Add it to a repository you already have](guides/existing-repository.md) | there is history, and you must lose nothing |
| [Set up a monorepo](guides/monorepo.md) | one repository, several languages |
| [Keep it up to date](guides/keep-up-to-date.md) | a new version is out, or you want to change a choice |
| [How your agents will behave](guides/working-with-agents.md) | you want to know what the rules make an assistant do |
| [Protect main on GitHub](guides/github-setup.md) | you want the rules to be binding, not advised |

## Understand

- [Concepts](concepts.md): one rulebook, enforcement in git and CI, branch before the first edit, provenance and upgrades, monorepos.
- [Engineering](ENGINEERING.md): how the engine is built, and how to change a template.
- [Decision records](adr/README.md): why the project is shaped this way.

## Look things up

- [Command reference](cli.md): every command, option, answer and environment variable.
- [Every generated file](generated-files.md): what each one is, and when it appears.
- [Glossary](glossary.md): plain definitions of the words used.
- [Troubleshooting](troubleshooting.md): the problems people actually hit.
- The stack-by-stack notes: [stacks](../skills/project-foundation/references/stacks.md),
  [GitHub settings](../skills/project-foundation/references/github-settings.md),
  [what each agent reads](../skills/project-foundation/references/agent-instructions.md).

## Contribute

[Contributing](../CONTRIBUTING.md), the [roadmap](../ROADMAP.md), the [changelog](../CHANGELOG.md), and the
[workflow this repository follows](EVOLVING.md).

The same pages are published, with search and a sidebar, at **<https://bhoudebert.github.io/project-foundation/docs/>**.

<!-- docs-nav:start -->
---
**Documentation:** [Start here](./start-here.md) · [Guides](./guides/new-project.md) · [Concepts](./concepts.md) · [Reference](./cli.md) · [Glossary](./glossary.md) · [All pages](./README.md)

[Start here](./start-here.md) →
<!-- docs-nav:end -->
