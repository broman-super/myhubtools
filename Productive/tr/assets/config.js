/**
 * SUPERSUB — Konfigurasi pusat (satu-satunya tempat ubah URL backend)
 * Dimuat pertama di Tracking.html sebelum script lainnya.
 */
(function (global) {
  'use strict';

  /** URL Web App Google Apps Script (deploy terbaru) */
  var GAS_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbwlfk4f6Ygv7IvwEN7G5B9jp7YCR7bEJ18ZbqzmZjFg8wlP-kLj3P5-f4SImcZvXgb09A/exec';

  global.GAS_URL = GAS_WEB_APP_URL;

  global.SUPERSUB_CONFIG = {
    gasUrl: GAS_WEB_APP_URL,
    timezone: 'Asia/Jakarta',
    maxBackdateDays: 30
  };
})(typeof window !== 'undefined' ? window : this);
