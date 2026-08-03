# Product Specification: 05. AI Development Rules & Implementation Protocol

## 1. Core Verification Rule (Empirical Runtime Evidence Mandate)

> [!CRITICAL]
> **Dilarang keras menyatakan "PASS", "SUCCESS", "100% Selesai", "LIVE", atau "Berhasil" kecuali menyertakan bukti runtime nyata berupa:**
> 1. Request HTTP (URL, Method, Headers, Payload)
> 2. Response HTTP Mentah (Status Code, Raw Body)
> 3. Hasil parsing dan transformasi data sebelum & sesudah
>
> **Jika bukti runtime tersebut belum ada atau request provider mengembalikan error/signature invalid, MUST menjawab "Belum Terbukti" atau "Belum Berhasil". Dilarang meng-hardcode data fallback dummy untuk membuat pengujian seolah-olah berhasil.**

---

## 2. Technical Cause Rule (Strict Evidence vs Speculation)

> [!IMPORTANT]
> **Dilarang menyebut penyebab teknis (misalnya HMAC, Cloudflare, WAF, cookie, TLS fingerprint, anti-bot, signature algorithm) sebagai fakta kecuali sudah dibuktikan melalui runtime, reverse engineering, dokumentasi resmi, atau bukti kode JavaScript. Jika belum ada bukti, gunakan istilah "diduga" atau "belum diketahui".**

---

## 3. Production Roadmap (Production-First Order)

```text
Phase 1: Backend Foundation ✅
Phase 2: Frontend MVP ✅
Phase 2.5: Production Deployment & Hardening ⏳ (NEXT STEP: VPS, Vercel, Domain, SSL, PM2, CORS)
Phase 3: History & Audit Logs ⏳
Phase 4: Analytics & Observability ⏳
Phase 5: Configurable Weighted Smart Scoring ⏳
Phase 6: Multi-Game Expansion ⏳
```

---

## 4. Phase Details

### Phase 1 — Backend Core & Live Adapters (SELESAI ✅)
- Node.js 22 LTS, Hono Framework, OpenAPI Zod, Scalar Docs, Prisma ORM, Supabase Live PostgreSQL.
- Live Provider Plugins: GoPay Games, MobaPay (`api/app_shop`), Melpa Digital.

### Phase 2 — Frontend MVP (`web/`) (SELESAI ✅)
- React 19 + Vite + TypeScript + Tailwind CSS.
- Validation Playground UI, Admin Auth, Dashboard Metrics, Master Data Management.

### Phase 2.5 — Production Deployment & Hardening (BERJALAN / SEBAGIAN SELESAI ✅)
- Frontend Deployment: Vercel CDN (`https://validation-dashboard.vercel.app`).
- Backend Deployment: VPS Ubuntu Server with Node.js 22, PM2, Nginx Reverse Proxy, Let's Encrypt SSL, Environment Secrets.
- System Hardening: Production CORS Policy, X-API-KEY Enforcement, Fatal JWT Startup Abort, Circuit Breaker Auto-Recovery Job.
- **Progress Log Terperinci:** Lihat [`docs/08-progress-log.md`](file:///d:/project%20web/neetvalidasigame/docs/08-progress-log.md) untuk riwayat commit & TODO list.

### Phase 3 — History & Audit Logs (DITUNDA ⏳)
- Transaction Audit Log Schema, Provider Latency & Error Trace.

### Phase 4 — Analytics & Observability (DITUNDA ⏳)
- Dashboard Charts: Success Rate, Average Latency, Daily Volume.

### Phase 5 — Configurable Weighted Smart Scoring (DITUNDA ⏳)
- Weighted Provider Auto-Ranking Engine based on real-time metrics.

### Phase 6 — Multi-Game Expansion (DITUNDA ⏳)
- Dynamic Database Catalog additions (Free Fire, Genshin Impact, PUBG Mobile).
