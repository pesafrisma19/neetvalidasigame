# Product Specification: 01. Project Overview

## 1. Identitas Produk

| Attribute | Details |
| :--- | :--- |
| **Nama Project** | **Validation Platform** |
| **Tujuan** | Membangun platform terpusat untuk validasi akun game yang modular, scalable, dan database-driven. Platform ini bertindak sebagai satu-satunya *gateway/middleware* validasi untuk seluruh Web Topup dan aplikasi eksternal. Web Topup **TIDAK BOLEH** lagi mengakses provider validasi secara langsung. |
| **Target Scope** | • Backend API & Plugin Architecture<br>• Database Configuration & Immutable Audit Logs<br>• Admin Dashboard & Overview<br>• Validation Playground (Testing Environment & History)<br>• OpenAPI / Swagger Auto-Generated Documentation |

---

## 2. High-Level Architecture & Configurable Weighted Scoring

```
                               ┌───────────────────────────┐
                               │   Client (Web Topup / UI) │
                               └─────────────┬─────────────┘
                                             │ HTTP Request (/api/v1/public/...)
                                             ▼
                               ┌───────────────────────────┐
                               │       Validation API      │
                               │  (Generic Feature Flags)  │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │     Validation Engine     │
                               │(Configurable Weight Score)│
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │   Plugin / Adapter Layer  │
                               │ (Interface: BaseAdapter)  │
                               └──────┬──────┬──────┬──────┘
                                      │      │      │
                        ┌─────────────┘      │      └─────────────┐
                        ▼                    ▼                    ▼
                ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                │ Melpa Plugin │     │Mobapay Plugin│     │UniPin Plugin │
                └──────────────┘     └──────────────┘     └──────────────┘
```

> **Configurable Weighted Scoring Principle:**  
> Validation Engine menggunakan strategi **Weighted Scoring**. Komponen skor minimal terdiri dari: *Health*, *Latency*, *Success Rate*, *Cost*, dan *Manual Weight*.  
> **Bobot setiap komponen dapat dikonfigurasi via database.** Engine dilarang meng-hardcode formula kalkulasi skor tertentu di source code.

---

## 3. Backward Compatibility Policy

> [!IMPORTANT]
> **Kebijakan Kompatibilitas Publik (Strict Compatibility Rule):**
> 
> 1. **Dilarang keras melakukan Breaking Changes pada Public API (`/api/v1/public/...`).**
> 2. Jika terjadi perubahan struktur response, penambahan data, atau perombakan skema:
>    - Rilis versi API baru pada prefix `/api/v2/public/...`, ATAU
>    - Daftarkan **Capability Version** baru (misal: `NICKNAME_V2`).
> 3. Response API versi lama wajib dipertahankan tetap berfungsi untuk klien aktif yang sudah terintegrasi.

---

## 4. Generic Feature Flag Architecture

Sistem Feature Flag bersifat **Generik** untuk mengontrol fungsionalitas sistem secara keseluruhan (bukan hanya provider):

Contoh kunci Feature Flag:
- `validation.smart-scoring` (Aktifkan Weighted Scoring Engine)
- `validation.cache` (Aktifkan Caching Layer)
- `provider.melpa` (Aktifkan Provider Melpa)
- `provider.mobapay` (Aktifkan Provider Mobapay)
- `playground.history` (Aktifkan Riwayat Playground)
- `playground.sandbox` (Aktifkan Switch Sandbox)
- `api.v2` (Aktifkan Endpoint API v2)

---

## 5. Technology Stack & OpenAPI First Standard

- **Frontend:** React 19, Vite, TypeScript, React Router DOM v7, Tailwind CSS, shadcn/ui, Lucide React, TanStack Query v5, React Hook Form, Zod.
- **Backend:** Node.js 22 LTS, TypeScript, Hono Framework (`@hono/zod-openapi`).
- **Database & ORM:** PostgreSQL (Supabase), Prisma ORM.
- **Docs:** Auto-Generated OpenAPI 3.0 via Hono Zod OpenAPI (Dilarang update manual).

---

## 6. Phase 1 Credential & Multi-Env Policy

- **Credential:** API Secrets/Tokens (`MELPA_TOKEN`, `MOBAPAY_TOKEN`, `JWT_SECRET`) disimpan di `.env`.
- **Database:** Menyimpan Base URL, Slugs, Timeout, Retry, Costs, Quotas, Regex, Weight, dan Status.
- **Multi-Environment:** Supported levels `DEVELOPMENT`, `SANDBOX`, `STAGING`, `PRODUCTION`.
