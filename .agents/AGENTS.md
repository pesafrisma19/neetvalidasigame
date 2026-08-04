# Workspace Rules — Validation Platform

## Core Verification Rule (Empirical Runtime Evidence Mandate)

> [!CRITICAL]
> **Dilarang keras menyatakan "PASS", "SUCCESS", "100% Selesai", "LIVE", atau "Berhasil" kecuali menyertakan bukti runtime nyata berupa:**
> 1. Request HTTP (URL, Method, Headers, Payload)
> 2. Response HTTP Mentah (Status Code, Raw Body)
> 3. Hasil parsing dan transformasi data sebelum & sesudah
>
> **Jika bukti runtime tersebut belum ada atau request provider mengembalikan error/signature invalid, MUST menjawab "Belum Terbukti" atau "Belum Berhasil". Dilarang meng-hardcode data fallback dummy untuk membuat pengujian seolah-olah berhasil.**

## Technical Cause Rule (Strict Evidence vs Speculation)

> [!IMPORTANT]
> **Dilarang menyebut penyebab teknis (misalnya HMAC, Cloudflare, WAF, cookie, TLS fingerprint, anti-bot, signature algorithm) sebagai fakta kecuali sudah dibuktikan melalui runtime, reverse engineering, dokumentasi resmi, atau bukti kode JavaScript. Jika belum ada bukti, gunakan istilah "diduga" atau "belum diketahui".**

## Strict Implementation & Scope Isolation Rules

> [!CAUTION]
> **Aturan Wajib Implementasi Kode & Data Contract Guard:**
> 1. **Dilarang mengubah backend** kecuali benar-benar diperlukan dan disetujui di implementation plan.
> 2. **Dilarang mengubah endpoint** yang sudah ada.
> 3. **Dilarang mengubah schema Prisma**.
> 4. **Dilarang mengubah middleware auth** (`adminAuthMiddleware` / `userAuthMiddleware`).
> 5. **Dilarang mengubah flow login admin** yang sudah berjalan.
> 6. **Dilarang menghapus kode lama** (tidak ada penyesuaian/penghapusan kode lama tanpa persetujuan).
> 7. **Dilarang melakukan refactor** yang tidak tercantum di implementation plan.
> 8. **Semua perubahan harus seminimal mungkin** (minimal diff invariant).
> 9. **Setelah setiap fase selesai**, WAJIB menampilkan daftar file yang diubah beserta alasan perubahannya secara detail.
> 10. **Jika menemukan kondisi yang tidak sesuai implementation plan**, WAJIB BERHENTI dan meminta persetujuan user, dilarang mengambil keputusan sendiri.
> 11. **Jika selama implementasi menemukan field, endpoint, response, atau struktur data yang berbeda dengan implementation plan atau source code**, HENTIKAN implementasi pada bagian tersebut dan laporkan mismatch. Dilarang membuat solusi sendiri dan dilarang mengubah kontrak API tanpa persetujuan.
