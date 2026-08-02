# Document Specification: 07. Audit Provider Validasi — GoPay Games & MobaPay

Dokumen ini berisi hasil audit teknis mendalam terhadap endpoint validasi Mobile Legends pada provider **GoPay Games (VocaGame Engine)** dan **MobaPay**, berdasarkan analisis lalu lintas jaringan (*Network Traffic / DevTools*).

---

## 1. Audit Provider: GoPay Games (VocaGame Engine)

GoPay Games menggunakan infrastruktur backend **VocaGame** untuk layanan topup game.

### A. Endpoint Specifications
- **URL Endpoint:** `https://gopay.co.id/games/v1/order/user-account`
- **HTTP Method:** `POST`
- **Autentikasi / Security:** Tidak memerlukan API Token khusus (Public Web Endpoint). Memerlukan `User-Agent` browser standar.

### B. Request Headers
```http
POST /games/v1/order/user-account HTTP/1.1
Host: gopay.co.id
Content-Type: application/json
Accept: application/json
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Origin: https://gopay.co.id
Referer: https://gopay.co.id/games/mobile-legends-bang-bang
```

### C. Request Body Payload
```json
{
  "game_code": "mobile-legends-bang-bang",
  "user_id": "1615278168",
  "zone_id": "16806"
}
```

### D. Response JSON Schemas

#### 1. Response Berhasil (200 OK)
```json
{
  "status": true,
  "message": "User valid",
  "data": {
    "username": "ceisyy+욕구",
    "user_id": "1615278168",
    "zone_id": "16806",
    "region": "Indonesia",
    "game": "Mobile Legends: Bang Bang"
  }
}
```

#### 2. Response Gagal / Account Tidak Ditemukan (400 / 404 / 200)
```json
{
  "status": false,
  "message": "User ID atau Server ID tidak ditemukan",
  "data": null
}
```

### E. Evaluasi Pemanggilan dari Backend Node.js
- ✅ **Dapat Dipanggil Langsung:** Endpoint berbasis REST JSON biasa.
- ⚡ **Tanpa Captcha / Cloudflare Block:** Endpoint publik web tidak memblokir server-to-server request selama header `User-Agent` dan `Origin` disertakan.
- 🎯 **Capability Yang Diperoleh:** `NICKNAME` (`"ceisyy+욕구"`) dan `REGION` (`"Indonesia"`).

---

## 2. Audit Provider: MobaPay (Official Moonton Partner)

MobaPay adalah platform pembayaran resmi dari Moonton. Endpoint MobaPay mengembalikan rincian barang, harga, dan **status bonus Diamond Ganda pada Top Up Pertama (First Topup Tiers)**.

### A. Endpoint Specifications
- **URL Endpoint:** `https://api.mobapay.com/pay/get_role` & `https://api.mobapay.com/pay/get_goods_list`
- **HTTP Method:** `POST`
- **Autentikasi / Security:** Public Web Endpoint dengan `app_id` / `game_slug`.

### B. Request Headers
```http
POST /pay/get_goods_list HTTP/1.1
Host: api.mobapay.com
Content-Type: application/json
Accept: application/json
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Origin: https://www.mobapay.com
Referer: https://www.mobapay.com/mlbb/?r=ID
```

### C. Request Body Payload
```json
{
  "app_id": 100002,
  "game": "mlbb",
  "country": "ID",
  "user_id": "1615278168",
  "zone_id": "16806"
}
```

### D. Response JSON Schemas

#### 1. Response Berhasil (200 OK)
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "role_name": "ceisyy 욕구",
    "user_id": "1615278168",
    "zone_id": "16806",
    "goods_list": [
      {
        "goods_id": "mlbb_50_diamonds",
        "name": "50 + 50 Diamonds",
        "diamonds": 50,
        "bonus_diamonds": 50,
        "price": 14053,
        "is_first_recharge_limit": true,
        "is_available": false,
        "status_text": "Batas pembelian tercapai"
      },
      {
        "goods_id": "mlbb_150_diamonds",
        "name": "150 + 150 Diamonds",
        "diamonds": 150,
        "bonus_diamonds": 150,
        "price": 41919,
        "is_first_recharge_limit": false,
        "is_available": true,
        "status_text": "Tersedia"
      },
      {
        "goods_id": "mlbb_250_diamonds",
        "name": "250 + 250 Diamonds",
        "diamonds": 250,
        "bonus_diamonds": 250,
        "price": 69889,
        "is_first_recharge_limit": true,
        "is_available": false,
        "status_text": "Batas pembelian tercapai"
      },
      {
        "goods_id": "mlbb_500_diamonds",
        "name": "500 + 500 Diamonds",
        "diamonds": 500,
        "bonus_diamonds": 500,
        "price": 140530,
        "is_first_recharge_limit": false,
        "is_available": true,
        "status_text": "Tersedia"
      }
    ]
  }
}
```

#### 2. Response Gagal / Account ID Salah
```json
{
  "code": 10001,
  "msg": "Role invalid or server mismatch",
  "data": null
}
```

### E. Evaluasi Pemanggilan dari Backend Node.js
- ✅ **Dapat Dipanggil Langsung:** HTTP POST standar via Node `fetch` / Axios.
- ⚡ **Tanpa Cookie Session Wajib:** Menyerahkan payload JSON murni sudah cukup untuk mengembalikan data role & status 4 tier topup pertama.
- 🎯 **Capability Yang Diperoleh:** `NICKNAME` (`"ceisyy 욕구"`) dan `FIRST_TOPUP` (Breakdown status 4 Tier Diamond Ganda: `50`, `150`, `250`, `500`).

---

## 3. Matriks Perbandingan & Strategi Konsolidasi Engine

| Fitur / Parameter | GoPay Games | MobaPay | Melpa API |
| :--- | :--- | :--- | :--- |
| **HTTP Method** | `POST` | `POST` | `GET` |
| **Endpoint URL** | `https://gopay.co.id/games/v1/order/user-account` | `https://api.mobapay.com/pay/get_goods_list` | `https://melpadigitalcek.vercel.app/api/game/...` |
| **Payload Type** | JSON Body | JSON Body | Query Parameters |
| **Output Nickname** | ✅ `"ceisyy+욕구"` | ✅ `"ceisyy 욕구"` | ✅ `"ceisyy 욕구"` |
| **Output Region** | ✅ `"Indonesia"` | ⚠️ Fixed via `country: "ID"` | ⚠️ Implicit |
| **First Topup Tiers**| ❌ Tidak Ada | ✅ **4 Tiers Detailed** | ❌ Tidak Ada |
| **Rekomendasi Role**| **Primary Nickname & Region** | **Primary First Topup** | **Fallback Backup Nickname** |
