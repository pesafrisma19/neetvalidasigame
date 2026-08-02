# Product Specification: 04. UI/UX & Playground Specification

## 1. Modul Utama Dashboard & Scope Phase

Admin Dashboard dirancang dengan modul-modul modular:

| Modul | Status Scope | Fungsi Utama |
| :--- | :--- | :--- |
| **Dashboard Overview** | **Phase 1** | Overview cepat validation stats & status provider. |
| **Game Management** | **Phase 1** | Katalog Game & regex User ID / Zone ID validation. |
| **Provider Management** | **Phase 1** | Katalog Provider & Endpoint configuration (Base URL, Timeout, Retry, Environment). |
| **Capability Management** | **Phase 1** | Katalog Capability & Capability Versioning (`NICKNAME_V1`, `FIRST_TOPUP_V1`). |
| **Validation Mapping** | **Phase 1** | Relasi Mapping & Provider Slugs. |
| **Test Account** | **Phase 1** | Katalog akun uji coba per game. |
| **Validation Playground** | **Phase 1** | Interactive Simulation 2-Panel & Terminal Viewer. |
| **API Documentation** | **Phase 1** | Auto-Generated Swagger / Scalar OpenAPI Viewer. |
| **Feature Flags Manager** | Phase 2+ | Manajemen Generic Feature Flags (`validation.smart-scoring`, `provider.melpa`, dll). |
| **Config Rollback Tool** | Phase 2+ | History versi konfigurasi, Diff Viewer, & 1-Click Rollback. |
| **Advanced Observability** | Phase 2+ | Metering p95/p99 latency, cost per request meter, & circuit breakdown. |

---

## 2. Validation Playground Interface Layout

Validation Playground dirancang dengan **Split-Panel Architecture + Bottom Live Terminal**:

```
+-----------------------------------------------------------------------------------+
|  [NAVBAR] Validation Platform Admin Dashboard                     [User Avatar]   |
+--------------------------------------------------+--------------------------------+
| PANEL KIRI: Validation Playground                | PANEL KANAN: Validation Result |
|                                                  |                                |
| 1. Pilih Game: [ Mobile Legends: Bang Bang  v ]  | Status: [  SUCCESS  ]          |
|                                                  | Response Time: 342 ms          |
| 2. Test Account Catalog (Dynamic from DB):       | Provider Used: Melpa (Prod #1) |
|    +----------------------------------------+    |                                |
|    | [Basic MLBB] UID: 12345678 Server: 2001|    | Extracted Capabilities:        |
|    | [Gunakan] [Copy UID] [Copy Server]     |    | • Nickname : ProGamer99 (v1)   |
|    |----------------------------------------|    | • Region   : ID                |
|    | [FirstTopup Used] Zone: 2002           |    | • FirstTopup: Available (True) |
|    | [Gunakan] [Copy UID] [Copy Server]     |    |                                |
|    +----------------------------------------+    |                                |
|                                                  |                                |
| 3. Manual Inputs:                                |                                |
|    User ID : [ 12345678                  ]   |                                |
|    Server  : [ 2001                      ]   |                                |
|                                                  |                                |
|    [  ⚡ VALIDATE ACCOUNT  ]                      |                                |
+--------------------------------------------------+--------------------------------+
| PANEL BAWAH: Interactive Live Terminal Logs                                      |
| Tabs: [ Request JSON ] [ Response JSON ] [ Raw Provider Response ] [ Normalized ]|
+-----------------------------------------------------------------------------------+
```

---

## 3. Mandatory UI Standards

- **Visual Style:** **Neon Brutalism + Dark Mode** (High contrast borders, neon accents, dark zinc background).
- **UI Library WAJIB:** `shadcn/ui` + `Lucide React` + Tailwind CSS.
- **UI Library DILARANG:** DILARANG menggunakan Material UI atau Ant Design.
- **Table Standard:** **SEMUA TABLE** wajib mendukung Pagination, Search, Sort, Filter, Loading State, Empty State, dan Error State.
