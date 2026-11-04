# How this project evolves

Every change goes through the same path, whoever makes it, a person or a coding agent. The path exists so that each change
is designed before it is coded, and explained before it is released.

```
idea ─▶ decision ─▶ code + tests ─▶ docs ─▶ PR ─▶ release
        (ADR)                                   (review) 
```

## 1. Idea

Ideas live in `ROADMAP.md` or an issue. Before building, talk it through: who is it for, when is it used, what does the
user do, what does the system do. A feature that cannot be described in those terms is not ready.

## 2. Decision: an ADR when the shape of the system changes

A new data store, a new execution path, a new dependency or service, a rule that cuts across features, a choice between real
alternatives: write a record in `docs/adr/` from `template.md`, with the alternatives that lost. Small changes inside an
existing shape need no record. Read the existing records before changing what they cover; an accepted record is
superseded by a new one, never rewritten.

## 3. Code and tests

- **One implementation, every entry point.** Logic lives in plain modules; command lines, servers and agents are thin entry
  points over it.
- **Rules in code.** Anything that must always hold is enforced in the code, never only in a prompt or a document.
- **Tests with the code.** Deterministic logic gets unit tests. Tests never call a paid or external service for real.
  `npm test` must pass.
- **Verify for real** where it matters, and say what was and was not verified.

## 4. Docs

The README when the overview changes; `docs/ENGINEERING.md` when the architecture changes; `AGENTS.md` or
`CONTRIBUTING.md` when the way of working changes; `ROADMAP.md`: remove what is done, add what was learnt.

## 5. Pull request

Conventional Commits, one concern per commit, in the order of this path (`docs(adr)`, `feat`, `test`,
`docs`). The pull request title is a Conventional Commit too: it becomes the commit on `main`. The template's checklist
mirrors this document. The maintainer reviews and merges.

<!-- docs-nav:start -->
---
**Documentation:** [Start here](./start-here.md) · [Guides](./guides/new-project.md) · [Concepts](./concepts.md) · [Reference](./cli.md) · [Glossary](./glossary.md) · [All pages](./README.md)

← [Engineering](./ENGINEERING.md) · [Architecture decision records](./adr/README.md) →
<!-- docs-nav:end -->
