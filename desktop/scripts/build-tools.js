'use strict';

// Menghasilkan desktop/tools.json dari DAFTAR TOOL YANG SUDAH ADA:
//   src/components/tool-card.js  → grup, judul, deskripsi, hash
//   src/core/router.js           → hash → path halaman
// Tidak ada daftar kedua yang ditulis tangan: kalau ada tool baru di hub, menu
// aplikasi ikut berubah setelah skrip ini jalan (otomatis lewat `npm start`).

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Sandbox minimal: kedua file aslinya ditulis untuk browser.
const sandbox = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
  document: { addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} },
  console
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

vm.runInContext(read('src/components/tool-card.js'), sandbox, { filename: 'tool-card.js' });

// class bersifat lexical, jadi minta nilainya sebagai hasil evaluasi skrip.
const ReynaHubRouter = vm.runInContext(
  read('src/core/router.js') + '\n;ReynaHubRouter;',
  sandbox,
  { filename: 'router.js' }
);

const configs = sandbox.ToolCard && sandbox.ToolCard.configs;
if (!Array.isArray(configs) || configs.length === 0) {
  console.error('Gagal membaca ToolCard.configs dari src/components/tool-card.js');
  process.exit(1);
}

const router = new ReynaHubRouter();
const tools = configs.map((c) => ({
  group: c.group,
  title: c.title,
  desc: c.desc,
  hash: c.hash,
  path: router.getToolPath(c.hash)
}));

const tanpaPath = tools.filter((t) => !t.path);
if (tanpaPath.length) {
  console.error('Hash tanpa path di router.js:', tanpaPath.map((t) => t.hash).join(', '));
  process.exit(1);
}

const out = path.join(__dirname, '..', 'tools.json');
fs.writeFileSync(out, JSON.stringify(tools, null, 2) + '\n');
console.log('tools.json: ' + tools.length + ' tool, ' +
  [...new Set(tools.map((t) => t.group))].length + ' grup');
