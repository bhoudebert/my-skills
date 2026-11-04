#!/usr/bin/env node
// Renders the real output of the tool to PNG for the documentation: the init session, the files it wrote, what git says,
// what upgrade says. The text comes from site/data.json, which scripts/build-site.mjs captures by running the engine and the
// generated hooks. Needs Chromium or Chrome (set CHROME_PATH); the PNGs are committed, so CI does not need a browser.
//
//   node scripts/build-site.mjs && node scripts/build-images.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "images");
const data = JSON.parse(readFileSync(path.join(ROOT, "site", "data.json"), "utf8"));

const chrome =
  process.env.CHROME_PATH ??
  ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "microsoft-edge"].find(
    (name) => spawnSync("sh", ["-c", `command -v ${name}`]).status === 0,
  );
if (!chrome) throw new Error("No Chromium or Chrome found: set CHROME_PATH");

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dim = (t) => `<span class="dim">${esc(t)}</span>`;
const answer = (t) => `<span class="answer">${esc(t)}</span>`;
const ok = (t) => `<span class="ok">${esc(t)}</span>`;

// ------------------------------------------------------------------------------------------------ the four screens
const screens = {
  "init-session": [
    `${dim("$")} project-foundation init`,
    ...data.found.map(esc),
    ...data.transcript.map((t) => `${esc(t.q)} ${answer(t.a)}`),
    "",
    ok(`${data.files} file(s) created`),
  ],
  "generated-tree": [
    `${dim("$")} project-foundation init --dry-run`,
    ok(`${data.files} file(s) would be created:`),
    ...Object.entries(data.tree).flatMap(([dir, names]) => names.map((n) => `  ${dir === "." ? "" : `${dir}/`}${n}`)).map(esc),
  ],
  refused: [
    `${dim("$")} git commit -m "fix: change the total"   ${dim("# on main")}`,
    ...data.refused.commit.trim().split("\n").map(esc),
    "",
    `${dim("$")} git commit -m "changed the total"   ${dim("# on a branch")}`,
    ...data.refused.badMessage.trim().split("\n").slice(0, 2).map(esc),
    "",
    `${dim("$")} git push origin fix/total:main`,
    ...data.refused.push.trim().split("\n").map(esc),
  ],
  upgrade: [
    `${dim("$")} project-foundation upgrade`,
    ...["update", "conflict", "kept"].flatMap((state) => {
      const files = data.states.filter((s) => s.state === state).map((s) => s.file);
      const label = { update: "can be updated from the templates (--apply)", conflict: "changed in the templates and edited here", kept: "edited here, unchanged in the templates (kept)" }[state];
      return files.length ? [`${ok(`${files.length} file(s)`)} ${esc(label)}:`, ...files.map((f) => `  ${esc(f)}`)] : [];
    }),
  ],
};

const page = (lines) => `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;background:#0b0c0e}
  pre{margin:0;padding:28px 32px;width:max-content;max-width:1180px;color:#eef0f3;font:15px/1.65 ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,"DejaVu Sans Mono",monospace;white-space:pre-wrap}
  .dim{color:#8e95a3}.answer{color:#8f97ff}.ok{color:#8f97ff}
</style><pre>${lines.join("\n")}</pre>`;

// ------------------------------------------------------------------------------------------------ the social preview
const markSvg = readFileSync(path.join(OUT, "logo-dark.svg"), "utf8").replace(/<\?xml[^>]*>/, "").replace(/width="64" height="64"/, 'width="220" height="220"');
const social = `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;width:1280px;height:640px;background:#0b0c0e;color:#eef0f3;font-family:"STIX Two Text","Iowan Old Style","Palatino Linotype",Georgia,"Times New Roman",serif}
  .card{display:flex;align-items:center;gap:56px;padding:0 96px;height:640px}
  h1{margin:0;font-weight:400;font-size:84px;letter-spacing:-0.026em;line-height:1.05}
  p{margin:20px 0 0;font-size:36px;line-height:1.25;color:#a8aebb;max-width:640px}
</style><div class="card">${markSvg}<div><h1>project-foundation</h1><p>One rules file for every coding agent. Git and CI hold them to it.</p></div></div>`;

const tmp = mkdtempSync(path.join(os.tmpdir(), "images-"));
{
  const file = path.join(tmp, "social-preview.html");
  writeFileSync(file, social);
  spawnSync(chrome, ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1280,640", `--screenshot=${path.join(OUT, "social-preview.png")}`, `file://${file}`], { timeout: 60000 });
  console.log("docs/images/social-preview.png  1280x640");
}
for (const [name, lines] of Object.entries(screens)) {
  const file = path.join(tmp, `${name}.html`);
  writeFileSync(file, page(lines));
  // Height from the number of lines, then the screenshot: a fixed window, not a guess about the font.
  const longest = Math.max(...lines.map((l) => l.replace(/<[^>]+>/g, "").length));
  const width = Math.min(1180, Math.max(560, Math.round(longest * 9.1) + 70));
  const height = Math.round(lines.length * 24.8 + 64);
  const run = spawnSync(
    chrome,
    ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${width},${height}`, `--screenshot=${path.join(OUT, `${name}.png`)}`, `file://${file}`],
    { encoding: "utf8", timeout: 60000 },
  );
  if (!existsSync(path.join(OUT, `${name}.png`))) throw new Error(`${name}: ${run.stderr}`);
  console.log(`docs/images/${name}.png  ${width}x${height}`);
}
rmSync(tmp, { recursive: true, force: true });
