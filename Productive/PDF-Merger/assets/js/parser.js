// parser.js - Perbaikan final: penerima & pengirim Shopee presisi

const PARSER_TEMPLATES = {
  shopee: {
    resi: /(?:Nomor\s*Resi|No\.?\s*Resi|Resi)\s*:\s*([A-Za-z0-9]+)/i,
    noPesanan: /(?:No\.?\s*Pesanan|Pesan)\s*:?\s*\(?([A-Za-z0-9]+)\)?/i,
    penerima: /Penerima\s*:\s*/i,
    pengirim: /Pengirim\s*:\s*/i,
    // Stop markers lebih awal: hentikan sebelum alamat
    stopMarkers: [
      "Jalan", "Jl\\.", "Dusun", "Kompleks", "Perumahan", "RT", "RW",
      "KOTA", "KAB\\.", "\\d+\\s*(?:gr|kg)", "Berat:", "#", "Pesan:",
      "Pengirim:", "No\\.?Pesanan:", "$"
    ]
  },
  tiktok: {
    resi: /\b(JX\d{9,})\b/i,
    resiFallback: /(?:Resi|AWB)\s*:\s*([A-Za-z0-9]+)/i,
    noPesanan: /(?:TT\s*)?Order\s*Id\s*:\s*(\d+)/i,
    penerima: /Penerima\s*:\s*(.+?),\s*\(?\+62\)?/i,
    pengirim: /Pengirim\s*:\s*(.+?),\s*\(?\+62\)?/i,
    stopMarkers: [
      "COD", "Ship", "Order Id", "TT Order",
      "\\d+\\s*(?:gr|kg|KG)", "BULANAN", "Jumlah", "Qty", "Product Name", "$"
    ]
  }
};

const KURIR_MAP = {
  'SPXID': 'SPX', 'JT': 'J&T', 'JX': 'J&T', 'ID': 'ID Express',
  'JNE': 'JNE', 'SCP': 'Sicepat', 'POS': 'POS Indonesia',
  'JNT': 'J&T', 'JNC': 'J&T Cargo', 'LX': 'Lazada Logistics',
  '0044': 'Sicepat' // dari log
};

const KURIR_NAMES = /(SPX|J&T|JNE|Sicepat|ID Express|POS Indonesia|J&T Cargo|Lazada Logistics)/i;

// ========== NORMALISASI ==========
function normalizeText(text) {
  let t = text.replace(/\s+/g, ' ');

  const fixWords = [
    { bad: /P\s*e\s*n\s*g\s*i\s*r\s*i\s*m/gi, good: "Pengirim" },
    { bad: /P\s*e\s*n\s*e\s*r\s*i\s*m\s*a/gi, good: "Penerima" },
    { bad: /B\s*e\s*r\s*a\s*t/gi, good: "Berat" },
    { bad: /R\s*e\s*s\s*i/gi, good: "Resi" },
    { bad: /O\s*r\s*d\s*e\s*r\s*I\s*D/gi, good: "Order ID" },
    { bad: /T\s*T\s*O\s*r\s*d\s*e\s*r/gi, good: "TT Order" },
    { bad: /S\s*K\s*U/gi, good: "SKU" },
    { bad: /C\s*O\s*D/gi, good: "COD" },
    { bad: /S\s*h\s*i\s*p/gi, good: "Ship" },
    { bad: /Q\s*t\s*y/gi, good: "Qty" },
    { bad: /R\s*E\s*G/gi, good: "REG" }
  ];
  fixWords.forEach(item => { t = t.replace(item.bad, item.good); });

  // Gabungkan huruf terpisah (minimal 3)
  t = t.replace(/\b([A-Za-z])(?:\s([A-Za-z])){2,}\b/g, m => m.replace(/\s/g, ''));

  // Dua huruf terpisah dengan pengecualian
  t = t.replace(/\b([A-Za-z])\s([A-Za-z])\b/g, (match, p1, p2) => {
    const joined = p1 + p2;
    if (['KG','GR','ID','TH','NO','RT','RW'].includes(joined.toUpperCase())) return match;
    return joined;
  });

  return t.trim();
}

// ========== DETEKSI PLATFORM ==========
function detectPlatform(text) {
  if (/TT\s*Order\s*Id/i.test(text)) return 'tiktok';
  if (/(?:Nomor\s*Resi|No\.?\s*Resi|Resi)\s*:/i.test(text)) return 'shopee';
  if (/\bJX\d{9,}\b/i.test(text)) return 'tiktok';
  if (/SPXID/i.test(text)) return 'shopee';
  return 'shopee';
}

// ========== EKSTRAK RESI ==========
function extractResi(text, tpl) {
  let match = text.match(tpl.resi);
  if (!match && tpl.resiFallback) match = text.match(tpl.resiFallback);
  return match ? match[1].trim() : '-';
}

// ========== DETEKSI KURIR ==========
function detectKurir(resi, text) {
  if (resi && resi !== '-') {
    const upper = resi.toUpperCase();
    for (const [prefix, kurir] of Object.entries(KURIR_MAP)) {
      if (upper.startsWith(prefix)) return kurir;
    }
  }
  const m = text.match(KURIR_NAMES);
  return m ? m[1] : '-';
}

// ========== EKSTRAK FIELD ==========
function extractField(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// ========== EKSTRAK SAMPAI BATAS ==========
function extractFieldUntil(text, startRegex, stopMarkers) {
  const match = text.match(startRegex);
  if (!match) return '-';
  const startIndex = match.index + match[0].length;
  const remaining = text.substring(startIndex);

  const stopRegex = new RegExp(stopMarkers.join('|'), 'i');
  const stopMatch = remaining.match(stopRegex);
  let result = stopMatch ? remaining.substring(0, stopMatch.index) : remaining;

  return result.replace(/[,.:\s+]+$/, '').trim() || '-';
}

// ========== PARSER PRODUK ==========
function parseProducts(text, platform) {
  if (platform === 'tiktok') return parseTikTokProducts(text);
  return parseShopeeProducts(text);
}

function parseShopeeProducts(text) {
  const headerRegex = /#\s*Nama\s*Produk\s+SKU\s+Variasi\s+Qty/i;
  const match = text.match(headerRegex);
  if (!match) return [];
  const remaining = text.substring(match.index + match[0].length);
  const lines = remaining.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const products = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)\s+(.+?)\s{2,}(.+?)\s{2,}(.+?)\s{2,}(\d+)$/);
    if (m) {
      products.push({ no: m[1], nama: m[2].trim(), sku: m[3].trim(), variasi: m[4].trim(), qty: parseInt(m[5]) });
    } else break;
  }
  return products;
}

function parseTikTokProducts(text) {
  const qtyMatch = text.match(/^(\d+)\s*$/m);
  const skuHeaderMatch = text.match(/SKU\s*\[?Seller\s*SKU\]?/i);
  if (!qtyMatch || !skuHeaderMatch) {
    const kodeMatch = text.match(/KODE\s+\d+-\d+\s+(.+?)\s+(\d+)\s+(\d+)/);
    if (kodeMatch) {
      return [{ no: 1, nama: kodeMatch[1].trim(), sku: '-', variasi: '-', qty: parseInt(kodeMatch[3]) }];
    }
    return [];
  }
  const qty = parseInt(qtyMatch[1]);
  const startIdx = qtyMatch.index + qtyMatch[0].length;
  const endIdx = skuHeaderMatch.index;
  if (startIdx >= endIdx) return [];
  const middle = text.substring(startIdx, endIdx).trim();
  const lines = middle.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lines.length === 0) return [];
  let namaProduk = '', variasi = '-';
  if (lines.length === 1) {
    namaProduk = lines[0];
  } else {
    const last = lines[lines.length - 1];
    if (/,/.test(last) && /\d/.test(last)) {
      variasi = last;
      namaProduk = lines.slice(0, -1).join(' ');
    } else {
      namaProduk = lines.join(' ');
    }
  }
  const afterSku = text.substring(skuHeaderMatch.index + skuHeaderMatch[0].length);
  const skuMatch = afterSku.match(/^\s*\[?([^\]]+)\]?/);
  const sku = skuMatch ? skuMatch[1].trim() : '-';
  return [{ no: 1, nama: namaProduk, sku, variasi, qty }];
}

function emptyResult(platform, error) {
  return {
    platform, resi: '-', kurir: '-', layanan: '-',
    penerima: '-', pengirim: '-', noPesanan: '-', berat: '-',
    produk: [], error
  };
}

// ========== PEMISAH PENERIMA SHOPEE ==========
function parseShopeePenerimaPengirim(rawPenerima, rawPengirim) {
  let penerima = '-';
  let pengirim = '-';

  // Coba pola: [Nama Toko] [No HP] [Nama Penerima] [Alamat...]
  const match = rawPenerima.match(/^([A-Za-z0-9.]+)\s+(\d{8,})\s+(.*)/);
  if (match) {
    pengirim = match[1].trim();  // Nama toko dianggap sebagai pengirim
    const telepon = match[2];
    const sisa = match[3].trim();

    // Ambil nama penerima: kata-kata sampai bertemu penanda alamat
    const words = sisa.split(/\s+/);
    let namaPenerima = '';
    for (const word of words) {
      // Hentikan jika kata adalah penanda alamat
      if (/^(Jalan|Jl\.?|Dusun|Kompleks|Perumahan|RT|RW|KOTA|KAB\.|NO|BLOK|Gang)/i.test(word) ||
          (word === word.toUpperCase() && word.length > 2 && !/^\d+$/.test(word))) {
        break;
      }
      namaPenerima += (namaPenerima ? ' ' : '') + word;
    }
    penerima = namaPenerima || '-';
  } else {
    // Fallback: ambil apa adanya
    penerima = rawPenerima;
  }

  // Jika dari Pengirim: sudah ada (tidak kosong), gunakan itu sebagai pengirim
  if (rawPengirim && rawPengirim !== '-' && !/penjual tidak perlu bayar/i.test(rawPengirim)) {
    pengirim = rawPengirim;
  }

  return { penerima, pengirim };
}

// ========== FUNGSI UTAMA ==========
function parseLabelData(rawText) {
  if (!rawText || !rawText.trim()) return emptyResult('unknown', 'Teks kosong');

  let text = normalizeText(rawText);
  console.log('Normalized:', text);

  const platform = detectPlatform(text);
  const tpl = PARSER_TEMPLATES[platform];

  const resi = extractResi(text, tpl);
  const kurir = detectKurir(resi, text);
  const layananRaw = extractField(text, /\b(Reguler|REG|ECO|Cargo|Express|EZ|Sameday|Instant)\b/i) || '-';
  const layanan = layananRaw === 'REG' ? 'Reguler' : layananRaw;
  const noPesanan = extractField(text, tpl.noPesanan) || '-';
  const berat = extractField(text, /(\d+(?:\.\d+)?\s*(?:gr|kg|KG))/) || '-';

  let penerima, pengirim;

  if (platform === 'tiktok') {
    penerima = extractField(text, tpl.penerima);
    pengirim = extractField(text, tpl.pengirim);
    if (!penerima || penerima === '-') {
      penerima = extractFieldUntil(text, /Penerima\s*:\s*/i, tpl.stopMarkers);
      if (penerima && /^[\d.,\s]+$/.test(penerima)) penerima = '-';
    }
    if (!pengirim || pengirim === '-') {
      pengirim = extractFieldUntil(text, /Pengirim\s*:\s*/i, tpl.stopMarkers);
    }
  } else {
    // Shopee
    const rawPenerima = extractFieldUntil(text, tpl.penerima, tpl.stopMarkers);
    const rawPengirim = extractFieldUntil(text, tpl.pengirim, tpl.stopMarkers);

    // Jika rawPengirim kosong atau hanya kalimat "Penjual tidak perlu...", kita akan ambil dari rawPenerima
    const cleanPengirim = (rawPengirim && !/penjual tidak perlu bayar/i.test(rawPengirim)) ? rawPengirim : null;

    const parsed = parseShopeePenerimaPengirim(rawPenerima, cleanPengirim);
    penerima = parsed.penerima;
    pengirim = parsed.pengirim;
  }

  if (penerima && penerima.toUpperCase().startsWith('NON COD')) penerima = '-';
  if (penerima && /^\d/.test(penerima)) penerima = '-';

  const produk = parseProducts(text, platform);

  return {
    platform, resi, kurir, layanan,
    penerima: penerima || '-',
    pengirim: pengirim || '-',
    noPesanan, berat, produk
  };
}