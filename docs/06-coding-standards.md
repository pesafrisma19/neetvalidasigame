# Product Specification: 06. Coding Standards & Best Practices

## 1. Backend Coding Standards

### TypeScript & Strict Typing
- **Strict Mode Enabled:** Setting `strict: true` pada `tsconfig.json` bersifat wajib.
- **Dilarang Menggunakan `any`:** Seluruh tipe data, fungsi, DTO, dan return value wajib terdefinisi secara eksplisit. Gunakan `unknown` jika tipe belum pasti, lalu lakukan type guard.
- **Logging Standard:** **DILARANG** menggunakan `console.log()`, `console.error()`, atau `console.warn()`. Seluruh logging **WAJIB** menggunakan **Pino Logger** (Structured JSON log with levels: `info`, `warn`, `error`, `debug`).

### Validation & Layer Separation
- **Input/Output Validation:** Seluruh HTTP Endpoint wajib divalidasi menggunakan **Zod Schema** dan `@hono/zod-openapi`.
- **Layer Responsibility (Clean Architecture):**
  - **Controllers / Routes:** Hanya bertugas menangani HTTP Routing, request DTO parsing, Zod validation, dan mapping response. **DILARANG** berisi business logic.
  - **Service Layer:** Hanya bertugas memproses business logic, orchestrating validation engine, dan menangani fallback/retry. Service wajib mengembalikan *Strongly Typed Objects*.
  - **Repository Layer:** Satu-satunya layer yang boleh mengakses database via Prisma ORM.
  - **Provider Adapter Layer:** Hanya bertugas berkomunikasi HTTP ke API Provider external dan melakukan parsing normalization. **DILARANG KERAS** mengakses database secara langsung.

---

## 2. Frontend Coding Standards

### API Layer & Data Fetching
- **Centralized API Client:** Seluruh HTTP request wajib melalui API Layer terpusat (Axios Instance dengan Interceptors). **DILARANG** melakukan `fetch()` atau `axios()` secara langsung di dalam React Components.
- **Server State Management:** Seluruh server data fetching, caching, mutation, dan revalidation **WAJIB** mengggunakan **TanStack Query (React Query v5)**.
- **No Hardcoded URLs:** Base URL API dan endpoint paths wajib diambil dari Environment Variables (`import.meta.env.VITE_API_BASE_URL`).

### Forms & Table Standards
- **Form Management:** Seluruh Form wajib dibangun menggunakan **React Hook Form** yang terintegrasi dengan **Zod Schema Resolver**.
- **Standard UI Table:** Seluruh data table di dashboard wajib menerapkan 7 fitur standar UI:
  1. **Pagination** (Controls & Page size)
  2. **Search** (Debounced real-time filter)
  3. **Sort** (Ascending / Descending column)
  4. **Filter** (Dropdown status/category)
  5. **Loading State** (Skeleton loader)
  6. **Empty State** (Desain visual data kosong)
  7. **Error State** (Visual error & Retry prompt)

---

## 3. Database Standards

- **Schema Migration:** Seluruh perubahan skema PostgreSQL wajib dilakukan melalui **Prisma Migration** (`npx prisma migrate dev`).
- **No Raw SQL:** Gunakan Prisma Type-Safe Query Builder. Raw SQL query hanya diizinkan untuk kueri analitik kompleks yang mengalami performa bottleneck.
- **Foreign Keys & Constraints:** Seluruh relasi antar-tabel wajib memiliki Foreign Key constraint eksplisit (`onDelete: Cascade` / `SetNull`).
- **Index Standards:** Kolom pencarian, filtering, dan kueri relasi yang sering diakses (`createdAt`, `gameId`, `status`, `code`, `email`) **WAJIB** diberi index Prisma (`@@index`).
- **Delete Policy:** Gunakan Hard Delete secara default. Soft Delete (`isDeleted`) hanya diterapkan pada entitas yang memiliki dependensi audit ketat.

---

## 4. Git & Commit Standards

- **Conventional Commits:** Format pesan commit wajib mengikuti konvensi baku:
  - `feat(scope):` - Penambahan fitur baru (misal: `feat(backend): add game catalog CRUD API`)
  - `fix(scope):` - Perbaikan bug (misal: `fix(engine): fix circuit breaker timeout reset`)
  - `refactor(scope):` - Refactoring kode tanpa mengubah behavior
  - `docs(scope):` - Penambahan atau pembaruan dokumentasi PRD
  - `chore(scope):` - Perubahan konfigurasi tooling / dependencies
  - `test(scope):` - Penambahan unit test atau E2E test
- **Atomic Commits:** Satu commit hanya boleh berisi **satu perubahan logis yang utuh**.
- **Security Rule:** **DILARANG KERAS** mempublikasikan atau melakukan commit pada file `.env` atau credential private. Seluruh file rahasia wajib terdaftar di `.gitignore`.
- **Release Verification:** Sebelum commit & push pada akhir fase, kode wajib lulus TypeScript Compile Check (`npx tsc --noEmit`), ESLint Check, dan Build Check.
