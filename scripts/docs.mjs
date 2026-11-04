#!/usr/bin/env node
// The documentation, kept connected and true.
//
//   node scripts/docs.mjs write    write the navigation blocks and docs/generated-files.md
//   node scripts/docs.mjs check    fail when either is out of date, or when a link or an image in the Markdown does not resolve
//
// docs/nav.json lists the pages in reading order. Every listed page ends with a generated block (documentation links, previous and
// next), so the Markdown reads as one guide on GitHub as well as on the site. docs/generated-files.md is built from the real
// manifest and assets/descriptions.json, so a file the tool writes cannot go undocumented.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = path.join(ROOT, "skills", "project-foundation");
const START = "<!-- docs-nav:start -->";
const END = "<!-- docs-nav:end -->";

const read = (file) => readFileSync(path.join(ROOT, file), "utf8");
export const nav = () => JSON.parse(read("docs/nav.json"));
export const pagesInOrder = () => nav().flatMap((section) => section.pages);

/** The first `# Title` of a Markdown file. */
export const titleOf = (file) => {
  // The generated page may not exist yet on the first run: its title is the first line it will have.
  const text = file === "docs/generated-files.md" ? generatedFilesPage().text : read(file);
  return /^# (.+)$/m.exec(text)?.[1].replace(/`/g, "") ?? path.basename(file);
};

const rel = (from, to) => {
  const r = path.posix.relative(path.posix.dirname(from), to);
  return r.startsWith(".") ? r : `./${r}`;
};

// ------------------------------------------------------------------------------------------------ the navigation blocks
function navBlock(file) {
  const pages = pagesInOrder();
  const i = pages.indexOf(file);
  const link = (target, label) => `[${label ?? titleOf(target)}](${rel(file, target)})`;
  const lines = [
    START,
    "---",
    `**Documentation:** ${link("docs/start-here.md", "Start here")} · ${link("docs/guides/new-project.md", "Guides")} · ${link("docs/concepts.md", "Concepts")} · ${link("docs/cli.md", "Reference")} · ${link("docs/glossary.md", "Glossary")} · ${link("docs/README.md", "All pages")}`,
    "",
    [i > 0 ? `← ${link(pages[i - 1])}` : null, i < pages.length - 1 ? `${link(pages[i + 1])} →` : null].filter(Boolean).join(" · "),
    END,
  ];
  return lines.join("\n");
}

function withNav(text, file) {
  const block = navBlock(file);
  const marked = new RegExp(`\\n*${START}[\\s\\S]*?${END}\\n*`);
  return marked.test(text) ? text.replace(marked, `\n\n${block}\n`) : `${text.replace(/\n+$/, "")}\n\n${block}\n`;
}

// ------------------------------------------------------------------------------------------------ the generated files page
const WHEN = {
  monorepo: "a monorepo",
  license_mit: "an MIT licence",
  lang_node: "a Node component",
  lang_rust: "a Rust component",
  lang_python: "a Python component",
  dependabot: "Dependabot on",
  codeql: "CodeQL on",
  release_please: "release automation on",
  spec_driven: "spec-driven on",
  nix: "a Nix shell",
};

export function generatedFilesPage() {
  const manifest = JSON.parse(readFileSync(path.join(SKILL, "assets", "manifest.json"), "utf8"));
  const descriptions = JSON.parse(readFileSync(path.join(SKILL, "assets", "descriptions.json"), "utf8"));
  const out = [
    "# Every generated file",
    "",
    "What `project-foundation init` can write, one table per module, and when each file appears. About forty files for a typical project;",
    "the rest depend on your answers. A file that already exists in your repository is never overwritten.",
    "",
    "This page is generated from the tool's own manifest, so a file the tool writes cannot be missing from it:",
    "`node scripts/docs.mjs write` rebuilds it.",
    "",
  ];
  const problems = [];
  for (const [name, module] of Object.entries(manifest.modules)) {
    out.push(`## ${name}`, "", `${module.summary}.`, "");
    out.push("| File | What it is | When |", "| --- | --- | --- |");
    for (const entry of module.files) {
      const key = entry.dest;
      const description = descriptions[key];
      if (!description) problems.push(`assets/descriptions.json has no description for ${key}`);
      const shown = key.replace(/@@component_path@@\//, "`<component folder>/").replace(/@@component_name@@/, "<component>");
      const file = key.includes("@@") ? `${shown.endsWith("`") ? shown : `${shown}\``}` : `\`${key}\``;
      const when = [module.enabled_by && WHEN[module.enabled_by], entry.only && WHEN[entry.only], entry.for_each && "once per component"].filter(Boolean);
      out.push(`| ${file.replace(/``/g, "`")} | ${description ?? ""} | ${when.length ? when.join("; ") : "always"} |`);
    }
    out.push("");
  }
  out.push(
    "`.project-foundation.json` is also written: the skill version, your answers and a hash of each file above, so that `upgrade` can tell a",
    "change in the templates from an edit of yours. Commit it. See [Keep it up to date](guides/keep-up-to-date.md).",
    "",
  );
  return { text: out.join("\n"), problems };
}

// ------------------------------------------------------------------------------------------------ links
const FENCE = /^(```|~~~)/;
const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/ /g, "-");

function headingSlugs(text) {
  const seen = new Map();
  const slugs = new Set();
  let fenced = false;
  for (const line of text.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = /^#{1,6} (.+)$/.exec(line);
    if (!m) continue;
    const base = slug(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    slugs.add(n ? `${base}-${n}` : base);
  }
  return slugs;
}

/** Every Markdown file of the repository that a reader may open, not the generated or vendored ones. */
export function markdownFiles() {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const relative = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "assets", ".taste-skill", "site", "templates"].includes(entry.name)) continue;
        walk(relative);
      } else if (entry.name.endsWith(".md")) found.push(relative);
    }
  };
  readdirSync(ROOT).filter((n) => n.endsWith(".md")).forEach((n) => found.push(n));
  walk("docs");
  walk("skills");
  return found.filter((f) => !f.includes("/templates/"));
}

export function checkLinks() {
  const problems = [];
  for (const file of markdownFiles()) {
    const text = read(file);
    for (const [, target] of text.matchAll(/(?:src|href|srcset)="([^"#][^"]*)"/g)) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), target.split("#")[0]));
      if (!existsSync(path.join(ROOT, resolved))) problems.push(`${file} has src/href ${target}, which does not exist`);
    }
    let fenced = false;
    text.split("\n").forEach((line, index) => {
      if (FENCE.test(line)) fenced = !fenced;
      if (fenced) return;
      const stripped = line.replace(/`[^`]*`/g, "");
      for (const [, target] of stripped.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        if (/^(https?:|mailto:|#$)/.test(target)) continue;
        const [filePart, anchor] = target.split("#");
        const resolved = filePart ? path.posix.normalize(path.posix.join(path.posix.dirname(file), filePart)) : file;
        if (!existsSync(path.join(ROOT, resolved))) {
          problems.push(`${file}:${index + 1} links to ${target}, which does not exist`);
          continue;
        }
        if (anchor && resolved.endsWith(".md") && !headingSlugs(read(resolved)).has(anchor)) {
          problems.push(`${file}:${index + 1} links to ${target}, but ${resolved} has no heading "#${anchor}"`);
        }
      }
    });
  }
  return problems;
}

// ------------------------------------------------------------------------------------------------ commands
export function expected() {
  const files = new Map();
  const generated = generatedFilesPage();
  files.set("docs/generated-files.md", generated.text);
  const pages = pagesInOrder();
  for (const page of pages) {
    const base = page === "docs/generated-files.md" ? generated.text : read(page);
    files.set(page, withNav(base, page));
  }
  return { files, problems: generated.problems };
}

function main(command) {
  const { files, problems } = expected();
  if (command === "write") {
    for (const [file, text] of files) writeFileSync(path.join(ROOT, file), text);
    console.log(`${files.size} page(s) written`);
    return problems.length ? (console.error(problems.join("\n")), 1) : 0;
  }
  if (command === "check") {
    const stale = [...files].filter(([file, text]) => !existsSync(path.join(ROOT, file)) || read(file) !== text).map(([file]) => file);
    const all = [...problems, ...stale.map((f) => `${f} is out of date: run node scripts/docs.mjs write`), ...checkLinks()];
    if (all.length) console.error(all.join("\n"));
    else console.log("the documentation is up to date and every link resolves");
    return all.length ? 1 : 0;
  }
  console.error("usage: node scripts/docs.mjs write | check");
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv[2]);
