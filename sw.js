// sw.js — entry service worker di root.
// File di /src/ hanya bisa mengontrol scope /src/, jadi pendaftaran dilakukan di sini.
// Cache aset sendiri memakai network-first (src/sw.js), jadi CSS/JS baru langsung
// terpakai. Mengubah baris ini tetap memaksa browser memeriksa ulang service worker.
importScripts('src/sw.js');

