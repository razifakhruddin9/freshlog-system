"""
Script untuk menghasilkan 6 diagram vektor SVG resolusi tinggi
untuk Dokumentasi Arsitektur FreshLog (Obsidian Vault & Project Docs).
"""
import os

OUTPUT_DIRS = [
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "images")
]

for d in OUTPUT_DIRS:
    os.makedirs(d, exist_ok=True)

# ----------------------------------------------------------------------
# 1. USER FLOW SVG
# ----------------------------------------------------------------------
svg_user_flow = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 780" width="100%" height="100%" style="background:#0F172A; font-family:'Segoe UI', system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="gradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="100%" stop-color="#B91C1C"/>
    </linearGradient>
    <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#6D28D9"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8"/>
    </marker>
    <marker id="arrowGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981"/>
    </marker>
  </defs>

  <!-- Title & Subtitle -->
  <text x="550" y="45" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="800" letter-spacing="-0.02em">FRESHLOG — USER FLOW UTAMA</text>
  <text x="550" y="70" text-anchor="middle" fill="#94A3B8" font-size="13">Alur Operasional Role-Based Access Control (Admin vs Staf) &amp; Siklus Rotasi FEFO</text>

  <!-- Node: Start -->
  <rect x="475" y="100" width="150" height="42" rx="21" fill="url(#gradEmerald)" filter="url(#shadow)"/>
  <text x="550" y="126" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="700">Mulai Akses App</text>
  
  <line x1="550" y1="142" x2="550" y2="175" stroke="#94A3B8" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Node: Login -->
  <rect x="440" y="175" width="220" height="50" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="550" y="205" text-anchor="middle" fill="#F8FAFC" font-size="14" font-weight="700">Halaman Login (RBAC)</text>

  <line x1="550" y1="225" x2="550" y2="265" stroke="#94A3B8" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Decision: Auth Check -->
  <polygon points="550,265 670,310 550,355 430,310" fill="#1E293B" stroke="#F59E0B" stroke-width="2" filter="url(#shadow)"/>
  <text x="550" y="306" text-anchor="middle" fill="#F8FAFC" font-size="12" font-weight="700">Verifikasi Role &amp;</text>
  <text x="550" y="322" text-anchor="middle" fill="#F8FAFC" font-size="12" font-weight="700">Kredensial Password</text>

  <!-- Lockout Branch (Left) -->
  <line x1="430" y1="310" x2="220" y2="310" stroke="#EF4444" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="325" y="300" text-anchor="middle" fill="#FCA5A5" font-size="11" font-weight="600">Gagal 5x Berturut-turut</text>
  <rect x="90" y="285" width="210" height="50" rx="10" fill="url(#gradRed)" filter="url(#shadow)"/>
  <text x="195" y="308" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">Proteksi Brute-Force</text>
  <text x="195" y="324" text-anchor="middle" fill="#FEE2E2" font-size="11">Lockout Akses 15 Menit</text>

  <!-- Loop back from lockout to login -->
  <path d="M 195 285 L 195 200 L 430 200" fill="none" stroke="#EF4444" stroke-dasharray="4,4" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Admin Branch (Right) -->
  <line x1="670" y1="310" x2="880" y2="310" stroke="#3B82F6" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="775" y="300" text-anchor="middle" fill="#93C5FD" font-size="11" font-weight="600">Valid: Role ADMIN</text>
  
  <rect x="800" y="285" width="210" height="50" rx="10" fill="url(#gradBlue)" filter="url(#shadow)"/>
  <text x="905" y="315" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">PORTAL ADMIN</text>

  <!-- Admin Tasks -->
  <rect x="780" y="360" width="250" height="38" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.2"/>
  <text x="905" y="384" text-anchor="middle" fill="#E2E8F0" font-size="12">Master Produk &amp; Atur Harga</text>
  
  <rect x="780" y="405" width="250" height="38" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.2"/>
  <text x="905" y="429" text-anchor="middle" fill="#E2E8F0" font-size="12">Pembelian (PO &amp; Faktur Supplier)</text>

  <rect x="780" y="450" width="250" height="38" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.2"/>
  <text x="905" y="474" text-anchor="middle" fill="#E2E8F0" font-size="12">Rekapitulasi Laporan Finansial</text>

  <rect x="780" y="495" width="250" height="38" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.2"/>
  <text x="905" y="519" text-anchor="middle" fill="#E2E8F0" font-size="12">Konfigurasi Bot Telegram &amp; Akun</text>

  <line x1="905" y1="335" x2="905" y2="358" stroke="#3B82F6" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Staff Branch (Down) -->
  <line x1="550" y1="355" x2="550" y2="400" stroke="#10B981" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="560" y="380" fill="#6EE7B7" font-size="11" font-weight="600">Valid: Role STAF</text>
  
  <rect x="440" y="400" width="220" height="50" rx="10" fill="url(#gradEmerald)" filter="url(#shadow)"/>
  <text x="550" y="430" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">PORTAL OPERASIONAL STAF</text>

  <!-- 3 Operasional Staf Pillars -->
  <!-- Pillar 1: Batch Stok -->
  <rect x="60" y="495" width="280" height="150" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>
  <rect x="60" y="495" width="280" height="32" rx="12" fill="#334155"/>
  <text x="200" y="516" text-anchor="middle" fill="#38BDF8" font-size="12" font-weight="700">1. INPUT BATCH STOK</text>
  <text x="200" y="550" text-anchor="middle" fill="#E2E8F0" font-size="12">• Tambah Batch Produk Eksisting</text>
  <text x="200" y="575" text-anchor="middle" fill="#E2E8F0" font-size="12">• Input Qty &amp; Tanggal Expired</text>
  <text x="200" y="600" text-anchor="middle" fill="#10B981" font-size="11" font-weight="600">🔒 Pembelian PO: Khusus Admin</text>

  <!-- Pillar 2: Kasir POS -->
  <rect x="410" y="495" width="280" height="150" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>
  <rect x="410" y="495" width="280" height="32" rx="12" fill="#334155"/>
  <text x="550" y="516" text-anchor="middle" fill="#34D399" font-size="12" font-weight="700">2. KASIR (BARANG KELUAR)</text>
  <text x="550" y="550" text-anchor="middle" fill="#E2E8F0" font-size="12">• Transaksi Checkout Pelanggan</text>
  <text x="550" y="575" text-anchor="middle" fill="#FBBF24" font-size="12" font-weight="600">• Auto-Deduction Exp Terdekat</text>
  <text x="550" y="600" text-anchor="middle" fill="#10B981" font-size="12" font-weight="700">✓ Sinkron Dampak Terselamatkan</text>

  <!-- Pillar 3: Penyelamatan AI -->
  <rect x="750" y="550" width="290" height="150" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" filter="url(#shadow)"/>
  <rect x="750" y="550" width="290" height="32" rx="12" fill="#334155"/>
  <text x="895" y="571" text-anchor="middle" fill="#C084FC" font-size="12" font-weight="700">3. ANALITIK AI &amp; MITIGASI</text>
  <text x="895" y="605" text-anchor="middle" fill="#E2E8F0" font-size="12">• Evaluasi Skor Risiko (0-100)</text>
  <text x="895" y="630" text-anchor="middle" fill="#E2E8F0" font-size="12">• Aksi: [Terjual] [Donasi] [Busuk]</text>
  <text x="895" y="655" text-anchor="middle" fill="#F43F5E" font-size="12" font-weight="700">✓ Eksekusi Atomik &amp; Idempotent</text>

  <!-- Connectors from Staff to Pillars -->
  <path d="M 470 450 L 200 450 L 200 492" fill="none" stroke="#10B981" stroke-width="1.8" marker-end="url(#arrow)"/>
  <line x1="550" y1="450" x2="550" y2="492" stroke="#10B981" stroke-width="1.8" marker-end="url(#arrow)"/>
  <path d="M 630 450 L 895 450 L 895 547" fill="none" stroke="#10B981" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- Unified Bottom Banner: Single Source of Truth -->
  <rect x="60" y="690" width="980" height="48" rx="10" fill="#134E4A" stroke="#2DD4BF" stroke-width="1.5"/>
  <text x="550" y="720" text-anchor="middle" fill="#CCFBF1" font-size="13" font-weight="700">🌐 SEMUA OPERASIONAL BERMUARA PADA: SINGLE SOURCE OF TRUTH (TABEL DAMPAK PANGAN &amp; DASHBOARD FEFO)</text>
</svg>
"""

# ----------------------------------------------------------------------
# 2. SITEMAP SVG
# ----------------------------------------------------------------------
svg_sitemap = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1150 720" width="100%" height="100%" style="background:#0F172A; font-family:'Segoe UI', system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="gradRoot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#064E3B"/>
    </linearGradient>
    <filter id="shadowBox" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Title -->
  <text x="575" y="45" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="800" letter-spacing="-0.02em">FRESHLOG — PETA SITUS SISTEM (SITEMAP)</text>
  <text x="575" y="70" text-anchor="middle" fill="#94A3B8" font-size="13">Hierarki Struktur Navigasi Single Page Application (SPA)</text>

  <!-- Root Node -->
  <rect x="425" y="95" width="300" height="52" rx="26" fill="url(#gradRoot)" stroke="#34D399" stroke-width="2" filter="url(#shadowBox)"/>
  <text x="575" y="126" text-anchor="middle" fill="#FFFFFF" font-size="15" font-weight="800">FreshLog Platform Core</text>

  <!-- Horizontal Distribution Line -->
  <line x1="85" y1="180" x2="1065" y2="180" stroke="#475569" stroke-width="2"/>
  <line x1="575" y1="147" x2="575" y2="180" stroke="#34D399" stroke-width="2"/>

  <!-- Vertical Branch Lines -->
  <line x1="85" y1="180" x2="85" y2="215" stroke="#475569" stroke-width="2"/>
  <line x1="248" y1="180" x2="248" y2="215" stroke="#475569" stroke-width="2"/>
  <line x1="411" y1="180" x2="411" y2="215" stroke="#475569" stroke-width="2"/>
  <line x1="575" y1="180" x2="575" y2="215" stroke="#475569" stroke-width="2"/>
  <line x1="738" y1="180" x2="738" y2="215" stroke="#475569" stroke-width="2"/>
  <line x1="901" y1="180" x2="901" y2="215" stroke="#475569" stroke-width="2"/>
  <line x1="1065" y1="180" x2="1065" y2="215" stroke="#475569" stroke-width="2"/>

  <!-- 7 Navigation Modules -->
  <!-- 1. Dashboard -->
  <g transform="translate(15, 215)">
    <rect width="140" height="42" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.8" filter="url(#shadowBox)"/>
    <text x="70" y="26" text-anchor="middle" fill="#A7F3D0" font-size="12" font-weight="700">1. Dashboard</text>
    <rect y="52" width="140" height="150" rx="8" fill="#0F172A" stroke="#334155"/>
    <text x="10" y="75" fill="#E2E8F0" font-size="10.5">• Bento KPI Stats</text>
    <text x="10" y="98" fill="#E2E8F0" font-size="10.5">• Batch Kritis</text>
    <text x="10" y="121" fill="#E2E8F0" font-size="10.5">• Kartu Dampak</text>
    <text x="10" y="144" fill="#E2E8F0" font-size="10.5">• Grafik 7 Hari</text>
    <text x="10" y="167" fill="#E2E8F0" font-size="10.5">• FEFO Badge</text>
  </g>

  <!-- 2. Stok & Batch -->
  <g transform="translate(178, 215)">
    <rect width="140" height="42" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.8" filter="url(#shadowBox)"/>
    <text x="70" y="26" text-anchor="middle" fill="#BFDBFE" font-size="12" font-weight="700">2. Stok &amp; Batch</text>
    <rect y="52" width="140" height="150" rx="8" fill="#0F172A" stroke="#334155"/>
    <text x="10" y="75" fill="#E2E8F0" font-size="10.5">• Master Produk</text>
    <text x="10" y="98" fill="#E2E8F0" font-size="10.5">• Tambah Batch</text>
    <text x="10" y="121" fill="#E2E8F0" font-size="10.5">• Tabel FEFO</text>
    <text x="10" y="144" fill="#E2E8F0" font-size="10.5">• Edit Data</text>
    <text x="10" y="167" fill="#E2E8F0" font-size="10.5">• Hapus Koreksi</text>
  </g>

  <!-- 3. Penjualan -->
  <g transform="translate(341, 215)">
    <rect width="140" height="42" rx="8" fill="#1E293B" stroke="#EC4899" stroke-width="1.8" filter="url(#shadowBox)"/>
    <text x="70" y="26" text-anchor="middle" fill="#FBCFE8" font-size="12" font-weight="700">3. Penjualan POS</text>
    <rect y="52" width="140" height="150" rx="8" fill="#0F172A" stroke="#334155"/>
    <text x="10" y="75" fill="#E2E8F0" font-size="10.5">• Grid Katalog</text>
    <text x="10" y="98" fill="#E2E8F0" font-size="10.5">• Keranjang POS</text>
    <text x="10" y="121" fill="#E2E8F0" font-size="10.5">• Auto-FEFO Cut</text>
    <text x="10" y="144" fill="#E2E8F0" font-size="10.5">• Cetak Nota</text>
    <text x="10" y="167" fill="#E2E8F0" font-size="10.5">• Sync Dampak</text>
  </g>

  <!-- 4. Pembelian -->
  <g transform="translate(505, 215)">
    <rect width="140" height="42" rx="8" fill="#1E293B" stroke="#06B6D4" stroke-width="1.8" filter="url(#shadowBox)"/>
    <text x="70" y="26" text-anchor="middle" fill="#A5F3FC" font-size="12" font-weight="700">4. Pembelian</text>
    <rect y="52" width="140" height="150" rx="8" fill="#0F172A" stroke="#334155"/>
    <text x="10" y="75" fill="#E2E8F0" font-size="10.5">• Input Pemasok</text>
    <text x="10" y="98" fill="#E2E8F0" font-size="10.5">• OCR Scan Nota</text>
    <text x="10" y="121" fill="#E2E8F0" font-size="10.5">• Riwayat Faktur</text>
    <text x="10" y="144" fill="#E2E8F0" font-size="10.5">• Proyeksi Restock</text>
    <text x="10" y="167" fill="#E2E8F0" font-size="10.5">• Saran Belanja</text>
  </g>

  <!-- 5. Analitik AI -->
  <g transform="translate(668, 215)">
    <rect width="140" height="42" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1.8" filter="url(#shadowBox)"/>
    <text x="70" y="26" text-anchor="middle" fill="#DDD6FE" font-size="12" font-weight="700">5. Analitik AI</text>
    <rect y="52" width="140" height="150" rx="8" fill="#0F172A" stroke="#334155"/>
    <text x="10" y="75" fill="#E2E8F0" font-size="10.5">• Skor Risiko (0-100)</text>
    <text x="10" y="98" fill="#E2E8F0" font-size="10.5">• Preskriptif LLM</text>
    <text x="10" y="121" fill="#E2E8F0" font-size="10.5">• Tombol [Terjual]</text>
    <text x="10" y="144" fill="#E2E8F0" font-size="10.5">• Tombol [Donasi]</text>
    <text x="10" y="167" fill="#E2E8F0" font-size="10.5">• Tombol [Busuk]</text>
  </g>

  <!-- 6. Laporan Rekap -->
  <g transform="translate(831, 215)">
    <rect width="140" height="42" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8" filter="url(#shadowBox)"/>
    <text x="70" y="26" text-anchor="middle" fill="#FDE68A" font-size="12" font-weight="700">6. Laporan</text>
    <rect y="52" width="140" height="150" rx="8" fill="#0F172A" stroke="#334155"/>
    <text x="10" y="75" fill="#E2E8F0" font-size="10.5">• Tab Harian</text>
    <text x="10" y="98" fill="#E2E8F0" font-size="10.5">• Tab Bulanan</text>
    <text x="10" y="121" fill="#E2E8F0" font-size="10.5">• Tab Tahunan</text>
    <text x="10" y="144" fill="#E2E8F0" font-size="10.5">• Dampak Terpadu</text>
    <text x="10" y="167" fill="#E2E8F0" font-size="10.5">• Export &amp; Print</text>
  </g>

  <!-- 7. Pengaturan -->
  <g transform="translate(995, 215)">
    <rect width="140" height="42" rx="8" fill="#1E293B" stroke="#64748B" stroke-width="1.8" filter="url(#shadowBox)"/>
    <text x="70" y="26" text-anchor="middle" fill="#CBD5E1" font-size="12" font-weight="700">7. Pengaturan</text>
    <rect y="52" width="140" height="150" rx="8" fill="#0F172A" stroke="#334155"/>
    <text x="10" y="75" fill="#E2E8F0" font-size="10.5">• Manajemen Akun</text>
    <text x="10" y="98" fill="#E2E8F0" font-size="10.5">• Hak Akses Role</text>
    <text x="10" y="121" fill="#E2E8F0" font-size="10.5">• Bot Telegram</text>
    <text x="10" y="144" fill="#E2E8F0" font-size="10.5">• Backup Data</text>
    <text x="10" y="167" fill="#E2E8F0" font-size="10.5">• Log Aktivitas</text>
  </g>

  <!-- Footer Indicator -->
  <rect x="250" y="440" width="650" height="40" rx="20" fill="#1E293B" stroke="#334155"/>
  <text x="575" y="465" text-anchor="middle" fill="#94A3B8" font-size="12">Navigasi Dinamis SPA (Section Toggle tanpa Full-Page Reload)</text>
</svg>
"""

# ----------------------------------------------------------------------
# 3. ARSITEKTUR SISTEM SVG
# ----------------------------------------------------------------------
svg_arsitektur = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 680" width="100%" height="100%" style="background:#0F172A; font-family:'Segoe UI', system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Title -->
  <text x="600" y="45" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="800">FRESHLOG — ARSITEKTUR SISTEM LAYERED</text>
  <text x="600" y="70" text-anchor="middle" fill="#94A3B8" font-size="13">Pemisahan Tanggung Jawab Antara Presentation, Gateway, Logic Engine, Data &amp; External APIs</text>

  <!-- Layer 1: Client Layer -->
  <rect x="30" y="100" width="200" height="520" rx="14" fill="#1E293B" stroke="#10B981" stroke-width="2" filter="url(#cardShadow)"/>
  <rect x="30" y="100" width="200" height="38" rx="14" fill="#047857"/>
  <text x="130" y="125" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">1. PRESENTATION (SPA)</text>
  <text x="130" y="170" text-anchor="middle" fill="#A7F3D0" font-size="12" font-weight="700">HTML5 Semantic</text>
  <text x="130" y="190" text-anchor="middle" fill="#94A3B8" font-size="11">Freshlog.html (Templates)</text>
  <line x1="50" y1="215" x2="210" y2="215" stroke="#334155"/>
  <text x="130" y="245" text-anchor="middle" fill="#A7F3D0" font-size="12" font-weight="700">Soft-Bento CSS</text>
  <text x="130" y="265" text-anchor="middle" fill="#94A3B8" font-size="11">Swiss Bento Tokens</text>
  <line x1="50" y1="290" x2="210" y2="290" stroke="#334155"/>
  <text x="130" y="320" text-anchor="middle" fill="#A7F3D0" font-size="12" font-weight="700">Vanilla ES6+ JS</text>
  <text x="130" y="340" text-anchor="middle" fill="#94A3B8" font-size="11">Freshlog.js Controller</text>
  <line x1="50" y1="365" x2="210" y2="365" stroke="#334155"/>
  <text x="130" y="395" text-anchor="middle" fill="#A7F3D0" font-size="12" font-weight="700">Local Cache</text>
  <text x="130" y="415" text-anchor="middle" fill="#94A3B8" font-size="11">LocalStorage Offline State</text>

  <!-- Layer 2: Gateway & Security -->
  <rect x="260" y="100" width="180" height="520" rx="14" fill="#1E293B" stroke="#F59E0B" stroke-width="2" filter="url(#cardShadow)"/>
  <rect x="260" y="100" width="180" height="38" rx="14" fill="#B45309"/>
  <text x="350" y="125" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">2. GATEWAY &amp; SECURITY</text>
  <text x="350" y="180" text-anchor="middle" fill="#FDE68A" font-size="12" font-weight="700">CORS Guard</text>
  <text x="350" y="200" text-anchor="middle" fill="#94A3B8" font-size="11">CORSMiddleware</text>
  <line x1="280" y1="230" x2="420" y2="230" stroke="#334155"/>
  <text x="350" y="260" text-anchor="middle" fill="#FDE68A" font-size="12" font-weight="700">Brute-Force Guard</text>
  <text x="350" y="280" text-anchor="middle" fill="#94A3B8" font-size="11">security.py Lockout</text>
  <line x1="280" y1="310" x2="420" y2="310" stroke="#334155"/>
  <text x="350" y="340" text-anchor="middle" fill="#FDE68A" font-size="12" font-weight="700">Rate Limiting</text>
  <text x="350" y="360" text-anchor="middle" fill="#94A3B8" font-size="11">Max 5 Attempts/15 min</text>
  <line x1="280" y1="390" x2="420" y2="390" stroke="#334155"/>
  <text x="350" y="420" text-anchor="middle" fill="#FDE68A" font-size="12" font-weight="700">Role Verification</text>
  <text x="350" y="440" text-anchor="middle" fill="#94A3B8" font-size="11">Admin vs Staff</text>

  <!-- Layer 3: Backend Core Engine -->
  <rect x="470" y="100" width="260" height="520" rx="14" fill="#1E293B" stroke="#3B82F6" stroke-width="2" filter="url(#cardShadow)"/>
  <rect x="470" y="100" width="260" height="38" rx="14" fill="#1D4ED8"/>
  <text x="600" y="125" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">3. BACKEND (FASTAPI / ASGI)</text>
  <text x="600" y="160" text-anchor="middle" fill="#93C5FD" font-size="13" font-weight="700">API Router &amp; Serialization</text>
  <text x="600" y="180" text-anchor="middle" fill="#94A3B8" font-size="11">main.py (Pydantic v2 Models)</text>
  
  <!-- Sub-box Domain Engines -->
  <rect x="485" y="210" width="230" height="380" rx="10" fill="#0F172A" stroke="#3B82F6" stroke-dasharray="3,3"/>
  <text x="600" y="235" text-anchor="middle" fill="#60A5FA" font-size="12" font-weight="800">Domain &amp; Logic Engines</text>
  
  <rect x="500" y="255" width="200" height="60" rx="6" fill="#1E293B"/>
  <text x="600" y="280" text-anchor="middle" fill="#E2E8F0" font-size="11.5" font-weight="700">FEFO &amp; Skor Risiko</text>
  <text x="600" y="300" text-anchor="middle" fill="#94A3B8" font-size="10.5">skor_risiko.py (0-100)</text>

  <rect x="500" y="330" width="200" height="60" rx="6" fill="#1E293B"/>
  <text x="600" y="355" text-anchor="middle" fill="#E2E8F0" font-size="11.5" font-weight="700">Prescriptive Decision AI</text>
  <text x="600" y="375" text-anchor="middle" fill="#94A3B8" font-size="10.5">rekomendasi.py (Rule + LLM)</text>

  <rect x="500" y="405" width="200" height="60" rx="6" fill="#1E293B"/>
  <text x="600" y="430" text-anchor="middle" fill="#E2E8F0" font-size="11.5" font-weight="700">Restock &amp; Safety Stock</text>
  <text x="600" y="450" text-anchor="middle" fill="#94A3B8" font-size="10.5">restock.py (Reorder Point)</text>

  <rect x="500" y="480" width="200" height="60" rx="6" fill="#1E293B"/>
  <text x="600" y="505" text-anchor="middle" fill="#E2E8F0" font-size="11.5" font-weight="700">Moving Average Analytics</text>
  <text x="600" y="525" text-anchor="middle" fill="#94A3B8" font-size="10.5">riwayat.py (Harian/Bulanan)</text>

  <!-- Layer 4: Data Layer -->
  <rect x="760" y="100" width="190" height="520" rx="14" fill="#1E293B" stroke="#8B5CF6" stroke-width="2" filter="url(#cardShadow)"/>
  <rect x="760" y="100" width="190" height="38" rx="14" fill="#6D28D9"/>
  <text x="855" y="125" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">4. DATA PERSISTENCE</text>
  <text x="855" y="180" text-anchor="middle" fill="#DDD6FE" font-size="12" font-weight="700">PostgreSQL / SQLite</text>
  <text x="855" y="200" text-anchor="middle" fill="#94A3B8" font-size="11">ACID Relational Engine</text>
  <line x1="780" y1="230" x2="930" y2="230" stroke="#334155"/>
  <text x="855" y="260" text-anchor="middle" fill="#DDD6FE" font-size="12" font-weight="700">Tabel Batches</text>
  <text x="855" y="280" text-anchor="middle" fill="#94A3B8" font-size="11">Stok &amp; Status Expired</text>
  <line x1="780" y1="310" x2="930" y2="310" stroke="#334155"/>
  <text x="855" y="340" text-anchor="middle" fill="#DDD6FE" font-size="12" font-weight="700">Tabel Dampak Pangan</text>
  <text x="855" y="360" text-anchor="middle" fill="#94A3B8" font-size="11">Single Source of Truth</text>
  <line x1="780" y1="390" x2="930" y2="390" stroke="#334155"/>
  <text x="855" y="420" text-anchor="middle" fill="#DDD6FE" font-size="12" font-weight="700">Tabel Users &amp; Auth</text>
  <text x="855" y="440" text-anchor="middle" fill="#94A3B8" font-size="11">Password Hash Bcrypt</text>

  <!-- Layer 5: External APIs -->
  <rect x="980" y="100" width="190" height="520" rx="14" fill="#1E293B" stroke="#EC4899" stroke-width="2" filter="url(#cardShadow)"/>
  <rect x="980" y="100" width="190" height="38" rx="14" fill="#BE185D"/>
  <text x="1075" y="125" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">5. CLOUD SERVICES</text>
  <text x="1075" y="180" text-anchor="middle" fill="#FBCFE8" font-size="12" font-weight="700">Google Gemini LLM</text>
  <text x="1075" y="200" text-anchor="middle" fill="#94A3B8" font-size="11">gemini-flash-lite</text>
  <line x1="1000" y1="230" x2="1150" y2="230" stroke="#334155"/>
  <text x="1075" y="260" text-anchor="middle" fill="#FBCFE8" font-size="12" font-weight="700">Gemini Vision OCR</text>
  <text x="1075" y="280" text-anchor="middle" fill="#94A3B8" font-size="11">Multimodal Invoice Scan</text>
  <line x1="1000" y1="310" x2="1150" y2="310" stroke="#334155"/>
  <text x="1075" y="340" text-anchor="middle" fill="#FBCFE8" font-size="12" font-weight="700">Telegram Bot API</text>
  <text x="1075" y="360" text-anchor="middle" fill="#94A3B8" font-size="11">Instant Critical Alerts</text>

  <!-- Flow Arrows connecting layers -->
  <line x1="230" y1="200" x2="260" y2="200" stroke="#10B981" stroke-width="2"/>
  <line x1="440" y1="200" x2="470" y2="200" stroke="#F59E0B" stroke-width="2"/>
  <line x1="730" y1="270" x2="760" y2="270" stroke="#3B82F6" stroke-width="2"/>
  <line x1="730" y1="350" x2="980" y2="350" stroke="#EC4899" stroke-width="2"/>
</svg>
"""

# ----------------------------------------------------------------------
# 4. ERD DATABASE SVG
# ----------------------------------------------------------------------
svg_erd = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1150 780" width="100%" height="100%" style="background:#0F172A; font-family:'Segoe UI', system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="erdShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Title -->
  <text x="575" y="45" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="800">FRESHLOG — ENTITY RELATIONSHIP DIAGRAM (ERD)</text>
  <text x="575" y="70" text-anchor="middle" fill="#94A3B8" font-size="13">Relasi Skema Database Ternormalisasi 3NF Berbasis Integritas Transaksional</text>

  <!-- Table 1: USERS -->
  <g transform="translate(60, 100)" filter="url(#erdShadow)">
    <rect width="250" height="200" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.8"/>
    <rect width="250" height="34" rx="8" fill="#1D4ED8"/>
    <text x="125" y="23" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">USERS</text>
    <text x="15" y="60" fill="#93C5FD" font-size="12" font-weight="700">🔑 id <tspan fill="#64748B">[UUID, PK]</tspan></text>
    <text x="15" y="85" fill="#E2E8F0" font-size="12">username <tspan fill="#64748B">[VARCHAR, UK]</tspan></text>
    <text x="15" y="110" fill="#E2E8F0" font-size="12">password_hash <tspan fill="#64748B">[VARCHAR]</tspan></text>
    <text x="15" y="135" fill="#E2E8F0" font-size="12">role <tspan fill="#F59E0B">[ADMIN / STAFF]</tspan></text>
    <text x="15" y="160" fill="#E2E8F0" font-size="12">nama_lengkap <tspan fill="#64748B">[VARCHAR]</tspan></text>
    <text x="15" y="185" fill="#E2E8F0" font-size="12">created_at <tspan fill="#64748B">[TIMESTAMP]</tspan></text>
  </g>

  <!-- Table 2: PRODUCTS -->
  <g transform="translate(450, 100)" filter="url(#erdShadow)">
    <rect width="260" height="225" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.8"/>
    <rect width="260" height="34" rx="8" fill="#047857"/>
    <text x="130" y="23" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">PRODUCTS (MASTER)</text>
    <text x="15" y="60" fill="#A7F3D0" font-size="12" font-weight="700">🔑 id <tspan fill="#64748B">[UUID, PK]</tspan></text>
    <text x="15" y="85" fill="#E2E8F0" font-size="12">sku <tspan fill="#64748B">[VARCHAR, Barcode UK]</tspan></text>
    <text x="15" y="110" fill="#E2E8F0" font-size="12">nama_produk <tspan fill="#64748B">[VARCHAR]</tspan></text>
    <text x="15" y="135" fill="#E2E8F0" font-size="12">kategori <tspan fill="#64748B">[VARCHAR]</tspan></text>
    <text x="15" y="160" fill="#E2E8F0" font-size="12">harga_beli <tspan fill="#64748B">[INTEGER, Modal]</tspan></text>
    <text x="15" y="185" fill="#E2E8F0" font-size="12">harga_jual <tspan fill="#64748B">[INTEGER, Jual]</tspan></text>
    <text x="15" y="210" fill="#E2E8F0" font-size="12">satuan <tspan fill="#64748B">[kg, pcs, unit]</tspan></text>
  </g>

  <!-- Table 3: BATCHES -->
  <g transform="translate(830, 100)" filter="url(#erdShadow)">
    <rect width="260" height="250" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8"/>
    <rect width="260" height="34" rx="8" fill="#B45309"/>
    <text x="130" y="23" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">BATCHES (INVENTARIS)</text>
    <text x="15" y="60" fill="#FDE68A" font-size="12" font-weight="700">🔑 id <tspan fill="#64748B">[UUID, PK]</tspan></text>
    <text x="15" y="85" fill="#E2E8F0" font-size="12">batch_id <tspan fill="#64748B">[VARCHAR, UK]</tspan></text>
    <text x="15" y="110" fill="#FDE68A" font-size="12" font-weight="700">🔗 product_id <tspan fill="#64748B">[FK -> PRODUCTS]</tspan></text>
    <text x="15" y="135" fill="#E2E8F0" font-size="12">stock <tspan fill="#64748B">[FLOAT, Sisa Stok]</tspan></text>
    <text x="15" y="160" fill="#E2E8F0" font-size="12">initial_stock <tspan fill="#64748B">[FLOAT, Stok Awal]</tspan></text>
    <text x="15" y="185" fill="#E2E8F0" font-size="12">tanggal_kedaluwarsa <tspan fill="#EF4444">[DATE, Exp]</tspan></text>
    <text x="15" y="210" fill="#E2E8F0" font-size="12">status <tspan fill="#64748B">[AKTIF/TERJUAL/DONASI/BUSUK]</tspan></text>
    <text x="15" y="235" fill="#E2E8F0" font-size="12">supplier_name <tspan fill="#64748B">[VARCHAR]</tspan></text>
  </g>

  <!-- Table 4: SALES -->
  <g transform="translate(60, 420)" filter="url(#erdShadow)">
    <rect width="250" height="225" rx="8" fill="#1E293B" stroke="#EC4899" stroke-width="1.8"/>
    <rect width="250" height="34" rx="8" fill="#BE185D"/>
    <text x="125" y="23" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">SALES (TRANSAKSI KASIR)</text>
    <text x="15" y="60" fill="#FBCFE8" font-size="12" font-weight="700">🔑 id <tspan fill="#64748B">[UUID, PK]</tspan></text>
    <text x="15" y="85" fill="#E2E8F0" font-size="12">invoice_number <tspan fill="#64748B">[VARCHAR, UK]</tspan></text>
    <text x="15" y="110" fill="#E2E8F0" font-size="12">tanggal_transaksi <tspan fill="#64748B">[TIMESTAMP]</tspan></text>
    <text x="15" y="135" fill="#E2E8F0" font-size="12">total_omzet <tspan fill="#64748B">[INTEGER]</tspan></text>
    <text x="15" y="160" fill="#E2E8F0" font-size="12">total_modal <tspan fill="#64748B">[INTEGER]</tspan></text>
    <text x="15" y="185" fill="#E2E8F0" font-size="12">laba_kotor <tspan fill="#64748B">[INTEGER]</tspan></text>
    <text x="15" y="210" fill="#FBCFE8" font-size="12" font-weight="700">🔗 user_id <tspan fill="#64748B">[FK -> USERS]</tspan></text>
  </g>

  <!-- Table 5: SALE_ITEMS -->
  <g transform="translate(450, 420)" filter="url(#erdShadow)">
    <rect width="260" height="200" rx="8" fill="#1E293B" stroke="#EC4899" stroke-width="1.8"/>
    <rect width="260" height="34" rx="8" fill="#BE185D"/>
    <text x="130" y="23" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">SALE_ITEMS</text>
    <text x="15" y="60" fill="#FBCFE8" font-size="12" font-weight="700">🔑 id <tspan fill="#64748B">[UUID, PK]</tspan></text>
    <text x="15" y="85" fill="#FBCFE8" font-size="12" font-weight="700">🔗 sale_id <tspan fill="#64748B">[FK -> SALES]</tspan></text>
    <text x="15" y="110" fill="#FDE68A" font-size="12" font-weight="700">🔗 batch_id <tspan fill="#64748B">[FK -> BATCHES (FEFO)]</tspan></text>
    <text x="15" y="135" fill="#E2E8F0" font-size="12">qty <tspan fill="#64748B">[FLOAT]</tspan></text>
    <text x="15" y="160" fill="#E2E8F0" font-size="12">harga_satuan <tspan fill="#64748B">[INTEGER]</tspan></text>
    <text x="15" y="185" fill="#E2E8F0" font-size="12">subtotal <tspan fill="#64748B">[INTEGER]</tspan></text>
  </g>

  <!-- Table 6: DAMPAK_PANGAN -->
  <g transform="translate(830, 420)" filter="url(#erdShadow)">
    <rect width="260" height="250" rx="8" fill="#064E3B" stroke="#34D399" stroke-width="2"/>
    <rect width="260" height="34" rx="8" fill="#047857"/>
    <text x="130" y="23" text-anchor="middle" fill="#FFFFFF" font-size="13" font-weight="800">DAMPAK_PANGAN (ESG SOURCE)</text>
    <text x="15" y="60" fill="#A7F3D0" font-size="12" font-weight="700">🔑 id <tspan fill="#64748B">[DP-YYYYMMDD-XXX, PK]</tspan></text>
    <text x="15" y="85" fill="#FDE68A" font-size="12" font-weight="700">🔗 batch_id <tspan fill="#64748B">[FK -> BATCHES]</tspan></text>
    <text x="15" y="110" fill="#E2E8F0" font-size="12">produk_nama <tspan fill="#64748B">[VARCHAR]</tspan></text>
    <text x="15" y="135" fill="#E2E8F0" font-size="12">qty_kg <tspan fill="#64748B">[FLOAT, Bobot kg]</tspan></text>
    <text x="15" y="160" fill="#E2E8F0" font-size="12">nilai_rupiah <tspan fill="#64748B">[INTEGER, Nilai Rp]</tspan></text>
    <text x="15" y="185" fill="#34D399" font-size="12" font-weight="700">tipe <tspan fill="#64748B">[TERSELAMATKAN / TIDAK]</tspan></text>
    <text x="15" y="210" fill="#E2E8F0" font-size="12">aksi <tspan fill="#64748B">[TERJUAL / DONASI / BUSUK]</tspan></text>
    <text x="15" y="235" fill="#93C5FD" font-size="12" font-weight="700">🔗 user_id <tspan fill="#64748B">[FK -> USERS]</tspan></text>
  </g>

  <!-- Connectors -->
  <!-- PRODUCTS -> BATCHES (1 to N) -->
  <line x1="710" y1="180" x2="830" y2="180" stroke="#10B981" stroke-width="2"/>
  <text x="770" y="170" fill="#A7F3D0" font-size="11" font-weight="700">1 : N</text>

  <!-- SALES -> SALE_ITEMS (1 to N) -->
  <line x1="310" y1="520" x2="450" y2="520" stroke="#EC4899" stroke-width="2"/>
  <text x="380" y="510" fill="#FBCFE8" font-size="11" font-weight="700">1 : N</text>

  <!-- BATCHES -> SALE_ITEMS (1 to N) -->
  <path d="M 900 350 L 900 385 L 580 385 L 580 420" fill="none" stroke="#F59E0B" stroke-width="2"/>
  <text x="740" y="380" fill="#FDE68A" font-size="11" font-weight="700">FEFO Cut</text>

  <!-- BATCHES -> DAMPAK_PANGAN (1 to 1/N) -->
  <line x1="960" y1="350" x2="960" y2="420" stroke="#34D399" stroke-width="2.5"/>
  <text x="970" y="385" fill="#34D399" font-size="11" font-weight="700">1 : 1</text>
</svg>
"""

# ----------------------------------------------------------------------
# 5. SEQUENCE DIAGRAM SVG
# ----------------------------------------------------------------------
svg_sequence = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1150 720" width="100%" height="100%" style="background:#0F172A; font-family:'Segoe UI', system-ui, -apple-system, sans-serif;">
  <!-- Title -->
  <text x="575" y="45" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="800">FRESHLOG — SEQUENCE DIAGRAM: AKSI AKHIR BATCH</text>
  <text x="575" y="70" text-anchor="middle" fill="#94A3B8" font-size="13">Alur Eksekusi Transaksi Atomik &amp; Pencegahan Eksekusi Dobel (Idempotency Guard)</text>

  <!-- Lifeline Headers -->
  <!-- 1. Staf -->
  <rect x="50" y="100" width="140" height="40" rx="8" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5"/>
  <text x="120" y="125" text-anchor="middle" fill="#93C5FD" font-size="12" font-weight="700">👤 Staf Gudang</text>
  <line x1="120" y1="140" x2="120" y2="670" stroke="#334155" stroke-dasharray="4,4"/>

  <!-- 2. UI Browser -->
  <rect x="250" y="100" width="150" height="40" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.5"/>
  <text x="325" y="125" text-anchor="middle" fill="#A7F3D0" font-size="12" font-weight="700">🖥️ FreshLog UI</text>
  <line x1="325" y1="140" x2="325" y2="670" stroke="#334155" stroke-dasharray="4,4"/>

  <!-- 3. FastAPI Backend -->
  <rect x="460" y="100" width="160" height="40" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.5"/>
  <text x="540" y="125" text-anchor="middle" fill="#FDE68A" font-size="12" font-weight="700">⚡ FastAPI Backend</text>
  <line x1="540" y1="140" x2="540" y2="670" stroke="#334155" stroke-dasharray="4,4"/>

  <!-- 4. Idempotency Guard -->
  <rect x="680" y="100" width="180" height="40" rx="8" fill="#1E293B" stroke="#EC4899" stroke-width="1.5"/>
  <text x="770" y="125" text-anchor="middle" fill="#FBCFE8" font-size="12" font-weight="700">🛡️ Idempotency Guard</text>
  <line x1="770" y1="140" x2="770" y2="670" stroke="#334155" stroke-dasharray="4,4"/>

  <!-- 5. Database Engine -->
  <rect x="920" y="100" width="160" height="40" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1.5"/>
  <text x="1000" y="125" text-anchor="middle" fill="#DDD6FE" font-size="12" font-weight="700">💾 Database Engine</text>
  <line x1="1000" y1="140" x2="1000" y2="670" stroke="#334155" stroke-dasharray="4,4"/>

  <!-- Message 1: Klik Tombol -->
  <line x1="120" y1="180" x2="325" y2="180" stroke="#93C5FD" stroke-width="2"/>
  <polygon points="325,180 315,175 315,185" fill="#93C5FD"/>
  <text x="220" y="172" text-anchor="middle" fill="#E2E8F0" font-size="11.5">1. Klik Tombol [Donasi / Terjual / Busuk]</text>

  <!-- Message 2: Modal Konfirmasi -->
  <rect x="250" y="200" width="150" height="35" rx="6" fill="#047857"/>
  <text x="325" y="222" text-anchor="middle" fill="#FFFFFF" font-size="11">2. Modal Konfirmasi Dialog</text>

  <!-- Message 3: Konfirmasi Ya -->
  <line x1="120" y1="260" x2="325" y2="260" stroke="#93C5FD" stroke-width="2"/>
  <polygon points="325,260 315,255 315,265" fill="#93C5FD"/>
  <text x="220" y="252" text-anchor="middle" fill="#E2E8F0" font-size="11.5">3. Klik [Ya, Lanjutkan]</text>

  <!-- Message 4: POST Request -->
  <line x1="325" y1="290" x2="540" y2="290" stroke="#10B981" stroke-width="2"/>
  <polygon points="540,290 530,285 530,295" fill="#10B981"/>
  <text x="432" y="282" text-anchor="middle" fill="#6EE7B7" font-size="11.5">4. POST /dampak-pangan/catat-aksi-akhir</text>

  <!-- Message 5: Idempotency Check -->
  <line x1="540" y1="325" x2="770" y2="325" stroke="#F59E0B" stroke-width="2"/>
  <polygon points="770,325 760,320 760,330" fill="#F59E0B"/>
  <text x="655" y="317" text-anchor="middle" fill="#FDE68A" font-size="11.5">5. Cek Status Terkini Batch</text>

  <!-- Alt Box Container -->
  <rect x="400" y="355" width="670" height="240" rx="8" fill="#111827" stroke="#374151" stroke-width="1.5"/>
  <text x="415" y="375" fill="#9CA3AF" font-size="11" font-weight="700">ALT: Cek Status Batch</text>

  <!-- Branch A: Already Final (Rejection) -->
  <text x="420" y="405" fill="#FCA5A5" font-size="11" font-weight="700">[Kondisi: Status Sudah Final]</text>
  <line x1="770" y1="420" x2="540" y2="420" stroke="#EF4444" stroke-dasharray="4,4" stroke-width="2"/>
  <polygon points="540,420 550,415 550,425" fill="#EF4444"/>
  <text x="655" y="412" text-anchor="middle" fill="#EF4444" font-size="11">Tolak: Batch Sudah Pernah Diproses</text>

  <line x1="540" y1="440" x2="325" y2="440" stroke="#EF4444" stroke-dasharray="4,4" stroke-width="2"/>
  <polygon points="325,440 335,435 335,445" fill="#EF4444"/>
  <text x="432" y="432" text-anchor="middle" fill="#FCA5A5" font-size="11">HTTP 400 (Idempotent Reject)</text>

  <!-- Divider inside Alt -->
  <line x1="400" y1="455" x2="1070" y2="455" stroke="#374151" stroke-dasharray="4,4"/>

  <!-- Branch B: Active Batch (Atomic Transaction) -->
  <text x="420" y="475" fill="#86EFAC" font-size="11" font-weight="700">[Kondisi: Status Masih AKTIF]</text>
  <line x1="770" y1="495" x2="1000" y2="495" stroke="#10B981" stroke-width="2"/>
  <polygon points="1000,495 990,490 990,500" fill="#10B981"/>
  <text x="885" y="487" text-anchor="middle" fill="#86EFAC" font-size="11">6. Atomic BEGIN: Update Batch + Insert Dampak</text>

  <rect x="940" y="515" width="120" height="30" rx="4" fill="#1E293B" stroke="#10B981"/>
  <text x="1000" y="534" text-anchor="middle" fill="#A7F3D0" font-size="10.5">COMMIT Sukses</text>

  <line x1="1000" y1="565" x2="540" y2="565" stroke="#10B981" stroke-width="2"/>
  <polygon points="540,565 550,560 550,570" fill="#10B981"/>
  <text x="770" y="557" text-anchor="middle" fill="#86EFAC" font-size="11">7. Return Sukses Tersimpan</text>

  <line x1="540" y1="585" x2="325" y2="585" stroke="#10B981" stroke-width="2"/>
  <polygon points="325,585 335,580 335,590" fill="#10B981"/>
  <text x="432" y="577" text-anchor="middle" fill="#86EFAC" font-size="11">HTTP 200 OK (Data Record)</text>

  <!-- Final UI Actions -->
  <line x1="325" y1="630" x2="120" y2="630" stroke="#10B981" stroke-dasharray="4,4" stroke-width="2"/>
  <polygon points="120,630 130,625 130,635" fill="#10B981"/>
  <text x="220" y="622" text-anchor="middle" fill="#86EFAC" font-size="11">8. Tombol Hilang &amp; Toast Notifikasi</text>
</svg>
"""

# ----------------------------------------------------------------------
# 6. TOPOLOGI INFRASTRUKTUR SVG
# ----------------------------------------------------------------------
svg_topologi = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="100%" height="100%" style="background:#0F172A; font-family:'Segoe UI', system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="topoShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Title -->
  <text x="600" y="45" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="800">FRESHLOG — TOPOLOGI INFRASTRUKTUR CLOUD</text>
  <text x="600" y="70" text-anchor="middle" fill="#94A3B8" font-size="13">Desain Arsitektur Production: Edge, PaaS Container, Database Managed Cluster &amp; External APIs</text>

  <!-- Box 1: Client Devices -->
  <rect x="50" y="100" width="220" height="230" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.8" filter="url(#topoShadow)"/>
  <rect x="50" y="100" width="220" height="34" rx="12" fill="#334155"/>
  <text x="160" y="123" text-anchor="middle" fill="#F8FAFC" font-size="12" font-weight="800">PERANGKAT KLIEN UMKM</text>
  <rect x="65" y="150" width="190" height="40" rx="6" fill="#0F172A" stroke="#475569"/>
  <text x="160" y="175" text-anchor="middle" fill="#E2E8F0" font-size="11.5">💻 PC Kasir (Chrome Desktop)</text>
  <rect x="65" y="200" width="190" height="40" rx="6" fill="#0F172A" stroke="#475569"/>
  <text x="160" y="225" text-anchor="middle" fill="#E2E8F0" font-size="11.5">📱 Tablet Gudang (PWA / Web)</text>
  <rect x="65" y="250" width="190" height="40" rx="6" fill="#0F172A" stroke="#475569"/>
  <text x="160" y="275" text-anchor="middle" fill="#E2E8F0" font-size="11.5">📲 HP Pemilik (Telegram App)</text>

  <!-- Box 2: Edge Network (Cloudflare) -->
  <rect x="340" y="100" width="200" height="230" rx="12" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8" filter="url(#topoShadow)"/>
  <rect x="340" y="100" width="200" height="34" rx="12" fill="#B45309"/>
  <text x="440" y="123" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">EDGE SECURITY</text>
  <rect x="355" y="150" width="170" height="40" rx="6" fill="#0F172A"/>
  <text x="440" y="175" text-anchor="middle" fill="#FDE68A" font-size="11.5">Cloudflare DNS &amp; CDN</text>
  <rect x="355" y="200" width="170" height="40" rx="6" fill="#0F172A"/>
  <text x="440" y="225" text-anchor="middle" fill="#FDE68A" font-size="11.5">WAF &amp; DDoS Protection</text>
  <rect x="355" y="250" width="170" height="40" rx="6" fill="#0F172A"/>
  <text x="440" y="275" text-anchor="middle" fill="#FDE68A" font-size="11.5">SSL / TLS 1.3 Encryption</text>

  <!-- Box 3: Cloud PaaS Container (Railway / Render / AWS) -->
  <rect x="610" y="100" width="280" height="340" rx="12" fill="#1E293B" stroke="#3B82F6" stroke-width="2" filter="url(#topoShadow)"/>
  <rect x="610" y="100" width="280" height="34" rx="12" fill="#1D4ED8"/>
  <text x="750" y="123" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">CLOUD CONTAINER PLATFORM</text>
  
  <rect x="630" y="150" width="240" height="40" rx="6" fill="#0F172A" stroke="#3B82F6"/>
  <text x="750" y="175" text-anchor="middle" fill="#93C5FD" font-size="12" font-weight="700">Nginx Reverse Proxy &amp; LB</text>

  <!-- Multi-worker FastAPI -->
  <rect x="630" y="205" width="240" height="110" rx="8" fill="#0F172A" stroke="#10B981" stroke-dasharray="3,3"/>
  <text x="750" y="225" text-anchor="middle" fill="#34D399" font-size="11" font-weight="700">Uvicorn ASGI Worker Pool</text>
  <rect x="645" y="235" width="210" height="30" rx="4" fill="#1E293B"/>
  <text x="750" y="255" text-anchor="middle" fill="#E2E8F0" font-size="11">FastAPI Worker #1 (Core)</text>
  <rect x="645" y="272" width="210" height="30" rx="4" fill="#1E293B"/>
  <text x="750" y="292" text-anchor="middle" fill="#E2E8F0" font-size="11">FastAPI Worker #2 (Core)</text>

  <!-- Cron Worker -->
  <rect x="630" y="330" width="240" height="40" rx="6" fill="#0F172A" stroke="#F59E0B"/>
  <text x="750" y="355" text-anchor="middle" fill="#FDE68A" font-size="11">APScheduler (Cron Pagi 07:00)</text>

  <!-- Box 4: Database Managed Tier -->
  <rect x="960" y="100" width="190" height="340" rx="12" fill="#1E293B" stroke="#8B5CF6" stroke-width="2" filter="url(#topoShadow)"/>
  <rect x="960" y="100" width="190" height="34" rx="12" fill="#6D28D9"/>
  <text x="1055" y="123" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">MANAGED DATA TIER</text>
  <rect x="975" y="150" width="160" height="65" rx="6" fill="#0F172A"/>
  <text x="1055" y="175" text-anchor="middle" fill="#DDD6FE" font-size="11.5" font-weight="700">Managed PostgreSQL</text>
  <text x="1055" y="195" text-anchor="middle" fill="#94A3B8" font-size="10.5">Primary Cluster (ACID)</text>
  
  <rect x="975" y="225" width="160" height="50" rx="6" fill="#0F172A"/>
  <text x="1055" y="248" text-anchor="middle" fill="#DDD6FE" font-size="11">Read Replica</text>
  <text x="1055" y="265" text-anchor="middle" fill="#94A3B8" font-size="10">Standby Failover</text>

  <rect x="975" y="285" width="160" height="60" rx="6" fill="#0F172A"/>
  <text x="1055" y="308" text-anchor="middle" fill="#DDD6FE" font-size="11" font-weight="700">Redis In-Memory</text>
  <text x="1055" y="328" text-anchor="middle" fill="#94A3B8" font-size="10">Cache &amp; Lockout State</text>

  <!-- Box 5: External APIs (Bottom) -->
  <rect x="340" y="490" width="550" height="150" rx="12" fill="#1E293B" stroke="#EC4899" stroke-width="2" filter="url(#topoShadow)"/>
  <rect x="340" y="490" width="550" height="34" rx="12" fill="#BE185D"/>
  <text x="615" y="513" text-anchor="middle" fill="#FFFFFF" font-size="12" font-weight="800">EXTERNAL CLOUD APIs</text>
  <rect x="365" y="540" width="230" height="75" rx="8" fill="#0F172A"/>
  <text x="480" y="568" text-anchor="middle" fill="#FBCFE8" font-size="12" font-weight="700">Google Gemini Cloud</text>
  <text x="480" y="588" text-anchor="middle" fill="#94A3B8" font-size="10.5">Flash-Lite LLM &amp; Vision OCR</text>

  <rect x="635" y="540" width="230" height="75" rx="8" fill="#0F172A"/>
  <text x="750" y="568" text-anchor="middle" fill="#FBCFE8" font-size="12" font-weight="700">Telegram Bot Server</text>
  <text x="750" y="588" text-anchor="middle" fill="#94A3B8" font-size="10.5">Automated Alerting Gateway</text>

  <!-- Connectors -->
  <line x1="270" y1="215" x2="340" y2="215" stroke="#F59E0B" stroke-width="2"/>
  <line x1="540" y1="215" x2="610" y2="215" stroke="#3B82F6" stroke-width="2"/>
  <line x1="890" y1="215" x2="960" y2="215" stroke="#8B5CF6" stroke-width="2"/>
  <line x1="750" y1="440" x2="750" y2="490" stroke="#EC4899" stroke-width="2"/>
</svg>
"""

DIAGRAMS = {
    "1_user_flow.svg": svg_user_flow,
    "2_sitemap.svg": svg_sitemap,
    "3_arsitektur_sistem.svg": svg_arsitektur,
    "4_erd_database.svg": svg_erd,
    "5_sequence_diagram.svg": svg_sequence,
    "6_topologi_infrastruktur.svg": svg_topologi
}

for name, content in DIAGRAMS.items():
    for d in OUTPUT_DIRS:
        path = os.path.join(d, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content.strip())
        print(f"Generated: {path}")

print("Semua 6 file diagram SVG berhasil dibuat.")
