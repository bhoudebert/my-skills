// project-foundation site: the live demo, the question index, the small entrances and the copy button. No dependencies.
// Without script everything is readable: every state hidden below is set only once this file runs.
(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // ------------------------------------------------------------------ the demo: real answers, real files
  const data = JSON.parse(document.getElementById("switch-data").textContent);
  const treeEl = document.querySelector("[data-tree]");
  const totalEl = document.querySelector("[data-total]");
  const toggles = [...document.querySelectorAll(".toggle")];
  let mask = data.startMask;

  const renderTree = (files, added) => {
    const dirs = {};
    for (const file of files) {
      const parts = file.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
      (dirs[dir] ??= []).push(parts.at(-1));
    }
    treeEl.replaceChildren(
      ...Object.entries(dirs).map(([dir, names]) => {
        const row = el("span", "tree-dir");
        row.append(el("span", "tree-name", dir === "." ? "./" : `${dir}/`));
        for (const name of names) {
          row.append(" ", el("span", `tree-file${added.has(dir === "." ? name : `${dir}/${name}`) ? " is-new" : ""}`, name));
        }
        return row;
      }),
    );
  };
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const before = new Set(data.filesByMask[mask]);
      mask ^= 1 << Number(toggle.dataset.bit);
      toggle.setAttribute("aria-checked", String(Boolean(mask & (1 << Number(toggle.dataset.bit)))));
      const files = data.filesByMask[mask];
      renderTree(files, new Set(files.filter((f) => !before.has(f))));
      totalEl.textContent = String(files.length);
    });
  });

  // ------------------------------------------------------------------ the question index: one answer, in large type
  const faq = document.querySelector(".faq");
  const items = [...document.querySelectorAll(".qa")];
  const phone = window.matchMedia("(max-width: 820px)");
  if (faq && items.length) {
    const pane = document.createElement("div");
    pane.className = "faq-pane";
    pane.setAttribute("aria-live", "polite");
    faq.appendChild(pane);
    let current = -1;
    const select = (index) => {
      if (index === current) return;
      current = index;
      items.forEach((item, i) => {
        item.classList.toggle("is-open", i === index);
        item.querySelector("button").setAttribute("aria-expanded", String(i === index));
      });
      pane.classList.add("is-changing");
      setTimeout(() => {
        pane.replaceChildren(...items[index].querySelector(".qa-a").cloneNode(true).childNodes);
        pane.classList.remove("is-changing");
      }, 150);
    };
    items.forEach((item, i) => {
      const button = item.querySelector("button");
      button.addEventListener("click", () => select(i));
      button.addEventListener("focus", () => select(i));
      button.addEventListener("mouseenter", () => { if (!phone.matches) select(i); });
    });
    pane.replaceChildren(...items[0].querySelector(".qa-a").cloneNode(true).childNodes);
    current = 0;
  }

  // ------------------------------------------------------------------ small entrances, once
  const seen = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        seen.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
  );
  // The parts of each section enter in turn: the rows of the slip, the controls, the questions.
  document.querySelectorAll(".row, .slip-head, .control, .qa, .door").forEach((part) => part.classList.add("reveal"));
  document.querySelectorAll(".reveal").forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--delay", `${Math.max(0, siblings.indexOf(el)) * 70}ms`);
    seen.observe(el);
  });

  // ------------------------------------------------------------------ copy the command
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const label = button.textContent;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy it from the page";
      }
      setTimeout(() => (button.textContent = label), 1800);
    });
  });
})();
