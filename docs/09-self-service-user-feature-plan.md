# Self-Service Partner Platform & Saldo/Wallet Infrastructure - Implementation Plan

Dokumen ini berisi panduan rencana pengerjaan (*feature plan*) bertahap untuk transisi dari sistem Admin API Key manual menjadi **Self-Service Partner User Platform berbasis Sistem Saldo/Wallet**.

---

## ⚠️ ATURAN DAN PRINSIP PENGERJAAN STRIKT

1. **Komitmen Bertahap Per-Fase:** Setiap fase harus diselesaikan, diuji secara empiris, dan di-commit secara terpisah.
2. **Review & Approval Mandatori:** Setelah setiap fase selesai, agen **WAJIB BERHENTI** dan me-minta review/approval eksplisit dari User sebelum melangkah ke fase berikutnya. Dilarang keras melompati fase secara otomatis.
3. **Integritas Transaksi & Keamanan Finansial:**
   - **Soft-Delete Only:** Model `User` menggunakan `deletedAt DateTime?`. Relasi `BalanceTransaction.user` menggunakan `onDelete: Restrict` untuk menjamin riwayat audit keuangan tidak pernah terhapus.
   - **Deduction POST-SUCCESS (Hanya Potong Jika Validasi Sukses):** Saldo Rp 100 HANYA terpotong jika hasil validasi provider berstatus `SUCCESS`. Risiko biaya vendor pada request gagal diserap platform, dan diselamatkan oleh `rate-limit.middleware.ts` untuk mencegah spam attack.
   - **Interactive Callback Transaction (`prisma.$transaction(async (tx) => ...)`):** Pemotongan saldo & pencatatan log transaksi WAJIB menggunakan bentuk *callback transaction*. Jika `updateMany.count === 0` (kalah race condition / saldo kurang), transaction langsung me-lemparkan error untuk me-rollback total seluruh operasi dan mencegah log transaksi palsu.
   - **Atomic All-or-Nothing Registration:** Pendaftaran user baru wajib dibungkus dalam 1 `prisma.$transaction(async (tx) => ...)` (User + ApiKey + BalanceTransaction).
4. **Nol Dampak Pada Partner Lama (Zero Breaking Changes):**
   - Seluruh kolom baru bertipe nullable (`userId String?`) atau memiliki `@default`.
   - Migration hanya berisi `ADD COLUMN` dan `CREATE TABLE` baru — **nol `ALTER COLUMN`** pada kolom lama (`keyHash`, `keyPrefix`, `rateLimit`, `isActive`, `deletedAt`).
   - Seluruh API Key bentukan Admin manual (`userId = null`) **100% dibebaskan dari sistem saldo** dan tetap menggunakan rate limiting per-menit seperti biasa.

---

## 🏛️ CONCEPT OVERVIEW: SISTEM SALDO/WALLET

- **Pendaftaran User:** User mendaftar $\rightarrow$ Otomatis mendapatkan saldo bonus **Rp 5.000 (Setara 50 kali validasi gratis @ Rp 100/hit), ONE-TIME**, tidak pernah reset otomatis.
- **Biaya Per-Hit:** Tiap validasi akun yang berhasil di-hit $\rightarrow$ Saldo terpotong **flat Rp 100** per transaksi sukses across semua provider (GoPay, MobaPay, NetEase, Melpa, SuperSus, dll).
- **Saldo Kurang (< Rp 100):** Request ditolak disisi middleware (`HTTP 402 Payment Required`), menginstruksikan user untuk top-up.
- **Top-up Manual Admin:** Admin memiliki endpoint khusus (`POST /api/v1/admin/users/:id/topup`) dengan penanganan idempotensi manual (`referenceNo`) untuk menyetujui/menambah saldo user secara manual setelah menerima bukti transfer.
- **Audit Trail:** Seluruh mutasi saldo dicatat di tabel `BalanceTransaction` (`SIGNUP_BONUS`, `VALIDATION_DEDUCTION`, `MANUAL_TOPUP_ADMIN`, `REFUND_PROVIDER_FAILURE`).

---

## 🚀 ROADMAP PENGERJAAN BERTAHAP (6 FASE)

### 🔹 FASE 1: Database Skema (`User` + `BalanceTransaction` + Migration Safe)
* **Tujuan:** Menambahkan model `User`, `BalanceTransaction`, dan FK `userId` pada `ApiKey` di `prisma/schema.prisma`.
* **Rincian Perubahan:**
  - Tambah model `User` (`id`, `email`, `password`, `name`, `companyName`, `balance Int @default(5000)`, `role: "USER"`, `deletedAt`).
  - Tambah model `BalanceTransaction` (`id`, `userId`, `apiKeyId`, `amount`, `balanceBefore`, `balanceAfter`, `type`, `description`, `createdAt`) dengan relasi `User` `onDelete: Restrict`.
  - Tambah relasi `userId String?` di `ApiKey` dengan `onDelete: SetNull`.
  - Migration aman: `ADD COLUMN` & `CREATE TABLE` murni, tanpa mengubah kolom lama.
  - Jalankan `npx prisma db push` & `npx prisma generate`.
* **Output:** Skema DB tersinkronisasi di Supabase PostgreSQL.
* **Stop Point:** Minta review & approval User.

---

### 🔹 FASE 2: Backend Auth & Registration (`/user/*`) + Proteksi Role Admin & Test Regresi
* **Tujuan:** Mengimplementasikan endpoint pendaftaran/login user partner dan memperketat `adminAuthMiddleware`.
* **Rincian Perubahan:**
  - Buat `src/features/user-auth/user-auth.route.ts` (`POST /api/v1/user/register` & `POST /api/v1/user/login`).
  - `POST /user/register`: Mendaftar user baru (saldo awal Rp 5.000), otomatis me-release 1 `ApiKey`, mencatat `BalanceTransaction` (`SIGNUP_BONUS`), dibungkus dalam satu `prisma.$transaction(async (tx) => ...)`, me-return JWT `user_token` dan `rawKey` **hanya 1 kali**.
  - Buat `userAuthMiddleware` untuk proteksi rute portal user.
  - Perbarui `adminAuthMiddleware` agar **wajib memeriksa** `payload.role === 'ADMIN' | 'SUPERADMIN'` (me-return `HTTP 403` jika user biasa mencoba masuk).
* **Verifikasi & Test Regresi:**
  - Jalankan script `scratch/test_auth_regression.ts` yang menguji **SELURUH ENDPOINT ADMIN** (Games, Providers, Endpoints, Mappings, API Keys, Logs) dengan Admin JWT Token vs User JWT Token vs Unauthenticated.
* **Stop Point:** Minta review & approval User.

---

### 🔹 FASE 3: Backend Saldo (`balanceDeductionMiddleware`) & Top-Up Manual Admin
* **Tujuan:** Memotong saldo Rp 100 per validasi sukses secara atomic via Interactive Callback Transaction, memblokir request jika saldo < Rp 100, serta endpoint top-up manual admin.
* **Rincian Perubahan:**
  - Implementasi `balanceDeductionMiddleware` di `src/middlewares/balance-deduction.middleware.ts`.
  - **Scope Isolation Strikt:** Hanya berlaku jika `apiKey.userId != null`. Key admin manual (`userId == null`) **100% BYPASS (Bebas Saldo)**.
  - **Pre-Check Saldo:** Memastikan saldo user $\ge 100$ sebelum panggil provider. Jika kurang, return `HTTP 402 Payment Required`.
  - **Interactive Callback Post-Success Deduction:** Pemotongan saldo Rp 100 & pencatatan `BalanceTransaction` (`VALIDATION_DEDUCTION`) HANYA dieksekusi jika validasi berstatus `SUCCESS`, dibungkus dalam `prisma.$transaction(async (tx) => ...)`. Jika `count === 0`, throw Error untuk me-rollback total transaction.
  - Endpoint Admin Top-Up Manual: `POST /api/v1/admin/users/:id/topup` dengan idempotency reference check (Menambah saldo user & catat `MANUAL_TOPUP_ADMIN`).
  - Endpoint User Portal: `GET /api/v1/user/dashboard` (Menampilkan saldo, 1 API Key, riwayat mutasi saldo, & log transaksi pribadi).
* **Stop Point:** Minta review & approval User.

---

### 🔹 FASE 4: Testing Backend End-to-End (Sebelum Sentuh Frontend)
* **Tujuan:** Pengujian menyeluruh alur transaksi saldo secara empiris disisi backend API.
* **Rincian Pengecekan:**
  - Register user baru $\rightarrow$ Saldo awal Rp 5.000.
  - Concurrent Burst Test $\rightarrow$ Mengirim request paralel bersamaan saat saldo pas-pasan (memastikan interactive callback transaction me-rollback kalah race condition dan 0 log palsu terbuat).
  - Test Provider Failure $\rightarrow$ Memastikan validasi yang FAILED/TIMEOUT **TIDAK MEMOTONG SALDO** (saldo tetap utuh).
  - Hit validasi 50x sukses $\rightarrow$ Saldo terpotong habis menjadi Rp 0.
  - Hit validasi ke-51 $\rightarrow$ Ditolak disisi middleware (`HTTP 402 Payment Required`).
  - Admin eksekusi Top-Up Manual Rp 10.000 $\rightarrow$ Saldo nambah Rp 10.000, validasi bisa berjalan kembali.
  - Test Partner Admin Lama (`userId = null`) $\rightarrow$ Bebas saldo, transaksi 100% sukses tanpa terpengaruh.
* **Stop Point:** Minta review & approval User.

---

### 🔹 FASE 5: Frontend User Portal (`/register`, `/login`, `/user/dashboard`) [DONE]
* **Tujuan:** Membangun antarmuka pengguna untuk partner user mendaftar dan mengelola saldo/API key.
* **Status:** ✅ **DONE** (Commit `2d0df41`).
* **Fitur Selesai:**
  - `web/src/pages/UserRegisterPage.tsx` dengan Modal Pop-up Kritis One-Time Raw Key Display (Copy Key button) & Bonus Saldo Rp 5.000.
  - `web/src/pages/UserLoginPage.tsx` untuk autentikasi mandiri partner user.
  - `web/src/pages/UserDashboardPage.tsx` (Status Saldo, Card Top-Up Manual Info Transfer, API key masked `${keyPrefix}...****`, & tabel mutasi saldo + log pribadi).
  - Isolasi token di `web/src/api/client.ts` tanpa fallback.

---

### 🔹 FASE 6: Final Regression Test & Production Deploy [DONE]
* **Tujuan:** Verifikasi akhir seluruh sistem dan deployment ke VPS Production.
* **Status:** ✅ **DONE** (Commit `2d0df41` pushed to `origin/main`).
* **Rincian Selesai:**
  - Pre-deployment audit (Env, HTTPS, CORS, Rate Limiting) 100% lulus.
  - Local compilation & Vite build check (`✓ built in 872ms`).
  - Git commit & push (`git push origin main`).
