// Renders every stack, with and without the optional modules, and a monorepo, and checks what comes out.
//
//   node --test tests/                                          from the repository root
//   YAML_NODE_PATH=/path/to/node_modules node --test tests/     also parse the YAML with the `yaml` package
//
// Checks: nothing is left unrendered; JSON parses; shell scripts pass `sh -n`; the Markdown has a blank line before every
// heading and table; the agent files stay inside the limits the agents have (Codex reads 32 KiB of AGENTS.md, Copilot code
// review about 4,000 characters of its file); the commit check accepts and rejects what it should; links between generated
// files resolve; `upgrade` tells a template change from a local edit.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { PROVENANCE, init, main, status, upgrade } from "../skills/project-foundation/scripts/foundation.mjs";
import { START, END, badgeBlock, badgeLines, insertBlock } from "../skills/project-foundation/scripts/lib/badges.mjs";
import { loadVariables } from "../skills/project-foundation/scripts/lib/answers.mjs";
import { detect, detectStacks, interview, parseRemote } from "../skills/project-foundation/scripts/lib/interview.mjs";
import { UserError } from "../skills/project-foundation/scripts/lib/answers.mjs";

const SKILL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills", "project-foundation");
const PROFILES = Object.keys(JSON.parse(readFileSync(path.join(SKILL, "assets", "profiles.json"), "utf8")).profiles);
const tmp = mkdtempSync(path.join(os.tmpdir(), "pf-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const BASE = { project_name: "Demo", project_slug: "demo", description: "A demo project.", owner: "acme", repo: "demo" };
const MONO = {
  ...BASE,
  description: "A demo monorepo.",
  components: [
    { name: "api", path: "services/api", profile: "rust" },
    { name: "worker", path: "services/worker", profile: "python", owner: "data-team" },
    { name: "web", path: "web", profile: "node" },
  ],
};

let counter = 0;
const fresh = (label) => path.join(tmp, `${label}-${counter++}`);
/** Renders answers into a new folder and returns it. */
function render(config, label = "repo", options = {}) {
  const target = fresh(label);
  init({ config, target, ...options });
  return target;
}
const read = (root, file) => readFileSync(path.join(root, file), "utf8");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const sh = (args, options = {}) => spawnSync("sh", args, { encoding: "utf8", ...options });
const git = (repo, ...args) =>
  spawnSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", ...args], { encoding: "utf8" });
const sha = (text) => createHash("sha256").update(text).digest("hex");

const outputs = new Map();
before(() => {
  for (const profile of PROFILES) {
    for (const spec of [false, true]) outputs.set(`${profile}${spec ? "+spec" : ""}`, render({ ...BASE, profile, spec_driven: spec }, profile));
  }
  outputs.set("monorepo", render(MONO, "monorepo"));
});

describe("every stack", () => {
  test("nothing is left unrendered", () => {
    for (const [key, root] of outputs) {
      for (const file of walk(root)) {
        if (file.includes("/scripts/spec-review")) continue; // vendored code, copied raw
        assert.doesNotMatch(readFileSync(file, "utf8"), /@@[#/a-z]/, `${key} ${path.relative(root, file)} has an unrendered tag`);
      }
    }
  });

  test("JSON parses", () => {
    for (const root of outputs.values()) for (const file of walk(root)) if (file.endsWith(".json")) JSON.parse(readFileSync(file, "utf8"));
  });

  test("shell scripts are valid sh and executable", () => {
    for (const [key, root] of outputs) {
      for (const file of walk(root)) {
        if (!file.endsWith(".sh") && path.basename(path.dirname(file)) !== ".githooks") continue;
        const done = sh(["-n", file]);
        assert.equal(done.status, 0, `${key} ${path.relative(root, file)}: ${done.stderr}`);
        assert.doesNotThrow(() => accessSync(file, constants.X_OK), `${path.relative(root, file)} is not executable`);
      }
    }
  });

  test("the Markdown is tidy: a blank line before a heading or a table, none after a table", () => {
    const problems = new Set();
    for (const [key, root] of outputs) {
      for (const file of walk(root).filter((f) => f.endsWith(".md"))) {
        const lines = readFileSync(file, "utf8").split("\n");
        let fenced = false;
        lines.forEach((line, i) => {
          if (line.startsWith("```")) fenced = !fenced;
          if (fenced) return;
          const name = `${path.relative(root, file)}:${i + 1}`;
          if (/^#{1,6} /.test(line) && i > 0 && lines[i - 1].trim() && !lines[i - 1].startsWith("---") && !lines[i - 1].startsWith("<!--")) {
            problems.add(`${name}: a heading with no blank line before it: ${line}`);
          }
          if (line.startsWith("|") && i > 0 && lines[i - 1].trim() && !lines[i - 1].startsWith("|")) problems.add(`${name}: a table starting right after text`);
          if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].startsWith("|")) problems.add(`${name}: text right after a table`);
          if (i >= 3 && !lines[i - 1] && !lines[i - 2] && !lines[i - 3]) problems.add(`${name}: three blank lines in a row`);
        });
      }
    }
    assert.deepEqual([...problems].sort(), []);
  });

  test("the agent files fit the tools that read them", () => {
    for (const [key, root] of outputs) {
      assert.ok(Buffer.byteLength(read(root, "AGENTS.md")) < 32 * 1024, "Codex stops reading project instructions at 32 KiB");
      assert.ok(read(root, ".github/copilot-instructions.md").length <= 4000, `${key}: Copilot code review reads about 4,000 characters`);
      assert.ok(read(root, "CLAUDE.md").startsWith("@AGENTS.md"));
      assert.ok(read(root, "GEMINI.md").startsWith("@./AGENTS.md"));
      for (const name of ["tests", "docs"]) assert.match(read(root, `.github/instructions/${name}.instructions.md`), /^---\napplyTo: "[^"]+"\n---\n/);
    }
  });

  test("links to generated files resolve", () => {
    for (const [key, root] of outputs) {
      for (const file of walk(root).filter((f) => f.endsWith(".md"))) {
        for (const [, target] of readFileSync(file, "utf8").matchAll(/\]\(([^)#:]+?)(?:#[^)]*)?\)/g)) {
          assert.ok(existsSync(path.resolve(path.dirname(file), target)), `${key} ${path.relative(root, file)} links to missing ${target}`);
        }
      }
    }
  });

  test("the stack shows in the commands and files", () => {
    const node = outputs.get("node");
    assert.match(read(node, "AGENTS.md"), /npm run quality/);
    assert.ok(existsSync(path.join(node, ".nvmrc")));
    assert.match(read(node, ".github/workflows/ci.yml"), /actions\/setup-node/);
    const maven = outputs.get("java-maven");
    assert.match(read(maven, "AGENTS.md"), /\.\/mvnw -B verify/);
    assert.match(read(maven, ".github/workflows/ci.yml"), /setup-java/);
    assert.match(read(maven, ".github/dependabot.yml"), /package-ecosystem: maven/);
    assert.match(read(maven, ".github/workflows/codeql.yml"), /language: java-kotlin/);
    const rust = outputs.get("rust");
    assert.match(read(rust, "AGENTS.md"), /cargo clippy/);
    assert.ok(existsSync(path.join(rust, "rust-toolchain.toml")));
    assert.match(read(rust, "release-please-config.json"), /"release-type": "rust"/);
    const other = outputs.get("other");
    assert.ok(!existsSync(path.join(other, ".github/workflows/codeql.yml")), "no CodeQL language, no workflow");
    assert.ok(!existsSync(path.join(other, ".github/dependabot.yml")));
  });

  test("spec-driven changes the rules, and the vendored reviewer is copied verbatim", () => {
    const plain = read(outputs.get("node"), "AGENTS.md");
    assert.doesNotMatch(plain, /openspec/);
    assert.match(plain, /decision record/);
    for (const profile of PROFILES) {
      const root = outputs.get(`${profile}+spec`);
      assert.match(read(root, "AGENTS.md"), /Spec first when behaviour changes/);
      assert.match(read(root, ".github/copilot-instructions.md"), /no-spec/);
      for (const f of ["scripts/spec-review.ts", "scripts/spec-review/checks.ts", "openspec/code-map.json", "openspec/README.md", ".github/workflows/specs.yml", "docs/adr/0004-specs-are-checked-in-ci.md", ".env.example"]) {
        assert.ok(existsSync(path.join(root, f)), `${profile}: ${f}`);
      }
      assert.match(read(root, ".gitignore"), /\.spec-review\//);
      assert.match(read(root, ".githooks/pre-push"), /spec-review\.ts --hook/);
      assert.doesNotMatch(read(outputs.get(profile), ".githooks/pre-push"), /spec-review/);
    }
    const source = readFileSync(path.join(SKILL, "assets/templates/spec-driven/scripts/spec-review/checks.ts"), "utf8");
    assert.equal(read(outputs.get("rust+spec"), "scripts/spec-review/checks.ts"), source);
  });

  test("the attribution rule follows the answer", () => {
    const off = render({ ...BASE, profile: "node", no_attribution: false }, "attr");
    assert.doesNotMatch(read(off, "AGENTS.md"), /attribution/);
    assert.match(read(outputs.get("node"), "AGENTS.md"), /No attribution trailers/);
  });

  test("an existing file is never overwritten, and .gitignore gains the missing lines", () => {
    const target = fresh("existing");
    mkdirSync(target);
    writeFileSync(path.join(target, "README.md"), "mine");
    writeFileSync(path.join(target, ".gitignore"), "secret.txt\n");
    const report = init({ config: { ...BASE, profile: "node" }, target });
    assert.equal(read(target, "README.md"), "mine");
    assert.ok(report.skipped.includes("README.md"));
    assert.match(read(target, ".gitignore"), /secret\.txt/);
    assert.match(read(target, ".gitignore"), /node_modules/);
    assert.ok(!(PROVENANCE in JSON.parse(read(target, PROVENANCE)).files), "the provenance file does not hash itself");
    assert.ok(!("README.md" in JSON.parse(read(target, PROVENANCE)).files), "a file that was already there is not recorded as generated");
  });

  test("a project without tests, lint or a layout does not get blank lines or a wrong layout", () => {
    const root = render({ ...BASE, profile: "python", setup_cmd: "pip install -r requirements.txt", quality_cmd: "python -m compileall -q .", lint_cmd: "", format_cmd: "", test_cmd: "", src_dir: "", test_dir: "" }, "bare");
    const agents = read(root, "AGENTS.md");
    assert.match(agents, /pip install -r requirements\.txt {6}# set up the project\npython -m compileall -q \. {4}# the gate\nsh scripts\/setup-hooks\.sh/);
    assert.doesNotMatch(agents, /^\s+# (tests only|lint|format)$/m);
    assert.match(agents, /- Language and tools: Python\.\n/);
    assert.doesNotMatch(agents, /Code under/);
    assert.match(read(root, ".github/copilot-instructions.md"), /- Stack: Python\. Gate: `python -m compileall -q \.`\./);
    const mono = render({ ...MONO, components: MONO.components.map((c) => (c.name === "web" ? { ...c, lint_cmd: "", format_cmd: "" } : c)) }, "bare-mono");
    assert.doesNotMatch(read(mono, "web/AGENTS.md"), /^\s+# (lint|format)$/m);
    assert.doesNotMatch(read(mono, ".github/instructions/web.instructions.md"), /Lint:|Format:/);
  });

  test("a missing answer or an unknown profile fails loudly", () => {
    assert.throws(() => render({ ...BASE, profile: "cobol" }), (e) => e instanceof UserError && /Unknown profile/.test(e.message));
    assert.throws(() => render({ project_name: "x", profile: "node" }), (e) => e instanceof UserError && /Missing required answer/.test(e.message));
    assert.throws(() => render(BASE), (e) => e instanceof UserError && /either `profile`/.test(e.message));
  });

  test("--dry-run writes nothing", () => {
    const target = fresh("dry");
    const report = init({ config: { ...BASE, profile: "node" }, target, dryRun: true });
    assert.ok(report.created.length > 20);
    assert.ok(!existsSync(target));
  });
});

describe("the commit check", () => {
  let script;
  let scriptOff;
  before(() => {
    script = path.join(render({ ...BASE, profile: "node" }, "commit"), "scripts", "conventional-commit-check.sh");
    scriptOff = path.join(render({ ...BASE, profile: "node", no_attribution: false }, "commit-off"), "scripts", "conventional-commit-check.sh");
  });
  const check = (message, which = script) => {
    const file = fresh("msg");
    writeFileSync(file, message);
    return sh([which, file]).status;
  };

  test("accepts", () => {
    for (const message of [
      "feat(api): accept a time zone\n",
      "fix: handle an empty list\n",
      "feat(api)!: drop the v1 endpoint\n\nBREAKING CHANGE: use v2.\n",
      `docs(adr): record the cache choice\n\nWhy: ${"x".repeat(60)}\n`,
      'revert: "feat(api): accept a time zone"\n',
      'Revert "feat: x"\n',
      "Merge branch 'main' into feat/x\n",
      "fixup! feat: x\n",
      `chore(deps): bump a thing\n\nSee https://example.com/${"a".repeat(200)}\n`,
      "chore: x\n\nSigned-off-by: A <a@b.c>\n",
    ]) assert.equal(check(message), 0, message);
  });

  test("rejects", () => {
    for (const message of [
      "Update stuff\n",
      "feat add a thing\n",
      "feat(Api): wrong case\n",
      "feat(api):no space\n",
      "feature(api): wrong type\n",
      "feat(api): ends with a period.\n",
      `feat(api): ${"x".repeat(100)}\n`,
      `feat(api): fine\n\n${"y".repeat(130)}\n`,
      "\n",
    ]) assert.notEqual(check(message), 0, message);
  });

  test("rejects attribution trailers when the rule is on, and accepts them when it is off", () => {
    for (const message of [
      "chore: x\n\nCo-Authored-By: Someone <a@b.c>\n",
      "chore: x\n\nco-authored-by: Someone <a@b.c>\n",
      "chore: x\n\nClaude-Session: https://example.com/s\n",
      "chore: x\n\nGenerated-By: a tool\n",
      "chore: x\n\n\u{1F916} Generated with [Claude Code](https://claude.com/claude-code)\n",
    ]) {
      assert.notEqual(check(message), 0, message);
      assert.equal(check(message, scriptOff), 0, message);
    }
  });
});

describe("what a repository tracks", () => {
  test("files tracked although they are ignored are reported by init, upgrade and status, whenever they were added", () => {
    const target = fresh("tracked");
    mkdirSync(target);
    git(target, "init", "-q");
    mkdirSync(path.join(target, ".spec-review"));
    writeFileSync(path.join(target, ".spec-review/report.json"), "{}");
    writeFileSync(path.join(target, ".spec-review/report.md"), "x");
    git(target, "add", "-A"); // a sweep, before any ignore rule exists
    const config = { ...BASE, profile: "node", spec_driven: true };
    const report = init({ config, target });
    assert.match(read(target, ".gitignore"), /\.spec-review\//);
    assert.ok(report.notes.some((n) => /2 file\(s\) under \.spec-review\/ are tracked by git although \.gitignore ignores them.*git rm -r --cached \.spec-review/.test(n)), report.notes.join("\n"));
    assert.ok(upgrade({ target }).notes.some((n) => /\.spec-review\//.test(n)), "upgrade says it too, with or without --apply");
    assert.ok(status(target).notes.some((n) => /\.spec-review\//.test(n)));
    git(target, "rm", "-r", "-q", "--cached", ".spec-review");
    assert.deepEqual(status(target).notes, [], "once untracked there is nothing to say");
    const plain = fresh("not-git");
    init({ config: { ...BASE, profile: "node" }, target: plain });
    assert.deepEqual(status(plain).notes, [], "not a git repository: nothing to say");
  });

  test("the installed skill is committed by default (and the rules say how to update it), or ignored on request", () => {
    const kept = outputs.get("node");
    assert.doesNotMatch(read(kept, ".gitignore"), /^\.agents\/$/m);
    const agents = read(kept, "AGENTS.md");
    assert.match(agents, /skill is committed in this repository/);
    assert.match(agents, /`chore\/update-project-foundation`/);
    const apart = render({ ...BASE, profile: "node", skill_in_repo: false }, "skill-ignored");
    assert.match(read(apart, ".gitignore"), /^\.agents\/$/m);
    assert.match(read(apart, ".gitignore"), /^\.claude\/skills\/$/m);
    assert.doesNotMatch(read(apart, "AGENTS.md"), /skill is committed in this repository/);
  });
});

describe("starting and delivering a change", () => {
  const fresh2 = (config, label) => {
    const target = fresh(label);
    init({ config: { ...BASE, profile: "node", quality_cmd: "true", ...config }, target });
    return target;
  };

  test("the rules tell an agent to check the branch before the first edit, and how to deliver", () => {
    const agents = read(outputs.get("node"), "AGENTS.md");
    assert.match(agents, /## Starting and delivering a change/);
    assert.match(agents, /Before the first edit of any task, \*\*including running a tool that writes files\*\*/);
    assert.match(agents, /git branch --show-current/);
    assert.match(agents, /On `main`\*\*: do not edit there\./);
    assert.match(agents, /Do not ask first/);
    assert.match(agents, /\*\*On another branch\*\*: ask once/);
    assert.match(agents, /Stage only the files of your task\*\*: `git add <paths>`, never `git add -A` or `git commit -a`/);
    assert.match(read(outputs.get("node"), ".github/copilot-instructions.md"), /never `git add -A`/);
    assert.match(agents, /gh pr create/);
    assert.match(agents, /pushing to\n  `main`, force-pushing/, "pushing a branch is not something to ask about");
    assert.match(read(outputs.get("node"), ".github/copilot-instructions.md"), /Before the first edit run `git branch --show-current`/);
    const local = read(render({ ...BASE, profile: "node", agent_opens_prs: false }, "local"), "AGENTS.md");
    assert.doesNotMatch(local, /gh pr create/);
    assert.match(local, /Push and open\nthe pull request only when asked/);
    for (const key of ["monorepo", ...PROFILES]) assert.match(read(outputs.get(key), "AGENTS.md"), /Starting and delivering a change/);
  });

  test("git refuses a commit on the default branch, except the first one, a branch, or an explicit exception", () => {
    const repo = fresh2({}, "guard");
    git(repo, "init", "-q", "-b", "main");
    git(repo, "config", "core.hooksPath", ".githooks");
    writeFileSync(path.join(repo, "a.txt"), "1\n");
    git(repo, "add", "-A");
    assert.equal(git(repo, "commit", "-q", "-m", "chore: start").status, 0, "the first commit of a repository is allowed");
    writeFileSync(path.join(repo, "a.txt"), "2\n");
    git(repo, "add", "-A");
    const refused = git(repo, "commit", "-q", "-m", "fix: change");
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /you are on main\. Create a branch first/);
    git(repo, "switch", "-q", "-c", "fix/change");
    assert.equal(git(repo, "commit", "-q", "-m", "fix: change").status, 0, "a branch is fine");
    git(repo, "switch", "-q", "main");
    writeFileSync(path.join(repo, "a.txt"), "3\n");
    git(repo, "add", "-A");
    const excepted = spawnSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "chore: exception"], { encoding: "utf8", env: { ...process.env, ALLOW_DEFAULT_BRANCH: "1" } });
    assert.equal(excepted.status, 0, "an explicit one-off exception");
    git(repo, "switch", "-q", "--detach", "HEAD");
    writeFileSync(path.join(repo, "a.txt"), "4\n");
    git(repo, "add", "-A");
    assert.equal(git(repo, "commit", "-q", "-m", "chore: detached").status, 0, "a rebase works on a detached head");
    assert.notEqual(git(repo, "commit", "-q", "--allow-empty", "-m", "bad message").status, 0, "the message is still checked");
  });

  test("git refuses a push to the default branch, and SKIP_PRE_PUSH does not lift that", () => {
    const repo = fresh2({}, "pushguard");
    git(repo, "init", "-q");
    const hook = path.join(repo, ".githooks/pre-push");
    const push = (ref, env = {}) => spawnSync("sh", [hook], { cwd: repo, input: `refs/heads/x abc ${ref} def\n`, encoding: "utf8", env: { ...process.env, ...env } });
    const refused = push("refs/heads/main");
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /refusing to push to main\. Push a branch and open a pull request/);
    assert.notEqual(push("refs/heads/main", { SKIP_PRE_PUSH: "1" }).status, 0, "skipping the gate is not skipping the rule");
    assert.equal(push("refs/heads/feat/x").status, 0, "a branch passes, with the (true) gate");
    assert.equal(push("refs/heads/main", { ALLOW_DEFAULT_BRANCH: "1" }).status, 0, "an explicit exception");
    assert.equal(push("refs/heads/feat/x", { SKIP_PRE_PUSH: "1" }).status, 0);
  });
});

describe("a monorepo", () => {
  let root;
  before(() => {
    root = outputs.get("monorepo");
  });

  test("each component gets its pin and its agent files", () => {
    assert.ok(existsSync(path.join(root, "services/api/rust-toolchain.toml")));
    assert.ok(existsSync(path.join(root, "services/worker/.python-version")));
    assert.ok(existsSync(path.join(root, "web/.nvmrc")));
    assert.ok(!existsSync(path.join(root, ".nvmrc")), "a pin belongs to its component, not to the root");
    for (const p of ["services/api", "services/worker", "web"]) {
      assert.match(read(root, `${p}/AGENTS.md`), /root `AGENTS.md`/);
      assert.ok(read(root, `${p}/CLAUDE.md`).startsWith("@AGENTS.md"));
      assert.ok(read(root, `${p}/GEMINI.md`).startsWith("@./AGENTS.md"));
    }
    for (const [name, glob] of [["api", "services/api/**"], ["worker", "services/worker/**"], ["web", "web/**"]]) {
      assert.match(read(root, `.github/instructions/${name}.instructions.md`), new RegExp(`applyTo: "${glob.replaceAll("*", "\\*")}"`));
    }
  });

  test("the root rules list the components", () => {
    for (const file of ["AGENTS.md", "CONTRIBUTING.md", "README.md"]) {
      assert.match(read(root, file), /\| `api` \| `services\/api` \| Rust \|/);
      assert.match(read(root, file), /\| `web` \| `web` \| Node.js \/ TypeScript \|/);
    }
    assert.match(read(root, "AGENTS.md"), /sh scripts\/quality\.sh --changed/);
    const copilot = read(root, ".github/copilot-instructions.md");
    assert.match(copilot, /`worker` \(Python\) in `services\/worker\/`/);
    assert.ok(copilot.length <= 4000);
    assert.match(read(root, "CONTRIBUTING.md"), /api, worker, web, deps, docs, ci, release/);
  });

  test("CI has a job per component and one required gate, and honours the pins", () => {
    const ci = read(root, ".github/workflows/ci.yml");
    for (const name of ["api", "worker", "web"]) {
      assert.ok(ci.includes(`  quality-${name}:`));
      assert.ok(ci.includes(`needs.changes.outputs.${name} == 'true'`));
    }
    assert.ok(ci.includes("working-directory: services/api"));
    assert.ok(ci.includes("needs: [commits, quality-api, quality-worker, quality-web]"));
    assert.equal((ci.match(/name: Quality gate/g) ?? []).length, 4, "a step per job and the gate itself");
    assert.match(ci, /actions-rust-lang\/setup-rust-toolchain/);
    assert.ok(ci.includes('python-version-file: "services/worker/.python-version"'));
    assert.doesNotMatch(ci, /dtolnay\/rust-toolchain@stable/);
  });

  test("Dependabot, CodeQL and release-please cover every component", () => {
    const dependabot = read(root, ".github/dependabot.yml");
    for (const [eco, dir] of [["cargo", "/services/api"], ["pip", "/services/worker"], ["npm", "/web"]]) {
      assert.ok(dependabot.includes(`package-ecosystem: ${eco}\n    directory: ${dir}\n`), eco);
    }
    assert.ok(dependabot.includes("package-ecosystem: github-actions"));
    const codeql = read(root, ".github/workflows/codeql.yml");
    for (const language of ["rust", "python", "javascript-typescript"]) assert.ok(codeql.includes(`- language: ${language}`));
    assert.match(codeql, /permissions:\n(?:  #.*\n)?  actions: read\n  contents: read\n  security-events: write\n/, "CodeQL needs actions: read on a private repository");
    const release = JSON.parse(read(root, "release-please-config.json"));
    assert.equal(release["include-component-in-tag"], true);
    assert.deepEqual(Object.fromEntries(Object.entries(release.packages).map(([k, v]) => [k, v["release-type"]])), { "services/api": "rust", "services/worker": "python", web: "node" });
    assert.equal(release.packages.web.component, "web");
    assert.deepEqual(Object.keys(JSON.parse(read(root, ".release-please-manifest.json"))).sort(), Object.keys(release.packages).sort());
    assert.match(read(root, ".github/CODEOWNERS"), /\/services\/worker\/ @data-team/);
  });

  test(".editorconfig keeps data files at two spaces inside components", () => {
    const text = read(root, ".editorconfig");
    assert.ok(text.indexOf("[services/api/**]") < text.indexOf("[*.{yml,yaml,json}]"), "later sections win");
    assert.match(text, /\n\n\[services\/api\/\*\*\]/);
  });

  test("the pre-push hook runs what changed", () => {
    assert.match(read(root, ".githooks/pre-push"), /sh scripts\/quality\.sh --changed/);
  });

  test("spec-driven and malformed components are refused", () => {
    assert.throws(() => render({ ...MONO, spec_driven: true }), (e) => /not supported for a monorepo/.test(e.message));
    const bad = [
      [[{ name: "Api", path: "a", profile: "rust" }], /kebab-case/],
      [[{ name: "a", path: "../x", profile: "rust" }, { name: "b", path: "b", profile: "rust" }], /inside the repository/],
      [[{ name: "a", path: "x", profile: "rust" }, { name: "a", path: "y", profile: "rust" }], /unique/],
      [[{ name: "a", path: ".", profile: "rust" }, { name: "b", path: "b", profile: "rust" }], /root/],
    ];
    for (const [components, pattern] of bad) assert.throws(() => render({ ...MONO, components }), (e) => e instanceof UserError && pattern.test(e.message));
  });

  test("quality.sh runs only the components a branch changed (a real git repository)", () => {
    const repo = fresh("e2e");
    const components = MONO.components.map((c) => ({ ...c, quality_cmd: `echo ran-${c.name}` }));
    init({ config: { ...MONO, components }, target: repo });
    git(repo, "init", "-q", "-b", "main");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "chore: start");
    const quality = (...args) => sh(["scripts/quality.sh", ...args], { cwd: repo });

    const everything = quality();
    assert.equal(everything.status, 0);
    for (const name of ["api", "worker", "web"]) assert.ok(everything.stdout.includes(`ran-${name}`));

    writeFileSync(path.join(repo, "web", "index.ts"), "export {};\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "feat(web): add an entry");
    const changed = quality("--changed", "--base", "HEAD~1");
    assert.equal(changed.status, 0);
    assert.ok(changed.stdout.includes("ran-web"));
    assert.ok(!changed.stdout.includes("ran-api") && !changed.stdout.includes("ran-worker"));

    writeFileSync(path.join(repo, "README.md"), "docs only\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "docs: reword");
    assert.ok(quality("--changed", "--base", "HEAD~1").stdout.includes("no component changed"));

    const one = quality("worker");
    assert.ok(one.stdout.includes("ran-worker") && !one.stdout.includes("ran-web"));
    assert.notEqual(quality("nope").status, 0);

    const broken = fresh("broken");
    init({ config: { ...MONO, components: MONO.components.map((c) => ({ ...c, quality_cmd: c.name === "api" ? "false" : `echo ran-${c.name}` })) }, target: broken });
    git(broken, "init", "-q");
    const result = sh(["scripts/quality.sh"], { cwd: broken });
    assert.notEqual(result.status, 0, "one failing component fails the gate");
    assert.ok(result.stdout.includes("ran-web"), "and the others still run");
  });
});

describe("the Nix dev shell", () => {
  test("is off by default, and on it lists the toolchains of every component", () => {
    assert.ok(!existsSync(path.join(outputs.get("node"), "flake.nix")));
    const root = render({ ...MONO, nix: true }, "nix");
    const flake = read(root, "flake.nix");
    for (const pkg of ["nodejs_24", "cargo", "clippy", "python313", "ruff", "gh", "jq"]) assert.match(flake, new RegExp(`^\\s+${pkg}$`, "m"), pkg);
    assert.equal(read(root, ".envrc"), "use flake\n");
    assert.match(read(root, ".gitignore"), /\.direnv\//);
    assert.match(read(root, "AGENTS.md"), /nix develop/);
    assert.equal((flake.match(/^\s+nodejs_24$/gm) ?? []).length, 1, "a package once");
    const parsed = spawnSync("nix-instantiate", ["--parse", path.join(root, "flake.nix")], { encoding: "utf8" });
    if (parsed.error) return; // nix is not installed: the syntax check is skipped
    assert.equal(parsed.status, 0, parsed.stderr);
  });
});

describe("provenance, status and upgrade", () => {
  const generate = () => {
    const target = fresh("prov");
    init({ config: { ...BASE, profile: "node" }, target });
    return target;
  };
  const provenance = (target) => JSON.parse(read(target, PROVENANCE));
  const save = (target, value) => writeFileSync(path.join(target, PROVENANCE), JSON.stringify(value, null, 2));

  test("init records the skill version, the answers and a hash of every generated file", () => {
    const target = generate();
    const p = provenance(target);
    assert.equal(p.skill, "project-foundation");
    assert.equal(p.version, readFileSync(path.join(SKILL, "VERSION"), "utf8").trim());
    assert.match(p.templatesHash, /^[0-9a-f]{64}$/);
    assert.equal(p.answers.project_name, "Demo");
    assert.equal(p.files["AGENTS.md"], sha(read(target, "AGENTS.md")));
    assert.ok(!("scripts/spec-review.ts" in p.files));
  });

  test("status is up to date right after init, and says so when the templates changed", async () => {
    const target = generate();
    assert.equal(status(target).upToDate, true);
    save(target, { ...provenance(target), templatesHash: "0".repeat(64), version: "0.0.1" });
    const s = status(target);
    assert.equal(s.upToDate, false);
    assert.equal(s.recorded.version, "0.0.1");
    const lines = [];
    assert.equal(await main(["status", "--target", target], (l) => lines.push(l)), 1);
    assert.match(lines.join("\n"), /run `upgrade`/);
  });

  test("upgrade has nothing to do right after init", () => {
    const target = generate();
    const r = upgrade({ target });
    assert.deepEqual([r.update, r.conflict, r.new, r.edited, r.missing], [[], [], [], [], []]);
    assert.ok(r.unchanged.includes("AGENTS.md"));
  });

  test("upgrade tells a template change from a local edit", () => {
    const target = generate();
    // An older template: what was recorded and written was different from today's rendering.
    const p = provenance(target);
    const old = "# an older README\n";
    writeFileSync(path.join(target, "README.md"), old);
    p.files["README.md"] = sha(old);
    // A file edited here only.
    writeFileSync(path.join(target, "SUPPORT.md"), "# my support page\n");
    // A file edited here and changed upstream.
    const mine = "# my edited security policy\n";
    writeFileSync(path.join(target, "SECURITY.md"), mine);
    p.files["SECURITY.md"] = sha("# the policy as it was before\n");
    p.templatesHash = "0".repeat(64); // the templates are not the ones this repository was generated from
    // A file deleted here, and a file the templates did not have when the repository was generated.
    rmSync(path.join(target, "ROADMAP.md"));
    delete p.files["docs/adr/0003-one-agent-instruction-file.md"];
    rmSync(path.join(target, "docs/adr/0003-one-agent-instruction-file.md"));
    save(target, p);

    const r = upgrade({ target });
    assert.deepEqual(r.update, ["README.md"]);
    assert.deepEqual(r.conflict, ["SECURITY.md"]);
    assert.ok(r.edited.includes("SUPPORT.md"));
    assert.deepEqual(r.missing, ["ROADMAP.md"]);
    assert.deepEqual(r.new, ["docs/adr/0003-one-agent-instruction-file.md"]);
    assert.equal(read(target, "README.md"), old, "without --apply nothing is written");

    const applied = upgrade({ target, apply: true });
    assert.match(read(target, "README.md"), /^# Demo/, "a file as generated is brought up to date");
    assert.equal(read(target, "SECURITY.md"), mine, "an edited file is never overwritten");
    assert.match(read(target, "SECURITY.md.upstream"), /# Security/, "its new version sits next to it");
    assert.equal(read(target, "SUPPORT.md"), "# my support page\n");
    assert.ok(existsSync(path.join(target, "docs/adr/0003-one-agent-instruction-file.md")));
    assert.ok(!existsSync(path.join(target, "ROADMAP.md")), "a file deleted on purpose stays deleted");
    assert.ok(applied.applied.includes("README.md") && applied.applied.includes("SECURITY.md.upstream"));
    assert.equal(status(target).upToDate, false, "a conflict left to merge keeps the repository marked as behind");
  });

  test("upgrade moves the recorded version forward once nothing is left to merge", () => {
    const target = generate();
    const p = provenance(target);
    const old = "# an older README\n";
    writeFileSync(path.join(target, "README.md"), old);
    p.files["README.md"] = sha(old);
    save(target, { ...p, version: "0.0.1", templatesHash: "0".repeat(64) });
    assert.equal(status(target).upToDate, false);
    upgrade({ target, apply: true });
    assert.equal(status(target).upToDate, true);
    assert.equal(provenance(target).version, readFileSync(path.join(SKILL, "VERSION"), "utf8").trim());
  });

  test("new answers given with --config are kept, so the next upgrade does not undo them", () => {
    const target = fresh("answers");
    const config = { ...BASE, profile: "python" };
    init({ config, target });
    const hook = path.join(target, ".githooks/pre-push");
    writeFileSync(hook, read(target, ".githooks/pre-push").replace("ruff check . && ruff format --check . && pytest", "flake8 . && pytest"));
    const changed = { ...config, quality_cmd: "flake8 . && pytest" };
    const preview = upgrade({ target, config: changed });
    assert.ok(preview.update.includes("AGENTS.md") && preview.update.includes(".github/workflows/ci.yml"));
    assert.deepEqual(preview.conflict, [".githooks/pre-push"], "the edited hook is never overwritten");
    assert.equal(provenance(target).answers.quality_cmd, undefined, "without --apply nothing is saved");
    upgrade({ target, config: changed, apply: true });
    assert.equal(provenance(target).answers.quality_cmd, "flake8 . && pytest");
    assert.match(read(target, "AGENTS.md"), /flake8 \. && pytest/);
    assert.match(read(target, ".githooks/pre-push.upstream"), /flake8 \. && pytest/);
    const again = upgrade({ target });
    assert.deepEqual(again.update, [], "the next upgrade renders from the new answers, not the old ones");
  });

  test(".gitignore is enriched on init and on upgrade, never rewritten, and a tracked folder is reported", () => {
    const target = fresh("ignore");
    mkdirSync(target);
    writeFileSync(path.join(target, ".gitignore"), "my-own-line\n.env\n");
    git(target, "init", "-q");
    mkdirSync(path.join(target, ".direnv"));
    writeFileSync(path.join(target, ".direnv/flake-profile"), "x");
    git(target, "add", "-f", ".direnv/flake-profile");
    const config = { ...BASE, profile: "node" };
    const first = init({ config, target });
    let ignore = read(target, ".gitignore");
    assert.match(ignore, /^my-own-line\n\.env\n/, "the user's lines stay where they were");
    assert.match(ignore, /node_modules/);
    assert.doesNotMatch(ignore, /\.direnv/, "Nix is off: nothing about it");
    assert.deepEqual(first.notes.filter((n) => /tracked/.test(n)), []);

    // Nix is chosen later: upgrade adds what Nix needs, and says that git still tracks .direnv/.
    const withNix = { ...config, nix: true, spec_driven: true };
    const preview = upgrade({ target, config: withNix });
    assert.ok(preview.merged.includes(".gitignore"));
    assert.equal(read(target, ".gitignore"), ignore, "a preview writes nothing");
    const applied = upgrade({ target, config: withNix, apply: true });
    ignore = read(target, ".gitignore");
    for (const line of [".direnv/", "result", ".spec-review/"]) assert.ok(ignore.split("\n").includes(line), line);
    assert.equal(ignore.split("\n").filter((l) => l === ".direnv/").length, 1);
    assert.match(applied.notes.join("\n"), /1 file\(s\) under \.direnv\/ are tracked by git.*git rm -r --cached \.direnv/);
    assert.match(read(target, ".env.example"), /SPEC_REVIEW_MODEL/);
    const again = upgrade({ target });
    assert.deepEqual(again.merged, [], "nothing left to add");
    // init with the same lines already present adds nothing and lists no duplicate.
    const second = init({ config: withNix, target, force: true });
    assert.equal(read(target, ".gitignore").split("\n").filter((l) => l === ".direnv/").length, 1);
    assert.ok(second.merged.length === 0 || !second.merged.includes(".gitignore"));
  });

  test("the date is frozen at init: a later upgrade does not see the decision records as changed", () => {
    const target = fresh("dated");
    init({ config: { ...BASE, profile: "node" }, target });
    const p = provenance(target);
    assert.match(p.answers.today, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(p.answers.year, p.answers.today.slice(0, 4));
    assert.match(read(target, "docs/adr/0001-record-architecture-decisions.md"), new RegExp(`Date: ${p.answers.today}`));
    // Another day: the recorded date is what is rendered, whatever today is.
    p.answers.today = "2020-02-02";
    p.answers.year = "2020";
    for (const adr of readdirSync(path.join(target, "docs/adr")).filter((f) => /^000\d/.test(f))) {
      const file = path.join(target, "docs/adr", adr);
      const text = readFileSync(file, "utf8").replace(/Date: \S+/, "Date: 2020-02-02");
      writeFileSync(file, text);
      p.files[`docs/adr/${adr}`] = sha(text);
    }
    save(target, p);
    const r = upgrade({ target });
    assert.deepEqual(r.update.filter((f) => f.startsWith("docs/adr/")), [], "the records are not rewritten");
    // A repository generated before the date was recorded falls back to the day it was generated.
    delete p.answers.today;
    delete p.answers.year;
    p.generatedAt = "2020-02-02T10:00:00.000Z";
    save(target, p);
    assert.deepEqual(upgrade({ target }).update.filter((f) => f.startsWith("docs/adr/")), []);
  });

  test("a repository not generated by the skill is refused with a clear message", () => {
    const target = fresh("plain");
    mkdirSync(target);
    assert.throws(() => upgrade({ target }), (e) => e instanceof UserError && /was not generated/.test(e.message));
  });

  test("the command line works end to end", () => {
    const script = path.join(SKILL, "scripts", "foundation.mjs");
    const config = fresh("cfg");
    writeFileSync(config, JSON.stringify({ ...BASE, profile: "go" }));
    const target = fresh("cli");
    const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, PROJECT_FOUNDATION_NO_GH: "1" } });
    assert.match(run("version").stdout, /^\d+\.\d+\.\d+/);
    assert.match(run("list").stdout, /agent-instructions:/);
    const dry = run("init", "--config", config, "--target", target, "--dry-run");
    assert.equal(dry.status, 0);
    assert.match(dry.stdout, /would be created/);
    assert.ok(!existsSync(target));
    assert.equal(run("init", "--config", config, "--target", target).status, 0);
    assert.equal(run("upgrade", "--target", target).status, 0);
    assert.equal(run("status", "--target", target).status, 0);
    const bad = run("init", "--target", fresh("bad"));
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /init needs --config/);
    assert.equal(run("nonsense").status, 2);
  });
});

describe("init without an answers file", () => {
  before(() => {
    process.env.PROJECT_FOUNDATION_NO_GH = "1"; // never call the GitHub API from a test
  });
  const touch = (root, file, text = "") => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  /** A scripted asker: answers in order, an empty string takes the default. */
  const scripted = (answers) => {
    const queue = [...answers];
    const asked = [];
    return {
      asked,
      ask: async (question, fallback = "") => {
        asked.push(question);
        const a = queue.shift() ?? "";
        return a === "" ? fallback : a;
      },
      yesNo: async (question, fallback) => {
        asked.push(question);
        const a = (queue.shift() ?? "").toLowerCase();
        return a === "" ? fallback : a.startsWith("y");
      },
    };
  };

  test("detects a single stack, a monorepo, and nothing", () => {
    const single = fresh("d1");
    touch(single, "Cargo.toml");
    assert.deepEqual(detectStacks(single), [{ path: ".", profile: "rust" }]);

    const mono = fresh("d2");
    touch(mono, "services/api/Cargo.toml");
    touch(mono, "services/worker/pyproject.toml");
    touch(mono, "web/package.json");
    touch(mono, "web/node_modules/left-pad/package.json"); // never looked into
    touch(mono, "docs/readme.md");
    assert.deepEqual(detectStacks(mono).sort((a, b) => a.path.localeCompare(b.path)), [
      { path: "services/api", profile: "rust" },
      { path: "services/worker", profile: "python" },
      { path: "web", profile: "node" },
    ]);

    const workspace = fresh("d3"); // a root manifest with nothing nested below stays a single project
    touch(workspace, "package.json");
    touch(workspace, "src/index.ts");
    assert.deepEqual(detectStacks(workspace), [{ path: ".", profile: "node" }]);

    const maven = fresh("d4");
    touch(maven, "pom.xml");
    touch(maven, "service/pom.xml");
    touch(maven, "web/package.json");
    assert.equal(detectStacks(maven).length, 2, "a parent manifest with components below: the components");

    const none = fresh("d5");
    mkdirSync(none);
    assert.deepEqual(detectStacks(none), []);
  });

  test("reads the owner and repository from a GitHub remote", () => {
    for (const url of ["git@github.com:acme/shop.git", "https://github.com/acme/shop.git", "https://github.com/acme/shop", "ssh://git@github.com/acme/shop.git"]) {
      assert.deepEqual(parseRemote(url), { owner: "acme", repo: "shop" }, url);
    }
    assert.deepEqual(parseRemote("git@gitlab.com:acme/shop.git"), {});
    assert.deepEqual(parseRemote(undefined), {});
    const repo = fresh("d6");
    touch(repo, "package.json", JSON.stringify({ description: "A shop." }));
    git(repo, "init", "-q");
    git(repo, "remote", "add", "origin", "git@github.com:acme/shop.git");
    const seen = detect(repo);
    assert.deepEqual([seen.owner, seen.repo, seen.description], ["acme", "shop", "A shop."]);
  });

  test("asks only what it cannot see, and builds answers init accepts", async () => {
    const repo = fresh("i1");
    touch(repo, "package.json", JSON.stringify({ description: "A shop." }));
    git(repo, "init", "-q");
    git(repo, "remote", "add", "origin", "git@github.com:acme/shop.git");
    const asker = scripted([]); // every default
    const answers = await interview(repo, asker, { hasNix: true, out: () => {} });
    assert.equal(answers.profile, "node");
    assert.equal(answers.owner, "acme");
    assert.equal(answers.repo, "shop");
    assert.equal(answers.description, "A shop.");
    assert.equal(answers.nix, true, "the default follows whether nix is installed");
    assert.equal(answers.release_please, true);
    assert.equal(answers.spec_driven, false);
    assert.equal(answers.no_attribution, true);
    assert.ok(!asker.asked.some((q) => /Stack\?/.test(q)), "a detected stack is not asked");
    const target = fresh("i1-out");
    init({ config: answers, target });
    assert.ok(existsSync(path.join(target, "flake.nix")));
  });

  test("asks whether the repository is private, and only keeps CodeQL where it can run", async () => {
    process.env.PROJECT_FOUNDATION_NO_GH = "1";
    const repo = fresh("q1");
    touch(repo, "package.json");
    const ask = async (answers) => interview(repo, scripted(answers), { out: () => {} });
    assert.equal((await ask(["", "", "acme", ""])).codeql, true, "public by default: CodeQL on");
    assert.equal((await ask(["", "", "acme", "", "y"])).codeql, false, "private, without Code Security: CodeQL off");
    assert.equal((await ask(["", "", "acme", "", "y", "y"])).codeql, true, "private with Code Security: CodeQL on");
    const asked = scripted(["", "", "acme", "", "y"]);
    await interview(repo, asked, { out: () => {} });
    assert.ok(asked.asked.some((q) => /private/.test(q)) && asked.asked.some((q) => /Code Security/.test(q)));
    const off = render({ ...BASE, profile: "node", codeql: false }, "no-codeql");
    assert.ok(!existsSync(path.join(off, ".github/workflows/codeql.yml")));
  });

  test("names the components of a monorepo and asks for a missing stack", async () => {
    const mono = fresh("i2");
    touch(mono, "services/api/Cargo.toml");
    touch(mono, "web/package.json");
    const answers = await interview(mono, scripted(["", "", "acme", "", "", "", "", "", ""]), { out: () => {} });
    assert.deepEqual(answers.components, [{ name: "api", path: "services/api", profile: "rust" }, { name: "web", path: "web", profile: "node" }]);
    assert.equal(answers.spec_driven, undefined, "spec-driven is not offered for a monorepo");

    const empty = fresh("i3");
    mkdirSync(empty);
    const asked = scripted(["", "", "acme", "", "", "", "", "python"]);
    assert.equal((await interview(empty, asked, { out: () => {} })).profile, "python");
    await assert.rejects(interview(empty, scripted(["", "", "acme", "", "", "", "", "cobol"]), { out: () => {} }), /Unknown stack/);
    await assert.rejects(interview(empty, scripted([]), { out: () => {} }), /GitHub owner is needed/);
  });

  test("the command line asks, generates in the current folder, and refuses to run twice", () => {
    const script = path.join(SKILL, "scripts", "foundation.mjs");
    const repo = fresh("cli-i");
    touch(repo, "go.mod", "module example.com/shop\n");
    git(repo, "init", "-q");
    git(repo, "remote", "add", "origin", "https://github.com/acme/shop.git");
    const answers = "\n".repeat(12); // the default to every question
    const first = spawnSync(process.execPath, [script, "init", "--interactive", "--yes"], { cwd: repo, input: answers, encoding: "utf8", env: { ...process.env, PROJECT_FOUNDATION_NO_GH: "1" } });
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Found: go in the repository root/);
    assert.match(first.stdout, /file\(s\) created/);
    assert.ok(existsSync(path.join(repo, "AGENTS.md")));
    assert.equal(JSON.parse(read(repo, PROVENANCE)).answers.profile, "go");
    const again = spawnSync(process.execPath, [script, "init", "--interactive", "--yes"], { cwd: repo, input: answers, encoding: "utf8", env: { ...process.env, PROJECT_FOUNDATION_NO_GH: "1" } });
    assert.equal(again.status, 2);
    assert.match(again.stderr, /already set up/);
    const status = spawnSync(process.execPath, [script, "status"], { cwd: repo, encoding: "utf8" });
    assert.equal(status.status, 0, "the target defaults to the current folder");
  });

  test("runs through a symlink, as an npm bin does", () => {
    const link = path.join(fresh("bin"), "my-skills");
    mkdirSync(path.dirname(link));
    symlinkSync(path.join(SKILL, "scripts", "foundation.mjs"), link);
    const done = spawnSync(process.execPath, [link, "version"], { encoding: "utf8" });
    assert.equal(done.status, 0, done.stderr);
    assert.match(done.stdout, /^\d+\.\d+\.\d+/);
  });

  test("without a terminal and without answers it says what to do", () => {
    const script = path.join(SKILL, "scripts", "foundation.mjs");
    const empty = fresh("none");
    mkdirSync(empty);
    const done = spawnSync(process.execPath, [script, "init"], { cwd: empty, encoding: "utf8", input: "" });
    assert.equal(done.status, 2);
    assert.match(done.stderr, /needs --config/);
  });
});

describe("badges", () => {
  const rootOf = (answers) => loadVariables({ ...BASE, profile: "node", ...answers }).root;

  test("a public repository gets CI, CodeQL, release and licence; a private or unknown one only the licence", () => {
    const base = "https://github.com/acme/demo";
    const publicLines = badgeLines(rootOf({}), { visibility: "public" });
    assert.equal(publicLines.length, 4);
    assert.ok(publicLines[0].includes(`${base}/actions/workflows/ci.yml/badge.svg?branch=main`));
    assert.ok(publicLines[1].includes("codeql.yml/badge.svg"));
    assert.ok(publicLines[2].includes("img.shields.io/github/v/release/acme/demo"));
    assert.ok(publicLines[3].includes("license-MIT") && publicLines[3].endsWith("(LICENSE)"));
    for (const visibility of ["private", undefined]) {
      const lines = badgeLines(rootOf({}), { visibility });
      assert.equal(lines.length, 1, `${visibility}: nothing that needs access to draw`);
      assert.match(lines[0], /license-MIT/);
    }
  });

  test("only the badges that apply: no CodeQL badge without CodeQL, no release badge without release-please, none without a licence", () => {
    const lines = badgeLines(rootOf({ codeql: false, release_please: false }), { visibility: "public" });
    assert.deepEqual(lines.map((l) => l.slice(0, 8)), ["[![CI](h", "[![Licen"]);
    assert.deepEqual(badgeLines(rootOf({ license: "Apache-2.0" }), { visibility: "private" }), []);
    assert.match(badgeLines(rootOf({}), { visibility: "private", licenseFile: false })[0], /opensource\.org/);
  });

  test("the block goes under the first title, replaces itself, and leaves the rest alone", () => {
    const block = badgeBlock(["[![A](a)](a)"]);
    const readme = "# Demo\n\nA demo.\n\n## Usage\n\n# Another title\n";
    const once = insertBlock(readme, block);
    assert.equal(once, `# Demo\n\n${block}\n\nA demo.\n\n## Usage\n\n# Another title\n`);
    assert.equal(insertBlock(once, block), once, "idempotent");
    const next = insertBlock(once, badgeBlock(["[![B](b)](b)"]));
    assert.ok(next.includes("[![B](b)](b)") && !next.includes("[![A](a)](a)"), "replaced between the markers");
    assert.ok(next.startsWith("# Demo\n\n") && next.endsWith("# Another title\n"));
    assert.equal(insertBlock("no title here\n", block), `${block}\n\nno title here\n`);
    assert.ok(once.includes(START) && once.includes(END));
    assert.equal(insertBlock("# T\n", block).split(START).length, 2);
  });

  test("the command prints by default, writes with --apply, and respects the visibility", () => {
    const script = path.join(SKILL, "scripts", "foundation.mjs");
    const env = { ...process.env, PROJECT_FOUNDATION_NO_GH: "1" };
    const repo = fresh("badges");
    init({ config: { ...BASE, profile: "go" }, target: repo });
    writeFileSync(path.join(repo, "README.md"), "# demo\n\nA demo.\n");
    const run = (...args) => spawnSync(process.execPath, [script, "badges", ...args], { cwd: repo, encoding: "utf8", env });
    const unknown = run();
    assert.equal(unknown.status, 0);
    assert.match(unknown.stdout, /visibility unknown/);
    assert.ok(!unknown.stdout.includes("actions/workflows"));
    const printed = run("--public");
    assert.ok(printed.stdout.includes("actions/workflows/ci.yml/badge.svg") && printed.stdout.includes(START));
    assert.equal(read(repo, "README.md"), "# demo\n\nA demo.\n", "printing writes nothing");
    assert.match(run("--public", "--apply").stdout, /README\.md updated/);
    assert.match(read(repo, "README.md"), /^# demo\n\n<!-- badges:start -->\n\[!\[CI\]/);
    assert.match(run("--public", "--apply").stdout, /already has these badges/);
    assert.match(run("--private", "--apply").stdout, /README\.md updated/, "a change of visibility rewrites the block");
    assert.ok(!read(repo, "README.md").includes("actions/workflows"));
    const lost = fresh("nobadge");
    init({ config: { ...BASE, profile: "go" }, target: lost });
    rmSync(path.join(lost, "README.md"));
    const missing = spawnSync(process.execPath, [script, "badges", "--apply", "--public"], { cwd: lost, encoding: "utf8", env });
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /README\.md not found/);
  });
});

describe("the site", () => {
  test("is built from the real tool, and says one number everywhere", () => {
    const built = spawnSync(process.execPath, [path.join(SKILL, "..", "..", "scripts", "build-site.mjs")], { encoding: "utf8" });
    assert.equal(built.status, 0, built.stderr);
    const site = path.join(SKILL, "..", "..", "site");
    const html = readFileSync(path.join(site, "index.html"), "utf8");
    assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/, "no placeholder is left");
    const slip = Number(/You hold (\d+) files/.exec(html)?.[1]);
    const demo = Number(/data-total>(\d+)</.exec(html)?.[1]);
    const shown = (html.match(/class="tree-file"/g) ?? []).length;
    assert.ok(slip > 30, "the itinerary names the real count");
    assert.deepEqual([demo, shown], [slip, slip], "the itinerary, the counter and the tree agree");
    const created = slip;
    // What looks like output is output: the refusals are the hooks' own words.
    assert.match(html, /you are on main\. Create a branch first/);
    assert.match(html, /refusing to push to main\. Push a branch and open a pull request/);
    assert.match(html, /<h1 class="statement">[\s\S]*One rules file\.[\s\S]*Every agent follows it\./);
    assert.doesNotMatch(html, /portrait-of-an-ant-profile-view\.jpg[\s\S]*Nepal/, "no picture of people");
    for (const image of html.match(/assets\/[\w.-]+\.jpg/g) ?? []) assert.ok(existsSync(path.join(site, image)), `${image} exists`);
    const data = JSON.parse(readFileSync(path.join(site, "data.json"), "utf8"));
    assert.equal(data.totals[data.startMask], created);
    assert.equal(data.version, readFileSync(path.join(SKILL, "VERSION"), "utf8").trim());
    for (const sw of data.switches) assert.ok(sw.added.length > 0, `${sw.key} adds files`);
  });
});

describe("YAML", () => {
  test("every generated workflow and config parses", (t) => {
    const modules = process.env.YAML_NODE_PATH;
    if (!modules) return t.skip("set YAML_NODE_PATH to a node_modules folder with the `yaml` package");
    const { parse } = createRequire(path.join(modules, "x.js"))("yaml");
    for (const [key, root] of outputs) {
      for (const file of walk(root).filter((f) => /\.ya?ml$/.test(f))) {
        assert.doesNotThrow(() => parse(readFileSync(file, "utf8")), `${key} ${path.relative(root, file)}`);
      }
    }
    const nix = render({ ...MONO, nix: true, spec_driven: false }, "yaml-nix");
    for (const file of walk(nix).filter((f) => /\.ya?ml$/.test(f))) parse(readFileSync(file, "utf8"));
  });
});
