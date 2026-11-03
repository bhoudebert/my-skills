# my-skills

AI skills for coding agents, in the open `SKILL.md` format, installable with
[`vercel-labs/skills`](https://github.com/vercel-labs/skills) (about 75 agents: Claude Code, Codex, Cursor, ...).

| Skill | What it does |
| --- | --- |
| [`project-foundation`](skills/project-foundation/SKILL.md) | Starts a repository from a good base: one `AGENTS.md` for Claude, Codex, Gemini and Copilot, the contribution workflow, ADRs, templates, tool-neutral hooks, CI with one required check, CodeQL, Dependabot, release-please, an optional Nix dev shell and spec-driven module. One project or a monorepo mixing Rust, Python, Node, Java and Go. Later, `status` and `upgrade` say what changed in the templates. |

## Install, update, remove

```bash
npx skills add bhoudebert/my-skills          # this repository (a private one works through your git credentials)
npx skills add ./my-skills                   # or a local clone
npx skills add ./my-skills -g                # for every project, not only the current one
npx skills list
npx skills check                             # is there a newer version?
npx skills update
npx skills remove project-foundation
```

Project scope is the default, and a project-scoped skill is committed with the project. `--copy` copies the files instead of
linking them. Without `skills`, a symlink works too: `ln -s "$PWD/skills/project-foundation" ~/.claude/skills/project-foundation`.

## Using project-foundation

Installing the skill (above) only makes it available to an agent: nothing is generated until `init` runs. Two ways to run it.

**1. With the command line**, from the repository to set up (Node 22 or later, no dependencies). Run it without installing:

```bash
npx github:bhoudebert/my-skills init     # or: npx /path/to/my-skills init
```

or install the command once, from a clone, and use it everywhere:

```bash
cd my-skills && npm link                  # puts `my-skills` on your PATH, pointing at the clone: `git pull` updates it
my-skills init                            # looks at the repository, asks what it cannot see, generates
my-skills init --dry-run                  # the same, listing what it would write
my-skills status                          # which skill version made this repository, did the templates change since
my-skills upgrade                         # what differs from the current templates; --apply writes the safe changes
my-skills list
```

`init` finds the stacks (`package.json`, `Cargo.toml`, `pom.xml`, `build.gradle`, `pyproject.toml`, `go.mod`, in the root or
in component folders) and the GitHub owner and repository (from `git remote`), and asks only for the rest. Every command acts
on the current folder, or `--target <folder>`.

**2. Through the agent**, with the skill installed: "bootstrap this repository". It interviews you, writes an answers file and
runs `init --config answers.json`. The script is at `.claude/skills/project-foundation/scripts/foundation.mjs` (project install)
or `~/.claude/skills/...` (global), for the cases where you want to call it by hand.

`init` writes `.project-foundation.json` into the repository (skill version and source commit, the answers, a hash of each
generated file): commit it. That is what lets `upgrade` tell a change in the templates from your own edit.

## Developing

```bash
npm test                                   # renders every stack, a monorepo, the Nix shell, upgrade and status
YAML_NODE_PATH=/path/to/node_modules npm test   # also parses the generated workflows (needs the `yaml` package)
```

The skills live under `skills/<name>/`, the layout `skills` discovers. Bump a skill's `VERSION` when its templates change.
