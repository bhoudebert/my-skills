#!/usr/bin/env node
// Renders the Markdown documentation as guided pages on the site: a sidebar in reading order, "on this page", search, previous
// and next, and links between pages that work. The Markdown stays the source; nothing is written twice.
//
//   node scripts/build-docs-site.mjs      writes site/docs/, site/images/ and the search index (all git-ignored)
//
// `marked` is a dev dependency of the site build only: the engine itself uses the Node standard library.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { ROOT, nav, pagesInOrder, titleOf } from "./docs.mjs";

const SITE = path.join(ROOT, "site");
const config = JSON.parse(readFileSync(path.join(SITE, "src", "config.json"), "utf8"));
const REPO = `https://github.com/${config.owner}/${config.repo}`;
const NAV_BLOCK = /<!-- docs-nav:start -->[\s\S]*?<!-- docs-nav:end -->/;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const read = (file) => readFileSync(path.join(ROOT, file), "utf8");

/** Where a Markdown file of the repository lives on the site, relative to the site root. */
export function siteUrl(file) {
  const base = path.posix.basename(file).replace(/\.md$/, "").toLowerCase();
  if (file === "docs/README.md") return "docs/index.html";
  if (file === "docs/adr/README.md") return "docs/adr/index.html";
  if (file.startsWith("docs/")) return `${path.posix.dirname(file)}/${base}.html`;
  if (file.startsWith("skills/project-foundation/references/")) return `docs/reference/${base}.html`;
  return `docs/${base}.html`; // the files at the root: CONTRIBUTING, ROADMAP, CHANGELOG…
}

const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/ /g, "-");

const rel = (fromUrl, toUrl) => {
  const r = path.posix.relative(path.posix.dirname(fromUrl), toUrl);
  return r === "" ? path.posix.basename(toUrl) : r;
};

// ------------------------------------------------------------------------------------------------ the renderer
let current = { file: "", url: "", headings: [] };

function resolveTarget(href) {
  if (/^(https?:|mailto:)/.test(href) || href.startsWith("#")) return { kind: "keep", href };
  const [filePart, anchor] = href.split("#");
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(current.file), filePart));
  const hash = anchor ? `#${anchor}` : "";
  if (target.endsWith(".md") && existsSync(path.join(ROOT, target))) return { kind: "page", href: rel(current.url, siteUrl(target)) + hash };
  if (target.startsWith("docs/images/")) return { kind: "image", href: rel(current.url, `images/${path.posix.basename(target)}`) };
  if (!existsSync(path.join(ROOT, target))) return { kind: "keep", href };
  const isDir = statSync(path.join(ROOT, target)).isDirectory();
  return { kind: "repo", href: `${REPO}/${isDir ? "tree" : "blob"}/main/${target}${hash}` };
}

marked.use({
  gfm: true,
  renderer: {
    heading({ tokens, depth, text }) {
      const id = slug(text);
      if (depth >= 2 && depth <= 3) current.headings.push({ depth, id, text: text.replace(/`/g, "") });
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
    },
    link({ href, title, tokens }) {
      const target = resolveTarget(href);
      const external = /^https?:/.test(target.href);
      return `<a href="${esc(target.href)}"${title ? ` title="${esc(title)}"` : ""}${external ? ' rel="noopener"' : ""}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, title, text }) {
      const target = resolveTarget(href);
      return `<img src="${esc(target.href)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy">`;
    },
    code({ text, lang }) {
      return `<div class="code-block"><button class="copy" type="button" aria-label="Copy this code">Copy</button><pre><code${lang ? ` class="language-${esc(lang)}"` : ""}>${esc(text)}</code></pre></div>\n`;
    },
  },
});

function render(file) {
  const url = siteUrl(file);
  current = { file, url, headings: [] };
  let md = read(file).replace(NAV_BLOCK, "");
  // The first heading is the page title, set in the template: drop it from the body.
  md = md.replace(/^# .+\n+/, "");
  let html = marked.parse(md);
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  return { html, headings: current.headings, url };
}

// ------------------------------------------------------------------------------------------------ the pages
const pagesFrom = () => {
  const adr = readdirSync(path.join(ROOT, "docs", "adr")).filter((n) => /^\d{4}-.+\.md$/.test(n)).map((n) => `docs/adr/${n}`);
  return [...new Set([...pagesInOrder(), ...adr, "docs/adr/template.md"])];
};

function sidebar(url) {
  return nav()
    .map((section) => {
      const items = section.pages
        .map((page) => {
          const href = rel(url, siteUrl(page));
          const active = siteUrl(page) === url;
          return `<li><a href="${esc(href)}"${active ? ' aria-current="page"' : ""}>${esc(titleOf(page))}</a></li>`;
        })
        .join("");
      return `<div class="nav-section"><h2>${esc(section.title)}</h2><ul>${items}</ul></div>`;
    })
    .join("\n");
}

const plain = (html) => html.replace(/<pre[\s\S]*?<\/pre>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

export function buildDocsSite() {
  const template = readFileSync(path.join(SITE, "src", "doc.template.html"), "utf8");
  rmSync(path.join(SITE, "docs"), { recursive: true, force: true });
  mkdirSync(path.join(SITE, "docs"), { recursive: true });
  rmSync(path.join(SITE, "images"), { recursive: true, force: true });
  cpSync(path.join(ROOT, "docs", "images"), path.join(SITE, "images"), { recursive: true });

  const order = pagesInOrder();
  const index = [];
  const written = [];
  for (const file of pagesFrom()) {
    const { html, headings, url } = render(file);
    const root = path.posix.relative(path.posix.dirname(url), ".") || ".";
    const i = order.indexOf(file);
    const link = (page) => (page ? `<a href="${esc(rel(url, siteUrl(page)))}"><span>${page === order[i - 1] ? "Previous" : "Next"}</span>${esc(titleOf(page))}</a>` : "");
    const toc = headings.length
      ? `<nav class="toc" aria-label="On this page"><h2>On this page</h2><ul>${headings.map((h) => `<li class="d${h.depth}"><a href="#${h.id}">${esc(h.text)}</a></li>`).join("")}</ul></nav>`
      : "";
    const title = titleOf(file);
    const page = template
      .replaceAll("{{TITLE}}", esc(title))
      .replaceAll("{{ROOT}}", root)
      .replaceAll("{{NAME}}", esc(config.name))
      .replaceAll("{{SIDEBAR}}", sidebar(url))
      .replaceAll("{{CONTENT}}", html)
      .replaceAll("{{TOC}}", toc)
      .replaceAll("{{PREV}}", link(order[i - 1]))
      .replaceAll("{{NEXT}}", link(order[i + 1]))
      .replaceAll("{{EDIT_URL}}", `${REPO}/edit/main/${file}`)
      .replaceAll("{{REPO_URL}}", REPO)
      .replaceAll("{{SITE}}", config.site)
      .replaceAll("{{URL}}", `${config.site}${url}`);
    const out = path.join(SITE, url);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, page);
    written.push(url);
    index.push({ title, url, section: nav().find((s) => s.pages.includes(file))?.title ?? "The project", text: `${headings.map((h) => h.text).join(". ")}. ${plain(html)}`.slice(0, 6000) });
  }
  writeFileSync(path.join(SITE, "docs", "search.json"), JSON.stringify(index));
  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const written = buildDocsSite();
  console.log(`${written.length} documentation page(s) written to site/docs/`);
}
