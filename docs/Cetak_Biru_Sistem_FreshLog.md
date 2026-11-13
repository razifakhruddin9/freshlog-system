# Cetak Biru Arsitektur & Skema Kerja Sistem FreshLog
> **Sistem Manajemen Inventori, Rotasi FEFO, dan Penyelamatan Pangan UMKM**  
> Tanggal: 13 November 2026 | Status: Dokumen Desain Teknis (Architecture Blueprint)

---

## 1. User Flow Utama

![Visual Diagram - User Flow](images/1_user_flow.svg)

Diagram alur (*flowchart*) berikut menggambarkan perjalanan pengguna dari proses autentikasi (berbasis hak akses Admin vs Staf) hingga eksekusi operasional kasir, manajemen stok FEFO, dan mitigasi risiko kedaluwarsa.

```mermaid
flowchart TD
    Start(["Mulai Akses Aplikasi"]) --> Login["Halaman Login / Autentikasi"]
    Login --> AuthCheck{"Verifikasi Role & Password"}
    
    AuthCheck -- "Kredensial Salah (5x)" --> Lockout["Proteksi Brute-Force: Lockout 15 Menit"]
    Lockout --> Login
    
    AuthCheck -- "Valid: Role Admin" --> AdminPortal["Portal Admin"]
    AuthCheck -- "Valid: Role Staf" --> StaffPortal["Portal Staf Gudang / Kasir"]
    
    %% Alur Admin
    AdminPortal --> MasterProduk["Kelola Produk Master<br/>(Nama, Kategori, Harga Beli/Jual)"]
    AdminPortal --> RekapLaporan["Pantau Laporan Rekapitulasi &<br/>Audit Dampak Pangan"]
    AdminPortal --> SettingBot["Konfigurasi Integrasi Bot Telegram"]
    
    %% Alur Staf
    StaffPortal --> PilihanFitur{"Pilih Operasional"}
    
    PilihanFitur -- "Barang Masuk" --> InputBatch["Tambah Batch Inventaris<br/>(Manual atau Scan OCR Nota)"]
    InputBatch --> SimpanBatch["Simpan Batch Baru<br/>(Set Tgl Kedaluwarsa & Qty)"]
    
    PilihanFitur -- "Barang Keluar (Kasir)" --> TransaksiPOS["Transaksi Penjualan POS"]
    TransaksiPOS --> AutoFEFO["Sistem Memotong Stok Batch<br/>Kedaluwarsa Terdekat (Auto-FEFO)"]
    AutoFEFO --> SyncDampakJual["Otomatis Tercatat ke<br/>Dampak Pangan (Terselamatkan)"]
    
    PilihanFitur -- "Penyelamatan Pangan" --> AnalitikAI["Halaman Analitik AI"]
    AnalitikAI --> EvaluasiRisiko["Sistem Evaluasi Skor Risiko<br/>& Rekomendasi LLM Gemini"]
    EvaluasiRisiko --> PilihAksi{"Klik Tombol Aksi Akhir<br/>(Terjual / Donasi / Busuk)"}
    PilihAksi --> DialogKonfirm["Modal Konfirmasi Dampak"]
    DialogKonfirm -- "Konfirmasi Ya" --> AtomicAksi["Transaksi Atomik Backend:<br/>1. Stok Batch = 0<br/>2. Status Batch Final<br/>3. Catat ke Tabel Dampak Pangan"]
    AtomicAksi --> HilangTombol["Tombol Aksi Hilang (Idempotent)<br/>& Notifikasi Toast Muncul"]
    
    SimpanBatch --> Selesai(["Update Dashboard Real-Time"])
    SyncDampakJual --> Selesai
    HilangTombol --> Selesai
```

> **Penjelasan Singkat**: Alur di atas memisahkan wewenang antara Admin (penetapan harga master & analitik finansial) dan Staf (operasional kasir & gudang). Seluruh alur barang keluar terintegrasi langsung dengan logika rotasi FEFO (*First Expired, First Out*) dan bermuara pada pencatatan otomatis metrik penyelamatan pangan.

---

## 2. Sitemap Sistem FreshLog

![Visual Diagram - Sitemap](images/2_sitemap.svg)

Struktur navigasi hierarkis *Single Page Application* (SPA) sistem FreshLog:

```mermaid
flowchart TD
    App["FreshLog SaaS Platform"]
    
    %% Level 1
    App --> NavDash["1. Dashboard & Dampak"]
    App --> NavStok["2. Stok & Batch"]
    App --> NavKasir["3. Penjualan (Kasir POS)"]
    App --> NavBeli["4. Pembelian (Stok Masuk)"]
    App --> NavAI["5. Analitik AI"]
    App --> NavLapor["6. Laporan Rekapitulasi"]
    App --> NavSet["7. Pengaturan Sistem"]
    
    %% Level 2 - Dashboard
    NavDash --> D1["KPI Bento Metrics (Omzet, Profit, Kedaluwarsa)"]
    NavDash --> D2["Daftar Batch Kritis (H-7 s/d Expired)"]
    NavDash --> D3["Kartu Dampak Pangan (Swiss-Bento Design)"]
    NavDash --> D4["Grafik Tren Pembelian vs Penjualan (7 Hari)"]
    
    %% Level 2 - Stok & Batch
    NavStok --> S1["Master Produk Master (Role Admin)"]
    NavStok --> S2["Form Tambah Batch Baru (Role Staf/Admin)"]
    NavStok --> S3["Tabel Inventaris FEFO (Urutan Kedaluwarsa)"]
    NavStok --> S4["Aksi Edit & Hapus Koreksi Batch"]
    
    %% Level 2 - Penjualan
    NavKasir --> K1["Katalog Produk & Grid Pencarian"]
    NavKasir --> K2["Keranjang Belanja & Kalkulator Kembalian"]
    NavKasir --> K3["Cetak Nota Struk Belanja"]
    
    %% Level 2 - Pembelian
    NavBeli --> P1["Form Input Batch Pemasok"]
    NavBeli --> P2["Pindai Faktur Fisik via AI OCR Vision"]
    NavBeli --> P3["Tabel Proyeksi Kebutuhan Restock AI"]
    
    %% Level 2 - Analitik AI
    NavAI --> A1["Monitoring Skor Risiko (0-100)"]
    NavAI --> A2["Rekomendasi Preskriptif Gemini (Diskon/Donasi/Buang)"]
    NavAI --> A3["Tombol Aksi Akhir Batch & Konfirmasi Modal"]
    
    %% Level 2 - Laporan
    NavLapor --> L1["Sub-tab: Laporan Harian, Bulanan, Tahunan"]
    NavLapor --> L2["Kartu Terpadu Dampak Pangan (Terselamatkan vs Kerugian)"]
    NavLapor --> L3["Filter Multi-Kriteria (Periode & Produk Master)"]
    NavLapor --> L4["Grafik Komparasi Volume & Ekspor Cetak"]
    
    %% Level 2 - Pengaturan
    NavSet --> ST1["Manajemen Akun & Role (Admin / Staf)"]
    NavSet --> ST2["Konfigurasi Notifikasi Bot Telegram"]
    NavSet --> ST3["Audit Log Riwayat Aktivitas"]
```

> **Penjelasan Singkat**: Sitemap dirancang modular dengan 7 menu utama yang saling terhubung secara reaktif tanpa perlu me-reload halaman browser (*Single Page App*).

---

## 3. Arsitektur Sistem (Layered Architecture)

![Visual Diagram - Arsitektur Sistem](images/3_arsitektur_sistem.svg)

Diagram blok arsitektur teknis dari Presentation Layer hingga Cloud Third-Party Service:

```mermaid
flowchart LR
    subgraph ClientLayer ["1. Presentation Layer (Browser Client)"]
        UI["SPA Interface (Freshlog.html)"]
        CSS["Quixotic Soft-Bento CSS (Freshlog.css)"]
        JS["Client Controller & State (Freshlog.js)"]
        Store[("Local Cache Storage")]
    end

    subgraph GatewayLayer ["2. Security & Gateway Layer"]
        CORS["FastAPI CORSMiddleware"]
        SecFilter["Brute-Force & Lockout Guard (security.py)"]
        RateLimit["Rate Limiter (Max 5 Attempts)"]
    end

    subgraph BackendLayer ["3. Backend Core Engine (FastAPI / ASGI)"]
        Router["API Routing (main.py)"]
        
        subgraph DomainEngines ["Domain & Logic Engines"]
            RisikoEngine["FEFO & Skor Risiko Engine (skor_risiko.py)"]
            RestockEngine["Safety Stock & Restock Engine (restock.py)"]
            DecisionEngine["Prescriptive AI Engine (rekomendasi.py)"]
            HistoryEngine["Moving Average Engine (riwayat.py)"]
        end
        
        Pydantic["Pydantic Data Validation & Serialization"]
    end

    subgraph DataLayer ["4. Data Persistence Layer"]
        DB[("Database Relasional: PostgreSQL / SQLite")]
        TblBatch["Tabel: Batches & Products"]
        TblDampak["Tabel: Dampak Pangan (Single Source of Truth)"]
        TblUsers["Tabel: Users & Roles"]
    end

    subgraph ExternalServices ["5. Layanan Eksternal (Cloud APIs)"]
        GeminiLLM["Google Gemini API (gemini-flash-lite)"]
        GeminiVision["Gemini Vision / OCR Engine"]
        TelegramAPI["Telegram Bot Gateway"]
    end

    %% Relasi Client ke Gateway
    UI --> JS
    JS <--> Store
    JS -- "RESTful JSON / HTTPS" --> CORS
    CORS --> SecFilter --> RateLimit --> Router

    %% Relasi Backend Router ke Logic
    Router --> Pydantic
    Router --> DomainEngines

    %% Relasi Logic ke Database
    Router <--> DB
    DB --- TblBatch
    DB --- TblDampak
    DB --- TblUsers

    %% Relasi ke External APIs
    DecisionEngine -- "Prompt Preskriptif" --> GeminiLLM
    Router -- "Scan Faktur Gambar" --> GeminiVision
    Router -- "Broadcast Alert Batch Kritis" --> TelegramAPI
```

> **Penjelasan Singkat**: Arsitektur memisahkan logika antarmuka, gateway keamanan, domain perhitungan matematis deterministik, dan orkestrasi model AI pihak ketiga. Jika API eksternal (Gemini) tidak dapat dijangkau, Decision Engine otomatis beralih (*graceful fallback*) ke Heuristic Rule Engine lokal.

---

## 4. Entity-Relationship Diagram (ERD Database)

![Visual Diagram - ERD Database](images/4_erd_database.svg)

Skema database ternormalisasi (3NF) yang menjamin integritas transaksi dan keterlacakan batch:

```mermaid
erDiagram
    USERS ||--o{ SALES : "melayani"
    USERS ||--o{ DAMPAK_PANGAN : "mencatat_aksi"
    PRODUCTS ||--o{ BATCHES : "memiliki"
    SALES ||--o{ SALE_ITEMS : "terdiri_atas"
    BATCHES ||--o{ SALE_ITEMS : "dialokasikan_ke"
    BATCHES ||--o{ DAMPAK_PANGAN : "bermuara_pada"

    USERS {
        string id PK "UUID / auto-generated"
        string username UK "admin / staf"
        string password_hash "Bcrypt / Argon2 Hash"
        string role "ADMIN / STAFF"
        string nama_lengkap "Nama Tampilan"
        datetime created_at "Waktu Registrasi"
    }

    PRODUCTS {
        string id PK "UUID Produk Master"
        string sku UK "Barcode / Kode Produk"
        string nama_produk "Nama Komoditas / Barang"
        string kategori "Dairy, Sayur, Daging, dll"
        int harga_beli "Modal Beli Standar"
        int harga_jual "Harga Jual Konsumen"
        string satuan "kg, unit, pcs"
        datetime created_at "Waktu Dibuat"
    }

    BATCHES {
        string id PK "Internal UUID"
        string batch_id UK "BTC-001, BTC-002, dll"
        string product_id FK "Relasi ke Master Produk"
        float stock "Stok Fisik Tersisa"
        float initial_stock "Stok Masuk Pertama Kali"
        date tanggal_masuk "Tgl Pengadaan"
        date tanggal_kedaluwarsa "Batas Kedaluwarsa (Exp)"
        string status "AKTIF / TERJUAL / DONASI / BUSUK"
        string supplier_name "Nama Pemasok"
        datetime updated_at "Waktu Pembaruan Terakhir"
    }

    SALES {
        string id PK "UUID Transaksi"
        string invoice_number UK "INV-YYYYMMDD-XXXX"
        datetime tanggal_transaksi "Waktu Checkout"
        int total_omzet "Total Nilai Penjualan"
        int total_modal "Total Modal HPP"
        int laba_kotor "Omzet dikurangi Modal"
        string user_id FK "Kasir yang Bertugas"
    }

    SALE_ITEMS {
        string id PK "UUID Item Penjualan"
        string sale_id FK "Relasi ke Transaksi Header"
        string batch_id FK "Relasi ke Batch Spesifik (FEFO)"
        float qty "Jumlah Barang Keluar"
        int harga_satuan "Harga Jual Real Time"
        int subtotal "Qty dikali Harga Satuan"
    }

    DAMPAK_PANGAN {
        string id PK "DP-YYYYMMDD-XXXX"
        string batch_id FK "Batch yang Diselesaikan"
        string produk_nama "Snapshot Nama Produk"
        float qty_kg "Bobot Pangan (kg)"
        int nilai_rupiah "Nilai Ekonomi (Rp)"
        string tipe "TERSELAMATKAN / TIDAK_TERSELAMATKAN"
        string aksi "TERJUAL / DONASI / BUSUK"
        date tanggal "Tanggal Pencatatan"
        string user_id FK "Eksekutor Aksi"
    }
```

> **Penjelasan Singkat**: Entitas `DAMPAK_PANGAN` bertindak sebagai *Single Source of Truth* untuk semua metrik keberlanjutan pangan (ESG) yang berasal dari dua jalur transaksi: kasir reguler (`TERJUAL`) dan aksi akhir mitigasi risiko (`TERJUAL`, `DONASI`, atau `BUSUK`).

---

## 5. Sequence Diagram: Alur Eksekusi Aksi Akhir Batch (Penyelamatan Pangan)

![Visual Diagram - Sequence Diagram](images/5_sequence_diagram.svg)

Diagram interaksi berikut mengilustrasikan penanganan transaksi atomik dan pencegahan eksekusi ganda (*idempotency check*) saat staf mengklik tombol aksi akhir di halaman Analitik AI:

```mermaid
sequenceDiagram
    autonumber
    actor Staf as Staf Gudang / Kasir
    participant UI as Browser (FreshLog UI)
    participant API as FastAPI Backend (main.py)
    participant Sec as Security / Idempotency Guard
    participant DB as Database / State Engine
    participant Log as Audit Logger

    Staf->>UI: Klik Tombol [Terjual / Donasi / Busuk]
    UI->>UI: Munculkan Dialog Konfirmasi Modal
    Note over UI: "Tandai batch ini DONASI?<br/>Stok berkurang 86 kg tercatat di Dampak Pangan."
    
    Staf->>UI: Klik [Ya, Lanjutkan]
    UI->>UI: Disable Tombol & Tampilkan Status Loading
    
    UI->>API: POST /dampak-pangan/catat-aksi-akhir {batch_id, aksi, qty_kg, nilai_rupiah}
    API->>Sec: Cek Status Batch Terkini (Idempotency Check)
    
    alt Status Batch Sudah Final (TERJUAL / DONASI / BUSUK)
        Sec-->>API: Tolak Request (Batch Already Final)
        API-->>UI: Return HTTP 400 Bad Request
        UI->>Staf: Toast Error: "Batch sudah berstatus final sebelumnya!"
    else Status Batch Masih AKTIF
        Sec->>DB: Mulai Database Transaction (Atomic BEGIN)
        DB->>DB: 1. Update Batches: set stock = 0, status = 'DONASI'
        DB->>DB: 2. Insert Dampak Pangan: tipe = 'TERSELAMATKAN', qty, rupiah
        DB->>DB: Selesaikan Transaksi (COMMIT)
        DB-->>API: Transaksi Sukses Tersimpan
        
        API->>Log: Catat Log Aktivitas Staf
        API-->>UI: Return HTTP 200 OK {status: "success", batch, record}
        
        UI->>UI: Hapus / Sembunyikan Tombol Aksi (Hanya Render Badge Status)
        UI->>UI: Perbarui Angka Kartu Dampak Pangan Dashboard & Laporan
        UI->>Staf: Toast Sukses: "Batch BTC-003 berhasil dicatat sebagai DONASI"
    end
```

> **Penjelasan Singkat**: Diagram di atas menjamin aturan bisnis: satu batch hanya boleh memiliki satu kali aksi final. Backend memvalidasi idempotensi sebelum menulis database, mencegah anomali stok minus atau pencatatan ganda pada metrik dampak pangan.

---

## 6. Topologi Infrastruktur Deployment

![Visual Diagram - Topologi Infrastruktur](images/6_topologi_infrastruktur.svg)

Diagram topologi infrastruktur komputasi untuk lingkungan *production*:

```mermaid
flowchart TD
    subgraph Clients ["Perangkat Klien UMKM"]
        KasirPC["Komputer Kasir (Browser Chrome)"]
        TabletGudang["Tablet Staf Gudang (Android/PWA)"]
        HPPemilik["Smartphone Pemilik (Telegram App)"]
    end

    subgraph Edge ["Edge Network & Keamanan"]
        CF["Cloudflare DNS & WAF"]
        SSL["Enkripsi TLS 1.3 / HTTPS"]
    end

    subgraph CloudPaaS ["Cloud Container Platform (Railway / Render / AWS)"]
        LB["Load Balancer & Reverse Proxy (Nginx)"]
        
        subgraph AppInstances ["Worker Container Pool"]
            Worker1["FastAPI Instance #1 (Uvicorn ASGI)"]
            Worker2["FastAPI Instance #2 (Uvicorn ASGI)"]
        end
        
        CronService["APScheduler / Background Worker (Cron 07:00 Pagi)"]
    end

    subgraph ManagedData ["Data Persistence Tier"]
        Postgres[("Managed PostgreSQL Database<br/>(Master Instance)")]
        PgReplica[("Read Replica / Standby Backup")]
        RedisCache[("Redis In-Memory Cache<br/>(Session & Rate Limiting)")]
    end

    subgraph ExternalAPIs ["External Cloud Services"]
        GoogleAI["Google Gemini Cloud (API Flash-Lite)"]
        TeleGateway["Telegram Bot Server"]
    end

    %% Koneksi
    Clients --> CF
    CF --> SSL --> LB
    LB --> Worker1
    LB --> Worker2
    
    Worker1 <--> RedisCache
    Worker2 <--> RedisCache
    
    Worker1 <--> Postgres
    Worker2 <--> Postgres
    Postgres -. "Streaming Replication" .-> PgReplica
    
    CronService --> Postgres
    CronService -- "Pemicu Alert Harian" --> TeleGateway
    TeleGateway --> HPPemilik
    
    Worker1 -- "Inferensi AI & OCR" --> GoogleAI
    Worker2 -- "Inferensi AI & OCR" --> GoogleAI
```

> **Penjelasan Singkat**: Seluruh trafik browser klien dilindungi oleh Cloudflare Edge (WAF & SSL) sebelum dialihkan ke Load Balancer Nginx. Di backend, multi-worker Uvicorn ASGI melayani request secara paralel dan terhubung ke kluster database PostgreSQL serta Redis untuk manajemen beban tinggi. Peringatan dini kedaluwarsa dipicu otomatis oleh background scheduler setiap pagi ke smartphone pemilik melalui gateway Telegram.

