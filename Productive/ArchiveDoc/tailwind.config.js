/** Tailwind build config — SPPD Toolbox.
 *
 *  This project ships a PRE-BUILT css/tailwind.css instead of the runtime
 *  CDN (cdn.tailwindcss.com), so the browser no longer downloads + runs the
 *  Tailwind JIT compiler on every load and on every DOM re-render.
 *
 *  Styling is still Tailwind utility classes in HTML/JS — nothing changes in
 *  how you write markup. The only rule: after adding, renaming, or deleting
 *  utility classes, regenerate the stylesheet once:
 *
 *    tailwindcss -c tailwind.config.js -i tailwind.src.css -o css/tailwind.css --minify
 *
 *  (Use the standalone Tailwind v3 CLI — no Node/npm required.)
 *
 *  Theme tokens are aligned to the REYNAHUB house design. The compiled CSS
 *  bakes them to literal hex (so they can't follow [data-theme]); the tool
 *  therefore re-maps the themed utilities to CSS var() in index.html.
 */
module.exports = {
  content: ['./index.html', './js/**/*.js', './css/styles.css'],
  theme: {
    extend: {
      colors: {
        accent: '#ff0000',
        'accent-hover': '#e60000',
        'accent-soft': '#ffe6e6',
        ink: '#0f172a',
        base: '#f8fafc',
        surface: '#ffffff',
        line: 'rgba(15,23,42,0.06)',
        muted: '#64748b'
      },
      fontFamily: {
        display: ['Geomini', 'Plus Jakarta Sans', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif']
      },
      borderRadius: { card: '18px' }
    }
  }
};
