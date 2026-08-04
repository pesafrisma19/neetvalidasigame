# Validation Platform - Development Progress Log

Dokumen ini mencatat riwayat kemajuan implementasi (*progress log*) serta daftar tugas mendatang (*TODO list*) proyek **neetvalidasigame**.

---

## 📅 2026-08-04 (Security, Reliability & Hardening Sprint)

### ✅ SELESAI (DONE):
- **[DONE] X-API-KEY Enforcement di `/validate-account`** (Commit `dc10662`)
  - Menambahkan `api-key.middleware.ts` dengan verifikasi Hash SHA-256 murni.
  - Memasang middleware khusus pada route `/api/v1/public/validate-account`.
  - Endpoint `/public/games` dan `/health` tetap 100% publik.
  - Refactoring instansi `PrismaClient` ke singleton terpusat di `src/lib/prisma.ts`.
- **[DONE] JWT_SECRET Fatal Startup Validation** (Commit `fffa21f`)
  - Memperbarui Zod schema di `src/config/env.config.ts` agar server langsung me-lemparkan error fatal dan menghentikan booting jika `JWT_SECRET` atau `JWT_REFRESH_SECRET` tidak diisi atau kurang dari 16 karakter.
  - Sanitasi file `.env.example` & `.env.production.example` dari kredensial asli.
- **[DONE] Circuit Breaker Auto-Recovery & Atomic Single-Probe Claim** (Commit `2cc473b`)
  - Menambahkan background worker `src/jobs/circuit-breaker-recovery.job.ts` dengan PM2 Cluster Guard (`instanceId === '0'`).
  - Implementasi *Atomic Single-Probe Claim* saat endpoint berstatus `HALF_OPEN` untuk mencegah race condition / concurrent bombardment.
  - Penanganan sukses (reset ke `CLOSED`) dan penanganan gagal (re-trip langsung ke `OPEN` dengan 5 menit cooldown).
- **[DONE] Client API Key Rate Limiting (In-Memory Sliding Window)** (Commit `75aaaa8`)
  - Menambahkan `rate-limit.middleware.ts` berbasis In-Memory Sliding Window 60 detik.
  - Membaca kolom `rateLimit` (req/menit) dari `apiKeyRecord` dengan penanganan `?? 100` untuk menghormati `rateLimit = 0`.
  - Mengembalikan response `HTTP 429 Too Many Requests` dengan header `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, dan `Retry-After`.
  - Dilengkapi mekanisme self-pruning background interval 10 menit untuk kebersihan RAM.
- **[DONE] Reset Password Database Supabase** (Tugas Manual User - Commit `b122542`)
  - User telah melakukan reset password database di Dashboard Supabase untuk mengamankan kredensial yang pernah ter-commit di history lama.
- **[DONE] Admin UI & Backend APIs for API Key Management** (Commit `fe13ab6`)
  - Menambahkan REST API Endpoints terproteksi JWT Admin di `src/features/master/master-data.route.ts` (`POST /admin/api-keys`, `GET /admin/api-keys`, `PUT /admin/api-keys/:id`, `DELETE /admin/api-keys/:id`, `POST /admin/restore/api-keys/:id`, `GET /admin/trash/api-keys`).
  - `POST /admin/api-keys` me-return `rawKey` **HANYA 1 KALI**, sedangkan list GET menyembunyikan raw key & key hash.
  - Menambahkan halaman Frontend Admin `web/src/pages/ApiKeyPage.tsx` lengkap dengan Modal Form Rilis Key Baru, Tab Aktif/Revoked (Trash), dan Modal Pop-up Kritis Penyimpanan Raw Key One-Time Display (dengan tombol Copy Key).
- **[DONE] Admin Log Viewer dengan Paginasi, Filter & API Key Binding** (Commit `6c9335b`)
  - Menambahkan `apiKeyId` ke skema `ValidationLog` & composite indexing di `prisma/schema.prisma` (migrasi DB `npx prisma db push` berhasil disinkronisasi ke PostgreSQL Supabase).
  - Menambahkan REST API Endpoint `GET /admin/logs` terproteksi JWT Admin dengan paginasi (`page`, `limit`), filter status, partner (termasuk legacy log option), game, provider, date range, dan search.
  - Menhubungkan `apiKeyId` dari Hono context (`c.get('apiKey')`) ke `validateAccount()` dan `logValidation()`.
  - Menambahkan halaman Frontend Admin `web/src/pages/LogViewerPage.tsx` lengkap dengan Filter Bar, Pagination, dan Log Inspector JSON Modal.
- **[DONE] Playground UI X-API-KEY Credentials Field & Client-Side Pre-Flight Check** (Commit `2c19697`)
  - Menambahkan input field `X-API-KEY Credentials` di `web/src/pages/PlaygroundPage.tsx` dengan **0 browser storage persistence** (murni di React memory state).
  - Menambahkan validasi pre-flight disisi client yang menghentikan request HTTP (0 network call) dan me-lemparkan pesan error jika `apiKey` belum diisi.
  - Menginjeksikan header `X-API-KEY` secara presisi saat tombol `[ Jalankan Validasi ]` ditekan.
- **[DONE] MobaPay Adapter Raw Response Sanitization (>99.7% DB Storage Reduction)**
  - Menghapus property noise raksasa yang tidak terpakai (`app_pay_channel_sub_list`, `pay_channel_list`, `banner_list`, `activity_list`, `date_list`, `time_list`, `shop_info`, `app_info`) dari `rawResponse` di `src/plugins/mobapay.adapter.ts`.
  - Mengurangi ukuran payload log MobaPay dari **336 KB menjadi 0.92 KB per request** tanpa mempengaruhi akurasi ekstraksi `nickname` dan `firstTopupTiers`.

---

### ⏳ TUGAS MENDATANG (TODO):
- **[TODO] Deployment Ke VPS Ubuntu & Vercel CDN**  
  Deploy seluruh perbaikan ke VPS production (`git pull && npx prisma generate && npm run build && pm2 restart validation-api --update-env`). Catatan: `npx prisma generate` wajib dijalankan di VPS agar Prisma Client mengenali kolom `apiKeyId`.
