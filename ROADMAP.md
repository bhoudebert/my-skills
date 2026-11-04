# Roadmap

Ideas, not promises. When an idea is done, remove it and record what was learnt; when one is added, say who it is for and
when it would be used. An idea that cannot be described in those terms is not ready to build.

## Next

- **The spec reviewer for other stacks.** It assumes a `src/` layout and TypeScript test titles. Java, Rust and Python projects that
  want spec-driven development need configurable roots and test-title patterns.
- **Spec-driven for monorepos**, once the reviewer knows layouts.
- **A second agent's native skill format**, if one of Codex, Gemini or Copilot documents its own.

## Later

- A scheduled workflow that opens a pull request when a newer version of the skill exists (for organisations that keep many repositories).
- Profiles for more stacks (.NET, Ruby, PHP) and more CI providers.

## Not now

- **A generator that keeps every agent file in sync.** One import line per tool is less machinery than a generator ([ADR 0003](docs/adr/0003-one-agent-instruction-file.md)).
- **A model in the generating path.** The files must be the same every time and checkable by a test.
