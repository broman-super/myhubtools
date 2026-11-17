// sw.js — entry service worker di root.
// File di /src/ hanya bisa mengontrol scope /src/, jadi pendaftaran dilakukan di sini.
// v18: naikkan versi bila src/styles/*.css atau src/*.js berubah, agar cache lama
// dibuang. Mengubah baris ini juga memaksa browser memeriksa ulang service worker.
importScripts('src/sw.js');

