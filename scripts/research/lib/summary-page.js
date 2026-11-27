// Page script of the research summary. summary-html.ts inlines this file verbatim and puts its
// SHA-256 into the page CSP, so it must stay one plain script: no imports, no network API.
// Every dynamic node is made with createElement and textContent; links are http(s) only.
(() => {
  const data = JSON.parse(document.getElementById("data").textContent);
  const byId = new Map(data.concepts.map((c) => [c.id, c]));
  const prereqs = new Map(data.concepts.map((c) => [c.id, c.prerequisites]));
  const unlocks = new Map();
  for (const c of data.concepts) {
    for (const p of c.prerequisites) {
      if (!unlocks.has(p)) unlocks.set(p, []);
      unlocks.get(p).push(c.id);
    }
  }
  const geo = new Map(data.layout.nodes.map((n) => [n.id, n]));
  const W = data.layout.width;
  const H = data.layout.height;

  const box = document.getElementById("graph-box");
  const svg = document.getElementById("graph-svg");
  const panel = document.getElementById("detail");
  const viewButton = document.getElementById("btn-view");
  const zoomGroup = document.getElementById("zoom");
  const chips = [...document.querySelectorAll("button.chip")];
  const nodes = new Map();
  for (const g of document.querySelectorAll("g.node")) nodes.set(g.getAttribute("data-id"), g);
  const edges = [...document.querySelectorAll("path.edge")];

  const state = { id: data.defaultId, part: "all", view: "focus", zoom: 1, x: 0, y: 0 };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round1 = (v) => Math.round(v * 10) / 10;

  function make(tag, text, cls) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  function link(url, label) {
    if (/^https?:\/\//i.test(url)) {
      const a = make("a", label);
      a.href = url;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      return a;
    }
    return make("span", label);
  }

  function reach(start, map, depth) {
    const seen = new Set([start]);
    let frontier = [start];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const id of frontier) {
        for (const n of map.get(id) || []) {
          if (!seen.has(n)) {
            seen.add(n);
            next.push(n);
          }
        }
      }
      frontier = next;
    }
    return seen;
  }

  function currentBox() {
    const w = W / state.zoom;
    const h = H / state.zoom;
    return { w, h };
  }

  function setViewBox(focus) {
    let x;
    let y;
    let w;
    let h;
    if (state.view === "focus") {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const id of focus) {
        const n = geo.get(id);
        if (!n) continue;
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.w);
        maxY = Math.max(maxY, n.y + n.h);
      }
      if (minX === Number.POSITIVE_INFINITY) return;
      const pad = 40;
      w = Math.max(maxX - minX + 2 * pad, 560);
      h = Math.max(maxY - minY + 2 * pad, 320);
      x = (minX + maxX) / 2 - w / 2;
      y = (minY + maxY) / 2 - h / 2;
    } else {
      ({ w, h } = currentBox());
      state.x = clamp(state.x, 0, Math.max(0, W - w));
      state.y = clamp(state.y, 0, Math.max(0, H - h));
      x = state.x;
      y = state.y;
    }
    svg.setAttribute("viewBox", [x, y, w, h].map(round1).join(" "));
  }

  function apply() {
    const focusing = state.view === "focus";
    const focus = new Set([...reach(state.id, prereqs, 2), ...reach(state.id, unlocks, 1)]);
    const filtered = state.part !== "all";
    for (const [id, g] of nodes) {
      g.classList.toggle("sel", id === state.id);
      g.classList.toggle("dim", focusing && !focus.has(id));
      g.classList.toggle("off", filtered && g.getAttribute("data-part") !== state.part);
    }
    for (const p of edges) {
      const a = p.getAttribute("data-from");
      const b = p.getAttribute("data-to");
      p.classList.toggle("dim", focusing && !(focus.has(a) && focus.has(b)));
      const partOf = (id) => nodes.get(id)?.getAttribute("data-part");
      p.classList.toggle("off", filtered && (partOf(a) !== state.part || partOf(b) !== state.part));
    }
    for (const c of chips)
      c.setAttribute("aria-pressed", String(c.getAttribute("data-part") === state.part));
    box.setAttribute("data-view", state.view);
    zoomGroup.hidden = focusing;
    viewButton.textContent = focusing ? "Show all" : "Back to focus view";
    viewButton.setAttribute("aria-pressed", String(!focusing));
    setViewBox(focus);
  }

  function jumpList(title, ids) {
    const wrap = make("div");
    wrap.appendChild(make("h4", title));
    if (ids.length === 0) {
      wrap.appendChild(make("p", "None", "muted"));
      return wrap;
    }
    const ul = make("ul");
    for (const id of ids) {
      const c = byId.get(id);
      const li = make("li");
      const b = make("button", c ? c.title : id, "linkish");
      b.type = "button";
      b.addEventListener("click", () => select(id));
      li.appendChild(b);
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
    return wrap;
  }

  function select(id) {
    const c = byId.get(id);
    if (!c) return;
    state.id = id;
    panel.textContent = "";
    panel.appendChild(make("h3", c.title));
    panel.appendChild(make("p", `Part ${c.part}, ${c.trackTitle}`, "muted"));
    panel.appendChild(make("p", c.summary));
    panel.appendChild(jumpList("Needs first", c.prerequisites));
    panel.appendChild(jumpList("Unlocks", unlocks.get(id) || []));
    const srcBox = make("div");
    srcBox.appendChild(make("h4", "Sources"));
    const ul = make("ul");
    for (const sid of c.sources) {
      const s = data.sources[sid];
      const li = make("li");
      li.appendChild(s ? link(s.url, s.title) : make("span", sid));
      if (s && s.status !== "active") li.appendChild(make("span", ` (${s.status})`, "muted"));
      ul.appendChild(li);
    }
    srcBox.appendChild(ul);
    panel.appendChild(srcBox);
    apply();
  }

  for (const [id, g] of nodes) {
    g.addEventListener("click", () => select(id));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(id);
      }
    });
  }

  for (const c of chips) {
    c.addEventListener("click", () => {
      state.part = c.getAttribute("data-part");
      apply();
    });
  }

  viewButton.addEventListener("click", () => {
    state.view = state.view === "focus" ? "all" : "focus";
    state.zoom = 1;
    state.x = 0;
    state.y = 0;
    apply();
  });

  function zoomBy(factor) {
    const before = currentBox();
    const cx = state.x + before.w / 2;
    const cy = state.y + before.h / 2;
    state.zoom = clamp(state.zoom * factor, 1, 8);
    const after = currentBox();
    state.x = cx - after.w / 2;
    state.y = cy - after.h / 2;
    apply();
  }

  function panBy(dx, dy) {
    const b = currentBox();
    state.x += dx * b.w;
    state.y += dy * b.h;
    apply();
  }

  document.getElementById("zoom-in").addEventListener("click", () => zoomBy(1.25));
  document.getElementById("zoom-out").addEventListener("click", () => zoomBy(0.8));
  document.getElementById("zoom-reset").addEventListener("click", () => {
    state.zoom = 1;
    state.x = 0;
    state.y = 0;
    apply();
  });

  box.addEventListener("keydown", (e) => {
    if (state.view !== "all" || e.target !== box) return;
    const keys = {
      left: "ArrowLeft",
      right: "ArrowRight",
      up: "ArrowUp",
      down: "ArrowDown",
    };
    let handled = true;
    if (e.key === keys.left) panBy(-0.15, 0);
    else if (e.key === keys.right) panBy(0.15, 0);
    else if (e.key === keys.up) panBy(0, -0.15);
    else if (e.key === keys.down) panBy(0, 0.15);
    else if (e.key === "+" || e.key === "=") zoomBy(1.25);
    else if (e.key === "-") zoomBy(0.8);
    else handled = false;
    if (handled) e.preventDefault();
  });

  if (byId.has(state.id)) select(state.id);
  else apply();
  document.documentElement.dataset.ready = "1";
})();
