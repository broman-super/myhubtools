/* ==========================================================================
   LATCH — Link Attach — app.js
   Vanilla JS, no build step. IIFE modules, loaded in dependency order.
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * 0. CONFIG
 *    Ganti API_URL dengan URL Web App Google Apps Script kamu setelah
 *    deploy (lihat DEPLOY_GUIDE.md). Kosongkan untuk mode demo (localStorage).
 * ---------------------------------------------------------------------- */
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyITzzos5-tN6HVCis1QO2mz0Fgnzd---s1iCI_SzpKQ4edFJ2-M8vhVdrJCTafg5fZ/exec", // contoh: "https://script.google.com/macros/s/XXXXXXXX/exec"
  BATCH_SIZE: 24,
  LOAD_TIMEOUT_MS: 15000,
  APP_NAME: "LATCH"
};

const ICONS = [
  "folder","code","book","file-text","grid","inbox","link-2","star",
  "heart","image","camera","calendar","clock","coffee","compass","globe",
  "home","layers","mail","message-circle","mic","monitor","moon","music",
  "navigation","settings","shield","tag","target","terminal","thumbs-up",
  "tool","user","users","video","watch","wifi","zap","flag","hash",
  "bell","bookmark","briefcase","cloud","droplet","filter","gift",
  "headphone","help-circle","life-buoy","link","list","lock","map",
  "map-pin","package","pie-chart","save","search","send","server",
  "share-2","sun","award"
];

/* ---------------------------------------------------------------------- *
 * 1. UTILS
 * ---------------------------------------------------------------------- */
const utils = (() => {
  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function esc(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  function relTime(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "Baru saja";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} menit lalu`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} jam lalu`;
    const day = Math.floor(hour / 24);
    if (day === 1) return "Kemarin";
    if (day < 7) return `${day} hari lalu`;
    const week = Math.floor(day / 7);
    if (week < 5) return `${week} minggu lalu`;
    const month = Math.floor(day / 30);
    if (month < 12) return `${month} bulan lalu`;
    return `${Math.floor(day / 365)} tahun lalu`;
  }

  function hostname(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return url || ""; }
  }

  function favIcon(url) {
    const h = hostname(url);
    return h ? `https://www.google.com/s2/favicons?sz=64&domain=${h}` : "";
  }

  function uid() {
    return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function csvParse(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(field); field = "";
          if (row.length > 1 || row[0] !== "") rows.push(row);
          row = [];
        } else field += c;
      }
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function csvBuild(rows) {
    return rows.map(r => r.map(v => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\r\n");
  }

  function downloadFile(filename, content, mime = "text/csv;charset=utf-8;") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { debounce, esc, copy, relTime, hostname, favIcon, uid, csvParse, csvBuild, downloadFile };
})();

/* ---------------------------------------------------------------------- *
 * 2. STATE — small reactive store
 * ---------------------------------------------------------------------- */
const state = (() => {
  const data = {
    mode: "public",          // 'public' | 'admin'
    theme: "light",
    links: [],
    categories: [],
    config: { announcement: "", pinHash: "" },
    activeCategory: "all",
    query: "",
    visibleCount: CONFIG.BATCH_SIZE,
    isAdmin: false,
    adminPin: "",
    dashActiveCategory: null,
    selectedIds: new Set(),
    dirtyRows: new Set()
  };
  const listeners = {};

  function get(key) { return data[key]; }
  function set(key, value) {
    data[key] = value;
    (listeners[key] || []).forEach(fn => fn(value));
  }
  function on(key, fn) { (listeners[key] = listeners[key] || []).push(fn); }
  function off(key, fn) {
    if (!listeners[key]) return;
    listeners[key] = listeners[key].filter(f => f !== fn);
  }
  return { get, set, on, off, _data: data };
})();

/* ---------------------------------------------------------------------- *
 * 3. STORAGE — localStorage wrapper (demo/offline fallback + theme/session)
 * ---------------------------------------------------------------------- */
const storage = (() => {
  const NS = "latch:";
  function get(key, fallback = null) {
    try {
      const v = localStorage.getItem(NS + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) {}
  }
  function remove(key) {
    try { localStorage.removeItem(NS + key); } catch (e) {}
  }

  function seedDemoData() {
    if (get("demo_seeded")) return;
    const cats = [
      { id: "cat_dev", name: "Development", icon: "code", order: 0 },
      { id: "cat_docs", name: "Docs", icon: "file-text", order: 1 },
      { id: "cat_notes", name: "Notes", icon: "edit-3", order: 2 }
    ];
    const links = [
      { id: utils.uid(), title: "React Documentation", url: "https://react.dev", category: "cat_dev", badge: "core", createdAt: new Date().toISOString(), order: 0 },
      { id: utils.uid(), title: "MDN Web Docs", url: "https://developer.mozilla.org", category: "cat_docs", badge: "daily", createdAt: new Date().toISOString(), order: 1 },
      { id: utils.uid(), title: "Google Apps Script", url: "https://developers.google.com/apps-script", category: "cat_dev", badge: "hot", createdAt: new Date().toISOString(), order: 2 },
      { id: utils.uid(), title: "Catatan Rapat Q3", url: "https://docs.google.com/document/d/example", category: "cat_notes", badge: "", createdAt: new Date().toISOString(), order: 3 }
    ];
    set("categories", cats);
    set("links", links);
    set("config", { announcement: "Ini mode demo (localStorage). Set API_URL di app.js untuk pakai Google Sheets.", pin: "1234" });
    set("demo_seeded", true);
  }

  return { get, set, remove, seedDemoData };
})();

/* ---------------------------------------------------------------------- *
 * 4. DB — data layer. Uses Apps Script Web App if CONFIG.API_URL is set,
 *    otherwise falls back to localStorage demo mode.
 * ---------------------------------------------------------------------- */
const db = (() => {
  const useRemote = !!CONFIG.API_URL;

  async function apiGet(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) throw new Error("Network error " + res.status);
    return res.json();
  }

  async function apiPost(action, payload = {}) {
    // text/plain avoids CORS preflight against Apps Script Web Apps
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
    if (!res.ok) throw new Error("Network error " + res.status);
    return res.json();
  }

  async function getData() {
    if (useRemote) {
      const json = await apiGet("getData");
      if (!json.ok) throw new Error(json.error || "Gagal memuat data");
      return json.data;
    }
    storage.seedDemoData();
    return {
      links: storage.get("links", []),
      categories: storage.get("categories", []),
      config: storage.get("config", { announcement: "", pin: "1234" })
    };
  }

  async function login(pin) {
    if (useRemote) {
      const json = await apiPost("login", { pin });
      return !!json.ok;
    }
    const cfg = storage.get("config", { pin: "1234" });
    return String(pin) === String(cfg.pin);
  }

  async function addLink(link, pin) {
    if (useRemote) {
      const json = await apiPost("addLink", { link, pin });
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
    const links = storage.get("links", []);
    const newLink = { ...link, id: utils.uid(), createdAt: new Date().toISOString(), order: links.length };
    links.push(newLink);
    storage.set("links", links);
    return newLink;
  }

  async function updateLink(link, pin) {
    if (useRemote) {
      const json = await apiPost("updateLink", { link, pin });
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
    const links = storage.get("links", []);
    const idx = links.findIndex(l => l.id === link.id);
    if (idx > -1) links[idx] = { ...links[idx], ...link };
    storage.set("links", links);
    return link;
  }

  async function deleteLink(id, pin) {
    if (useRemote) {
      const json = await apiPost("deleteLink", { id, pin });
      if (!json.ok) throw new Error(json.error);
      return true;
    }
    storage.set("links", storage.get("links", []).filter(l => l.id !== id));
    return true;
  }

  async function deleteLinks(ids, pin) {
    if (useRemote) {
      const json = await apiPost("deleteLinks", { ids, pin });
      if (!json.ok) throw new Error(json.error);
      return true;
    }
    const set_ = new Set(ids);
    storage.set("links", storage.get("links", []).filter(l => !set_.has(l.id)));
    return true;
  }

  async function reorderLinks(orderedIds, pin) {
    if (useRemote) {
      const json = await apiPost("reorderLinks", { orderedIds, pin });
      if (!json.ok) throw new Error(json.error);
      return true;
    }
    const links = storage.get("links", []);
    const map = new Map(links.map(l => [l.id, l]));
    const reordered = orderedIds.map((id, i) => ({ ...map.get(id), order: i })).filter(Boolean);
    const rest = links.filter(l => !orderedIds.includes(l.id));
    storage.set("links", [...reordered, ...rest]);
    return true;
  }

  async function addCategory(name, icon, pin) {
    if (useRemote) {
      const json = await apiPost("addCategory", { name, icon, pin });
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
    const cats = storage.get("categories", []);
    const cat = { id: utils.uid(), name, icon: icon || "folder", order: cats.length };
    cats.push(cat);
    storage.set("categories", cats);
    return cat;
  }

  async function deleteCategory(id, pin) {
    if (useRemote) {
      const json = await apiPost("deleteCategory", { id, pin });
      if (!json.ok) throw new Error(json.error);
      return true;
    }
    storage.set("categories", storage.get("categories", []).filter(c => c.id !== id));
    return true;
  }

  async function updateCategory(id, name, icon, pin) {
    if (useRemote) {
      const json = await apiPost("updateCategory", { id, name, icon, pin });
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
    const cats = storage.get("categories", []);
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) throw new Error("Kategori tidak ditemukan");
    cats[idx] = { ...cats[idx], name, icon: icon || "folder" };
    storage.set("categories", cats);
    return cats[idx];
  }

  async function importCsv(rows, pin) {
    if (useRemote) {
      const json = await apiPost("importCsv", { rows, pin });
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
    const links = storage.get("links", []);
    const cats = storage.get("categories", []);
    let order = links.length;
    rows.forEach(r => {
      const [title, url, categoryName, badge] = r;
      if (!title || !url) return;
      let cat = cats.find(c => c.name.toLowerCase() === (categoryName || "").toLowerCase());
      if (!cat && categoryName) {
        cat = { id: utils.uid(), name: categoryName, icon: "folder", order: cats.length };
        cats.push(cat);
      }
      links.push({
        id: utils.uid(), title, url,
        category: cat ? cat.id : "",
        badge: (badge || "").toLowerCase(),
        createdAt: new Date().toISOString(),
        order: order++
      });
    });
    storage.set("links", links);
    storage.set("categories", cats);
    return { imported: rows.length };
  }

  return {
    useRemote, getData, login, addLink, updateLink, deleteLink, deleteLinks,
    reorderLinks, addCategory, deleteCategory, updateCategory, importCsv
  };
})();

/* ---------------------------------------------------------------------- *
 * 5. LAYOUT — inline fragment loader
 * ---------------------------------------------------------------------- */
const layout = (() => {
  // Cache each fragment's HTML once, then remove the template nodes from the
  // DOM entirely so their child element IDs never collide with rendered copies.
  const cache = {};
  let cached = false;

  function cacheFragments() {
    if (cached) return;
    ["fragment-public", "fragment-admin", "fragment-modals", "fragment-footer"].forEach(fragId => {
      const frag = document.getElementById(fragId);
      if (frag) {
        cache[fragId] = frag.innerHTML;
        frag.remove();
      }
    });
    cached = true;
  }

  const mountedFlags = {};
  function mountModals() {
    cacheFragments();
    ["fragment-modals", "fragment-footer"].forEach(fragId => {
      if (!mountedFlags[fragId]) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = cache[fragId] || "";
        while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);
        mountedFlags[fragId] = true;
      }
    });
  }

  function showMode(mode) {
    cacheFragments();
    mountModals();
    const app = document.getElementById("app");
    const fragId = mode === "admin" ? "fragment-admin" : "fragment-public";
    app.innerHTML = cache[fragId] || "";
    app.classList.remove("mode-fade");
    void app.offsetWidth;
    app.classList.add("mode-fade");
    if (typeof feather !== "undefined") feather.replace();
    document.querySelectorAll("[data-feather-brand]").forEach(el => {
      el.innerHTML = `<i data-feather="link-2" style="width:14px;height:14px"></i> ${CONFIG.APP_NAME}`;
    });
    if (typeof feather !== "undefined") feather.replace();
  }

  return { showMode, mountModals };
})();

/* ---------------------------------------------------------------------- *
 * 6. COMPONENTS — toast, modal, skeleton, loading, drawer, sheet
 * ---------------------------------------------------------------------- */
const components = (() => {
  let toastTimer = null;

  function toast(message, { variant = "info", undo = null } = {}) {
    const wrap = document.getElementById("toastWrap");
    if (!wrap) return;
    clearTimeout(toastTimer);
    wrap.innerHTML = "";
    const el = document.createElement("div");
    el.className = `toast ${variant}`;
    el.innerHTML = `<span>${utils.esc(message)}</span>`;
    if (undo) {
      const btn = document.createElement("button");
      btn.className = "toast-undo";
      btn.textContent = "Urungkan";
      btn.onclick = () => { undo(); hideToast(); };
      el.appendChild(btn);
    }
    wrap.appendChild(el);
    requestAnimationFrame(() => wrap.classList.add("show"));
    toastTimer = setTimeout(hideToast, undo ? 5000 : 3000);
  }
  function hideToast() {
    const wrap = document.getElementById("toastWrap");
    if (wrap) wrap.classList.remove("show");
  }

  function openModal(id) {
    closeAllModals();
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("open");
    const input = modal.querySelector("input");
    if (input) setTimeout(() => input.focus(), 50);
    trapFocus(modal);
  }
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("open");
  }
  function closeAllModals() {
    document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
  }
  function trapFocus(container) {
    const focusables = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    container.onkeydown = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
  }

  function openDrawer(id) {
    document.getElementById("overlayBg").classList.add("show");
    document.getElementById(id).classList.add("open");
  }
  function closeDrawer(id) {
    document.getElementById("overlayBg").classList.remove("show");
    document.getElementById(id).classList.remove("open");
  }
  function openSheet(id) {
    document.getElementById("overlayBg").classList.add("show");
    document.getElementById(id).classList.add("open");
  }
  function closeSheet(id) {
    document.getElementById("overlayBg").classList.remove("show");
    document.getElementById(id).classList.remove("open");
  }

  function renderSkeletonGrid(container, count = 6) {
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const card = document.createElement("div");
      card.className = "skeleton-card raised";
      card.innerHTML = `
        <div class="skeleton-box sk-icon"></div>
        <div class="sk-lines">
          <div class="skeleton-box sk-line"></div>
          <div class="skeleton-box sk-line short"></div>
        </div>`;
      container.appendChild(card);
    }
  }

  function hideLoadingOverlay() {
    const ov = document.getElementById("loadingOverlay");
    if (ov) { ov.classList.add("hide"); setTimeout(() => ov.remove(), 350); }
  }

  return {
    toast, hideToast, openModal, closeModal, closeAllModals,
    openDrawer, closeDrawer, openSheet, closeSheet,
    renderSkeletonGrid, hideLoadingOverlay
  };
})();

/* ---------------------------------------------------------------------- *
 * 7. VIEW — public view renderer
 * ---------------------------------------------------------------------- */
const view = (() => {
  let clockTimer = null;
  let observer = null;

  function badgeClass(badge) { return badge ? `badge-${badge}` : ""; }

  function iconUrl(url) { return utils.favIcon(url); }

  function filteredLinks() {
    const { links, activeCategory, query } = state._data;
    let list = links.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (activeCategory !== "all") list = list.filter(l => l.category === activeCategory);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(l => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
    }
    return list;
  }

  function renderTabs() {
    const wrap = document.getElementById("tabsWrap");
    if (!wrap) return;
    const { categories, links, activeCategory } = state._data;
    const countFor = (catId) => catId === "all" ? links.length : links.filter(l => l.category === catId).length;
    const chips = [{ id: "all", name: "Semua", icon: "grid" }, ...categories.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))];
    wrap.innerHTML = chips.map(c => `
      <button class="chip raised pressable ${activeCategory === c.id ? "active" : ""}" data-cat="${utils.esc(c.id)}">
        <i data-feather="${c.icon || "folder"}"></i>
        <span>${utils.esc(c.name)}</span>
        <span class="chip-count">${countFor(c.id)}</span>
      </button>`).join("");
    if (typeof feather !== "undefined") feather.replace();
    wrap.querySelectorAll(".chip").forEach(btn => {
      btn.addEventListener("click", () => {
        state.set("activeCategory", btn.dataset.cat);
        state.set("visibleCount", CONFIG.BATCH_SIZE);
        renderTabs();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const grid = document.getElementById("linkGrid");
    if (!grid) return;
    const all = filteredLinks();
    const visible = all.slice(0, state.get("visibleCount"));

    if (!all.length) {
      const { query, activeCategory, links } = state._data;
      let title = "Tidak ada link ditemukan";
      let sub = "Coba ubah kata kunci pencarian";
      if (!links.length) { title = "Belum ada link"; sub = "Tambahkan link pertama lewat mode admin"; }
      else if (activeCategory !== "all" && !query) { title = "Kategori ini masih kosong"; sub = "Belum ada link di kategori ini"; }
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon inset"><i data-feather="search"></i></div>
          <div class="empty-title">${utils.esc(title)}</div>
          <div class="empty-sub">${utils.esc(sub)}</div>
        </div>`;
      if (typeof feather !== "undefined") feather.replace();
      return;
    }

    grid.innerHTML = visible.map((l, i) => `
      <div class="link-card raised ${badgeClass(l.badge)}" data-url="${utils.esc(l.url)}" style="animation-delay:${(i % 12) * 50}ms">
        <div class="link-icon"><img src="${iconUrl(l.url)}" alt="" loading="lazy" onerror="this.style.display='none'"></div>
        <a class="link-body" href="${utils.esc(l.url)}" target="_blank" rel="noopener noreferrer">
          <div class="link-title">${utils.esc(l.title)}</div>
          <div class="link-meta">${utils.relTime(l.createdAt)}</div>
        </a>
        <button class="copy-btn pressable" data-copy="${utils.esc(l.url)}" title="Salin link"><i data-feather="copy"></i></button>
      </div>`).join("");

    if (typeof feather !== "undefined") feather.replace();

    grid.querySelectorAll(".copy-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        const ok = await utils.copy(btn.dataset.copy);
        components.toast(ok ? "Link disalin" : "Gagal menyalin link", { variant: ok ? "success" : "error" });
      });
    });

    setupInfiniteScroll(all.length);
  }

  function setupInfiniteScroll(totalCount) {
    const sentinel = document.getElementById("loadMoreSentinel");
    if (!sentinel) return;
    if (observer) observer.disconnect();
    if (state.get("visibleCount") >= totalCount) return;
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        state.set("visibleCount", state.get("visibleCount") + CONFIG.BATCH_SIZE);
        renderGrid();
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
  }

  function startClock() {
    stopClock();
    const el = document.getElementById("clockText");
    if (!el) return;
    const tick = () => {
      const d = new Date();
      el.textContent = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    };
    tick();
    clockTimer = setInterval(tick, 1000 * 30);
  }
  function stopClock() { if (clockTimer) clearInterval(clockTimer); }

  function renderAnnouncement() {
    const el = document.getElementById("announceText");
    if (el) el.textContent = state.get("config").announcement || "Selamat datang di LATCH.";
  }

  function bindSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    input.value = state.get("query");
    input.addEventListener("input", utils.debounce((e) => {
      state.set("query", e.target.value);
      state.set("visibleCount", CONFIG.BATCH_SIZE);
      renderGrid();
    }, 200));
  }

  function renderAll() {
    renderAnnouncement();
    renderTabs();
    renderGrid();
    bindSearch();
    startClock();
  }

  return { renderAll, renderGrid, renderTabs, filteredLinks, stopClock };
})();

/* ---------------------------------------------------------------------- *
 * 8. DASHBOARD — admin view renderer
 * ---------------------------------------------------------------------- */
const dashboard = (() => {
  let dragSrcId = null;

  function groupedLinks() {
    const { links, categories } = state._data;
    const sortedCats = categories.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return sortedCats.map(cat => ({
      cat,
      items: links.filter(l => l.category === cat.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    })).concat([{
      cat: { id: "", name: "Tanpa Kategori", icon: "inbox" },
      items: links.filter(l => !l.category).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }]).filter(g => g.items.length);
  }

  function renderNav() {
    const groups = groupedLinks();
    const active = state.get("dashActiveCategory");
    const navList = document.getElementById("dashNavList");
    const sheetList = document.getElementById("sheetCategoryList");
    const itemsHtml = groups.map(g => `
      <div class="dash-nav-item ${active === g.cat.id ? "active" : ""}" data-jump="${utils.esc(g.cat.id)}">
        <span><i data-feather="${g.cat.icon || "folder"}" style="width:13px;height:13px;margin-right:6px;vertical-align:-2px"></i>${utils.esc(g.cat.name)}</span>
        <span>${g.items.length}</span>
      </div>`).join("");
    if (navList) navList.innerHTML = itemsHtml;
    if (sheetList) {
      sheetList.innerHTML = groups.map(g => `
        <div class="sheet-item" data-jump="${utils.esc(g.cat.id)}">
          <span><i data-feather="${g.cat.icon || "folder"}" style="width:14px;height:14px;margin-right:8px;vertical-align:-2px"></i>${utils.esc(g.cat.name)}</span>
          <span>${g.items.length}</span>
        </div>`).join("");
    }
    if (typeof feather !== "undefined") feather.replace();
    document.querySelectorAll("[data-jump]").forEach(el => {
      el.addEventListener("click", () => {
        const target = document.getElementById("cat-group-" + (el.dataset.jump || "none"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        components.closeSheet("categorySheet");
      });
    });
  }

  function categoryOptionsHtml(selected) {
    const cats = state.get("categories").slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return cats.map(c => `<option value="${utils.esc(c.id)}" ${c.id === selected ? "selected" : ""}>${utils.esc(c.name)}</option>`).join("");
  }

  function rowHtml(link) {
    const selected = state.get("selectedIds").has(link.id);
    return `
      <div class="dash-row raised" data-id="${utils.esc(link.id)}" draggable="true">
        <div class="dash-grip"><input type="checkbox" class="checkbox row-check" ${selected ? "checked" : ""}> ⠿</div>
        <div><label>Judul</label><input type="text" class="row-title" value="${utils.esc(link.title)}"></div>
        <div><label>URL</label><input type="text" class="row-url" value="${utils.esc(link.url)}"></div>
        <div>
          <label>Kategori</label>
          <select class="row-category">${categoryOptionsHtml(link.category)}</select>
        </div>
        <div><label>Waktu</label><span style="font-size:12px;color:var(--text-tertiary)">${utils.relTime(link.createdAt)}</span></div>
        <div class="row-actions">
          <span class="save-hint"><button class="row-save" title="Simpan"><i data-feather="save"></i></button></span>
          <button class="row-copy" title="Salin"><i data-feather="copy"></i></button>
          <button class="row-delete" title="Hapus"><i data-feather="trash-2"></i></button>
        </div>
      </div>`;
  }

  function renderMain() {
    const main = document.getElementById("dashMain");
    if (!main) return;
    const groups = groupedLinks();
    if (!groups.length) {
      main.innerHTML = `<div class="empty-state">
        <div class="empty-icon inset"><i data-feather="inbox"></i></div>
        <div class="empty-title">Belum ada link</div>
        <div class="empty-sub">Klik "Tambah Link" untuk mulai mengisi LATCH</div>
      </div>`;
      if (typeof feather !== "undefined") feather.replace();
      return;
    }
    main.innerHTML = groups.map(g => `
      <div class="category-group" id="cat-group-${utils.esc(g.cat.id || "none")}">
        <div class="category-group-title"><i data-feather="${g.cat.icon || "folder"}"></i> ${utils.esc(g.cat.name)} (${g.items.length})</div>
        <div class="dash-table">
          <div class="dash-row dash-head">
            <div></div><div>Judul</div><div>URL</div><div>Kategori</div><div>Waktu</div><div>Aksi</div>
          </div>
          ${g.items.map(rowHtml).join("")}
        </div>
      </div>`).join("");
    if (typeof feather !== "undefined") feather.replace();
    bindRowEvents();
  }

  function bindRowEvents() {
    document.querySelectorAll(".dash-row[data-id]").forEach(row => {
      const id = row.dataset.id;
      const markDirty = () => row.classList.add("dirty");

      row.querySelector(".row-title").addEventListener("input", markDirty);
      row.querySelector(".row-url").addEventListener("input", markDirty);
      row.querySelector(".row-category").addEventListener("change", markDirty);

      row.querySelector(".row-save").addEventListener("click", async () => {
        const link = state.get("links").find(l => l.id === id);
        const updated = {
          ...link,
          title: row.querySelector(".row-title").value.trim(),
          url: row.querySelector(".row-url").value.trim(),
          category: row.querySelector(".row-category").value
        };
        try {
          await db.updateLink(updated, state.get("adminPin"));
          const links = state.get("links").map(l => l.id === id ? updated : l);
          state.set("links", links);
          row.classList.remove("dirty");
          components.toast("Perubahan disimpan", { variant: "success" });
          renderNav();
        } catch (e) {
          components.toast("Gagal menyimpan: " + e.message, { variant: "error" });
        }
      });

      row.querySelector(".row-copy").addEventListener("click", async () => {
        const ok = await utils.copy(row.querySelector(".row-url").value);
        components.toast(ok ? "URL disalin" : "Gagal menyalin", { variant: ok ? "success" : "error" });
      });

      row.querySelector(".row-delete").addEventListener("click", () => {
        confirmDelete(id);
      });

      row.querySelector(".row-check").addEventListener("change", (e) => {
        const sel = state.get("selectedIds");
        if (e.target.checked) sel.add(id); else sel.delete(id);
        updateBulkBar();
      });

      row.addEventListener("dragstart", () => { dragSrcId = id; row.style.opacity = "0.4"; });
      row.addEventListener("dragend", () => { row.style.opacity = "1"; });
      row.addEventListener("dragover", (e) => e.preventDefault());
      row.addEventListener("drop", async (e) => {
        e.preventDefault();
        if (!dragSrcId || dragSrcId === id) return;
        const links = state.get("links").slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const srcIdx = links.findIndex(l => l.id === dragSrcId);
        const dstIdx = links.findIndex(l => l.id === id);
        const [moved] = links.splice(srcIdx, 1);
        links.splice(dstIdx, 0, moved);
        links.forEach((l, i) => l.order = i);
        state.set("links", links);
        renderMain();
        try { await db.reorderLinks(links.map(l => l.id), state.get("adminPin")); }
        catch (e2) { components.toast("Gagal menyimpan urutan", { variant: "error" }); }
      });
    });
  }

  function updateBulkBar() {
    const count = state.get("selectedIds").size;
    const btn = document.getElementById("btnBulkDelete");
    const span = document.getElementById("bulkCount");
    if (span) span.textContent = count;
    if (btn) btn.classList.toggle("hidden", count === 0);
  }

  let pendingDeleteId = null;
  let pendingDeleteBulk = false;
  function confirmDelete(id) {
    pendingDeleteId = id; pendingDeleteBulk = false;
    document.getElementById("deleteModalText").textContent = "Link ini akan dihapus permanen.";
    components.openModal("deleteModal");
  }
  function confirmBulkDelete() {
    pendingDeleteBulk = true;
    document.getElementById("deleteModalText").textContent = `${state.get("selectedIds").size} link akan dihapus permanen.`;
    components.openModal("deleteModal");
  }

  async function performDelete() {
    try {
      if (pendingDeleteBulk) {
        const ids = Array.from(state.get("selectedIds"));
        await db.deleteLinks(ids, state.get("adminPin"));
        state.set("links", state.get("links").filter(l => !ids.includes(l.id)));
        state.get("selectedIds").clear();
        updateBulkBar();
      } else if (pendingDeleteId) {
        await db.deleteLink(pendingDeleteId, state.get("adminPin"));
        state.set("links", state.get("links").filter(l => l.id !== pendingDeleteId));
      }
      components.toast("Berhasil dihapus", { variant: "success" });
      components.closeModal("deleteModal");
      renderMain(); renderNav();
    } catch (e) {
      components.toast("Gagal menghapus: " + e.message, { variant: "error" });
    }
  }

  function openDrawerForAdd() {
    document.getElementById("drawerTitle").textContent = "Tambah Link";
    document.getElementById("fieldId").value = "";
    document.getElementById("fieldTitle").value = "";
    document.getElementById("fieldUrl").value = "";
    document.getElementById("fieldBadge").value = "";
    document.getElementById("fieldCategory").innerHTML = categoryOptionsHtml(null);
    components.openDrawer("linkDrawer");
  }
  function openDrawerForEdit(link) {
    document.getElementById("drawerTitle").textContent = "Edit Link";
    document.getElementById("fieldId").value = link.id;
    document.getElementById("fieldTitle").value = link.title;
    document.getElementById("fieldUrl").value = link.url;
    document.getElementById("fieldBadge").value = link.badge || "";
    document.getElementById("fieldCategory").innerHTML = categoryOptionsHtml(link.category);
    components.openDrawer("linkDrawer");
  }

  async function saveDrawer() {
    const id = document.getElementById("fieldId").value;
    const title = document.getElementById("fieldTitle").value.trim();
    const url = document.getElementById("fieldUrl").value.trim();
    const category = document.getElementById("fieldCategory").value;
    const badge = document.getElementById("fieldBadge").value;
    if (!title || !url) {
      components.toast("Judul dan URL wajib diisi", { variant: "error" });
      return;
    }
    try {
      if (id) {
        const link = { ...state.get("links").find(l => l.id === id), title, url, category, badge };
        await db.updateLink(link, state.get("adminPin"));
        state.set("links", state.get("links").map(l => l.id === id ? link : l));
        components.toast("Link diperbarui", { variant: "success" });
      } else {
        const newLink = await db.addLink({ title, url, category, badge }, state.get("adminPin"));
        state.set("links", [...state.get("links"), newLink]);
        components.toast("Link ditambahkan", { variant: "success" });
      }
      components.closeDrawer("linkDrawer");
      renderMain(); renderNav();
    } catch (e) {
      components.toast("Gagal menyimpan: " + e.message, { variant: "error" });
    }
  }

  let editCategoryId = null;

  function renderIconPicker() {
    const container = document.getElementById("iconPicker");
    if (!container) return;
    container.innerHTML = ICONS.map(icon =>
      `<button class="icon-picker-item" data-icon="${icon}" title="${icon}"><i data-feather="${icon}"></i></button>`
    ).join("");
    if (typeof feather !== "undefined") feather.replace();
    container.querySelectorAll(".icon-picker-item").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".icon-picker-item").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
    highlightIcon("folder");
  }

  function highlightIcon(icon) {
    const container = document.getElementById("iconPicker");
    if (!container) return;
    container.querySelectorAll(".icon-picker-item").forEach(b => b.classList.remove("selected"));
    const target = container.querySelector(`[data-icon="${icon}"]`);
    if (target) target.classList.add("selected");
  }

  function renderCategoryModal() {
    const list = document.getElementById("categoryModalList");
    const cats = state.get("categories").slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    list.innerHTML = cats.map(c => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:var(--bg-base)">
        <span style="font-size:13px"><i data-feather="${c.icon || "folder"}" style="width:13px;height:13px;margin-right:6px;vertical-align:-2px"></i>${utils.esc(c.name)}</span>
        <div style="display:flex;gap:6px">
          <button class="btn-icon-sm" data-edit-cat="${utils.esc(c.id)}" title="Edit"><i data-feather="edit-3" style="width:13px;height:13px"></i></button>
          <button class="btn-danger" data-del-cat="${utils.esc(c.id)}" style="font-size:11px">Hapus</button>
        </div>
      </div>`).join("") || `<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:12px">Belum ada kategori</div>`;
    if (typeof feather !== "undefined") feather.replace();
    list.querySelectorAll("[data-del-cat]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.delCat;
        const inUse = state.get("links").some(l => l.category === id);
        if (inUse && !confirm("Kategori ini masih dipakai oleh beberapa link. Hapus tetap?")) return;
        try {
          await db.deleteCategory(id, state.get("adminPin"));
          state.set("categories", state.get("categories").filter(c => c.id !== id));
          renderCategoryModal(); renderMain(); renderNav();
        } catch (e) {
          components.toast("Gagal menghapus kategori: " + e.message, { variant: "error" });
        }
      });
    });
    list.querySelectorAll("[data-edit-cat]").forEach(btn => {
      btn.addEventListener("click", () => editCategory(btn.dataset.editCat));
    });
  }

  function editCategory(id) {
    const cat = state.get("categories").find(c => c.id === id);
    if (!cat) return;
    editCategoryId = id;
    document.getElementById("newCategoryName").value = cat.name;
    document.getElementById("addCategoryBtn").innerHTML = '<i data-feather="save"></i> Simpan';
    document.getElementById("cancelEditCatBtn").classList.remove("hidden");
    document.getElementById("categoryModalTitle").textContent = "Edit Kategori";
    if (typeof feather !== "undefined") feather.replace();
    highlightIcon(cat.icon || "folder");
  }

  function cancelEditCategory() {
    editCategoryId = null;
    document.getElementById("newCategoryName").value = "";
    document.getElementById("addCategoryBtn").innerHTML = '<i data-feather="plus"></i> Tambah';
    document.getElementById("cancelEditCatBtn").classList.add("hidden");
    document.getElementById("categoryModalTitle").textContent = "Kelola Kategori";
    if (typeof feather !== "undefined") feather.replace();
    highlightIcon("folder");
  }

  async function saveCategory() {
    const input = document.getElementById("newCategoryName");
    const name = input.value.trim();
    if (!name) return;
    const icon = document.querySelector("#iconPicker .selected")?.dataset?.icon || "folder";
    try {
      if (editCategoryId) {
        await db.updateCategory(editCategoryId, name, icon, state.get("adminPin"));
        state.set("categories", state.get("categories").map(c => c.id === editCategoryId ? { ...c, name, icon } : c));
        components.toast("Kategori diperbarui", { variant: "success" });
      } else {
        const cat = await db.addCategory(name, icon, state.get("adminPin"));
        state.set("categories", [...state.get("categories"), cat]);
        components.toast("Kategori ditambahkan", { variant: "success" });
      }
      input.value = "";
      editCategoryId = null;
      document.getElementById("addCategoryBtn").innerHTML = '<i data-feather="plus"></i> Tambah';
      document.getElementById("cancelEditCatBtn").classList.add("hidden");
      document.getElementById("categoryModalTitle").textContent = "Kelola Kategori";
      if (typeof feather !== "undefined") feather.replace();
      highlightIcon("folder");
      renderCategoryModal(); renderNav();
    } catch (e) {
      components.toast("Gagal menyimpan kategori: " + e.message, { variant: "error" });
    }
  }

  function exportCsv() {
    const cats = new Map(state.get("categories").map(c => [c.id, c.name]));
    const rows = [["Title", "URL", "Category", "Badge"]];
    state.get("links").forEach(l => rows.push([l.title, l.url, cats.get(l.category) || "", l.badge || ""]));
    utils.downloadFile(`latch-export-${Date.now()}.csv`, utils.csvBuild(rows));
    components.toast("File CSV diunduh", { variant: "success" });
  }

  let importRows = [];
  function handleCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = utils.csvParse(e.target.result).filter(r => r.length >= 2);
      if (rows.length && /title/i.test(rows[0][0] || "")) rows.shift();
      importRows = rows;
      document.getElementById("fileDropText").textContent = `${rows.length} baris siap diimport (${file.name})`;
    };
    reader.readAsText(file);
  }
  async function confirmImport() {
    if (!importRows.length) {
      document.getElementById("importError").textContent = "Pilih file CSV terlebih dahulu.";
      return;
    }
    try {
      await db.importCsv(importRows, state.get("adminPin"));
      const fresh = await db.getData();
      state.set("links", fresh.links);
      state.set("categories", fresh.categories);
      components.closeModal("importModal");
      renderMain(); renderNav();
      components.toast(`${importRows.length} link diimport`, { variant: "success" });
      importRows = [];
    } catch (e) {
      document.getElementById("importError").textContent = "Gagal import: " + e.message;
    }
  }

  function renderAll() {
    renderNav();
    renderMain();
    updateBulkBar();
  }

  return {
    renderAll, renderNav, renderMain,
    openDrawerForAdd, openDrawerForEdit, saveDrawer,
    renderCategoryModal, saveCategory, cancelEditCategory, renderIconPicker,
    exportCsv, handleCsvFile, confirmImport,
    confirmDelete: confirmBulkDelete, performDelete
  };
})();

/* ---------------------------------------------------------------------- *
 * 9. THEME
 * ---------------------------------------------------------------------- */
const theme = (() => {
  function apply(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    state.set("theme", mode);
    storage.set("theme", mode);
    document.querySelectorAll("#themeToggle svg, #themeToggleDash svg").forEach(svg => {});
    ["themeToggle", "themeToggleDash"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.innerHTML = `<i data-feather="${mode === "dark" ? "sun" : "moon"}"></i>`;
    });
    if (typeof feather !== "undefined") feather.replace();
  }
  function toggle() { apply(state.get("theme") === "dark" ? "light" : "dark"); }
  function init() {
    const saved = storage.get("theme", null);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    apply(saved || (prefersDark ? "dark" : "light"));
  }
  return { apply, toggle, init };
})();

/* ---------------------------------------------------------------------- *
 * 10. APP — init orchestrator
 * ---------------------------------------------------------------------- */
const app = (() => {
  function bindPublicEvents() {
    document.getElementById("btnAdminSwitch")?.addEventListener("click", () => {
      if (state.get("isAdmin")) switchMode("admin");
      else components.openModal("loginModal");
    });
    document.getElementById("themeToggle")?.addEventListener("click", theme.toggle);
  }

  function bindAdminEvents() {
    document.getElementById("btnPublicSwitch")?.addEventListener("click", () => switchMode("public"));
    document.getElementById("themeToggleDash")?.addEventListener("click", theme.toggle);
    document.getElementById("btnLogout")?.addEventListener("click", () => {
      state.set("isAdmin", false);
      state.set("adminPin", "");
      storage.remove("adminSession");
      switchMode("public");
      components.toast("Berhasil keluar", { variant: "info" });
    });
    document.getElementById("btnAddLink")?.addEventListener("click", dashboard.openDrawerForAdd);
    document.getElementById("btnAddCategory")?.addEventListener("click", () => {
      dashboard.renderCategoryModal();
      dashboard.renderIconPicker();
      dashboard.cancelEditCategory();
      components.openModal("categoryModal");
    });
    document.getElementById("btnImportCsv")?.addEventListener("click", () => components.openModal("importModal"));
    document.getElementById("btnExportCsv")?.addEventListener("click", dashboard.exportCsv);
    document.getElementById("btnBulkDelete")?.addEventListener("click", dashboard.confirmDelete);
    document.getElementById("dashNavToggle")?.addEventListener("click", () => components.openSheet("categorySheet"));
  }

  let globalModalEventsBound = false;
  function bindGlobalModalEvents() {
    if (globalModalEventsBound) return;
    globalModalEventsBound = true;
    document.getElementById("overlayBg")?.addEventListener("click", () => {
      document.querySelectorAll(".drawer.open, .bottom-sheet.open").forEach(el => el.classList.remove("open"));
      document.getElementById("overlayBg").classList.remove("show");
    });
    document.querySelectorAll(".modal .modal-backdrop").forEach(bg => {
      bg.addEventListener("click", () => bg.closest(".modal").classList.remove("open"));
    });

    document.getElementById("drawerClose")?.addEventListener("click", () => components.closeDrawer("linkDrawer"));
    document.getElementById("drawerCancel")?.addEventListener("click", () => components.closeDrawer("linkDrawer"));
    document.getElementById("drawerSave")?.addEventListener("click", dashboard.saveDrawer);

    document.getElementById("loginCancel")?.addEventListener("click", () => components.closeModal("loginModal"));
    document.getElementById("loginSubmit")?.addEventListener("click", doLogin);
    document.getElementById("pinInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

    document.getElementById("deleteCancel")?.addEventListener("click", () => components.closeModal("deleteModal"));
    document.getElementById("deleteConfirm")?.addEventListener("click", dashboard.performDelete);

    document.getElementById("categoryModalClose")?.addEventListener("click", () => {
      components.closeModal("categoryModal");
      dashboard.cancelEditCategory();
    });
    document.getElementById("addCategoryBtn")?.addEventListener("click", dashboard.saveCategory);
    document.getElementById("cancelEditCatBtn")?.addEventListener("click", dashboard.cancelEditCategory);
    document.getElementById("newCategoryName")?.addEventListener("keydown", (e) => { if (e.key === "Enter") dashboard.saveCategory(); });

    document.getElementById("importCancel")?.addEventListener("click", () => components.closeModal("importModal"));
    document.getElementById("importConfirm")?.addEventListener("click", dashboard.confirmImport);
    document.getElementById("fileDropLabel")?.addEventListener("click", (e) => {
      if (e.target.id !== "csvFileInput") document.getElementById("csvFileInput").click();
    });
    document.getElementById("csvFileInput")?.addEventListener("change", (e) => {
      if (e.target.files[0]) dashboard.handleCsvFile(e.target.files[0]);
    });

    document.getElementById("helpClose")?.addEventListener("click", () => components.closeModal("helpModal"));

    document.getElementById("backToTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener("scroll", utils.debounce(() => {
      const btn = document.getElementById("backToTop");
      if (btn) btn.classList.toggle("show", window.scrollY > 400);
    }, 100));
  }

  async function doLogin() {
    const pin = document.getElementById("pinInput").value.trim();
    const errEl = document.getElementById("loginError");
    errEl.textContent = "";
    try {
      const ok = await db.login(pin);
      if (!ok) { errEl.textContent = "PIN salah, coba lagi."; return; }
      state.set("isAdmin", true);
      state.set("adminPin", pin);
      storage.set("adminSession", pin);
      components.closeModal("loginModal");
      document.getElementById("pinInput").value = "";
      switchMode("admin");
      components.toast("Berhasil masuk sebagai admin", { variant: "success" });
    } catch (e) {
      errEl.textContent = "Gagal login: " + e.message;
    }
  }

  function switchMode(mode) {
    state.set("mode", mode);
    view.stopClock();
    layout.showMode(mode);
    if (mode === "admin") {
      bindAdminEvents();
      dashboard.renderAll();
    } else {
      bindPublicEvents();
      view.renderAll();
    }
    bindGlobalModalEvents();
    location.hash = mode === "admin" ? "#admin" : "";
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("searchInput")?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const first = document.querySelector(".link-card .link-body");
        if (first) window.open(first.getAttribute("href"), "_blank", "noopener");
        return;
      }
      if (e.key === "Escape") {
        if (document.querySelector(".modal.open")) components.closeAllModals();
        else if (document.querySelector(".drawer.open, .bottom-sheet.open")) {
          document.querySelectorAll(".drawer.open, .bottom-sheet.open").forEach(el => el.classList.remove("open"));
          document.getElementById("overlayBg")?.classList.remove("show");
        } else if (state.get("mode") === "public" && state.get("query")) {
          const input = document.getElementById("searchInput");
          if (input) { input.value = ""; state.set("query", ""); state.set("visibleCount", CONFIG.BATCH_SIZE); view.renderGrid(); }
        }
        return;
      }
      if (e.key === "?" && !typing) {
        components.openModal("helpModal");
      }
    });
  }

  async function loadData() {
    const timeoutId = setTimeout(() => {
      components.toast("Gagal memuat data (timeout)", { variant: "error" });
    }, CONFIG.LOAD_TIMEOUT_MS);
    try {
      const data = await db.getData();
      clearTimeout(timeoutId);
      state.set("links", data.links || []);
      state.set("categories", data.categories || []);
      state.set("config", data.config || {});
      return true;
    } catch (e) {
      clearTimeout(timeoutId);
      components.toast("Gagal memuat data: " + e.message, { variant: "error" });
      return false;
    }
  }

  async function init() {
    theme.init();
    layout.mountModals();
    components.renderSkeletonGrid(document.getElementById("skeletonGrid"), 6);
    if (typeof feather !== "undefined") feather.replace();

    bindGlobalModalEvents();

    const savedPin = storage.get("adminSession", null);
    if (savedPin) { state.set("isAdmin", true); state.set("adminPin", savedPin); }

    await loadData();
    components.hideLoadingOverlay();

    const startMode = (location.hash === "#admin" && state.get("isAdmin")) ? "admin" : "public";
    switchMode(startMode);
    bindKeyboardShortcuts();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => { app.init(); });
