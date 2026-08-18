import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Calendar, ChevronDown, ChevronRight, Pencil, Trash2, Camera, CheckCircle2,
  Circle, AlertTriangle, X, ArrowLeft, TrendingUp, Archive, Star,
  ClipboardList, LayoutGrid, Download, Printer
} from "lucide-react";
import { loadProjects, syncToSupabase, uploadToStorage, deleteFromStorage } from "./supabase.js";

// ---------- Design tokens — diselaraskan ke design-system.css (REYNAHUB/UNITOOLS) ----------
const C = {
  canvasSoft: "var(--bg)",
  surface: "var(--surface)",
  hairline: "var(--border)",
  ink: "var(--text)",
  inkSecondary: "var(--text)",
  inkMuted: "var(--muted)",
  inkFaint: "#a39e98", // tidak ada token faint di shared; pertahankan
  primary: "var(--primary)",        // aksen merah brand webtools
  primaryActive: "var(--primary-light)",
  secondary: "#213183",             // navy logo RND (sub-brand)
  onPrimary: "#ffffff",
  sky: "#62aef0", purple: "#d6b6f6", purpleDeep: "#391c57", pink: "#ff64c8",
  orange: "var(--warning)", orangeDeep: "#793400",
  teal: "#2a9d99", green: "var(--success)", brown: "#523410",
};

const R = { xs: 4, sm: "var(--radius-md)", md: "var(--radius-sm)", lg: "var(--radius-bento)", xl: "var(--radius-bento)", full: "var(--radius-full)" };

const shadow1 = "var(--shadow-sm)";
const shadow2 = "var(--shadow-md)";

// ---------- Status config ----------
const PROJECT_STATUS = {
  Ideation: { label: "Ideation", bg: C.purple, fg: C.purpleDeep },
  "On Track": { label: "On Track", bg: "#c9f2d3", fg: "#0b5e1e" },
  "At Risk": { label: "At Risk", bg: "#ffe0c2", fg: C.orangeDeep },
  Done: { label: "Done", bg: "#cfe6ff", fg: "#0b3a63" },
};
const MILESTONE_STATUS = {
  "Belum mulai": { label: "Belum mulai", bg: "#eeeeec", fg: C.inkMuted },
  Berjalan: { label: "Berjalan", bg: "#cfe6ff", fg: "#0b3a63" },
  Selesai: { label: "Selesai", bg: "#c9f2d3", fg: "#0b5e1e" },
};

// ---------- helpers: id + tree ops ----------
let idCounter = 1000;
const nid = () => `id-${idCounter++}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

// Kompres gambar di browser agar payload kecil (hindari timeout GAS)
async function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal baca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal baca gambar"));
      img.onload = () => {
        const max = 1024;
        let w = img.width, h = img.height;
        if (w > h && w > max) { h = Math.round((h * max) / w); w = max; }
        else if (h > max) { w = Math.round((w * max) / h); h = max; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function mapTree(nodes, id, fn) {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    if (n.children?.length) return { ...n, children: mapTree(n.children, id, fn) };
    return n;
  });
}
function removeFromTree(nodes, id) {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children?.length ? { ...n, children: removeFromTree(n.children, id) } : n));
}
function addChildToTree(nodes, parentId, child) {
  if (parentId === null) return [...nodes, child];
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children || []), child] };
    if (n.children?.length) return { ...n, children: addChildToTree(n.children, parentId, child) };
    return n;
  });
}
function flattenMilestones(nodes = []) {
  let out = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children?.length) out = out.concat(flattenMilestones(n.children));
  }
  return out;
}
function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}
function collectPhotoUrls(node, acc = []) {
  (node.checklist || []).forEach((c) => { if (c.photoUrl) acc.push(c.photoUrl); });
  (node.children || []).forEach((ch) => collectPhotoUrls(ch, acc));
  return acc;
}
function milestoneMatchesSearch(m, q) {
  if ((m.title || "").toLowerCase().includes(q)) return true;
  if ((m.checklist || []).some((c) => (c.title || "").toLowerCase().includes(q))) return true;
  return (m.children || []).some((ch) => milestoneMatchesSearch(ch, q));
}
function filterMilestoneTree(nodes, pred) {
  const out = [];
  for (const n of nodes) {
    const kids = filterMilestoneTree(n.children || [], pred);
    if (pred(n) || kids.length) out.push({ ...n, children: kids });
  }
  return out;
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}
function buildRoadmapCsv(projects) {
  const header = ["Project Code", "Project Name", "Category", "Status", "Target Release", "Milestone Title", "Milestone Status", "Milestone Target", "Checklist Item", "Done?", "Foto?"];
  const rows = [header.map(csvCell).join(",")];
  projects.forEach((p) => {
    const ms = flattenMilestones(p.milestones);
    if (ms.length === 0) {
      rows.push([p.code, p.name, p.category, p.status, p.targetReleaseDate || "", "", "", "", "", "", ""].map(csvCell).join(","));
      return;
    }
    ms.forEach((m) => {
      const items = m.checklist || [];
      if (items.length === 0) {
        rows.push([p.code, p.name, p.category, p.status, p.targetReleaseDate || "", m.title, m.status || "", m.targetDate || "", "", "", ""].map(csvCell).join(","));
        return;
      }
      items.forEach((c) => {
        rows.push([
          p.code, p.name, p.category, p.status, p.targetReleaseDate || "",
          m.title, m.status || "", m.targetDate || "",
          c.title, c.isCompleted ? "Ya" : "Tidak", c.photoUrl ? "Ya" : "Tidak",
        ].map(csvCell).join(","));
      });
    });
  });
  return rows.join("\r\n");
}
function downloadCsv(filename, csv) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function openPrintableReport(projects) {
  const esc = (s) => (s == null ? "" : String(s)).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  let body = "";
  projects.filter((p) => !p.archived || projects.length === 1).forEach((p) => {
    body += `<h2>${esc(p.name)} <small>(${esc(p.code)} · ${esc(p.status)})</small></h2>`;
    body += `<p class="meta">${esc(p.category)} · Target: ${esc(p.targetReleaseDate || "—")}</p>`;
    flattenMilestones(p.milestones).forEach((m) => {
      body += `<h3>${esc(m.title)} <small>(${esc(m.status || "")} · ${esc(m.targetDate || "")})</small></h3>`;
      const items = m.checklist || [];
      if (items.length) body += "<ul>" + items.map((c) => `<li class="${c.isCompleted ? "done" : ""}">${esc(c.title)}${c.photoUrl ? ` <img src="${esc(c.photoUrl)}" style="height:26px;width:26px;object-fit:cover;border-radius:4px;vertical-align:middle;">` : ""}</li>`).join("") + "</ul>";
    });
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>RND Roadmap</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;margin:32px;}
h1{font-size:22px;margin:0 0 4px;} .sub{color:#666;margin:0 0 24px;font-size:13px;}
h2{font-size:16px;margin:24px 0 2px;} h2 small{color:#888;font-weight:400;font-size:12px;}
.meta{color:#666;font-size:12px;margin:0 0 8px;} h3{font-size:13px;margin:12px 0 4px;} h3 small{color:#888;font-weight:400;}
ul{margin:4px 0;padding-left:18px;} li{font-size:12px;margin:2px 0;} li.done{color:#0a7d3c;text-decoration:line-through;}
</style></head><body>
<h1>RND Roadmap</h1><p class="sub">Diekspor ${new Date().toLocaleString("id-ID")}</p>
${body || "<p>Tidak ada project.</p>"}
<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Popup diblokir. Izinkan popup untuk export PDF."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
function highlightMatch(text, q) {
  const s = text == null ? "" : String(text);
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return s;
  const idx = s.toLowerCase().indexOf(needle);
  if (idx === -1) return s;
  return (<>
    {s.slice(0, idx)}
    <mark style={{ background: "#fff3a3", color: "inherit", borderRadius: 2, padding: "0 1px" }}>{s.slice(idx, idx + needle.length)}</mark>
    {s.slice(idx + needle.length)}
  </>);
}

const LightboxContext = React.createContext({ viewPhoto: () => {} });
const useLightbox = () => React.useContext(LightboxContext);
function Lightbox({ url, onClose }) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url, onClose]);
  if (!url) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,18,22,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24, cursor: "zoom-out" }}
    >
      <button
        onClick={onClose}
        aria-label="Tutup"
        style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 38, height: 38, borderRadius: R.full, cursor: "pointer", fontSize: 22, lineHeight: 1 }}
      >×</button>
      <img
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: R.lg, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", cursor: "default" }}
      />
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
function pad2(n) { return String(n).padStart(2, "0"); }
function toYMD(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function parseYMD(s) {
  if (!s) return null;
  const p = String(s).split("-").map(Number);
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
  const d = new Date(p[0], p[1] - 1, p[2]);
  return isNaN(d.getTime()) ? null : d;
}
function DatePicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const d = parseYMD(value) || new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState(null);
  const place = () => {
    const r = wrapRef.current.getBoundingClientRect();
    const ph = 290, pw = Math.max(r.width, 230);
    const openUp = r.bottom + ph > window.innerHeight && r.top > ph;
    setPos({ top: openUp ? r.top - ph - 6 : r.bottom + 6, left: r.left, width: pw });
  };
  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    const onScroll = () => place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);
  const selected = parseYMD(value);
  const startWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const display = selected ? selected.getDate() + " " + MONTHS[selected.getMonth()] + " " + selected.getFullYear() : "Pilih tanggal";
  const isSel = (d) => selected && selected.getDate() === d && selected.getMonth() === view.m && selected.getFullYear() === view.y;
  const pick = (d) => { onChange(toYMD(new Date(view.y, view.m, d))); setOpen(false); };
  const navBtn = { border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: C.inkMuted, width: 30, height: 30, borderRadius: R.full };
  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, fontSize: 13, color: selected ? C.ink : C.inkFaint, cursor: "pointer" }}
      >
        <span>{display}</span>
        <Calendar size={15} color={C.inkMuted} />
      </div>
      {open && pos && createPortal(
        <div ref={popRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.18)", width: pos.width, minWidth: 230 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button type="button" onClick={() => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 })} style={navBtn}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{MONTHS[view.m]} {view.y}</span>
            <button type="button" onClick={() => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 })} style={navBtn}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {WDAYS.map((w) => <div key={w} style={{ textAlign: "center", fontSize: 11, color: C.inkFaint, padding: "4px 0" }}>{w}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((d, i) => d === null ? <div key={i} /> : (
              <button
                key={i}
                type="button"
                onClick={() => pick(d)}
                onMouseEnter={(e) => { if (!isSel(d)) e.currentTarget.style.background = C.canvasSoft; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                style={{ border: "none", borderRadius: R.sm, padding: "6px 0", fontSize: 12, cursor: "pointer", background: isSel(d) ? C.primary : "transparent", color: isSel(d) ? "#fff" : C.ink }}
              >{d}</button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function projectChecklistStats(project) {
  const all = flattenMilestones(project.milestones);
  let total = 0, done = 0;
  all.forEach((m) => {
    (m.checklist || []).forEach((c) => {
      total++;
      if (c.isCompleted) done++;
    });
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
function overdueMilestones(project) {
  const all = flattenMilestones(project.milestones);
  const today = todayStr();
  return all.filter((m) => m.targetDate && m.targetDate < today && m.status !== "Selesai");
}
function upcomingMilestones(project) {
  const all = flattenMilestones(project.milestones);
  const today = new Date();
  const in7 = new Date();
  in7.setDate(today.getDate() + 7);
  return all.filter((m) => {
    if (!m.targetDate || m.status === "Selesai") return false;
    const d = parseYMD(m.targetDate);
    return d >= today && d <= in7;
  });
}

// ---------- seed data ----------
function seedData() {
  return [
    {
      id: nid(),
      name: "SmartJar — Toples Pintar IoT",
      code: "SJ-001",
      category: "IoT / Consumer",
      description: "Toples penyimpanan bahan makanan dengan sensor berat dan notifikasi stok habis.",
      status: "On Track",
      startDate: "2026-03-01",
      targetReleaseDate: "2026-11-15",
      archived: false,
      milestones: [
        {
          id: nid(), title: "Riset & Konsep", description: "Validasi ide dan riset pasar awal",
          status: "Selesai", targetDate: "2026-03-20", completedAt: "2026-03-18",
          checklist: [
            { id: nid(), title: "Survey 50 calon pengguna", notes: "Hasil: 78% tertarik", isCompleted: true, completedAt: "2026-03-10", hasPhoto: false },
            { id: nid(), title: "Analisis kompetitor", notes: "3 kompetitor utama dipetakan", isCompleted: true, completedAt: "2026-03-15", hasPhoto: false },
          ],
          evaluations: [
            { id: nid(), score: 4, decision: "Go", comments: "Potensi pasar cukup jelas, lanjut ke prototyping.", createdAt: "2026-03-19" },
          ],
          children: [],
        },
        {
          id: nid(), title: "Prototyping", description: "Membuat prototipe fungsional",
          status: "Berjalan", targetDate: "2026-08-10", completedAt: null,
          checklist: [
            { id: nid(), title: "Desain PCB sensor berat", notes: "", isCompleted: true, completedAt: "2026-06-01", hasPhoto: true },
            { id: nid(), title: "Rakit prototipe v1", notes: "Masih perlu kalibrasi sensor", isCompleted: false, completedAt: null, hasPhoto: false },
          ],
          evaluations: [],
          children: [
            {
              id: nid(), title: "Sub: Kalibrasi Sensor", description: "Tuning akurasi sensor berat",
              status: "Berjalan", targetDate: "2026-07-25", completedAt: null,
              checklist: [
                { id: nid(), title: "Uji akurasi 10 sample bahan", notes: "", isCompleted: false, completedAt: null, hasPhoto: false },
              ],
              evaluations: [],
              children: [],
            },
          ],
        },
        {
          id: nid(), title: "Uji Coba Lapangan", description: "Pilot ke 20 rumah tangga",
          status: "Belum mulai", targetDate: "2026-09-30", completedAt: null,
          checklist: [], evaluations: [], children: [],
        },
      ],
    },
    {
      id: nid(),
      name: "EcoWrap — Kemasan Biodegradable",
      code: "EW-002",
      category: "Material / Sustainability",
      description: "Kemasan makanan biodegradable berbahan dasar limbah pertanian lokal.",
      status: "At Risk",
      startDate: "2026-01-10",
      targetReleaseDate: "2026-07-01",
      archived: false,
      milestones: [
        {
          id: nid(), title: "Formulasi Bahan", description: "Uji formula biodegradable",
          status: "Berjalan", targetDate: "2026-06-15", completedAt: null,
          checklist: [
            { id: nid(), title: "Uji formula batch 3", notes: "Ketahanan air masih kurang", isCompleted: false, completedAt: null, hasPhoto: true },
          ],
          evaluations: [
            { id: nid(), score: 2, decision: "No-Go", comments: "Formula batch 2 gagal uji ketahanan air, perlu revisi total.", createdAt: "2026-05-20" },
          ],
          children: [],
        },
        {
          id: nid(), title: "Sertifikasi Lingkungan", description: "Proses sertifikasi biodegradable",
          status: "Belum mulai", targetDate: "2026-06-25", completedAt: null,
          checklist: [], evaluations: [], children: [],
        },
      ],
    },
    {
      id: nid(),
      name: "PulseBand — Wearable Kesehatan",
      code: "PB-003",
      category: "Wearable / Health",
      description: "Gelang pemantau detak jantung dan kualitas tidur untuk lansia.",
      status: "Ideation",
      startDate: "2026-07-01",
      targetReleaseDate: "2027-02-01",
      archived: false,
      milestones: [
        {
          id: nid(), title: "Riset Kebutuhan Pengguna", description: "",
          status: "Belum mulai", targetDate: "2026-08-15", completedAt: null,
          checklist: [
            { id: nid(), title: "Wawancara 15 keluarga lansia", notes: "", isCompleted: false, completedAt: null, hasPhoto: false },
          ],
          evaluations: [], children: [],
        },
      ],
    },
  ];
}

// ---------- shared small UI ----------
function Badge({ bg, fg, children, icon }) {
  return (
    <span
      style={{
        background: bg, color: fg, borderRadius: R.full, padding: "3px 10px",
        fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      {icon}{children}
    </span>
  );
}

function ProgressBar({ pct, color = C.primary }) {
  return (
    <div style={{ background: "#ececea", borderRadius: R.full, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ background: color, height: "100%", width: `${pct}%`, borderRadius: R.full, transition: "width .3s" }} />
    </div>
  );
}

function IconButton({ onClick, title, children, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "transparent", border: "none", cursor: "pointer", padding: 6,
        borderRadius: R.md, color: danger ? "#b3261e" : C.inkMuted, display: "flex", alignItems: "center",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "#fdeceb" : "#efeeec")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children, style, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        background: C.primary, color: C.onPrimary, border: "none", borderRadius: R.full,
        padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6, ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.background = C.primaryActive)}
      onMouseUp={(e) => (e.currentTarget.style.background = C.primary)}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.surface, color: C.ink, border: `1px solid ${C.hairline}`, borderRadius: R.md,
        padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 6, ...style,
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return <label style={{ fontSize: 13, fontWeight: 600, color: C.inkSecondary, marginBottom: 4, display: "block" }}>{children}</label>;
}
const inputStyle = {
  width: "100%", boxSizing: "border-box", background: C.surface, color: C.ink, fontSize: 14,
  border: "1px solid #dddddd", borderRadius: R.xs, padding: "8px 10px", outline: "none",
};

function Modal({ title, onClose, children, width = 460, onCloseAttempt }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (onCloseAttempt) onCloseAttempt(); else onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const f = el.querySelector("input:not([type=hidden]), textarea, select") || el.querySelector("button");
      if (f) f.focus();
    }, 0);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [onCloseAttempt, onClose]);
  const attemptClose = () => { if (onCloseAttempt) onCloseAttempt(); else onClose(); };
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(23,23,23,0.35)", zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={attemptClose}
    >
      <div
        ref={ref}
        style={{
          background: C.surface, borderRadius: R.lg, boxShadow: shadow2, width, maxWidth: "100%",
          maxHeight: "88vh", overflowY: "auto", padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: "-0.25px" }}>{title}</h3>
          <IconButton onClick={attemptClose} title="Tutup"><X size={18} /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState({ state: "idle", msg: "" }); // idle | saving | saved | error
  const [view, setView] = useState("dashboard"); // dashboard | project
  const hydrated = useRef(false);
  const skipSync = useRef(false);
  const saveTimer = useRef(null);
  const saving = useRef(false);
  const queued = useRef(null);

  // --- Load dari Supabase (anon read) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadProjects();
        if (cancelled) return;
        if (rows.length) {
          skipSync.current = true;
          setProjects(rows);
        } else {
          const seeded = seedData();
          skipSync.current = true;
          setProjects(seeded);
          try {
            await syncToSupabase(seeded.map((p) => ({ id: p.id, data: p })), []);
            setSaveStatus({ state: "saved", msg: "Tersimpan" });
          } catch (e) {
            setSaveStatus({ state: "error", msg: "Gagal simpan: " + (e && e.message ? e.message : e) });
          }
        }
      } catch (e) {
        if (!cancelled) console.error("Gagal memuat roadmap:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
      hydrated.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // --- Simpan tiap perubahan ke Supabase via GAS (debounce + optimistic) ---
  const doSave = useCallback(async () => {
    if (saving.current) return;
    const batch = queued.current;
    if (!batch) return;
    saving.current = true;
    try {
      await syncToSupabase(batch.rows, batch.deletes || []);
      setSaveStatus({ state: "saved", msg: "Tersimpan" });
    } catch (e) {
      setSaveStatus({ state: "error", msg: "Gagal simpan: " + (e && e.message ? e.message : e) });
    } finally {
      saving.current = false;
      if (queued.current && queued.current !== batch) doSave(); // ada edit baru, simpan lagi
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current || skipSync.current) {
      skipSync.current = false;
      return;
    }
    queued.current = { rows: projects.map((p) => ({ id: p.id, data: p })), deletes: [] };
    setSaveStatus({ state: "saving", msg: "Menyimpan…" });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), 400);
    return () => clearTimeout(saveTimer.current);
  }, [projects]);

  // Sembunyikan badge "Tersimpan" otomatis setelah 3 detik; biarkan "error" bertahan
  useEffect(() => {
    if (saveStatus.state !== "saved") return;
    const t = setTimeout(() => setSaveStatus({ state: "idle", msg: "" }), 3000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectModal, setProjectModal] = useState(null); // null | {} (new) | project (edit)
  const [showArchived, setShowArchived] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  function openProject(id) {
    setActiveProjectId(id);
    setView("project");
  }
  function backToDashboard() {
    setView("dashboard");
    setActiveProjectId(null);
  }
  function saveProject(data) {
    if (data.id) {
      setProjects((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
    } else {
      const newProj = {
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : nid(), milestones: [], archived: false,
        name: data.name, code: data.code, category: data.category, description: data.description,
        status: data.status, startDate: data.startDate, targetReleaseDate: data.targetReleaseDate,
      };
      setProjects((prev) => [...prev, newProj]);
    }
    setProjectModal(null);
  }
  function archiveProject(id) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p)));
  }
  function updateProjectMilestones(projectId, updater) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, milestones: updater(p.milestones) } : p))
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--font-sans)", background: C.canvasSoft, minHeight: "100dvh", height: "100dvh", overflowY: "auto", color: C.ink, padding: "28px 24px" }}>
        <style>{`@keyframes sk{0%{opacity:.45}50%{opacity:1}100%{opacity:.45}} .sk{background:var(--surface2);border-radius:8px;animation:sk 1.2s ease-in-out infinite;}`}</style>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div className="sk" style={{ height: 28, width: 220, marginBottom: 22 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 18 }}>
                <div className="sk" style={{ height: 16, width: "60%", marginBottom: 10 }} />
                <div className="sk" style={{ height: 12, width: "40%", marginBottom: 16 }} />
                <div className="sk" style={{ height: 8, width: "100%", marginBottom: 6 }} />
                <div className="sk" style={{ height: 8, width: "82%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <LightboxContext.Provider value={{ viewPhoto: setLightboxUrl }}>
    <div style={{ fontFamily: "var(--font-sans)", background: C.canvasSoft, minHeight: "100dvh", height: "100dvh", overflowY: "auto", color: C.ink }}>
      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: var(--muted); }
        input:focus, textarea:focus, select:focus { border-color: var(--primary) !important; box-shadow: var(--focus-ring); }
      `}</style>

      {/* Top nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.hairline}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <div
          onClick={backToDashboard}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <div style={{ width: 28, height: 28, borderRadius: R.md, background: C.secondary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LayoutGrid size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.25px" }}>RND Roadmap Tracker</span>
        </div>
        {view === "project" && activeProject && (
          <>
            <ChevronRight size={14} color={C.inkFaint} />
            <span style={{ fontSize: 14, color: C.inkMuted }}>{activeProject.name}</span>
          </>
        )}
        {saveStatus.state !== "idle" && (
          <span
            title={saveStatus.msg}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: R.sm,
              background: saveStatus.state === "error" ? "#ffe0c2" : saveStatus.state === "saved" ? "#c9f2d3" : "#f6f5f4",
              color: saveStatus.state === "error" ? C.orangeDeep : saveStatus.state === "saved" ? "#0b5e1e" : C.inkMuted,
              whiteSpace: "nowrap",
            }}
          >
            {saveStatus.state === "error" ? "⚠ " : saveStatus.state === "saved" ? "✓ " : ""}{saveStatus.msg}
          </span>
        )}
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px 64px" }}>
        {view === "dashboard" && (
          <Dashboard
            projects={projects}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            onOpen={openProject}
            onNewProject={() => setProjectModal({})}
            onEditProject={(p) => setProjectModal(p)}
            onArchive={archiveProject}
          />
        )}
        {view === "project" && activeProject && (
          <ProjectDetail
            project={activeProject}
            onBack={backToDashboard}
            onEditProject={() => setProjectModal(activeProject)}
            updateMilestones={(updater) => updateProjectMilestones(activeProject.id, updater)}
          />
        )}
      </div>

      {projectModal !== null && (
        <ProjectModal
          key={projectModal.id || "new"}
          initial={projectModal}
          onClose={() => setProjectModal(null)}
          onSave={saveProject}
        />
      )}
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
    </LightboxContext.Provider>
  );
}

// ---------- Dashboard ----------
function Dashboard({ projects, showArchived, setShowArchived, onOpen, onNewProject, onEditProject, onArchive }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("default");
  const DASH_FILTERS = [
    { key: "all", label: "Semua" },
    { key: "Ideation", label: "Ideation" },
    { key: "On Track", label: "On Track" },
    { key: "At Risk", label: "At Risk" },
    { key: "Done", label: "Done" },
  ];
  const STATUS_ORDER = { "Ideation": 0, "On Track": 1, "At Risk": 2, "Done": 3 };
  const comparators = {
    default: () => 0,
    status: (a, b) => ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) || (a.name || "").localeCompare(b.name || ""),
    target: (a, b) => (a.targetReleaseDate || "9999-99-99").localeCompare(b.targetReleaseDate || "9999-99-99"),
    progress: (a, b) => projectChecklistStats(b).pct - projectChecklistStats(a).pct,
  };
  const needle = q.trim().toLowerCase();
  const visible = projects
    .filter((p) => (showArchived ? p.archived : !p.archived))
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter((p) => {
      if (!needle) return true;
      if ((p.name || "").toLowerCase().includes(needle)) return true;
      if ((p.code || "").toLowerCase().includes(needle)) return true;
      if ((p.description || "").toLowerCase().includes(needle)) return true;
      return (p.milestones || []).some((m) =>
        (m.title || "").toLowerCase().includes(needle) ||
        (m.checklist || []).some((c) => (c.title || "").toLowerCase().includes(needle))
      );
    }).slice().sort(comparators[sort] || comparators.default);

  const counts = { Ideation: 0, "On Track": 0, "At Risk": 0, Done: 0 };
  projects.filter((p) => !p.archived).forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
  let totalItems = 0, doneItems = 0;
  projects.filter((p) => !p.archived).forEach((p) => {
    flattenMilestones(p.milestones).forEach((m) => (m.checklist || []).forEach((c) => { totalItems++; if (c.isCompleted) doneItems++; }));
  });
  const overallPct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const CIRC = 2 * Math.PI * 36;

  const alerts = [];
  projects.filter((p) => !p.archived).forEach((p) => {
    overdueMilestones(p).forEach((m) => alerts.push({ project: p, milestone: m, kind: "overdue" }));
    upcomingMilestones(p).forEach((m) => alerts.push({ project: p, milestone: m, kind: "upcoming" }));
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.625px", margin: "0 0 4px" }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: C.inkMuted, margin: 0 }}>Ringkasan progres produk baru Divisi R&D.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => downloadCsv("rnd-roadmap.csv", buildRoadmapCsv(projects.filter((p) => !p.archived)))}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          ><Download size={16} /> Export CSV</button>
          <button
            onClick={() => openPrintableReport(projects)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          ><Printer size={16} /> Export PDF</button>
          <PrimaryButton onClick={onNewProject}><Plus size={16} /> Project Baru</PrimaryButton>
        </div>
      </div>

      {/* Search & filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari project, milestone, atau checklist…"
          style={{ flex: "1 1 240px", minWidth: 200, padding: "9px 12px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, fontSize: 13, color: C.ink, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DASH_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                padding: "7px 12px", borderRadius: R.full, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                border: `1px solid ${statusFilter === f.key ? C.primary : C.hairline}`,
                background: statusFilter === f.key ? C.primary : C.surface,
                color: statusFilter === f.key ? "#fff" : C.inkSecondary,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, fontSize: 13, color: C.ink, cursor: "pointer" }}
        >
          <option value="default">Urutkan: Default</option>
          <option value="status">Status</option>
          <option value="target">Target Rilis</option>
          <option value="progress">Progress</option>
        </select>
      </div>

      {/* Status summary + overall progress */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {Object.entries(PROJECT_STATUS).map(([key, cfg]) => (
            <div key={key} style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: R.full, background: cfg.fg }} />
                <span style={{ fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>{counts[key] || 0}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="84" height="84" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke={C.hairline} strokeWidth="10" />
            <circle cx="44" cy="44" r="36" fill="none" stroke={C.primary} strokeWidth="10"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - overallPct / 100)}
              transform="rotate(-90 44 44)" strokeLinecap="round" />
            <text x="44" y="44" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill={C.ink}>{overallPct}%</text>
          </svg>
          <div>
            <div style={{ fontSize: 13, color: C.inkMuted, fontWeight: 500 }}>Progress Keseluruhan</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{doneItems}/{totalItems} item checklist</div>
          </div>
        </div>
      </div>

      {/* Alert panel */}
      {alerts.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 18, marginBottom: 24, boxShadow: shadow1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={16} color={C.orangeDeep} />
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Panel Peringatan</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a, i) => (
              <div
                key={i}
                onClick={() => onOpen(a.project.id)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
                  padding: "8px 10px", borderRadius: R.sm, background: a.kind === "overdue" ? "#fff4ec" : "#f6f5f4",
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{a.project.name}</span>
                  <span style={{ color: C.inkMuted }}> — {a.milestone.title}</span>
                </div>
                <Badge
                  bg={a.kind === "overdue" ? "#ffe0c2" : "#cfe6ff"}
                  fg={a.kind === "overdue" ? C.orangeDeep : "#0b3a63"}
                >
                  {a.kind === "overdue" ? `Lewat target: ${a.milestone.targetDate}` : `Target: ${a.milestone.targetDate}`}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{showArchived ? "Project Diarsipkan" : "Semua Project"}</h3>
        <button
          onClick={() => setShowArchived((s) => !s)}
          style={{ background: "none", border: "none", color: C.primary, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          {showArchived ? "Lihat project aktif" : "Lihat arsip"}
        </button>
      </div>

      {visible.length === 0 && (
        <div style={{ background: C.surface, border: `1px dashed ${C.hairline}`, borderRadius: R.lg, padding: 40, textAlign: "center", color: C.inkMuted, fontSize: 14 }}>
          {needle ? `Tidak ada hasil untuk "${q}".` : showArchived ? "Belum ada project yang diarsipkan." : "Belum ada project. Tambahkan project baru untuk mulai melacak roadmap."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {visible.map((p) => {
          const stats = projectChecklistStats(p);
          const cfg = PROJECT_STATUS[p.status] || PROJECT_STATUS["Ideation"];
          return (
            <div
              key={p.id}
              style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 18, cursor: "pointer" }}
              onClick={() => onOpen(p.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <Badge bg={cfg.bg} fg={cfg.fg}>{cfg.label}</Badge>
                {overdueMilestones(p).length > 0 && (
                  <Badge bg="#ffe0c2" fg={C.orangeDeep}>Lewat Target</Badge>
                )}
                <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <IconButton title="Edit" onClick={() => onEditProject(p)}><Pencil size={14} /></IconButton>
                  <IconButton title={p.archived ? "Aktifkan" : "Arsipkan"} onClick={() => onArchive(p.id)}><Archive size={14} /></IconButton>
                </div>
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px", letterSpacing: "-0.25px" }}>{highlightMatch(p.name, q)}</h4>
              <p style={{ fontSize: 12, color: C.inkFaint, margin: "0 0 10px" }}>{p.code} · {p.category}</p>
              <p style={{ fontSize: 13, color: C.inkSecondary, margin: "0 0 14px", lineHeight: 1.4, minHeight: 34 }}>{highlightMatch(p.description, q)}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.inkMuted, marginBottom: 4 }}>
                <span>Progress checklist</span>
                <span style={{ fontWeight: 600, color: C.ink }}>{stats.pct}%</span>
              </div>
              <ProgressBar pct={stats.pct} />
              <p style={{ fontSize: 11, color: C.inkFaint, margin: "10px 0 0" }}>Target rilis: {p.targetReleaseDate || "—"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Project Modal ----------
function ProjectModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    id: initial.id || null,
    name: initial.name || "",
    code: initial.code || "",
    category: initial.category || "",
    description: initial.description || "",
    status: initial.status || "Ideation",
    startDate: initial.startDate || todayStr(),
    targetReleaseDate: initial.targetReleaseDate || "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e }));
  const initialSnapshot = useRef(JSON.stringify(form)).current;
  const dirty = JSON.stringify(form) !== initialSnapshot;
  const handleClose = () => {
    if (dirty && !window.confirm("Keluar? Data yang sudah diinput akan hilang.")) return;
    onClose();
  };

  return (
    <Modal title={initial.id ? "Edit Project" : "Project Baru"} onClose={onClose} onCloseAttempt={handleClose} width={480}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; onSave(form); }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div>
          <FieldLabel>Nama Produk</FieldLabel>
          <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="mis. SmartJar — Toples Pintar IoT" required />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Kode / SKU</FieldLabel>
            <input style={inputStyle} value={form.code} onChange={set("code")} placeholder="SJ-001" />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Kategori</FieldLabel>
            <input style={inputStyle} value={form.category} onChange={set("category")} placeholder="IoT / Consumer" />
          </div>
        </div>
        <div>
          <FieldLabel>Deskripsi Singkat</FieldLabel>
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.description} onChange={set("description")} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Tanggal Mulai</FieldLabel>
            <DatePicker value={form.startDate} onChange={set("startDate")} />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Target Rilis</FieldLabel>
            <DatePicker value={form.targetReleaseDate} onChange={set("targetReleaseDate")} />
          </div>
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select style={inputStyle} value={form.status} onChange={set("status")}>
            {Object.keys(PROJECT_STATUS).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <SecondaryButton onClick={handleClose}>Batal</SecondaryButton>
            <PrimaryButton type="submit">Simpan</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Project Detail ----------
function ProjectDetail({ project, onBack, onEditProject, updateMilestones }) {
  const [tab, setTab] = useState("roadmap"); // roadmap | laporan
  const [milestoneModal, setMilestoneModal] = useState(null); // {parentId, edit?}
  const [checklistModal, setChecklistModal] = useState(null); // {milestoneId, edit?}
  const [evalModal, setEvalModal] = useState(null); // {milestoneId}
  const [msQ, setMsQ] = useState("");
  const msNeedle = msQ.trim().toLowerCase();
  const visibleMilestones = msNeedle
    ? filterMilestoneTree(project.milestones, (m) => milestoneMatchesSearch(m, msNeedle))
    : project.milestones;
  const stats = projectChecklistStats(project);
  const cfg = PROJECT_STATUS[project.status] || PROJECT_STATUS["Ideation"];
  const overdue = overdueMilestones(project);

  function addMilestone(parentId, data) {
    const node = {
      id: nid(), title: data.title, description: data.description, status: data.status,
      targetDate: data.targetDate, completedAt: data.status === "Selesai" ? todayStr() : null,
      checklist: [], evaluations: [], children: [],
    };
    updateMilestones((ms) => addChildToTree(ms, parentId, node));
    setMilestoneModal(null);
  }
  function editMilestone(id, data) {
    updateMilestones((ms) => mapTree(ms, id, (n) => ({
      ...n, title: data.title, description: data.description, status: data.status,
      targetDate: data.targetDate, completedAt: data.status === "Selesai" ? (n.completedAt || todayStr()) : null,
    })));
    setMilestoneModal(null);
  }
  function deleteMilestone(id) {
    const node = findNode(project.milestones, id);
    if (node) collectPhotoUrls(node).forEach((u) => { try { deleteFromStorage(u); } catch (_) {} });
    updateMilestones((ms) => removeFromTree(ms, id));
  }
  function addChecklist(milestoneId, data) {
    updateMilestones((ms) => mapTree(ms, milestoneId, (n) => ({
      ...n, checklist: [...(n.checklist || []), {
        id: nid(), title: data.title, notes: data.notes, isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? todayStr() : null, photoUrl: data.photoUrl || "",
      }],
    })));
    setChecklistModal(null);
  }
  function editChecklist(milestoneId, itemId, data) {
    updateMilestones((ms) => mapTree(ms, milestoneId, (n) => ({
      ...n,
      checklist: (n.checklist || []).map((c) => c.id === itemId ? {
        ...c, title: data.title, notes: data.notes, isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? (c.completedAt || todayStr()) : null, photoUrl: data.photoUrl || "",
      } : c),
    })));
    setChecklistModal(null);
  }
  function toggleChecklist(milestoneId, itemId) {
    updateMilestones((ms) => mapTree(ms, milestoneId, (n) => ({
      ...n,
      checklist: (n.checklist || []).map((c) => c.id === itemId ? {
        ...c, isCompleted: !c.isCompleted, completedAt: !c.isCompleted ? todayStr() : null,
      } : c),
    })));
  }
  function deleteChecklist(milestoneId, itemId) {
    updateMilestones((ms) => mapTree(ms, milestoneId, (n) => {
      const item = (n.checklist || []).find((c) => c.id === itemId);
      if (item && item.photoUrl) deleteFromStorage(item.photoUrl);
      return { ...n, checklist: (n.checklist || []).filter((c) => c.id !== itemId) };
    }));
  }
  function addEvaluation(milestoneId, data) {
    updateMilestones((ms) => mapTree(ms, milestoneId, (n) => ({
      ...n, evaluations: [{ id: nid(), score: data.score, decision: data.decision, comments: data.comments, createdAt: todayStr() }, ...(n.evaluations || [])],
    })));
    setEvalModal(null);
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.inkMuted, fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0, marginBottom: 14 }}>
        <ArrowLeft size={14} /> Kembali ke Dashboard
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Badge bg={cfg.bg} fg={cfg.fg}>{cfg.label}</Badge>
            <span style={{ fontSize: 12, color: C.inkFaint }}>{project.code} · {project.category}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}>{project.name}</h1>
          <p style={{ fontSize: 14, color: C.inkSecondary, margin: 0, maxWidth: 620 }}>{project.description}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => downloadCsv(`${project.code || "project"}-roadmap.csv`, buildRoadmapCsv([project]))}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          ><Download size={14} /> CSV</button>
          <button
            onClick={() => openPrintableReport([project])}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          ><Printer size={14} /> PDF</button>
          <SecondaryButton onClick={onEditProject}><Pencil size={14} /> Edit Project</SecondaryButton>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 16 }}>
          <p style={{ fontSize: 12, color: C.inkMuted, margin: "0 0 6px" }}>Progress Checklist</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{stats.pct}%</span>
            <span style={{ fontSize: 12, color: C.inkFaint }}>({stats.done}/{stats.total} item)</span>
          </div>
          <ProgressBar pct={stats.pct} />
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 16 }}>
          <p style={{ fontSize: 12, color: C.inkMuted, margin: "0 0 6px" }}>Tahapan Overdue</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {overdue.length > 0 && <AlertTriangle size={16} color={C.orangeDeep} />}
            <span style={{ fontSize: 22, fontWeight: 700, color: overdue.length ? C.orangeDeep : C.ink }}>{overdue.length}</span>
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 16 }}>
          <p style={{ fontSize: 12, color: C.inkMuted, margin: "0 0 6px" }}>Target Rilis</p>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{project.targetReleaseDate || "—"}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.hairline}` }}>
        {[["roadmap", "Roadmap"], ["laporan", "Laporan Detail"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 4px", marginRight: 20,
              fontSize: 14, fontWeight: 600, color: tab === key ? C.primary : C.inkMuted,
              borderBottom: tab === key ? `2px solid ${C.primary}` : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "roadmap" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              value={msQ}
              onChange={(e) => setMsQ(e.target.value)}
              placeholder="Cari tahapan atau checklist…"
              style={{ flex: "1 1 200px", minWidth: 160, padding: "9px 12px", borderRadius: R.md, border: `1px solid ${C.hairline}`, background: C.surface, fontSize: 13, color: C.ink, outline: "none" }}
            />
            <PrimaryButton onClick={() => setMilestoneModal({ parentId: null })}><Plus size={16} /> Tambah Tahapan</PrimaryButton>
          </div>
          {visibleMilestones.length === 0 ? (
            <div style={{ background: C.surface, border: `1px dashed ${C.hairline}`, borderRadius: R.lg, padding: 40, textAlign: "center", color: C.inkMuted, fontSize: 14 }}>
              {project.milestones.length === 0 ? "Belum ada tahapan. Tambahkan tahapan pertama untuk mulai menyusun roadmap." : `Tidak ada tahapan sesuai pencarian "${msQ}".`}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {visibleMilestones.map((m, i) => (
                <MilestoneNode
                  key={m.id}
                  node={m}
                  depth={0}
                  isLast={i === visibleMilestones.length - 1}
                  q={msQ}
                  onAddChild={(parentId) => setMilestoneModal({ parentId })}
                  onEdit={(node) => setMilestoneModal({ parentId: null, edit: node })}
                  onDelete={deleteMilestone}
                  onAddChecklist={(milestoneId) => setChecklistModal({ milestoneId })}
                  onEditChecklist={(milestoneId, item) => setChecklistModal({ milestoneId, edit: item })}
                  onToggleChecklist={toggleChecklist}
                  onDeleteChecklist={deleteChecklist}
                  onAddEval={(milestoneId) => setEvalModal({ milestoneId })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "laporan" && <ReportView project={project} />}

      {milestoneModal && (
        <MilestoneModal
          key={milestoneModal.edit ? "edit-" + milestoneModal.edit.id : "add-" + milestoneModal.parentId}
          isEdit={!!milestoneModal.edit}
          initial={milestoneModal.edit}
          onClose={() => setMilestoneModal(null)}
          onSave={(data) => milestoneModal.edit ? editMilestone(milestoneModal.edit.id, data) : addMilestone(milestoneModal.parentId, data)}
        />
      )}
      {checklistModal && (
        <ChecklistModal
          key={checklistModal.edit ? "edit-" + checklistModal.edit.id : "add-" + checklistModal.milestoneId}
          initial={checklistModal.edit}
          onClose={() => setChecklistModal(null)}
          onSave={(data) => checklistModal.edit
            ? editChecklist(checklistModal.milestoneId, checklistModal.edit.id, data)
            : addChecklist(checklistModal.milestoneId, data)}
        />
      )}
      {evalModal && (
        <EvaluationModal
          onClose={() => setEvalModal(null)}
          onSave={(data) => addEvaluation(evalModal.milestoneId, data)}
        />
      )}
    </div>
  );
}

// ---------- Milestone timeline node marker ----------
function TimelineDot({ status, isOverdue, size = 28 }) {
  const isDone = status === "Selesai";
  const isActive = status === "Berjalan";
  const ring = isOverdue ? "0 0 0 3px #ffe0c2" : "none";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: R.full, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isDone ? C.green : isActive ? C.primary : C.surface,
        border: `2px solid ${isDone ? C.green : isActive ? C.primary : "#c9c6c0"}`,
        boxShadow: ring, zIndex: 1,
      }}
    >
      {isDone && <CheckCircle2 size={size - 12} color="#fff" strokeWidth={2.5} />}
      {isActive && <div style={{ width: size - 18, height: size - 18, borderRadius: R.full, background: "#fff" }} />}
    </div>
  );
}

// ---------- Milestone Node (recursive, timeline style) ----------
function MilestoneNode({ node, depth, isLast, q = "", onAddChild, onEdit, onDelete, onAddChecklist, onEditChecklist, onToggleChecklist, onDeleteChecklist, onAddEval }) {
  const { viewPhoto } = useLightbox();
  const [open, setOpen] = useState(depth < 1);
  const [showChecklist, setShowChecklist] = useState(true);
  const [showEval, setShowEval] = useState(false);
  const st = MILESTONE_STATUS[node.status] || MILESTONE_STATUS["Belum mulai"];
  const checklistTotal = (node.checklist || []).length;
  const checklistDone = (node.checklist || []).filter((c) => c.isCompleted).length;
  const pct = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const isOverdue = node.targetDate && node.targetDate < todayStr() && node.status !== "Selesai";
  const dotSize = depth === 0 ? 28 : 20;
  const hasChildren = (node.children || []).length > 0;

  return (
    <div style={{ display: "flex", gap: 14 }}>
      {/* Timeline rail */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: dotSize }}>
        <TimelineDot status={node.status} isOverdue={isOverdue} size={dotSize} />
        {!isLast && <div style={{ flex: 1, width: 2, background: C.hairline, marginTop: 2 }} />}
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : depth === 0 ? 24 : 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${isOverdue ? "#f0c49a" : C.hairline}`, borderRadius: R.lg, padding: depth === 0 ? 16 : 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <IconButton onClick={() => setOpen((o) => !o)} title="Buka/tutup">
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </IconButton>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontSize: depth === 0 ? 16 : 14, fontWeight: 700 }}>{highlightMatch(node.title, q)}</span>
                <Badge bg={st.bg} fg={st.fg}>{st.label}</Badge>
                {isOverdue && <Badge bg="#ffe0c2" fg={C.orangeDeep} icon={<AlertTriangle size={11} />}>Overdue</Badge>}
              </div>
              {node.description && <p style={{ fontSize: 13, color: C.inkMuted, margin: "0 0 6px" }}>{node.description}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: C.inkFaint, flexWrap: "wrap" }}>
                {node.targetDate && <span>Target: {node.targetDate}</span>}
                {checklistTotal > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 120 }}>
                    Checklist {checklistDone}/{checklistTotal}
                    <span style={{ width: 60 }}><ProgressBar pct={pct} color={C.teal} /></span>
                  </span>
                )}
                {(node.evaluations || []).length > 0 && <span>{node.evaluations.length} evaluasi</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              <IconButton title="Tambah sub-tahapan" onClick={() => onAddChild(node.id)}><Plus size={15} /></IconButton>
              <IconButton title="Edit" onClick={() => onEdit(node)}><Pencil size={14} /></IconButton>
              <IconButton title="Hapus" danger onClick={() => { if (window.confirm('Hapus milestone "' + (node.title || '') + '"? Tindakan tidak bisa dibatalkan.')) onDelete(node.id); }}><Trash2 size={14} /></IconButton>
            </div>
          </div>

          {open && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.hairline}` }}>
              {/* Checklist section */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <button onClick={() => setShowChecklist((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, fontSize: 13, fontWeight: 600, color: C.inkSecondary }}>
                    <ClipboardList size={14} /> Checklist ({checklistTotal})
                  </button>
                  <button onClick={() => onAddChecklist(node.id)} style={{ background: "none", border: "none", color: C.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Tambah item</button>
                </div>
                {showChecklist && (node.checklist || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {node.checklist.map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: R.sm, background: C.canvasSoft }}>
                        <div style={{ cursor: "pointer", marginTop: 1 }} onClick={() => onToggleChecklist(node.id, c.id)}>
                          {c.isCompleted ? <CheckCircle2 size={16} color={C.green} /> : <Circle size={16} color={C.inkFaint} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, textDecoration: c.isCompleted ? "line-through" : "none", color: c.isCompleted ? C.inkFaint : C.ink }}>
                            {highlightMatch(c.title, q)}
                            {c.photoUrl && (
                              <img
                                src={c.photoUrl}
                                alt=""
                                onClick={(e) => { e.stopPropagation(); viewPhoto(c.photoUrl); }}
                                style={{ display: "inline-block", width: 48, height: 48, objectFit: "cover", borderRadius: 6, marginLeft: 8, verticalAlign: "middle", cursor: "pointer", border: `1px solid ${C.hairline}` }}
                              />
                            )}
                          </div>
                          {c.notes && <div style={{ fontSize: 12, color: C.inkMuted }}>{c.notes}</div>}
                          {c.completedAt && <div style={{ fontSize: 11, color: C.inkFaint }}>Selesai: {c.completedAt}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 0 }}>
                          <IconButton title="Edit" onClick={() => onEditChecklist(node.id, c)}><Pencil size={12} /></IconButton>
                          <IconButton title="Hapus" danger onClick={() => { if (window.confirm('Hapus item "' + (c.title || '') + '"? Tindakan tidak bisa dibatalkan.')) onDeleteChecklist(node.id, c.id); }}><Trash2 size={12} /></IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evaluation section */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <button onClick={() => setShowEval((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, fontSize: 13, fontWeight: 600, color: C.inkSecondary }}>
                    <Star size={14} /> Evaluasi ({(node.evaluations || []).length})
                  </button>
                  <button onClick={() => onAddEval(node.id)} style={{ background: "none", border: "none", color: C.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Tambah evaluasi</button>
                </div>
                {showEval && (node.evaluations || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {node.evaluations.map((ev) => (
                      <div key={ev.id} style={{ padding: "8px 10px", borderRadius: R.sm, background: C.canvasSoft }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <Badge bg={ev.decision === "Go" ? "#c9f2d3" : "#ffe0c2"} fg={ev.decision === "Go" ? "#0b5e1e" : C.orangeDeep}>{ev.decision}</Badge>
                          <span style={{ fontSize: 12, color: C.inkMuted }}>Skor {ev.score}/5</span>
                          <span style={{ fontSize: 11, color: C.inkFaint }}>· {ev.createdAt}</span>
                        </div>
                        {ev.comments && <div style={{ fontSize: 12, color: C.inkSecondary }}>{ev.comments}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sub-milestones: nested mini-timeline */}
        {open && hasChildren && (
          <div style={{ marginTop: 12 }}>
            {node.children.map((child, i) => (
              <MilestoneNode
                key={child.id}
                node={child}
                depth={depth + 1}
                isLast={i === node.children.length - 1}
                q={q}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChecklist={onAddChecklist}
                onEditChecklist={onEditChecklist}
                onToggleChecklist={onToggleChecklist}
                onDeleteChecklist={onDeleteChecklist}
                onAddEval={onAddEval}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Milestone Modal ----------
function MilestoneModal({ isEdit, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    status: initial?.status || "Belum mulai",
    targetDate: initial?.targetDate || "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e }));
  const initialSnapshot = useRef(JSON.stringify(form)).current;
  const dirty = JSON.stringify(form) !== initialSnapshot;
  const handleClose = () => {
    if (dirty && !window.confirm("Keluar? Data yang sudah diinput akan hilang.")) return;
    onClose();
  };
  return (
    <Modal title={isEdit ? "Edit Tahapan" : "Tambah Tahapan"} onClose={onClose} onCloseAttempt={handleClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (!form.title.trim()) return; onSave(form); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <FieldLabel>Judul Tahapan</FieldLabel>
          <input style={inputStyle} value={form.title} onChange={set("title")} placeholder="mis. Prototyping" required />
        </div>
        <div>
          <FieldLabel>Deskripsi</FieldLabel>
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={form.description} onChange={set("description")} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Status</FieldLabel>
            <select style={inputStyle} value={form.status} onChange={set("status")}>
              {Object.keys(MILESTONE_STATUS).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Target Tanggal</FieldLabel>
            <DatePicker value={form.targetDate} onChange={set("targetDate")} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <SecondaryButton onClick={handleClose}>Batal</SecondaryButton>
          <PrimaryButton type="submit">Simpan</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Checklist Modal ----------
function ChecklistModal({ initial, onClose, onSave }) {
  const { viewPhoto } = useLightbox();
  const [form, setForm] = useState({
    title: initial?.title || "",
    notes: initial?.notes || "",
    isCompleted: initial?.isCompleted || false,
    photoUrl: initial?.photoUrl || "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial?.photoUrl || "");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e })); setDirty(true); };

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setDirty(true);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }
  function onPick(e) {
    pickFile(e.target.files && e.target.files[0]);
  }
  const handleClose = () => {
    if (dirty && !window.confirm("Keluar? Data yang sudah diinput akan hilang.")) return;
    onClose();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    let photoUrl = form.photoUrl;
    if (file) {
      setBusy(true);
      try {
        // Kompres di client, lalu upload ke Supabase Storage lewat GAS (DB hanya simpan URL)
        const dataUrl = await resizeImageFile(file);
        const r = await uploadToStorage(dataUrl, file.name, "image/jpeg");
        if (r && r.photoUrl) photoUrl = r.photoUrl;
      } catch (err) {
        setBusy(false);
        alert("Gagal upload foto: " + (err && err.message ? err.message : err));
        return;
      }
      setBusy(false);
    } else if (!preview) {
      photoUrl = "";
    }
    // Bersihkan foto lama di Storage bila diganti/dibuang (best-effort)
    if (initial && initial.photoUrl && initial.photoUrl !== photoUrl) {
      deleteFromStorage(initial.photoUrl);
    }
    onSave({ ...form, photoUrl });
  }

  return (
    <Modal title={initial ? "Edit Checklist Item" : "Tambah Checklist Item"} onClose={onClose} onCloseAttempt={handleClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <FieldLabel>Judul Item</FieldLabel>
          <input style={inputStyle} value={form.title} onChange={set("title")} placeholder="mis. Uji akurasi sensor" required />
        </div>
        <div>
          <FieldLabel>Catatan</FieldLabel>
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={form.notes} onChange={set("notes")} />
        </div>
        <div>
          <FieldLabel>Foto Bukti</FieldLabel>
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); pickFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
            style={{ border: `1px dashed ${C.hairline}`, borderRadius: R.md, padding: 12, marginBottom: 8 }}
          >
            {preview && (
              <>
                <img src={preview} alt="" onClick={() => viewPhoto(preview)} style={{ maxWidth: "100%", maxHeight: 260, borderRadius: R.sm, marginBottom: 8, display: "block", cursor: "pointer" }} />
                <button type="button" onClick={() => { setPreview(""); setFile(null); setDirty(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: R.sm, border: `1px solid ${C.hairline}`, background: C.surface, color: C.inkSecondary, fontSize: 12, cursor: "pointer", marginBottom: 8 }}>Hapus foto</button>
              </>
            )}
            <input type="file" accept="image/*" onChange={onPick} style={{ fontSize: 13 }} />
            <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 4 }}>Klik pilih file, atau seret gambar ke sini.</div>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSecondary, cursor: "pointer" }}>
          <input type="checkbox" checked={form.isCompleted} onChange={(e) => { setForm((f) => ({ ...f, isCompleted: e.target.checked })); setDirty(true); }} />
          Sudah selesai
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <SecondaryButton onClick={handleClose}>Batal</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy}>{busy ? "Mengupload…" : "Simpan"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Evaluation Modal ----------
function EvaluationModal({ onClose, onSave }) {
  const [form, setForm] = useState({ score: 3, decision: "Go", comments: "" });
  const initialSnapshot = useRef(JSON.stringify(form)).current;
  const dirty = JSON.stringify(form) !== initialSnapshot;
  const handleClose = () => {
    if (dirty && !window.confirm("Keluar? Data yang sudah diinput akan hilang.")) return;
    onClose();
  };
  return (
    <Modal title="Tambah Evaluasi" onClose={onClose} onCloseAttempt={handleClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <FieldLabel>Skor Kelayakan (1–5)</FieldLabel>
          <input type="range" min={1} max={5} value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))} style={{ width: "100%" }} />
          <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: C.primary }}>{form.score}/5</div>
        </div>
        <div>
          <FieldLabel>Keputusan</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {["Go", "No-Go"].map((d) => (
              <button
                type="button" key={d}
                onClick={() => setForm((f) => ({ ...f, decision: d }))}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: R.md, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  border: `1px solid ${form.decision === d ? C.primary : C.hairline}`,
                  background: form.decision === d ? "#e6f1fb" : C.surface,
                  color: form.decision === d ? C.primary : C.inkMuted,
                }}
              >{d}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Catatan Kualitatif</FieldLabel>
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} placeholder="Pertimbangan, risiko, atau alasan keputusan..." />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <SecondaryButton onClick={handleClose}>Batal</SecondaryButton>
          <PrimaryButton type="submit">Simpan Evaluasi</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Report View ----------
function ReportView({ project }) {
  const { viewPhoto } = useLightbox();
  const all = flattenMilestones(project.milestones);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Ringkasan Produk</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
          <div><span style={{ color: C.inkMuted }}>Mulai: </span>{project.startDate || "—"}</div>
          <div><span style={{ color: C.inkMuted }}>Target rilis: </span>{project.targetReleaseDate || "—"}</div>
          <div><span style={{ color: C.inkMuted }}>Total tahapan: </span>{all.length}</div>
          <div><span style={{ color: C.inkMuted }}>Total evaluasi: </span>{all.reduce((s, m) => s + (m.evaluations || []).length, 0)}</div>
        </div>
      </div>

      {all.map((m) => (
        <div key={m.id} style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.lg, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{m.title}</span>
            <Badge bg={(MILESTONE_STATUS[m.status] || MILESTONE_STATUS["Belum mulai"]).bg} fg={(MILESTONE_STATUS[m.status] || MILESTONE_STATUS["Belum mulai"]).fg}>{m.status}</Badge>
          </div>
          {m.description && <p style={{ fontSize: 13, color: C.inkMuted, margin: "0 0 8px" }}>{m.description}</p>}

          {(m.checklist || []).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.inkSecondary, margin: "0 0 4px" }}>Checklist</p>
              {m.checklist.map((c) => (
                <div key={c.id} style={{ fontSize: 12, color: C.inkMuted, display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  {c.isCompleted ? <CheckCircle2 size={12} color={C.green} /> : <Circle size={12} color={C.inkFaint} />}
                  {c.title}
                  {c.photoUrl && <img src={c.photoUrl} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4, marginLeft: 6, verticalAlign: "middle", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); viewPhoto(c.photoUrl); }} />}
                </div>
              ))}
            </div>
          )}

          {(m.evaluations || []).length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.inkSecondary, margin: "0 0 4px" }}>Evaluasi</p>
              {m.evaluations.map((ev) => (
                <div key={ev.id} style={{ fontSize: 12, color: C.inkMuted, marginBottom: 2 }}>
                  <Badge bg={ev.decision === "Go" ? "#c9f2d3" : "#ffe0c2"} fg={ev.decision === "Go" ? "#0b5e1e" : C.orangeDeep}>{ev.decision}</Badge>
                  {" "}Skor {ev.score}/5 — {ev.comments} <span style={{ color: C.inkFaint }}>({ev.createdAt})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
