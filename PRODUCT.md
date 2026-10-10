# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Sales-analytics users in an e-commerce operation, working from a browser against live transaction data. Two audiences share the same tool: the internal operations team (primary) and external stakeholders such as clients or vendors who are given access to the same dashboards and reports. Their job: review sales, profit, and cost performance for a selected date range, catch anomalies early, and export or print the result.

- Confirmed: audience is mixed internal + external; interface language is Indonesian; use is internal (not a public, marketed product).
- Inferred from tool content (confirm before relying on it): the internal role is a sales/ops analyst working Shopee/TikTok/SUPERSUB channels; external access is view/report-sharing rather than data entry.

## Product Purpose

SAS — Sales Analytic Simplify — turns raw sales and cost rows into one readable dashboard: KPI cards, trend and margin charts, per-category breakdowns, and a detailed transaction table. It exists so the operation can see what sold, what it earned, and where money went without spreadsheet wrangling. Success = a period's numbers load fast, read clearly, and drive a decision; importing and recording data is possible but secondary to reading it.

## Positioning

A self-hosted, framework-free sales dashboard that a small operation owns end to end: static files, its own backend (Google Apps Script / Supabase), its own data — no third-party BI product and no per-seat license. It ships inside the REYNAHUB tool hub, so it inherits one navbar, one theme, and one design language with the team's other tools.

## Operating Context

- Delivered two ways: embedded in the REYNAHUB hub via iframe (theme synced by postMessage, tool chrome hidden) or opened standalone (own topbar plus a "back to hub" control).
- Data lives in Google Sheets / Supabase, read and written through a GAS web-app endpoint (POST `text/plain` JSON).
- Period-driven work: the dashboard is scoped by a date-range picker (day/week/month/custom) and can compare two periods.
- Ingestion: Excel (.xlsx) import with column auto-mapping, preview, and validation; plus manual sales-target and expense entry.
- Indonesian-language UI; light and dark themes.

## Capabilities and Constraints

Confirmed capabilities: KPI summary; sales trend line chart; margin, category, and daily-breakdown charts; sortable/searchable/paginated transaction table; date-range and compare mode; Excel import (drag-drop, auto-map, preview); sales target; expense tracking; print/PDF output; dark mode.

Constraints: one self-contained HTML file per tool (inline CSS + JS, no root toolchain); all color/radius/shadow come from design tokens, no raw hex outside `:root`; hash routes and the hub's embed/theme contracts are stable; when editing existing code, do not remove existing functions.

Undecided: whether external users get read-only access or write access; whether Supabase or Google Sheets is the canonical store going forward.

## Brand Commitments

- In-app name: "SAS — Sales Analytic Simplify" (Bento Edition). Hub name: REYNAHUB_SYS / REYNAHUB.
- Live at reynahub.web.id (GitHub Pages, custom domain).
- Voice: Indonesian, plain, operational. Typeface: Plus Jakarta Sans (self-hosted).
- The tool must read as one family with the rest of the hub — same navbar, theme, and design language.

## Evidence on Hand

Real transaction and cost data in Google Sheets/Supabase, accessed live through the GAS endpoint; real backend source under `gas/`. No testimonials, benchmarks, pricing, or customer logos exist — future work must not fabricate them.

## Product Principles

1. Read first — the dashboard's job is to make a period's numbers legible in seconds; data entry supports that, never leads it.
2. One operation, owned end to end — data, backend, and UI stay in the team's own hands; prefer the simplest thing the operation can maintain over a purchased platform.
3. Native to the hub — a tool is only "done" when it behaves as a member of the family (same navbar, theme, tokens, language).
4. Honest states — loading, empty, error, and offline each tell the user what happened and what to do next.
5. Calm under stress — money and inventory decisions are serious; keep copy plain and errors actionable.
