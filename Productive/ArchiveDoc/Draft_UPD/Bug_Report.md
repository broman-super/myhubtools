## 🐛 Bug Report

Gunakan template ini untuk mencatat bug:

```markdown
### Bug #___
**Test ID:** [misal: 3.4]
**Priority:** 🔴 Critical / 🟡 High / 🟢 Medium / 🔵 Low **Device/Browser:** [misal: iPhone 12, Safari] **Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Result:**
...

**Actual Result:**
...

**Screenshot/Video:** [link]

**Notes:**
...
```

---

## ✅ Definition of Done (DoD)

Sebelum deploy ke production, pastikan:

- [ ] **Semua Critical tests PASS** (14/14)
- [ ] **Minimal 90% High tests PASS** (11/12)
- [ ] **Tidak ada bug Critical yang open**
- [ ] **UI 100% compliant dengan Anti-Slop guideline**
- [ ] **Mobile UX tested di minimal 3 device berbeda**
- [ ] **Performance: Load time < 3 detik**
- [ ] **Semua API endpoints working**
- [ ] **PDF generation working di desktop & mobile**
- [ ] **File upload working dari camera HP**
- [ ] **Data persistency verified (reload tidak hilang)**

---

## 📝 Testing Notes

**Test Environment:**

- Frontend URL: _______________
- GAS Endpoint: _______________
- Supabase Project: _______________
- Test Date: _______________
- Tester: _______________

**Devices Tested:**

- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Tablet (iPad/Android)

**Final Decision:**

- [ ] ✅ Ready to deploy
- [ ] ⚠️ Deploy with known issues (catat di bawah)
- [ ] ❌ Not ready (fix critical bugs first)

**Notes:**
```
