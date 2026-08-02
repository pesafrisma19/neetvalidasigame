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
