/**
 * SUPERSUB — Konfigurasi pusat (satu-satunya tempat ubah URL backend)
 * Dimuat pertama di Tracking.html sebelum script lainnya.
 */
(function (global) {
  'use strict';

  /** URL Web App Google Apps Script (deploy terbaru) */
  var GAS_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbwNPC8SwiV_K1kAca9R5CCfTeQr8RlMNQn6elLoRQfC11xIkYHiPE_BaUtFYSO5VzIVvQ/exec';

  global.GAS_URL = GAS_WEB_APP_URL;

  global.SUPERSUB_CONFIG = {
    gasUrl: GAS_WEB_APP_URL,
    timezone: 'Asia/Jakarta',
    maxBackdateDays: 30
  };
})(typeof window !== 'undefined' ? window : this);
