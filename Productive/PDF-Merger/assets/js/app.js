// app.js - Aplikasi utama Label Merger V2 (mendukung multi-halaman & normalisasi teks)

(function() {
    let files = [];
    let parsedData = []; // data per halaman

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const fileListEl = document.getElementById('file-list');
    const fileCount = document.getElementById('file-count');
    const clearBtn = document.getElementById('clear-btn');
    const mergeBtn = document.getElementById('merge-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const mergePerKurirBtn = document.getElementById('merge-per-kurir-btn');
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    const summaryContainer = document.getElementById('summary-container');
    const summaryStats = document.getElementById('summary-stats');
    const dataTableBody = document.querySelector('#data-table tbody');

    // Render daftar file
    function renderList() {
        fileListEl.innerHTML = '';
        if (files.length === 0) {
            fileListEl.innerHTML = '<li class="empty-message">Belum ada file</li>';
            mergeBtn.disabled = true;
            analyzeBtn.disabled = true;
            clearBtn.disabled = true;
        } else {
            files.forEach((f, i) => {
                const li = document.createElement('li');
                li.setAttribute('data-index', i);
                li.innerHTML = `<span class="handle">☰</span><span class="name" title="${f.name}">${f.name}</span><button class="remove-btn" data-index="${i}">✕</button>`;
                fileListEl.appendChild(li);
            });
            new Sortable(fileListEl, {
                handle: '.handle',
                animation: 150,
                onEnd: function(evt) {
                    const moved = files.splice(evt.oldIndex, 1)[0];
                    files.splice(evt.newIndex, 0, moved);
                    // Reorder parsedData jika ada (tapi karena parsedData per halaman, lebih kompleks; reset saja)
                    parsedData = [];
                    summaryContainer.classList.add('hidden');
                    mergePerKurirBtn.classList.add('hidden');
                    downloadCsvBtn.classList.add('hidden');
                }
            });
            mergeBtn.disabled = false;
            analyzeBtn.disabled = false;
            clearBtn.disabled = false;
        }
        fileCount.textContent = files.length;
    }

    // Tambah file
    function addFiles(newFiles) {
        const pdfFiles = Array.from(newFiles).filter(f => f.type === 'application/pdf');
        if (pdfFiles.length === 0) {
            setStatus('Hanya file PDF yang diterima.', 'error');
            return;
        }
        const existingKeys = files.map(f => f.name + '_' + f.size);
        const unique = pdfFiles.filter(f => !existingKeys.includes(f.name + '_' + f.size));
        if (unique.length === 0) {
            setStatus('File sudah ada di daftar.', 'info');
            return;
        }
        if (files.length + unique.length > 100) {
            setStatus('Maksimal 100 file.', 'error');
            return;
        }
        files.push(...unique);
        setStatus(`${unique.length} file ditambahkan.`, 'success');
        renderList();
        parsedData = [];
        summaryContainer.classList.add('hidden');
        mergePerKurirBtn.classList.add('hidden');
        downloadCsvBtn.classList.add('hidden');
    }

    // Hapus file
    function removeFile(index) {
        files.splice(index, 1);
        parsedData = []; // reset karena urutan halaman berubah
        summaryContainer.classList.add('hidden');
        renderList();
    }

    // Gabung semua
    mergeBtn.addEventListener('click', async () => {
        if (files.length === 0) return;
        mergeBtn.disabled = true;
        setStatus('Menggabungkan...');
        try {
            const bytes = await mergePDFs(files);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
            downloadBlob(blob, `label-gabungan-${ts}.pdf`);
            setStatus('✅ Berhasil diunduh', 'success');
        } catch(e) {
            console.error(e);
            setStatus('❌ Gagal menggabungkan', 'error');
        }
        mergeBtn.disabled = false;
    });

    // Analisis data
    analyzeBtn.addEventListener('click', async () => {
        if (files.length === 0) return;
        analyzeBtn.disabled = true;
        setStatus('Mengekstrak teks & menganalisis...');
        parsedData = [];

        for (const file of files) {
            try {
                const pagesText = await extractTextFromPDF(file); // array per halaman
                console.log(`=== File: ${file.name} (${pagesText.length} halaman) ===`);
                pagesText.forEach((text, idx) => {
                    console.log(`--- Halaman ${idx+1} ---`);
                    console.log(text);
                    // Normalisasi teks untuk spasi aneh
                    const cleanText = normalizeText(text);
                    console.log(`--- Setelah normalisasi ---`);
                    console.log(cleanText);
                    const data = parseLabelData(cleanText);
                    parsedData.push({ ...data, fileName: file.name, page: idx+1 });
                });
                console.log(`=============================`);
            } catch(e) {
                console.error(`Gagal proses ${file.name}:`, e);
                parsedData.push({ fileName: file.name, page: 0, error: e.message, platform: 'error', resi: '-', kurir: '-', layanan: '-', penerima: '-', pengirim: '-', noPesanan: '-', produk: [] });
            }
        }

        renderSummary();
        summaryContainer.classList.remove('hidden');
        mergePerKurirBtn.classList.remove('hidden');
        downloadCsvBtn.classList.remove('hidden');
        analyzeBtn.disabled = false;
        setStatus(`✅ Analisis selesai. ${parsedData.length} label diproses.`, 'success');
    });

    // Fungsi normalisasi teks: perbaiki spasi berlebihan antar karakter
    function normalizeText(text) {
        // 1. Hapus spasi di antara karakter tunggal yang membentuk kata umum
        // Contoh: "P e n g i r i m" -> "Pengirim"
        // Kita lakukan penggantian untuk kata-kata kunci yang sering muncul
        const keywords = ['Pengirim', 'Penerima', 'COD', 'Order', 'Id', 'Ship', 'Qty', 'Product', 'Name', 'SKU', 'Seller', 'Total', 'Jumlah', 'Barang'];
        let result = text;
        // Untuk setiap kata kunci, buat pola dengan spasi antar karakter
        keywords.forEach(word => {
            // Buat regex: setiap karakter diikuti spasi (kecuali terakhir)
            const spacedPattern = word.split('').join('\\s*');
            const regex = new RegExp(spacedPattern, 'gi');
            result = result.replace(regex, word);
        });

        // 2. Hapus spasi berlebihan lainnya: jika ada spasi > 1, ganti jadi satu
        result = result.replace(/\s+/g, ' ');

        return result.trim();
    }

    // Render ringkasan
    function renderSummary() {
        const total = parsedData.length;
        const kurirCount = {};
        parsedData.forEach(d => {
            const k = d.kurir || '?';
            kurirCount[k] = (kurirCount[k] || 0) + 1;
        });
        let statsHTML = `<div class="stat-card"><span class="label">Total Resi</span><span class="value">${total}</span></div>`;
        for (const [kurir, count] of Object.entries(kurirCount)) {
            statsHTML += `<div class="stat-card"><span class="label">${kurir}</span><span class="value">${count}</span></div>`;
        }
        summaryStats.innerHTML = statsHTML;

        dataTableBody.innerHTML = '';
        const seenResi = {};
        parsedData.forEach((d, idx) => {
            const isDuplicate = d.resi && d.resi !== '-' && seenResi[d.resi];
            if (d.resi && d.resi !== '-') seenResi[d.resi] = true;

            const tr = document.createElement('tr');
            tr.className = isDuplicate ? 'duplicate' : '';
            tr.innerHTML = `
                <td>${idx+1}</td>
                <td>${d.platform || '-'}</td>
                <td>${d.resi || '-'}</td>
                <td>${d.kurir || '-'}</td>
                <td>${d.layanan || '-'}</td>
                <td>${d.penerima || '-'}</td>
                <td>${d.pengirim || '-'}</td>
                <td>${d.noPesanan || '-'}</td>
            `;
            dataTableBody.appendChild(tr);
        });
    }

    // Gabung per kurir
    mergePerKurirBtn.addEventListener('click', async () => {
        if (parsedData.length === 0) return;
        // Kelompokkan file asli berdasarkan kurir dari parsedData
        // Perlu diketahui bahwa parsedData per halaman, sementara file bisa banyak halaman.
        // Untuk mempermudah, kita ambil halaman dari file asli? Ini agak rumit.
        // Kita batalkan fitur ini jika data berasal dari multi-halaman file.
        // Untuk sementara, kita hanya izinkan jika setiap file hanya 1 halaman.
        const hasMultiPage = files.some((f, i) => {
            // Periksa jumlah halaman dari data parsedData yang fileName sama
            const count = parsedData.filter(d => d.fileName === f.name).length;
            return count > 1;
        });
        if (hasMultiPage) {
            setStatus('Maaf, fitur Gabung per Kurir belum mendukung file multi-halaman. Silakan gunakan file label tunggal.', 'error');
            return;
        }

        const groups = {};
        parsedData.forEach((d, i) => {
            const file = files.find(f => f.name === d.fileName);
            if (file) {
                const key = (d.kurir || 'TidakDiketahui').replace(/\s+/g, '_');
                if (!groups[key]) groups[key] = [];
                groups[key].push(file);
            }
        });
        setStatus('Menggabung per kurir...');
        try {
            const results = await mergePDFsGrouped(groups);
            for (const [key, bytes] of Object.entries(results)) {
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
                downloadBlob(blob, `${key}-${ts}.pdf`);
            }
            setStatus('✅ File per kurir diunduh', 'success');
        } catch(e) {
            console.error(e);
            setStatus('❌ Gagal', 'error');
        }
    });

    // Unduh CSV
    downloadCsvBtn.addEventListener('click', () => {
        if (parsedData.length === 0) return;
        const header = ['No','Platform','Resi','Kurir','Layanan','Penerima','Pengirim','No.Pesanan','File','Halaman'];
        const rows = [header];
        parsedData.forEach((d, i) => {
            rows.push([i+1, d.platform||'', d.resi||'', d.kurir||'', d.layanan||'', d.penerima||'', d.pengirim||'', d.noPesanan||'', d.fileName||'', d.page||'']);
        });
        const ts = new Date().toISOString().slice(0,10);
        downloadCSV(rows, `data-pengiriman-${ts}.csv`);
        setStatus('CSV diunduh', 'success');
    });

    // Event listeners
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files.length) { addFiles(e.target.files); fileInput.value = ''; }
    });
    fileListEl.addEventListener('click', e => {
        if (e.target.classList.contains('remove-btn')) {
            removeFile(parseInt(e.target.dataset.index));
        }
    });
    clearBtn.addEventListener('click', () => {
        if (files.length && confirm('Hapus semua file?')) {
            files = [];
            parsedData = [];
            renderList();
            summaryContainer.classList.add('hidden');
            mergePerKurirBtn.classList.add('hidden');
            downloadCsvBtn.classList.add('hidden');
            setStatus('Daftar dikosongkan');
        }
    });

    renderList();
})();