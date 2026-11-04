// Documentation pages: the menu on small screens, copy buttons, "on this page", and search. No dependencies.
(() => {
  const root = document.body.dataset.root || ".";

  // ------------------------------------------------------------------ menu
  const menu = document.querySelector(".menu");
  const sidebar = document.getElementById("sidebar");
  menu?.addEventListener("click", () => {
    const open = sidebar.classList.toggle("is-open");
    menu.setAttribute("aria-expanded", String(open));
  });

  // ------------------------------------------------------------------ copy buttons
  document.querySelectorAll(".code-block .copy").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.parentElement.querySelector("code").textContent;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select and copy";
      }
      setTimeout(() => (button.textContent = "Copy"), 1600);
    });
  });

  // ------------------------------------------------------------------ the current section in "on this page"
  const links = [...document.querySelectorAll(".toc a")];
  if (links.length && "IntersectionObserver" in window) {
    const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const seen = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.remove("is-current"));
          byId.get(entry.target.id)?.classList.add("is-current");
        });
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    byId.forEach((_, id) => {
      const heading = document.getElementById(id);
      if (heading) seen.observe(heading);
    });
  }

  // ------------------------------------------------------------------ search over every page
  const input = document.getElementById("q");
  const results = document.getElementById("results");
  if (!input) return;
  let index = null;
  const load = async () => {
    if (index) return index;
    try {
      index = await (await fetch(`${root}/docs/search.json`)).json();
    } catch {
      index = [];
    }
    return index;
  };
  const text = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  };
  const highlight = (value, words) => {
    const fragment = document.createDocumentFragment();
    const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    value.split(pattern).forEach((part, i) => {
      if (i % 2) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        fragment.append(mark);
      } else fragment.append(part);
    });
    return fragment;
  };
  const search = async () => {
    const words = input.value.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    results.replaceChildren();
    if (!words.length) return (results.hidden = true);
    const pages = await load();
    const scored = pages
      .map((page) => {
        const title = page.title.toLowerCase();
        const body = page.text.toLowerCase();
        if (!words.every((w) => title.includes(w) || body.includes(w))) return null;
        return { page, score: words.reduce((n, w) => n + (title.includes(w) ? 10 : 0) + Math.min(5, body.split(w).length - 1), 0) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    if (!scored.length) results.append(text("li", "none", "Nothing found"));
    scored.forEach(({ page }, i) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `${root}/${page.url}`;
      a.setAttribute("role", "option");
      a.setAttribute("aria-selected", String(i === 0));
      const at = page.text.toLowerCase().indexOf(words[0]);
      const snippet = page.text.slice(Math.max(0, at - 40), Math.max(0, at - 40) + 130);
      a.append(text("span", "r-title", page.title), " ", text("span", "r-section", page.section));
      const s = document.createElement("span");
      s.className = "r-snippet";
      s.append(highlight(snippet, words));
      a.append(s);
      li.append(a);
      results.append(li);
    });
    results.hidden = false;
  };
  input.addEventListener("input", search);
  input.addEventListener("focus", search);
  input.addEventListener("keydown", (event) => {
    const options = [...results.querySelectorAll("a")];
    const current = options.findIndex((a) => a.getAttribute("aria-selected") === "true");
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options.forEach((a, i) => a.setAttribute("aria-selected", String(i === next)));
    } else if (event.key === "Enter" && options[current]) {
      location.href = options[current].href;
    } else if (event.key === "Escape") {
      results.hidden = true;
      input.blur();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search")) results.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      event.preventDefault();
      input.focus();
    }
  });
})();
