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
- **[DONE] Reset Password Database Supabase** (Tugas Manual User)
  - User telah melakukan reset password database di Dashboard Supabase untuk mengamankan kredensial yang pernah ter-commit di history lama.

---

### ⏳ TUGAS MENDATANG (TODO):
- **[TODO] Admin UI API Key Management**  
  Membuat halaman Admin Panel (`/admin/api-keys`) untuk me-release, menampilkan 1x raw key, dan mencabut (*revoke*) API Key partner Web Topup.
