#!/usr/bin/env node
// Builds site/ from the real tool: runs the engine and the generated hooks in a throwaway repository and puts what they
// really print on the page. Nothing on the site that looks like output is typed by hand.
//
//   node scripts/build-site.mjs            writes site/data.json and site/index.html (from site/src/)
//
// Node standard library only.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { init, plan, upgrade } from "../skills/project-foundation/scripts/foundation.mjs";
import { interview } from "../skills/project-foundation/scripts/lib/interview.mjs";
import { buildDocsSite } from "./build-docs-site.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const config = JSON.parse(readFileSync(path.join(SITE, "src", "config.json"), "utf8"));
const VERSION = readFileSync(path.join(ROOT, "skills/project-foundation/VERSION"), "utf8").trim();

const tmp = mkdtempSync(path.join(os.tmpdir(), "site-"));
const sh = (cmd, args, options = {}) => spawnSync(cmd, args, { encoding: "utf8", ...options });
const git = (repo, ...args) => sh("git", ["-C", repo, "-c", "user.name=Ada", "-c", "user.email=ada@example.com", ...args]);
const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const BASE = { project_name: "billing", project_slug: "billing", description: "Invoicing for small shops.", owner: "acme", repo: "billing", profile: "node", no_attribution: true };

// ------------------------------------------------------------------------------------------------ the switches
// Each is a real answer of the tool. The consequence is the difference in the files it would write.
const SWITCHES = [
  { key: "release_please", label: "Releases as pull requests", sentence: "Releases open themselves as a pull request.", on: true },
  { key: "dependabot", label: "Weekly dependency updates", sentence: "Dependencies are bumped every week.", on: true },
  { key: "nix", label: "Nix dev shell", sentence: "Every contributor gets the same toolchains.", on: false },
  // On, as the interview proposes it for a public repository; off for a private one without GitHub Code Security.
  { key: "codeql", label: "CodeQL scanning", sentence: "Code is scanned for vulnerabilities.", on: true },
  { key: "spec_driven", label: "Specs checked against code", sentence: "Behaviour is specified before it is coded.", on: false },
];
const answersFor = (mask) => ({ ...BASE, ...Object.fromEntries(SWITCHES.map((s, i) => [s.key, Boolean(mask & (1 << i))])) });
const filesFor = (mask) => plan(answersFor(mask), null).files.map((f) => f.dest);

const totals = {};
for (let mask = 0; mask < 1 << SWITCHES.length; mask++) totals[mask] = filesFor(mask).length;
const startMask0 = 0;
const startMask = SWITCHES.reduce((m, s, i) => (s.on ? m | (1 << i) : m), 0);
const switches = SWITCHES.map((s, i) => {
  const without = filesFor(startMask & ~(1 << i));
  const withIt = filesFor(startMask | (1 << i));
  const added = withIt.filter((f) => !without.includes(f));
  return { ...s, bit: i, added };
});

// ------------------------------------------------------------------------------------------------ timings
const timings = [];
for (let i = 0; i < 7; i++) {
  const target = path.join(tmp, `time-${i}`);
  const t0 = performance.now();
  init({ config: answersFor(startMask), target });
  timings.push(performance.now() - t0);
}
timings.sort((a, b) => a - b);
const writeMs = Math.round(timings[Math.floor(timings.length / 2)]);

// ------------------------------------------------------------------------------------------------ the init session
const repo = path.join(tmp, "billing");
mkdirSync(repo);
writeFileSync(path.join(repo, "package.json"), JSON.stringify({ name: "billing", description: "Invoicing for small shops." }));
git(repo, "init", "-q", "-b", "main");
git(repo, "remote", "add", "origin", "git@github.com:acme/billing.git");
process.env.PROJECT_FOUNDATION_NO_GH = "1";
const transcript = [];
const asker = {
  ask: async (question, fallback = "") => {
    transcript.push({ q: question, a: fallback });
    return fallback;
  },
  yesNo: async (question, fallback) => {
    transcript.push({ q: question, a: fallback ? "y" : "n" });
    return fallback;
  },
};
const found = [];
const answers = await interview(repo, asker, { hasNix: false, out: (t) => found.push(t) });
const initReport = init({ config: answers, target: repo });

// ------------------------------------------------------------------------------------------------ the file tree
const tree = {};
for (const file of initReport.created.filter((f) => f !== ".project-foundation.json")) {
  const parts = file.split("/");
  const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
  (tree[dir] ??= []).push(parts.at(-1));
}

// What the page says must be one number: the defaults of the switches are the defaults the interview proposes.
const shown = initReport.created.length;
if (shown !== totals[startMask]) {
  throw new Error(`the page would say ${totals[startMask]} files (the switches) and ${shown} (the init session): make the switch defaults match the interview defaults`);
}

// ------------------------------------------------------------------------------------------------ the guards, for real
sh("sh", [path.join(repo, "scripts/setup-hooks.sh")], { cwd: repo });
writeFileSync(path.join(repo, "a.txt"), "1\n");
git(repo, "add", "a.txt");
const first = git(repo, "commit", "-q", "-m", "chore: start");
if (first.status !== 0) throw new Error(`the first commit failed: ${first.stderr}`);
writeFileSync(path.join(repo, "a.txt"), "2\n");
git(repo, "add", "a.txt");
const refusedCommit = git(repo, "commit", "-q", "-m", "fix: change the total");
if (refusedCommit.status === 0) throw new Error("the pre-commit guard did not refuse a commit on main");
const badMessage = (() => {
  git(repo, "switch", "-q", "-c", "fix/total");
  const r = git(repo, "commit", "-q", "-m", "changed the total");
  if (r.status === 0) throw new Error("the commit-msg hook accepted a bad message");
  return r.stderr;
})();
const refusedPush = sh("sh", [path.join(repo, ".githooks/pre-push")], { cwd: repo, input: "refs/heads/fix/total abc refs/heads/main def\n" });
if (refusedPush.status === 0) throw new Error("the pre-push guard did not refuse a push to main");

// ------------------------------------------------------------------------------------------------ the upgrade states, for real
const up = path.join(tmp, "upgrade");
const upAnswers = { ...BASE, profile: "python" };
init({ config: upAnswers, target: up });
writeFileSync(path.join(up, ".githooks/pre-push"), readFileSync(path.join(up, ".githooks/pre-push"), "utf8").replace("ruff check . && ruff format --check . && pytest", "flake8 . && pytest"));
writeFileSync(path.join(up, "SUPPORT.md"), "# Support\n\nWrite to the maintainer.\n");
const before = upgrade({ target: up, config: { ...upAnswers, quality_cmd: "flake8 . && pytest" } });
const states = [
  ...before.update.map((f) => ({ state: "update", file: f })),
  ...before.conflict.map((f) => ({ state: "conflict", file: f })),
  ...before.edited.map((f) => ({ state: "kept", file: f })),
];

// ------------------------------------------------------------------------------------------------ data and page
const filesByMask = Object.fromEntries(Array.from({ length: 1 << SWITCHES.length }, (_, mask) => [mask, filesFor(mask)]));
const data = { version: VERSION, filesByMask, writeMs, files: totals[startMask], totals, switches, startMask, tree, transcript, found, refused: { commit: refusedCommit.stderr, badMessage, push: refusedPush.stderr }, states, stacks: ["Node", "Java", "Rust", "Python", "Go"] };
writeFileSync(path.join(SITE, "data.json"), JSON.stringify(data, null, 2) + "\n");

const treeHtml = Object.entries(tree)
  .map(([dir, names]) => `<div class="tree-dir"><span class="tree-name">${escapeHtml(dir === "." ? "./" : `${dir}/`)}</span> ${names.map((n) => `<span class="tree-file">${escapeHtml(n)}</span>`).join(" ")}</div>`)
  .join("\n");
const transcriptHtml = [
  `<span class="t-dim">$</span> project-foundation init`,
  ...found.map((l) => escapeHtml(l)),
  ...transcript.map((t) => `${escapeHtml(t.q)} <span class="t-answer">${escapeHtml(t.a)}</span>`),
  "",
  `<span class="t-ok">${initReport.created.length} file(s) created</span>`,
].join("\n");
const guardHtml = [
  `<span class="t-dim">$</span> git commit -m "fix: change the total"   <span class="t-dim"># on main</span>`,
  escapeHtml(refusedCommit.stderr.trim()),
  "",
  `<span class="t-dim">$</span> git commit -m "changed the total"   <span class="t-dim"># on a branch</span>`,
  escapeHtml(badMessage.trim().split("\n").slice(0, 2).join("\n")),
  "",
  `<span class="t-dim">$</span> git push origin fix/total:main`,
  escapeHtml(refusedPush.stderr.trim()),
].join("\n");
const upgradeHtml = [
  `<span class="t-dim">$</span> project-foundation upgrade`,
  ...["update", "conflict", "kept"].flatMap((state) => {
    const files = states.filter((s) => s.state === state).map((s) => s.file);
    const label = { update: "can be updated from the templates", conflict: "changed in the templates and edited here", kept: "edited here, unchanged in the templates (kept)" }[state];
    return files.length ? [`${files.length} file(s) ${label}:`, ...files.map((f) => `  ${escapeHtml(f)}`)] : [];
  }),
].join("\n");

const faq = JSON.parse(readFileSync(path.join(SITE, "src", "faq.json"), "utf8"));
const faqHtml = faq.map((item) => `<p class="faq-item"><span class="faq-q">${escapeHtml(item.q)}</span> ${item.a}</p>`).join("\n");

const bandsHtml = [
  ...switches.map((s) => {
    const names = s.added.slice(0, 3).map(escapeHtml).join(", ") + (s.added.length > 3 ? ` and ${s.added.length - 3} more` : "");
    return `    <div class="band${s.on ? " is-on" : ""}" data-tone="${s.bit % 3}">
      <p class="band-sentence" id="sw-${s.key}">${escapeHtml(s.sentence)}</p>
      <button class="toggle" type="button" role="switch" aria-checked="${s.on}" aria-labelledby="sw-${s.key}" data-ui data-bit="${s.bit}"><span class="knob"></span></button>
      <p class="band-effect">+${s.added.length} ${s.added.length === 1 ? "file" : "files"}: ${names}.</p>
    </div>`;
  }),
  `    <div class="band band-total is-on" data-tone="1">
      <p class="band-sentence">Together: <span data-total>${totals[startMask]}</span> files.</p>
    </div>`,
].join("\n");

const treeFor = (files) => {
  const dirs = {};
  for (const f of files) {
    const parts = f.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    (dirs[dir] ??= []).push(parts.at(-1));
  }
  return Object.entries(dirs)
    .map(([dir, names]) => `<span class="tree-dir"><span class="tree-name">${escapeHtml(dir === "." ? "./" : `${dir}/`)}</span> ${names.map((n) => `<span class="tree-file">${escapeHtml(n)}</span>`).join(" ")}</span>`)
    .join("");
};
const qaHtml = faq
  .map((item, i) => `      <div class="qa${i === 0 ? " is-open" : ""}">
        <h3 class="qa-q"><button type="button" aria-expanded="${i === 0}">${escapeHtml(item.q)}</button></h3>
        <div class="qa-a">${item.a}</div>
      </div>`)
  .join("\n");
const controlsHtml = switches
  .map((s) => `        <div class="control">
          <span class="control-name" id="sw-${s.key}">${escapeHtml(s.label)}</span>
          <button class="toggle" type="button" role="switch" aria-checked="${s.on}" aria-labelledby="sw-${s.key}" data-ui data-bit="${s.bit}"><span class="knob"></span></button>
        </div>`)
  .join("\n");

const stageDuration = (ms) => (ms < 1000 ? "Under a second" : `${(ms / 1000).toFixed(1)} seconds`);
const replacements = {
  NAME: config.name,
  SITE: config.site,
  REPO_URL: `https://github.com/${config.owner}/${config.repo}`,
  INSTALL: `npx skills add ${config.owner}/${config.repo}`,
  VERSION,
  FILES: String(data.files),
  WRITE_DURATION: stageDuration(writeMs).toLowerCase(),
  SWITCHES_JSON: JSON.stringify({ switches: switches.map(({ key, label, sentence, on, bit, added }) => ({ key, label, sentence, on, bit, added })), totals, startMask, filesByMask }).replace(/</g, "\\u003c"),
  TREE: treeHtml,
  TRANSCRIPT: transcriptHtml,
  GUARDS: guardHtml,
  UPGRADE: upgradeHtml,
  FAQ: faqHtml,
  QA: qaHtml,
  CONTROLS: controlsHtml,
  DEMO_TREE: treeFor(filesFor(startMask)),
  DEMO_COUNT: String(totals[startMask]),
  CREDITS: readFileSync(path.join(SITE, "src", "credits.html"), "utf8").trim(),
};
let html = readFileSync(path.join(SITE, "src", "index.template.html"), "utf8");
for (const [key, value] of Object.entries(replacements)) html = html.replaceAll(`{{${key}}}`, value);
const left = html.match(/\{\{[A-Z_]+\}\}/g);
if (left) throw new Error(`unfilled placeholders: ${[...new Set(left)].join(", ")}`);
writeFileSync(path.join(SITE, "index.html"), html);
rmSync(tmp, { recursive: true, force: true });
const docs = buildDocsSite();
console.log(`site/index.html and ${docs.length} documentation pages written: ${data.files} files by default, generated in ${writeMs} ms, version ${VERSION}`);
