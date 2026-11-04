// project-foundation site: the switches, the entrances and the copy button. No dependencies.
// Without script everything is readable: the hidden states below are set only once this file runs.
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");

  // ------------------------------------------------------------------ the switches: real answers, real counts
  const data = JSON.parse(document.getElementById("switch-data").textContent);
  const bands = [...document.querySelectorAll(".band:not(.band-total)")];
  const totalEl = document.querySelector("[data-total]");
  let mask = data.startMask;

  const render = () => {
    bands.forEach((band) => {
      const bit = Number(band.querySelector(".toggle").dataset.bit);
      const on = Boolean(mask & (1 << bit));
      band.classList.toggle("is-on", on);
      band.querySelector(".toggle").setAttribute("aria-checked", String(on));
      const effect = band.querySelector(".band-effect");
      const item = data.switches[bit];
      const names = item.added.slice(0, 3).join(", ") + (item.added.length > 3 ? ` and ${item.added.length - 3} more` : "");
      effect.textContent = `+${item.added.length} ${item.added.length === 1 ? "file" : "files"}: ${names}. ${data.totals[mask]} in all.`;
    });
    if (totalEl) totalEl.textContent = String(data.totals[mask]);
  };
  bands.forEach((band) => {
    const toggle = band.querySelector(".toggle");
    const flip = () => {
      mask ^= 1 << Number(toggle.dataset.bit);
      render();
    };
    toggle.addEventListener("click", flip);
    // The whole band answers a click on its sentence too, with a thumb on a phone.
    band.querySelector(".band-sentence").addEventListener("click", flip);
  });
  render();

  // ------------------------------------------------------------------ fit the big words to their measure
  // The display face is condensed, so a size in vw is a guess. Measure the real text and set the size that fills the measure.
  const textWidth = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().width;
  };
  const fitSize = (elements, measure, probe = 100) => {
    const saved = elements.map((el) => el.style.fontSize);
    elements.forEach((el) => (el.style.fontSize = `${probe}px`));
    const widest = Math.max(...elements.map(textWidth));
    elements.forEach((el, i) => (el.style.fontSize = saved[i]));
    return widest ? (probe * measure) / widest : 0;
  };
  const fit = () => {
    const set = (name, px) => px > 0 && root.style.setProperty(name, `${px.toFixed(1)}px`);
    const hero = document.querySelector(".statement");
    if (hero) {
      const byWidth = fitSize([...hero.querySelectorAll(".line-in")], hero.clientWidth);
      const byHeight = (innerHeight - 330) / (2 * 0.86);
      set("--hero-size", Math.min(byWidth * 0.99, byHeight));
    }
    const cta = document.querySelector(".statement-2");
    if (cta) set("--cta-size", Math.min(fitSize([...cta.querySelectorAll(".line-in")], cta.clientWidth), innerHeight * 0.42));
    const boxes = [...document.querySelectorAll(".specimen-box")];
    if (boxes.length) {
      // One size for both: the longer word spans the page, the shorter one steps to the other side.
      const measure = boxes[0].closest(".specimens").clientWidth;
      const padding = (box) => parseFloat(getComputedStyle(box).paddingInline) * 2;
      const sizes = boxes.map((box) => fitSize([box.querySelector(".specimen-word")], measure - padding(box)));
      set("--spec-size", Math.min(...sizes) * 0.985);
    }
  };
  fit();
  if (document.fonts?.ready) document.fonts.ready.then(fit);
  let fitting = false;
  addEventListener("resize", () => { if (!fitting) { fitting = true; requestAnimationFrame(() => { fit(); fitting = false; }); } });

  // ------------------------------------------------------------------ the masked headline on load
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));

  // ------------------------------------------------------------------ entrances, staggered, once
  const seen = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        seen.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  document.querySelectorAll(".reveal, .statement-2").forEach((el, i, all) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--delay", `${Math.max(0, siblings.indexOf(el)) * 75}ms`);
    seen.observe(el);
  });

  // ------------------------------------------------------------------ the photograph drifts as the page scrolls
  const photo = document.querySelector(".photo-img");
  if (photo && !reduced) {
    let ticking = false;
    const frame = photo.parentElement;
    const update = () => {
      const r = frame.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
      photo.style.transform = `translate3d(0, ${(-progress * 15).toFixed(2)}%, 0)`;
      ticking = false;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ------------------------------------------------------------------ copy the command
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const label = button.textContent;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select and copy it above";
      }
      setTimeout(() => (button.textContent = label), 1800);
    });
  });
})();
