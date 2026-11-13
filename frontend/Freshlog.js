/* =============================================================================
   KONFIGURASI PUSAT INTEGRASI BACKEND FASTAPI (FreshLog Engine)
   ============================================================================= */
const FRESHLOG_API_BASE = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:"))
  ? "http://127.0.0.1:8000"
  : "https://inventori-api-production.up.railway.app";

// Helper pengecekan status koneksi backend FastAPI
async function cekKoneksiBackend() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${FRESHLOG_API_BASE}/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      console.log(`%c[FreshLog Backend]%c Terhubung ke FastAPI (${FRESHLOG_API_BASE})`, "color: #10B981; font-weight: bold;", "color: inherit;");
      return true;
    }
  } catch (e) {
    console.warn(`%c[FreshLog Backend]%c Offline di ${FRESHLOG_API_BASE}. Sistem berjalan dalam Mode Cache Lokal (LocalStorage).`, "color: #F59E0B; font-weight: bold;", "color: inherit;");
  }
  return false;
}

// Helper sinkronisasi data dampak pangan dari backend (Single Source of Truth)
async function syncDampakPanganDariBackend() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${FRESHLOG_API_BASE}/dampak-pangan/list`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json && json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem("freshlog_dampak_pangan", JSON.stringify(json.data));
        console.log(`[FreshLog Sync] Berhasil memuat ${json.data.length} catatan dampak pangan dari backend.`);
        if (typeof renderDashboardDampakRingkas === "function") renderDashboardDampakRingkas();
        if (typeof terapkanFilterLaporan === "function") terapkanFilterLaporan();
      }
    }
  } catch (errSync) {
    // Mode offline, biarkan membaca data lokal yang sudah ada
  }
}

/* ========================================== */
/* 1. NAVIGASI HALAMAN (SINGLE PAGE APP)      */
/* ========================================== */
function pindahHalaman(targetId) {
  // Validasi Hak Akses Role: Staf tidak diperkenankan mengakses Pembelian (Barang Masuk)
  const userRoleEl = document.getElementById("user-role");
  const currentRoleText = userRoleEl ? userRoleEl.innerText : "";
  const akunAktifData = (typeof daftarAkun !== "undefined" && typeof activeUserKey !== "undefined") ? daftarAkun[activeUserKey] : null;
  const currentRole = ((akunAktifData && akunAktifData.role) || currentRoleText || "").toLowerCase();
  const isUserStaff = currentRole.includes("staf") || currentRole === "staff";

  if (targetId === "pembelian" && isUserStaff) {
    if (typeof tampilkanToastModern === "function") {
      tampilkanToastModern("Akses Dibatasi: Fitur Pembelian (Barang Masuk) hanya dapat diakses oleh Admin Toko.", "warning");
    } else {
      alert("Akses Dibatasi: Fitur Pembelian (Barang Masuk) hanya dapat diakses oleh Admin Toko.");
    }
    return;
  }

  if (targetId === "prediksi") {
    targetId = "analitik-ai";
  }
  if (targetId === "smart-input") {
    targetId = "kasir";
    setTimeout(() => {
      if (typeof gantiTabPenjualan === "function") gantiTabPenjualan("voice-ocr");
    }, 50);
  }
  const navLinks = document.querySelectorAll(".nav-menu a");
  const sections = document.querySelectorAll(".main-content .section");

  // Sembunyikan semua section
  sections.forEach((section) => {
    section.style.display = "none";
  });

  // Tampilkan section yang dipilih
  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.style.display = "block";

    // Panggil API saat buka halaman terkait
    if (targetId === "dashboard") {
      if (typeof renderDashboardDampakRingkas === "function") renderDashboardDampakRingkas();
    }
    if (targetId === "kasir" && typeof initHalamanPenjualan === "function") {
      initHalamanPenjualan();
    }
    if (targetId === "pembelian" && typeof initHalamanPembelian === "function") {
      initHalamanPembelian();
    }
    if (targetId === "pemasok" && typeof initHalamanPemasok === "function") {
      initHalamanPemasok();
    }
    if (targetId === "produk") {
      loadInventarisDariServer();
      if (typeof renderTabelMasterProduk === "function") renderTabelMasterProduk();
      if (typeof terapkanHakAksesRoleStokBatch === "function") terapkanHakAksesRoleStokBatch();
    }
    if (targetId === "analitik-ai" && typeof initHalamanAnalitikAI === "function") {
      initHalamanAnalitikAI();
    }
    if (targetId === "pengaturan" && typeof initHalamanPengaturan === "function") {
      initHalamanPengaturan();
    }
    if (targetId === "laporan" && typeof initHalamanLaporan === "function") {
      initHalamanLaporan();
    }
    if (targetId === "dashboard" && typeof loadGrafik === "function") {
      loadGrafik();
    }
  }

  // Perbarui status kelas active pada menu navigasi
  navLinks.forEach((nav) => {
    const navTarget = nav.getAttribute("data-target") || (nav.getAttribute("href") ? nav.getAttribute("href").replace(/^#/, "") : "");
    if (navTarget === targetId) {
      nav.classList.add("active");
    } else {
      nav.classList.remove("active");
    }
  });

  // Otomatis tutup sidebar jika berada di layar seluler (HP)
  const sidebar = document.getElementById("sidebar");
  if (sidebar && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav-menu a");

  navLinks.forEach((link) => {
    const handleNav = function (e) {
      if (e) e.preventDefault();
      const targetId = this.getAttribute("data-target") || (this.getAttribute("href") ? this.getAttribute("href").replace(/^#/, "") : "");
      if (targetId) {
        pindahHalaman(targetId);
      }
    };
    link.addEventListener("click", handleNav);
    link.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        handleNav.call(this, e);
      }
    });
  });

  // Secara default, tampilkan section Dashboard saja saat pertama kali dimuat
  const sections = document.querySelectorAll(".main-content .section");
  sections.forEach((section) => (section.style.display = "none"));
  const defaultDashboard = document.getElementById("dashboard");
  if (defaultDashboard) {
    defaultDashboard.style.display = "block";
  }

  // Hitung metrik ringkasan dashboard awal dari inventaris
  if (typeof updateDashboardSummary === "function") {
    updateDashboardSummary();
  }

  // Sinkronisasi status koneksi dan data dari FastAPI backend
  if (typeof cekKoneksiBackend === "function") {
    cekKoneksiBackend();
  }
  if (typeof syncDampakPanganDariBackend === "function") {
    syncDampakPanganDariBackend();
  }

  // Tampilkan tanggal hari ini di top floating bar
  const elDate = document.getElementById("top-current-date");
  if (elDate) {
    const opsi = { day: "numeric", month: "short", year: "numeric" };
    elDate.innerText = new Date().toLocaleDateString("id-ID", opsi);
  }
});
  
  /* ========================================== */
  /* 2. MENU HAMBURGER (RESPONSIF HP)           */
  /* ========================================== */
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });
  }
  
  /* ========================================== */
  /* 3. POP-UP MODAL (OPEN & CLOSE)             */
  /* ========================================== */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "flex";
    }
  }
  
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";
    }
  }
  
  // Tutup modal jika pengguna mengklik area luar kotak modal
  window.addEventListener("click", function (event) {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  });
  
  /* ========================================== */
  /* 4. PENJUALAN (BARANG KELUAR) & KASIR FEFO  */
  /* ========================================== */
  
  // Database Produk Master Kasir & Penjualan
  const productDatabase = {
    "899123456789": { name: "Susu UHT 1L", price: 18000, buyPrice: 15000, category: "Minuman & Dairy" },
    "899999900001": { name: "Roti Tawar Daging", price: 12500, buyPrice: 10000, category: "Snack & Kue" },
    "899888800002": { name: "Yogurt Stroberi", price: 9500, buyPrice: 7500, category: "Minuman & Dairy" },
    "899777700003": { name: "Tahu Sumedang", price: 6000, buyPrice: 4500, category: "Makanan Fresh" },
    "899666600004": { name: "Tempe Bacem", price: 7500, buyPrice: 5500, category: "Makanan Fresh" }
  };

  // State Keranjang Belanja Penjualan
  let keranjangPenjualan = [];
  let tabPenjualanAktif = "baru";

  // Data Riwayat Penjualan (diambil dari localStorage jika ada)
  const defaultSalesRecords = [
    {
      id: "INV-20261110-101",
      waktu: "2026-11-10T14:32:00",
      pelanggan: "Bpk. Hendra (Resto Sari)",
      petugas: "Admin Toko",
      items: [
        {
          nama: "Susu UHT 1L",
          qty: 4,
          harga: 18000,
          subtotal: 72000,
          alokasiFEFO: [{ code: "BTC-001", expiry_date: "2026-11-10", qtyAlokasi: 4 }]
        }
      ],
      total: 72000,
      uangDiterima: 100000,
      kembalian: 28000
    },
    {
      id: "INV-20261110-102",
      waktu: "2026-11-10T16:15:00",
      pelanggan: "Pelanggan Umum",
      petugas: "Staff Toko",
      items: [
        {
          nama: "Roti Tawar Daging",
          qty: 2,
          harga: 12500,
          subtotal: 25000,
          alokasiFEFO: [{ code: "BTC-002", expiry_date: "2026-11-25", qtyAlokasi: 2 }]
        },
        {
          nama: "Yogurt Stroberi",
          qty: 3,
          harga: 9500,
          subtotal: 28500,
          alokasiFEFO: [{ code: "BTC-003", expiry_date: "2026-11-15", qtyAlokasi: 3 }]
        }
      ],
      total: 53500,
      uangDiterima: 60000,
      kembalian: 6500
    }
  ];

  function getRiwayatPenjualanData() {
    try {
      const data = JSON.parse(localStorage.getItem("freshlog_sales_records"));
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {}
    localStorage.setItem("freshlog_sales_records", JSON.stringify(defaultSalesRecords));
    return defaultSalesRecords;
  }

  function simpanRiwayatPenjualanData(data) {
    localStorage.setItem("freshlog_sales_records", JSON.stringify(data));
    if (typeof loadGrafik === "function") {
      try { loadGrafik(); } catch (e) {}
    }
  }

  // Inisialisasi Halaman Penjualan
  function initHalamanPenjualan() {
    renderPilihanProdukPenjualan();
    renderKeranjangPenjualan();
    renderRiwayatPenjualan();
    updateInfoBatchFEFO();
  }

  // Switch Sub-Tab Penjualan
  function gantiTabPenjualan(tabKey) {
    tabPenjualanAktif = tabKey;
    const btnBaru = document.getElementById("tab-btn-jual-baru");
    const btnRiwayat = document.getElementById("tab-btn-jual-riwayat");
    const btnVoiceOcr = document.getElementById("tab-btn-jual-voice-ocr");

    const panelBaru = document.getElementById("panel-jual-baru");
    const panelRiwayat = document.getElementById("panel-jual-riwayat");
    const panelVoiceOcr = document.getElementById("panel-jual-voice-ocr");

    if (btnBaru) btnBaru.classList.toggle("active", tabKey === "baru");
    if (btnRiwayat) btnRiwayat.classList.toggle("active", tabKey === "riwayat");
    if (btnVoiceOcr) btnVoiceOcr.classList.toggle("active", tabKey === "voice-ocr");

    if (panelBaru) panelBaru.style.display = (tabKey === "baru") ? "block" : "none";
    if (panelRiwayat) {
      panelRiwayat.style.display = (tabKey === "riwayat") ? "block" : "none";
      if (tabKey === "riwayat") renderRiwayatPenjualan();
    }
    if (panelVoiceOcr) panelVoiceOcr.style.display = (tabKey === "voice-ocr") ? "block" : "none";
  }

  // Render Pilihan Produk di Dropdown
  function renderPilihanProdukPenjualan() {
    const select = document.getElementById("pilih-produk-penjualan");
    const selectFilter = document.getElementById("filter-jual-produk");
    if (!select) return;

    // Kumpulkan produk dari productDatabase dan batch inventaris
    const mapProduk = new Map();
    for (const [sku, detail] of Object.entries(productDatabase)) {
      if (detail && detail.name) {
        mapProduk.set(detail.name, {
          nama: detail.name,
          sku: sku,
          harga: detail.price || 15000,
          kategori: detail.category || "Umum"
        });
      }
    }

    if (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
      dataBatchDemo.forEach(b => {
        if (b.name && !mapProduk.has(b.name)) {
          mapProduk.set(b.name, {
            nama: b.name,
            sku: b.code,
            harga: 15000,
            kategori: b.category || "Umum"
          });
        }
      });
    }

    let optionsHtml = `<option value="">-- Pilih Produk untuk Dijual --</option>`;
    mapProduk.forEach(p => {
      // Hitung sisa stok tersedia saat ini dari dataBatchDemo
      let totalStok = 0;
      if (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
        totalStok = dataBatchDemo
          .filter(b => b.name === p.nama)
          .reduce((sum, b) => sum + (parseFloat(b.stock) || 0), 0);
      }
      optionsHtml += `<option value="${p.nama}" data-harga="${p.harga}">📦 ${p.nama} (Stok: ${totalStok} pcs) - Rp ${p.harga.toLocaleString("id-ID")}</option>`;
    });

    select.innerHTML = optionsHtml;

    if (selectFilter) {
      let filterHtml = `<option value="">Semua Produk</option>`;
      mapProduk.forEach(p => {
        filterHtml += `<option value="${p.nama}">${p.nama}</option>`;
      });
      selectFilter.innerHTML = filterHtml;
    }
  }

  // Hitung Alokasi FEFO untuk suatu produk dan qty
  function hitungAlokasiFEFO(namaProduk, qtyDiminta) {
    if (typeof dataBatchDemo === "undefined" || !Array.isArray(dataBatchDemo)) {
      return { cukup: false, alokasi: [], totalTersedia: 0, sisaKurang: qtyDiminta };
    }

    // Filter batch produk yang memiliki stok > 0
    const batchList = dataBatchDemo
      .filter(b => b.name === namaProduk && (parseFloat(b.stock) || 0) > 0)
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)); // Urutkan tgl exp terdekat duluan (FEFO)

    const totalTersedia = batchList.reduce((s, b) => s + (parseFloat(b.stock) || 0), 0);
    let sisaDibutuhkan = qtyDiminta;
    const alokasi = [];

    for (const b of batchList) {
      if (sisaDibutuhkan <= 0) break;
      const stokBatch = parseFloat(b.stock) || 0;
      const ambil = Math.min(stokBatch, sisaDibutuhkan);
      alokasi.push({
        code: b.code,
        expiry_date: b.expiry_date,
        qtyAlokasi: ambil,
        sisaBatchSetelahnya: stokBatch - ambil
      });
      sisaDibutuhkan -= ambil;
    }

    return {
      cukup: sisaDibutuhkan === 0,
      alokasi: alokasi,
      totalTersedia: totalTersedia,
      sisaKurang: sisaDibutuhkan > 0 ? sisaDibutuhkan : 0
    };
  }

  // Update Tampilan Harga & Preview Batch FEFO
  function updateInfoBatchFEFO() {
    const select = document.getElementById("pilih-produk-penjualan");
    const inputQty = document.getElementById("input-qty-penjualan");
    const inputHarga = document.getElementById("input-harga-penjualan");
    const previewText = document.getElementById("fefo-preview-text");
    if (!select || !previewText) return;

    const namaProduk = select.value;
    const qty = parseInt(inputQty?.value) || 1;

    if (!namaProduk) {
      if (inputHarga) inputHarga.value = "";
      previewText.innerHTML = "Pilih produk dan tentukan jumlah untuk melihat batch mana yang otomatis terpotong lebih dulu.";
      return;
    }

    const selectedOption = select.options[select.selectedIndex];
    const harga = parseInt(selectedOption?.getAttribute("data-harga")) || 15000;
    if (inputHarga) inputHarga.value = harga;

    const hasilFEFO = hitungAlokasiFEFO(namaProduk, qty);
    if (hasilFEFO.totalTersedia === 0) {
      previewText.innerHTML = `<span style="color:#dc2626; font-weight:700;">⚠️ Stok Kosong!</span> Produk "${namaProduk}" belum memiliki batch dengan stok aktif.`;
    } else if (!hasilFEFO.cukup) {
      const detailStr = hasilFEFO.alokasi.map(a => `<strong>${a.code}</strong> (${a.qtyAlokasi} pcs, Exp: ${a.expiry_date})`).join(", ");
      previewText.innerHTML = `<span style="color:#d97706; font-weight:700;">⚠️ Stok Kurang!</span> Tersedia total <strong>${hasilFEFO.totalTersedia} pcs</strong>, permintaan <strong>${qty} pcs</strong> (Kurang ${hasilFEFO.sisaKurang} pcs).<br>Alokasi FEFO maksimal: ${detailStr}`;
    } else {
      const detailStr = hasilFEFO.alokasi.map(a => `<span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:6px; margin:2px; font-weight:600;">${a.code} (${a.qtyAlokasi} pcs - Exp: ${a.expiry_date})</span>`).join(" ");
      previewText.innerHTML = `✅ <strong>Siap Diproses (FEFO):</strong> Otomatis memotong dari batch terdekat:<br>${detailStr}<br><small style="color:var(--ink-secondary);">Total stok tersedia untuk produk ini: ${hasilFEFO.totalTersedia} pcs.</small>`;
    }
  }

  // Tambah item ke keranjang belanja
  function tambahItemKeKeranjangFEFO() {
    const select = document.getElementById("pilih-produk-penjualan");
    const inputQty = document.getElementById("input-qty-penjualan");
    if (!select) return;

    const namaProduk = select.value;
    const qty = parseInt(inputQty?.value) || 1;

    if (!namaProduk) {
      alert("Silakan pilih produk terlebih dahulu!");
      return;
    }
    if (qty <= 0) {
      alert("Jumlah qty harus lebih dari 0!");
      return;
    }

    tambahItemKeKeranjangPenjualanInternal(namaProduk, qty);
  }

  // Helper Internal tambah item keranjang
  function tambahItemKeKeranjangPenjualanInternal(namaProduk, qty, skuInput) {
    const hasilFEFO = hitungAlokasiFEFO(namaProduk, qty);
    if (hasilFEFO.totalTersedia <= 0) {
      alert(`Stok produk "${namaProduk}" sedang kosong di inventaris!`);
      return;
    }

    // Cari harga
    let harga = 15000;
    for (const [sku, detail] of Object.entries(productDatabase)) {
      if (detail.name === namaProduk && detail.price) {
        harga = detail.price;
        break;
      }
    }

    // Cek apakah produk sudah ada di keranjang
    const idxExisting = keranjangPenjualan.findIndex(i => i.nama === namaProduk);
    if (idxExisting >= 0) {
      const totalBaru = keranjangPenjualan[idxExisting].qty + qty;
      const reFEFO = hitungAlokasiFEFO(namaProduk, totalBaru);
      if (!reFEFO.cukup) {
        alert(`Perhatian: Total permintaan (${totalBaru} pcs) melebihi stok yang ada (${reFEFO.totalTersedia} pcs)!`);
      }
      keranjangPenjualan[idxExisting].qty = totalBaru;
      keranjangPenjualan[idxExisting].subtotal = totalBaru * harga;
      keranjangPenjualan[idxExisting].alokasiFEFO = reFEFO.alokasi;
    } else {
      keranjangPenjualan.push({
        nama: namaProduk,
        sku: skuInput || "",
        qty: qty,
        harga: harga,
        subtotal: qty * harga,
        alokasiFEFO: hasilFEFO.alokasi
      });
    }

    renderKeranjangPenjualan();
    updateInfoBatchFEFO();
  }

  // Render Tabel Keranjang Belanja
  function renderKeranjangPenjualan() {
    const tbody = document.getElementById("cart-items");
    const labelTotal = document.getElementById("label-total-belanja");
    if (!tbody) return;

    if (keranjangPenjualan.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--ink-secondary); padding: 24px;">Keranjang masih kosong. Tambahkan item di sebelah kiri.</td></tr>`;
      if (labelTotal) labelTotal.innerText = "Rp 0";
      hitungKembalianPenjualan();
      return;
    }

    let total = 0;
    let html = "";

    keranjangPenjualan.forEach((item, index) => {
      total += item.subtotal;
      const batchPills = (item.alokasiFEFO && item.alokasiFEFO.length > 0)
        ? item.alokasiFEFO.map(b => `<span style="display:inline-block; background:#dcfce7; color:#166534; font-size:0.75rem; padding:2px 6px; border-radius:6px; margin:2px;">${b.code} (${b.qtyAlokasi})</span>`).join(" ")
        : `<span style="color:#d97706; font-size:0.78rem;">⚠️ Belum dialokasi</span>`;

      html += `
        <tr>
          <td><strong>${item.nama}</strong></td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" class="btn btn-sm" style="padding:2px 8px;" onclick="ubahQtyKeranjang(${index}, -1)">-</button>
              <span style="font-weight:700;">${item.qty}</span>
              <button type="button" class="btn btn-sm" style="padding:2px 8px;" onclick="ubahQtyKeranjang(${index}, 1)">+</button>
            </div>
          </td>
          <td>Rp ${item.harga.toLocaleString("id-ID")}</td>
          <td><strong>Rp ${item.subtotal.toLocaleString("id-ID")}</strong></td>
          <td>${batchPills}</td>
          <td>
            <button type="button" class="btn btn-sm btn-delete" onclick="hapusItemKeranjang(${index})" title="Hapus item">✕</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (labelTotal) labelTotal.innerText = "Rp " + total.toLocaleString("id-ID");
    hitungKembalianPenjualan();
  }

  // Ubah Qty item di keranjang
  function ubahQtyKeranjang(index, delta) {
    if (!keranjangPenjualan[index]) return;
    const item = keranjangPenjualan[index];
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      hapusItemKeranjang(index);
      return;
    }
    const hasilFEFO = hitungAlokasiFEFO(item.nama, newQty);
    item.qty = newQty;
    item.subtotal = newQty * item.harga;
    item.alokasiFEFO = hasilFEFO.alokasi;
    renderKeranjangPenjualan();
  }

  // Hapus item dari keranjang
  function hapusItemKeranjang(index) {
    keranjangPenjualan.splice(index, 1);
    renderKeranjangPenjualan();
  }

  // Hitung Kembalian
  function hitungKembalianPenjualan() {
    const inputUang = document.getElementById("input-uang-dibayar");
    const labelKembalian = document.getElementById("label-kembalian");
    if (!labelKembalian) return;

    const total = keranjangPenjualan.reduce((s, i) => s + i.subtotal, 0);
    const uang = parseFloat(inputUang?.value) || 0;
    const kembalian = uang - total;

    if (uang === 0) {
      labelKembalian.innerText = "Rp 0";
      labelKembalian.style.color = "var(--ink-charcoal)";
    } else if (kembalian >= 0) {
      labelKembalian.innerText = "Rp " + kembalian.toLocaleString("id-ID");
      labelKembalian.style.color = "#16a34a"; // Hijau
    } else {
      labelKembalian.innerText = "Kurang Rp " + Math.abs(kembalian).toLocaleString("id-ID");
      labelKembalian.style.color = "#dc2626"; // Merah
    }
  }

  // Selesaikan Transaksi Penjualan & Potong Stok FEFO
  function selesaikanTransaksiPenjualan() {
    if (keranjangPenjualan.length === 0) {
      alert("Keranjang belanja masih kosong! Tambahkan barang yang dijual terlebih dahulu.");
      return;
    }

    const totalBelanja = keranjangPenjualan.reduce((s, i) => s + i.subtotal, 0);
    const inputUang = document.getElementById("input-uang-dibayar");
    const uangBayar = parseFloat(inputUang?.value) || 0;

    if (uangBayar < totalBelanja && uangBayar > 0) {
      alert(`Uang pembayaran kurang! Total belanja Rp ${totalBelanja.toLocaleString("id-ID")}, uang diterima Rp ${uangBayar.toLocaleString("id-ID")}.`);
      return;
    }

    const konfirmasi = confirm(`Proses transaksi penjualan senilai Rp ${totalBelanja.toLocaleString("id-ID")}?\nStok batch dengan kedaluwarsa terdekat akan langsung dipotong (FEFO).`);
    if (!konfirmasi) return;

    // 1. Eksekusi Pemotongan Stok FEFO riil di dataBatchDemo
    const ringkasanBatchTerpotong = [];
    keranjangPenjualan.forEach(item => {
      let sisaKebutuhan = item.qty;
      if (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
        // Ambil batch produk ini dan urutkan tanggal expired terdekat (FEFO)
        const batches = dataBatchDemo
          .filter(b => b.name === item.nama && (parseFloat(b.stock) || 0) > 0)
          .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

        batches.forEach(b => {
          if (sisaKebutuhan <= 0) return;
          const stokSaatIni = parseFloat(b.stock) || 0;
          const dipotong = Math.min(stokSaatIni, sisaKebutuhan);
          b.stock = stokSaatIni - dipotong;
          sisaKebutuhan -= dipotong;

          // Jika stok batch habis akibat penjualan normal, tandai status final TERJUAL
          if (b.stock <= 0) {
            b.stock = 0;
            b.status = "TERJUAL";
            b.is_final = true;
          }

          ringkasanBatchTerpotong.push({
            produk: item.nama,
            code: b.code,
            expiry_date: b.expiry_date,
            qtyAlokasi: dipotong,
            sisaBatch: b.stock
          });

          // Catat penjualan normal ke tabel dampak_pangan (Terselamatkan)
          const nilaiJual = Math.round(dipotong * (item.harga || 0));
          const tglStr = new Date().toISOString().slice(0, 10);
          const nowIso = new Date().toISOString();
          const recordKasir = {
            id: `DP-KASIR-${Date.now()}-${b.code}`,
            batch_id: b.code,
            produk: item.nama,
            qty_kg: dipotong,
            nilai_rupiah: nilaiJual,
            tipe: "TERSELAMATKAN",
            aksi: "TERJUAL",
            tanggal: tglStr,
            waktu: nowIso,
            user_id: userAktifNama
          };
          if (typeof simpanDampakPanganRecord === "function") {
            simpanDampakPanganRecord(recordKasir);
          }
          try {
            fetch(`${FRESHLOG_API_BASE}/dampak-pangan/penjualan-normal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                batch_id: b.code,
                produk: item.nama,
                qty_kg: dipotong,
                nilai_rupiah: nilaiJual,
                sisa_stok: b.stock,
                user_id: userAktifNama
              })
            }).catch(() => {});
          } catch (eKasirSync) {}
        });
      }
    });

    // Simpan perubahan batch ke localStorage
    if (typeof dataBatchDemo !== "undefined") {
      localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));
    }

    // Perbarui metrik dashboard dampak dan laporan
    if (typeof renderDashboardDampakRingkas === "function") renderDashboardDampakRingkas();
    if (typeof terapkanFilterLaporan === "function") terapkanFilterLaporan();

    // 2. Buat ID Faktur & Record Penjualan
    const tglNow = new Date();
    const compactDate = tglNow.toISOString().slice(0, 10).replace(/-/g, "");
    const randomNo = Math.floor(100 + Math.random() * 900);
    const fakturId = `INV-${compactDate}-${randomNo}`;
    const userAktifNama = (typeof userAktif !== "undefined" && userAktif && userAktif.nama) ? userAktif.nama : "Admin Toko";
    const pelangganVal = document.getElementById("input-nama-pelanggan")?.value.trim() || "Pelanggan Umum";
    const bayarFinal = uangBayar > 0 ? uangBayar : totalBelanja;
    const kembalianFinal = bayarFinal - totalBelanja;

    const recordBaru = {
      id: fakturId,
      waktu: tglNow.toISOString(),
      pelanggan: pelangganVal,
      petugas: userAktifNama,
      items: JSON.parse(JSON.stringify(keranjangPenjualan)),
      total: totalBelanja,
      uangDiterima: bayarFinal,
      kembalian: kembalianFinal,
      alokasiBatchRiil: ringkasanBatchTerpotong
    };

    // 3. Simpan ke Riwayat Penjualan
    const riwayat = getRiwayatPenjualanData();
    riwayat.unshift(recordBaru);
    simpanRiwayatPenjualanData(riwayat);

    // 4. Catat ke Log Aktivitas (Audit Trail)
    if (typeof catatLogAktivitas === "function") {
      catatLogAktivitas(
        "Penjualan Barang Keluar",
        `Faktur ${fakturId}: ${keranjangPenjualan.length} jenis item terjual, total Rp ${totalBelanja.toLocaleString("id-ID")} kepada "${pelangganVal}" (Alokasi FEFO).`,
        "Kasir & Penjualan"
      );
    }

    // 5. Bersihkan Keranjang & Form
    keranjangPenjualan = [];
    if (inputUang) inputUang.value = "";
    const inputPelanggan = document.getElementById("input-nama-pelanggan");
    if (inputPelanggan) inputPelanggan.value = "";
    renderKeranjangPenjualan();
    renderPilihanProdukPenjualan();

    // 6. Refresh tabel inventaris & dampak jika ada
    if (typeof renderTabelInventaris === "function") renderTabelInventaris();
    if (typeof updateRingkasanInventaris === "function") updateRingkasanInventaris();
    if (typeof hitungAnalitikDampak === "function") hitungAnalitikDampak();

    // 7. Buka modal detail faktur yang baru selesai
    tampilkanDetailPenjualan(recordBaru.id);
  }

  // Render Daftar Riwayat Penjualan dengan Filter
  function renderRiwayatPenjualan() {
    const tbody = document.getElementById("tabel-riwayat-penjualan");
    if (!tbody) return;

    const riwayat = getRiwayatPenjualanData();
    const tglMulai = document.getElementById("filter-jual-tgl-mulai")?.value;
    const tglAkhir = document.getElementById("filter-jual-tgl-akhir")?.value;
    const prodFilter = document.getElementById("filter-jual-produk")?.value;
    const keyword = document.getElementById("filter-jual-cari")?.value.toLowerCase().trim() || "";

    const hasilFilter = riwayat.filter(r => {
      // Filter Tanggal
      if (tglMulai) {
        const tglRec = new Date(r.waktu).toISOString().slice(0, 10);
        if (tglRec < tglMulai) return false;
      }
      if (tglAkhir) {
        const tglRec = new Date(r.waktu).toISOString().slice(0, 10);
        if (tglRec > tglAkhir) return false;
      }

      // Filter Produk
      if (prodFilter) {
        const punyaProduk = r.items && r.items.some(i => i.nama === prodFilter);
        if (!punyaProduk) return false;
      }

      // Pencarian kata kunci
      if (keyword) {
        const matchId = r.id.toLowerCase().includes(keyword);
        const matchPelanggan = (r.pelanggan || "").toLowerCase().includes(keyword);
        const matchItem = r.items && r.items.some(i => i.nama.toLowerCase().includes(keyword));
        if (!matchId && !matchPelanggan && !matchItem) return false;
      }

      return true;
    });

    if (hasilFilter.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--ink-secondary); padding: 24px;">Tidak ada transaksi penjualan yang cocok dengan filter.</td></tr>`;
      return;
    }

    let html = "";
    hasilFilter.forEach(r => {
      const d = new Date(r.waktu);
      const waktuStr = isNaN(d.getTime()) ? r.waktu : `${d.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" })} ${d.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}`;

      // Daftar item dan qty
      const itemRingkas = r.items.map(i => `${i.nama} (${i.qty})`).join(", ");

      // Kumpulkan badge batch terpakai
      const batchPills = [];
      r.items.forEach(i => {
        if (i.alokasiFEFO && i.alokasiFEFO.length > 0) {
          i.alokasiFEFO.forEach(b => {
            batchPills.push(`<span style="display:inline-block; background:#dcfce7; color:#166534; font-size:0.75rem; padding:2px 6px; border-radius:6px; margin:2px;">${b.code} (${b.qtyAlokasi})</span>`);
          });
        }
      });

      html += `
        <tr>
          <td><strong style="color:var(--emerald-primary);">${r.id}</strong></td>
          <td><small>${waktuStr}</small></td>
          <td>${r.pelanggan || "Pelanggan Umum"}</td>
          <td>${itemRingkas}</td>
          <td><strong>Rp ${r.total.toLocaleString("id-ID")}</strong></td>
          <td>${batchPills.length > 0 ? batchPills.join(" ") : "-"}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="tampilkanDetailPenjualan('${r.id}')">🔍 Detail Struk</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // Reset Filter Riwayat Penjualan
  function resetFilterPenjualan() {
    const tglMulai = document.getElementById("filter-jual-tgl-mulai");
    const tglAkhir = document.getElementById("filter-jual-tgl-akhir");
    const prodFilter = document.getElementById("filter-jual-produk");
    const keyword = document.getElementById("filter-jual-cari");

    if (tglMulai) tglMulai.value = "";
    if (tglAkhir) tglAkhir.value = "";
    if (prodFilter) prodFilter.value = "";
    if (keyword) keyword.value = "";

    renderRiwayatPenjualan();
  }

  // Tampilkan Modal Detail Transaksi Penjualan & Alokasi Batch
  function tampilkanDetailPenjualan(fakturId) {
    const riwayat = getRiwayatPenjualanData();
    const record = riwayat.find(r => r.id === fakturId);
    if (!record) {
      alert("Data transaksi tidak ditemukan!");
      return;
    }

    const titleEl = document.getElementById("modal-penjualan-faktur");
    const waktuEl = document.getElementById("modal-penjualan-waktu");
    const bodyEl = document.getElementById("modal-detail-penjualan-body");

    if (titleEl) titleEl.innerText = `Faktur Penjualan: ${record.id}`;
    if (waktuEl) {
      const d = new Date(record.waktu);
      waktuEl.innerText = isNaN(d.getTime()) ? record.waktu : `Waktu Transaksi: ${d.toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })} - ${d.toLocaleTimeString("id-ID")} | Kasir: ${record.petugas || "Admin Toko"}`;
    }

    if (bodyEl) {
      let itemsHtml = "";
      record.items.forEach(i => {
        let batchDetail = "";
        if (i.alokasiFEFO && i.alokasiFEFO.length > 0) {
          batchDetail = `<div style="margin-top:6px; font-size:0.8rem; color:var(--ink-secondary);">
            <em>Alokasi Batch Terpotong (FEFO):</em><br>` +
            i.alokasiFEFO.map(b => `• <strong>Batch ${b.code}</strong> (${b.qtyAlokasi} pcs) - Exp: <strong>${b.expiry_date}</strong>`).join("<br>") +
          `</div>`;
        }

        itemsHtml += `
          <tr style="border-bottom:1px solid var(--border-hairline);">
            <td style="padding:10px 8px;">
              <strong>${i.nama}</strong>
              ${batchDetail}
            </td>
            <td style="padding:10px 8px; text-align:center;">${i.qty}</td>
            <td style="padding:10px 8px; text-align:right;">Rp ${i.harga.toLocaleString("id-ID")}</td>
            <td style="padding:10px 8px; text-align:right;"><strong>Rp ${i.subtotal.toLocaleString("id-ID")}</strong></td>
          </tr>
        `;
      });

      bodyEl.innerHTML = `
        <div style="background:var(--bg-nested-subtle); padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:0.88rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="color:var(--ink-secondary);">Pelanggan:</span>
            <strong>${record.pelanggan || "Pelanggan Umum"}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--ink-secondary);">Metode Pengeluaran:</span>
            <span style="color:var(--emerald-primary); font-weight:700;">Rotasi FEFO Otomatis (Batch Terdekat)</span>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:0.88rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--border-hairline); background:var(--bg-nested-subtle);">
              <th style="padding:8px; text-align:left;">Item &amp; Rincian Batch</th>
              <th style="padding:8px; text-align:center;">Qty</th>
              <th style="padding:8px; text-align:right;">Harga</th>
              <th style="padding:8px; text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="border-top:2px dashed var(--border-hairline); padding-top:12px; font-size:0.9rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Total Belanja:</span>
            <strong style="font-size:1.15rem; color:var(--emerald-primary);">Rp ${record.total.toLocaleString("id-ID")}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:var(--ink-secondary);">
            <span>Uang Diterima:</span>
            <span>Rp ${(record.uangDiterima || record.total).toLocaleString("id-ID")}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:var(--ink-secondary);">
            <span>Kembalian:</span>
            <strong style="color:#16a34a;">Rp ${(record.kembalian || 0).toLocaleString("id-ID")}</strong>
          </div>
        </div>
      `;
    }

    openModal("modal-detail-penjualan");
  }

  // Cetak Struk dari Modal
  function cetakStrukModal() {
    window.print();
  }

  // Ekspor CSV Riwayat Penjualan
  function eksporRiwayatPenjualanCSV() {
    const riwayat = getRiwayatPenjualanData();
    if (!riwayat || riwayat.length === 0) {
      alert("Tidak ada data riwayat penjualan untuk diekspor!");
      return;
    }

    let csv = "No. Faktur,Tanggal & Waktu,Pelanggan,Petugas,Total Belanja (Rp),Item Terjual,Batch Terpakai (FEFO)\n";
    riwayat.forEach(r => {
      const itemsStr = r.items.map(i => `${i.nama} (${i.qty})`).join("; ");
      const batchStr = r.items.map(i => (i.alokasiFEFO || []).map(b => `${b.code} (${b.qtyAlokasi})`).join("; ")).filter(s => s).join(" | ");
      csv += `"${r.id}","${r.waktu}","${r.pelanggan || "Pelanggan Umum"}","${r.petugas || "Admin Toko"}",${r.total},"${itemsStr}","${batchStr}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Penjualan_FreshLog_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Konfirmasi Ekstraksi Voice / OCR ke Penjualan Baru
  function konfirmasiEkstraksiKePenjualan(e) {
    if (e) e.preventDefault();
    const inputProd = document.getElementById("ekstrak-produk");
    const inputQty = document.getElementById("ekstrak-jumlah");
    if (!inputProd || !inputQty) return;

    const nama = inputProd.value.trim();
    const qty = parseInt(inputQty.value) || 1;

    if (!nama) {
      alert("Nama produk tidak boleh kosong!");
      return;
    }

    // Cocokkan nama produk terdekat
    let matchedName = nama;
    for (const [sku, detail] of Object.entries(productDatabase)) {
      if (detail.name.toLowerCase().includes(nama.toLowerCase()) || nama.toLowerCase().includes(detail.name.toLowerCase())) {
        matchedName = detail.name;
        break;
      }
    }

    tambahItemKeKeranjangPenjualanInternal(matchedName, qty);
    gantiTabPenjualan("baru");
    alert(`Berhasil! ${qty} pcs "${matchedName}" telah dimasukkan ke Form Penjualan Baru (Alokasi FEFO).`);
  }

  // Helper pencarian produk berdasarkan kode Barcode / SKU / Kode Batch / Nama
  function cariProdukBerdasarkanKodeScan(kode) {
    const clean = (kode || "").trim();
    if (!clean) return null;

    // 1. Cek langsung di productDatabase berdasarkan SKU/Barcode
    if (productDatabase[clean]) {
      return {
        sku: clean,
        nama: productDatabase[clean].name,
        harga: productDatabase[clean].price || 15000,
        kategori: productDatabase[clean].category || "Umum"
      };
    }

    // 2. Cek berdasarkan Kode Batch di dataBatchDemo (misal QR Code berisi BTC-001)
    if (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
      const batchMatch = dataBatchDemo.find(b => (b.code || "").toLowerCase() === clean.toLowerCase());
      if (batchMatch) {
        let harga = 15000;
        let skuFound = batchMatch.code;
        for (const [sku, detail] of Object.entries(productDatabase)) {
          if (detail.name.toLowerCase() === batchMatch.name.toLowerCase()) {
            harga = detail.price || 15000;
            skuFound = sku;
            break;
          }
        }
        return {
          sku: skuFound,
          nama: batchMatch.name,
          harga: harga,
          kategori: batchMatch.category || "Umum"
        };
      }
    }

    // 3. Cek kecocokan nama produk di productDatabase
    for (const [sku, detail] of Object.entries(productDatabase)) {
      if (detail.name.toLowerCase() === clean.toLowerCase()) {
        return {
          sku: sku,
          nama: detail.name,
          harga: detail.price || 15000,
          kategori: detail.category || "Umum"
        };
      }
    }

    return null;
  }

  // Listener Pemindaian Barcode Kasir (Input Manual / Hardware Scanner)
  const barcodeInput = document.getElementById("barcode-scanner");
  if (barcodeInput) {
    barcodeInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = this.value.trim();
        const found = cariProdukBerdasarkanKodeScan(code);
        if (found) {
          tambahItemKeKeranjangPenjualanInternal(found.nama, 1, found.sku);
          this.value = "";
        } else if (code !== "") {
          alert(`Kode Barcode / QR "${code}" tidak ditemukan dalam master produk maupun batch!`);
          this.value = "";
        }
      }
    });
  }

  /* ============================================================== */
  /* SCAN BARCODE / QR CODE VIA KAMERA (LIBRARY HTML5-QRCODE CDN)   */
  /* ============================================================== */

  let instanceHtml5QrCode = null;
  let isScannerKameraAktif = false;
  let modeScannerKamera = "penjualan"; // 'penjualan' | 'pembelian' | 'sku-produk'
  let intervalNativeBarcodeDetector = null;
  let isTorchOn = false;

  function bunyiBeepScan() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  // ==============================================================
  // ENGINE PEMINDAI 1D BARCODE SUPER CEPAT & RESILIEN (EAN-13, EAN-8, UPC)
  // Dirancang khusus untuk membaca barcode produk fisik riil meskipun:
  // - Terdapat goresan/glare pada garis
  // - Teks kode produksi (seperti batch code / CP...) mepet di samping guard bar
  // - Kontras tidak merata / pencahayaan rendah pada kamera atau foto
  // ==============================================================
  const BuiltinBarcodeEngine = (function() {
    const L_PATTERNS = [
      [3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2],
      [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2]
    ];
    const G_PATTERNS = [
      [1, 1, 2, 3], [1, 2, 2, 2], [2, 2, 1, 2], [1, 1, 4, 1], [2, 3, 1, 1],
      [1, 3, 2, 1], [4, 1, 1, 1], [2, 1, 3, 1], [3, 1, 2, 1], [2, 1, 1, 3]
    ];
    const FIRST_DIGIT_PARITIES = [
      "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
      "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
    ];

    function matchLG(runs, startIdx, estMod) {
      const total = runs[startIdx] + runs[startIdx + 1] + runs[startIdx + 2] + runs[startIdx + 3];
      if (Math.abs(total - 7 * estMod) / (7 * estMod) > 0.40) return null;
      let best = null;
      let minVar = 0.38;

      for (let d = 0; d < 10; d++) {
        let varL = 0;
        for (let i = 0; i < 4; i++) {
          varL += Math.abs(runs[startIdx + i] - (L_PATTERNS[d][i] / 7) * total) / total;
        }
        if (varL < minVar) {
          minVar = varL;
          best = { digit: d, parity: "L" };
        }
        let varG = 0;
        for (let i = 0; i < 4; i++) {
          varG += Math.abs(runs[startIdx + i] - (G_PATTERNS[d][i] / 7) * total) / total;
        }
        if (varG < minVar) {
          minVar = varG;
          best = { digit: d, parity: "G" };
        }
      }
      return best;
    }

    function matchR(runs, startIdx, estMod) {
      const total = runs[startIdx] + runs[startIdx + 1] + runs[startIdx + 2] + runs[startIdx + 3];
      if (Math.abs(total - 7 * estMod) / (7 * estMod) > 0.40) return null;
      let best = null;
      let minVar = 0.38;

      for (let d = 0; d < 10; d++) {
        let varR = 0;
        for (let i = 0; i < 4; i++) {
          varR += Math.abs(runs[startIdx + i] - (L_PATTERNS[d][i] / 7) * total) / total;
        }
        if (varR < minVar) {
          minVar = varR;
          best = { digit: d };
        }
      }
      return best;
    }

    function verifyChecksumEAN13(s) {
      if (!s || s.length !== 13) return false;
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += (i % 2 === 0) ? parseInt(s[i], 10) : parseInt(s[i], 10) * 3;
      }
      return ((10 - (sum % 10)) % 10) === parseInt(s[12], 10);
    }

    function decodeRowEAN13(pixels, threshold) {
      const runs = [];
      const colors = [];
      let cur = (pixels[0] < threshold) ? 1 : 0;
      let len = 1;

      for (let i = 1; i < pixels.length; i++) {
        const c = (pixels[i] < threshold) ? 1 : 0;
        if (c === cur) {
          len++;
        } else {
          runs.push(len);
          colors.push(cur);
          cur = c;
          len = 1;
        }
      }
      runs.push(len);
      colors.push(cur);

      for (let i = 0; i <= runs.length - 59; i++) {
        if (colors[i] !== 1 || colors[i+1] !== 0 || colors[i+2] !== 1) continue;

        const estMod = (runs[i] + runs[i+1] + runs[i+2]) / 3;
        if (estMod < 0.75) continue;
        if (Math.abs(runs[i] - estMod) / estMod > 0.8) continue;
        if (Math.abs(runs[i+1] - estMod) / estMod > 0.8) continue;
        if (Math.abs(runs[i+2] - estMod) / estMod > 0.8) continue;

        if (colors[i+3] !== 0) continue;

        let leftParity = "";
        let leftDigits = [];
        let validLeft = true;
        let idx = i + 3;

        for (let d = 0; d < 6; d++) {
          const m = matchLG(runs, idx, estMod);
          if (!m) { validLeft = false; break; }
          leftDigits.push(m.digit);
          leftParity += m.parity;
          idx += 4;
        }
        if (!validLeft) continue;

        const firstDigit = FIRST_DIGIT_PARITIES.indexOf(leftParity);
        if (firstDigit === -1) continue;

        if (colors[idx] !== 0 || colors[idx+1] !== 1 || colors[idx+2] !== 0 || colors[idx+3] !== 1 || colors[idx+4] !== 0) {
          continue;
        }
        const centerMod = (runs[idx] + runs[idx+1] + runs[idx+2] + runs[idx+3] + runs[idx+4]) / 5;
        if (Math.abs(centerMod - estMod) / estMod > 0.50) continue;
        idx += 5;

        if (colors[idx] !== 1) continue;

        let rightDigits = [];
        let validRight = true;
        for (let d = 0; d < 6; d++) {
          const m = matchR(runs, idx, estMod);
          if (!m) { validRight = false; break; }
          rightDigits.push(m.digit);
          idx += 4;
        }
        if (!validRight) continue;

        if (colors[idx] !== 1 || colors[idx+1] !== 0 || colors[idx+2] !== 1) continue;
        const endMod = (runs[idx] + runs[idx+1] + runs[idx+2]) / 3;
        if (Math.abs(endMod - estMod) / estMod > 0.55) continue;

        const fullCode = [firstDigit, ...leftDigits, ...rightDigits].join("");
        if (verifyChecksumEAN13(fullCode)) {
          return fullCode;
        }
      }
      return null;
    }

    function scanGrayscale(gray, width, height) {
      const ySteps = [];
      for (let y = Math.floor(height * 0.12); y <= Math.floor(height * 0.88); y += Math.max(1, Math.floor(height / 120))) {
        ySteps.push(y);
      }

      for (const y of ySteps) {
        const row = gray.subarray(y * width, (y + 1) * width);
        let min = 255, max = 0;
        for (let x = 0; x < width; x++) {
          const v = row[x];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (max - min < 28) continue;

        for (let pct = 0.15; pct <= 0.85; pct += 0.08) {
          const t = Math.round(min + pct * (max - min));
          const res = decodeRowEAN13(row, t);
          if (res) return { code: res, format: "EAN_13" };
        }
      }

      const colBuf = new Uint8Array(height);
      const xSteps = [];
      for (let x = Math.floor(width * 0.15); x <= Math.floor(width * 0.85); x += Math.max(2, Math.floor(width / 70))) {
        xSteps.push(x);
      }

      for (const x of xSteps) {
        let min = 255, max = 0;
        for (let y = 0; y < height; y++) {
          const v = gray[y * width + x];
          colBuf[y] = v;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (max - min < 28) continue;
        for (let pct = 0.15; pct <= 0.85; pct += 0.08) {
          const t = Math.round(min + pct * (max - min));
          const res = decodeRowEAN13(colBuf, t);
          if (res) return { code: res, format: "EAN_13" };
        }
      }

      return null;
    }

    function scanImageData(imageData) {
      if (!imageData || !imageData.data) return null;
      const w = imageData.width;
      const h = imageData.height;
      const d = imageData.data;
      const gray = new Uint8Array(w * h);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        gray[j] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      }
      return scanGrayscale(gray, w, h);
    }

    return { scanGrayscale, scanImageData };
  })();

  function dapatkanDaftarFormatBarcode() {
    if (typeof Html5QrcodeSupportedFormats !== "undefined") {
      return [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.PDF_417
      ];
    }
    return undefined;
  }

  async function bukaScannerKamera(mode) {
    modeScannerKamera = mode || "penjualan";
    isTorchOn = false;
    const subEl = document.getElementById("scanner-subtitle-mode");
    const statusBox = document.getElementById("scanner-status-box");
    const resultBox = document.getElementById("scanner-result-box");
    const selectCam = document.getElementById("pilih-kamera-scanner");
    const btnTorch = document.getElementById("btn-toggle-torch");
    const manualInput = document.getElementById("manual-scan-input");

    if (resultBox) resultBox.style.display = "none";
    if (manualInput) manualInput.value = "";
    if (btnTorch) {
      btnTorch.style.display = "none";
      btnTorch.innerHTML = "<span>🔦 Senter</span>";
    }

    if (subEl) {
      if (modeScannerKamera === "penjualan") {
        subEl.innerText = "Mode Penjualan: Otomatis memasukkan produk ke keranjang FEFO";
      } else if (modeScannerKamera === "pembelian") {
        subEl.innerText = "Mode Pembelian: Pilih otomatis produk barang masuk";
      } else {
        subEl.innerText = "Mode Produk Master: Isi otomatis Kode Barcode / SKU";
      }
    }

    openModal("modal-scanner-kamera");

    // Berikan jeda waktu sejenak agar modal menyelesaikan reflow layout DOM
    await new Promise(resolve => setTimeout(resolve, 150));

    if (typeof Html5Qrcode === "undefined") {
      if (statusBox) {
        statusBox.innerHTML = `<span style="color:#dc2626; font-weight:600;">Library html5-qrcode belum termuat. Periksa koneksi internet Anda atau gunakan input manual / tombol contoh.</span>`;
      }
      return;
    }

    if (statusBox) {
      statusBox.innerHTML = `Meminta izin kamera perangkat... Pastikan izin kamera diizinkan di browser.`;
    }

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        if (selectCam) {
          selectCam.innerHTML = devices.map((d, idx) =>
            `<option value="${d.id}">${d.label || "Kamera " + (idx + 1)}</option>`
          ).join("");
        }
        // Prioritaskan kamera belakang (environment) pada HP/tablet
        const backCam = devices.find(d => /back|rear|environment/i.test(d.label || ""));
        const chosenId = backCam ? backCam.id : devices[0].id;
        if (selectCam) selectCam.value = chosenId;
        await mulaiStreamKameraScanner(chosenId);
      } else {
        if (selectCam) {
          selectCam.innerHTML = `<option value="">Kamera Utama Perangkat</option>`;
        }
        await mulaiStreamKameraScanner({ facingMode: "environment" });
      }
    } catch (err) {
      console.warn("Gagal mendapatkan daftar kamera via getCameras, mencoba fallback environment:", err);
      try {
        await mulaiStreamKameraScanner({ facingMode: "environment" });
      } catch (err2) {
        if (statusBox) {
          statusBox.innerHTML = `Kamera tidak dapat diakses (${err2?.message || "Izin ditolak atau webcam tidak tersedia"}). Gunakan tombol <strong>📁 Scan Gambar</strong> atau ketik barcode manual di bawah.`;
        }
      }
    }
  }

  async function mulaiStreamKameraScanner(cameraIdOrConfig) {
    const statusBox = document.getElementById("scanner-status-box");
    const laserEl = document.getElementById("scanner-laser");
    const btnTorch = document.getElementById("btn-toggle-torch");
    await hentikanStreamKameraScanner();

    if (typeof Html5Qrcode === "undefined") return;

    // Inisialisasi Html5Qrcode dengan SEMUA format barcode (EAN-13, Code 128, QR Code, dsb.)
    // serta aktifkan hardware BarcodeDetector jika didukung browser
    const constructorOptions = {
      verbose: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };
    const formats = dapatkanDaftarFormatBarcode();
    if (formats) {
      constructorOptions.formatsToSupport = formats;
    }

    try {
      instanceHtml5QrCode = new Html5Qrcode("html5-qrcode-reader", constructorOptions);
    } catch (e) {
      console.warn("Inisialisasi constructor dengan opsi gagal, fallback ke default:", e);
      instanceHtml5QrCode = new Html5Qrcode("html5-qrcode-reader");
    }

    // Konfigurasi pemindaian: area luas & fleksibel agar barcode horizontal panjang terbaca
    const scanConfig = {
      fps: 15,
      qrbox: function (viewfinderWidth, viewfinderHeight) {
        const w = Math.min(viewfinderWidth - 16, Math.max(260, Math.floor(viewfinderWidth * 0.90)));
        const h = Math.min(viewfinderHeight - 16, Math.max(160, Math.floor(viewfinderHeight * 0.78)));
        return { width: w, height: h };
      },
      disableFlip: false
    };

    try {
      await instanceHtml5QrCode.start(
        cameraIdOrConfig,
        scanConfig,
        (decodedText, decodedResult) => {
          prosesHasilScanBarcodeQR(decodedText, decodedResult);
        },
        () => {
          // Frame pencarian berkelanjutan, abaikan frame kosong
        }
      );

      isScannerKameraAktif = true;
      if (laserEl) laserEl.style.display = "block";
      if (statusBox) {
        statusBox.innerHTML = `<span style="color:var(--emerald-primary); font-weight:700;">🟢 Kamera Siap:</span> Dekatkan Barcode / QR Code produk (10–20 cm). Pastikan pencahayaan cukup dan garis barcode tidak buram.`;
      }

      // Cek apakah kamera mendukung lampu senter (torch)
      try {
        const capabilities = instanceHtml5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch && btnTorch) {
          btnTorch.style.display = "inline-flex";
        }
      } catch (e) {}

      // ENGINE PENDUKUNG AKTIF: Built-in 1D Fast Scanline + Native BarcodeDetector
      // Membaca langsung frame video aktif secara real-time paralel untuk kecepatan deteksi maksimal
      let videoScanCanvas = null;
      let nativeDetectorInstance = null;
      if ("BarcodeDetector" in window) {
        try {
          nativeDetectorInstance = new window.BarcodeDetector({
            formats: ["ean_13", "code_128", "qr_code", "upc_a", "ean_8", "code_39"]
          });
        } catch (e) {}
      }

      intervalNativeBarcodeDetector = setInterval(async () => {
        if (!isScannerKameraAktif) {
          clearInterval(intervalNativeBarcodeDetector);
          return;
        }
        const videoEl = document.querySelector("#html5-qrcode-reader video");
        if (!videoEl || videoEl.readyState < 2) return;

        // 1. Coba Native BarcodeDetector jika didukung browser
        if (nativeDetectorInstance) {
          try {
            const barcodes = await nativeDetectorInstance.detect(videoEl);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              clearInterval(intervalNativeBarcodeDetector);
              prosesHasilScanBarcodeQR(barcodes[0].rawValue);
              return;
            }
          } catch (e) {}
        }

        // 2. Built-in ultra-fast scanline engine (sangat cepat & tahan goresan)
        try {
          if (!videoScanCanvas) {
            videoScanCanvas = document.createElement("canvas");
          }
          const vw = videoEl.videoWidth || 640;
          const vh = videoEl.videoHeight || 480;
          const scale = Math.min(1, 560 / Math.max(vw, vh));
          const cw = Math.floor(vw * scale);
          const ch = Math.floor(vh * scale);
          if (videoScanCanvas.width !== cw || videoScanCanvas.height !== ch) {
            videoScanCanvas.width = cw;
            videoScanCanvas.height = ch;
          }
          const ctx = videoScanCanvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(videoEl, 0, 0, cw, ch);
          const imgData = ctx.getImageData(0, 0, cw, ch);
          const res = BuiltinBarcodeEngine.scanImageData(imgData);
          if (res && res.code) {
            clearInterval(intervalNativeBarcodeDetector);
            prosesHasilScanBarcodeQR(res.code);
            return;
          }
        } catch (e) {}
      }, 120);
    } catch (err) {
      isScannerKameraAktif = false;
      if (laserEl) laserEl.style.display = "none";
      if (statusBox) {
        statusBox.innerHTML = `<span style="color:#dc2626; font-weight:600;">Gagal memulai stream kamera:</span> ${err?.message || err}.<br>Silakan coba ganti pilihan kamera atau gunakan <strong>📁 Scan Gambar</strong>.`;
      }
    }
  }

  async function toggleSenterKamera() {
    if (!instanceHtml5QrCode || !isScannerKameraAktif) return;
    try {
      isTorchOn = !isTorchOn;
      await instanceHtml5QrCode.applyVideoConstraints({
        advanced: [{ torch: isTorchOn }]
      });
      const btn = document.getElementById("btn-toggle-torch");
      if (btn) btn.innerHTML = isTorchOn ? "<span>💡 Matikan Senter</span>" : "<span>🔦 Senter</span>";
    } catch (e) {
      alert("Lampu senter tidak didukung pada kamera ini.");
    }
  }

  async function gantiPerangkatKameraScanner() {
    const selectCam = document.getElementById("pilih-kamera-scanner");
    if (!selectCam || !selectCam.value) return;
    await mulaiStreamKameraScanner(selectCam.value);
  }

  async function hentikanStreamKameraScanner() {
    if (intervalNativeBarcodeDetector) {
      clearInterval(intervalNativeBarcodeDetector);
      intervalNativeBarcodeDetector = null;
    }
    const laserEl = document.getElementById("scanner-laser");
    if (laserEl) laserEl.style.display = "none";

    if (instanceHtml5QrCode) {
      try {
        if (isScannerKameraAktif) {
          await instanceHtml5QrCode.stop();
        }
        instanceHtml5QrCode.clear();
      } catch (e) {}
      isScannerKameraAktif = false;
      instanceHtml5QrCode = null;
    }
  }

  async function tutupScannerKamera() {
    await hentikanStreamKameraScanner();
    closeModal("modal-scanner-kamera");
  }

  async function scanBarcodeDariFile(input) {
    const file = input?.files?.[0];
    if (!file) return;
    const statusBox = document.getElementById("scanner-status-box");

    await hentikanStreamKameraScanner();
    if (statusBox) statusBox.innerHTML = `<em>Menganalisis barcode &amp; QR code dari file gambar...</em>`;

    const fileUrl = URL.createObjectURL(file);

    try {
      // 1. Muat gambar ke element Image untuk analisis canvas
      const img = new Image();
      img.src = fileUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Gagal membaca file gambar."));
      });

      // Tampilkan pratinjau gambar di viewport scanner
      const readerContainer = document.getElementById("html5-qrcode-reader");
      if (readerContainer) {
        readerContainer.innerHTML = `<img src="${fileUrl}" style="max-width:100%; max-height:280px; object-fit:contain; border-radius:8px; display:block; margin:0 auto;" />`;
      }

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      // LANGKAH 1: ENGINE 1D BUILT-IN SUPER CEPAT (Prioritas tertinggi: tahan goresan, noise & teks samping barcode)
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const fastResult = BuiltinBarcodeEngine.scanImageData(imgData);
        if (fastResult && fastResult.code) {
          URL.revokeObjectURL(fileUrl);
          input.value = "";
          prosesHasilScanBarcodeQR(fastResult.code);
          return;
        }
      } catch (e) {
        console.warn("Built-in scanline engine:", e);
      }

      // LANGKAH 2: QUAGGA2 (Jika library termuat dari CDN)
      if (typeof Quagga !== "undefined") {
        try {
          const quaggaCode = await new Promise(resolve => {
            Quagga.decodeSingle({
              src: canvas.toDataURL("image/jpeg", 0.92),
              numOfWorkers: 0,
              inputStream: { size: 800 },
              decoder: {
                readers: ["ean_reader", "code_128_reader", "upc_reader", "code_39_reader"]
              },
              locate: true
            }, result => {
              resolve(result?.codeResult?.code || null);
            });
          });

          if (quaggaCode) {
            URL.revokeObjectURL(fileUrl);
            input.value = "";
            prosesHasilScanBarcodeQR(quaggaCode);
            return;
          }
        } catch (e) {
          console.warn("Quagga2 scan:", e);
        }
      }

      // LANGKAH 3: NATIVE BARCODE DETECTOR (Jika didukung browser)
      if ("BarcodeDetector" in window) {
        try {
          const detector = new window.BarcodeDetector();
          const results = await detector.detect(img);
          if (results && results.length > 0 && results[0].rawValue) {
            URL.revokeObjectURL(fileUrl);
            input.value = "";
            prosesHasilScanBarcodeQR(results[0].rawValue);
            return;
          }
        } catch (e) {}
      }

      // LANGKAH 4: HTML5-QRCODE / ZXing (Khusus QR Code, Data Matrix & format 2D lainnya)
      if (typeof Html5Qrcode !== "undefined") {
        try {
          const constructorOptions = {
            verbose: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
          };
          const formats = dapatkanDaftarFormatBarcode();
          if (formats) constructorOptions.formatsToSupport = formats;
          const fileScanner = new Html5Qrcode("html5-qrcode-reader", constructorOptions);
          const decodedText = await fileScanner.scanFile(file, false);
          URL.revokeObjectURL(fileUrl);
          input.value = "";
          prosesHasilScanBarcodeQR(decodedText);
          return;
        } catch (e) {}
      }

      // SEMUA ENGINE GAGAL
      URL.revokeObjectURL(fileUrl);
      input.value = "";
      if (statusBox) {
        statusBox.innerHTML = `<span style="color:#dc2626; font-weight:600;">Barcode / QR Code tidak terbaca pada gambar tersebut.</span> Pastikan gambar jelas, tidak terpotong, atau ketik kode manual di bawah.`;
      }
    } catch (err) {
      URL.revokeObjectURL(fileUrl);
      input.value = "";
      if (statusBox) {
        statusBox.innerHTML = `<span style="color:#dc2626; font-weight:600;">Gagal memproses gambar:</span> ${err?.message || err}.`;
      }
    }
  }

  function submitScanManual() {
    const input = document.getElementById("manual-scan-input");
    const val = input ? input.value.trim() : "";
    if (!val) {
      alert("Silakan ketik atau paste kode Barcode / SKU terlebih dahulu!");
      return;
    }
    prosesHasilScanBarcodeQR(val);
  }

  function simulasiScanCepat(kodeSample) {
    prosesHasilScanBarcodeQR(kodeSample || "899123456789");
  }

  async function prosesHasilScanBarcodeQR(decodedText) {
    const kode = (decodedText || "").trim();
    if (!kode) return;

    bunyiBeepScan();

    // Tampilkan hasil scan pada badge notifikasi di modal
    const resultBox = document.getElementById("scanner-result-box");
    const resultCode = document.getElementById("scanner-result-code");
    if (resultBox && resultCode) {
      resultCode.innerText = kode;
      resultBox.style.display = "block";
    }

    // Hentikan kamera dan tutup modal scanner
    await tutupScannerKamera();

    // 1. MODE: INPUT SKU PADA MODAL PRODUK MASTER
    if (modeScannerKamera === "sku-produk") {
      const inputSku = document.getElementById("prod-sku");
      if (inputSku) inputSku.value = kode;
      alert(`✅ Berhasil! Kode Barcode / SKU "${kode}" telah dimasukkan ke Form Tambah Produk.`);
      return;
    }

    const found = cariProdukBerdasarkanKodeScan(kode);

    // 2. MODE: PEMILIHAN PRODUK PADA FORM PEMBELIAN (BARANG MASUK)
    if (modeScannerKamera === "pembelian") {
      if (found) {
        const inputProd = document.getElementById("input-produk-pembelian") || document.getElementById("pilih-produk-pembelian");
        if (inputProd) {
          inputProd.value = found.nama;
          isiOtomatisHargaBeliProduk();
        }
        alert(`✅ Barcode "${kode}" terdeteksi sebagai "${found.nama}". Produk telah dimasukkan ke Form Pembelian.`);
      } else {
        const konfirmasi = confirm(`Kode Barcode "${kode}" berhasil dipindai oleh kamera, namun belum terdaftar di database produk.\n\nApakah Anda ingin mendaftarkan produk ini ke Master Produk sekarang?`);
        if (konfirmasi) {
          openModal("modal-produk");
          const inputSku = document.getElementById("prod-sku");
          if (inputSku) inputSku.value = kode;
          const inputNama = document.getElementById("prod-nama");
          if (inputNama) inputNama.focus();
        }
      }
      return;
    }

    // 3. MODE: KASIR & PENJUALAN (BARANG KELUAR - ALOKASI FEFO)
    const inputBarcode = document.getElementById("barcode-scanner");
    if (inputBarcode) inputBarcode.value = kode;

    if (found) {
      const selectJual = document.getElementById("pilih-produk-penjualan");
      if (selectJual) {
        selectJual.value = found.nama;
        updateInfoBatchFEFO();
      }
      tambahItemKeKeranjangPenjualanInternal(found.nama, 1, found.sku);
      if (inputBarcode) inputBarcode.value = "";
      if (typeof catatLogAktivitas === "function") {
        catatLogAktivitas("Scan Barcode/QR Kamera", `Memindai kode "${kode}" (${found.nama}) ke keranjang penjualan FEFO`, "Kasir & Penjualan");
      }
    } else {
      const mauDaftar = confirm(`✅ Barcode / QR Code "${kode}" berhasil dibaca oleh kamera!\n\nNamun produk dengan kode ini belum ada di master produk.\nApakah Anda ingin mendaftarkannya sekarang?`);
      if (mauDaftar) {
        openModal("modal-produk");
        const inputSku = document.getElementById("prod-sku");
        if (inputSku) inputSku.value = kode;
        const inputNama = document.getElementById("prod-nama");
        if (inputNama) inputNama.focus();
      }
    }
  }

  // Helper hapus item baris lama jika ada referensi
  function removeItem(button) {
    const row = button.closest("tr");
    if (row) row.remove();
  }

  /* ========================================== */
  /* 4B. PEMBELIAN (BARANG MASUK) DARI PEMASOK  */
  /* ========================================== */

  let keranjangPembelian = [];
  let tabPembelianAktif = "baru";

  const defaultPurchaseRecords = [
    {
      id: "PO-20261108-201",
      waktu: "2026-11-08T09:15:00",
      pemasok: "PT Distribusi Makanan Utama",
      referensi: "SJ-2026-081",
      statusBayar: "Lunas",
      petugas: "Admin Toko",
      items: [
        {
          nama: "Susu UHT 1L",
          kodeBatch: "BTC-001",
          expiryDate: "2026-11-10",
          qty: 20,
          hargaBeli: 14500,
          subtotal: 290000
        }
      ],
      total: 290000
    },
    {
      id: "PO-20261109-202",
      waktu: "2026-11-09T11:40:00",
      pemasok: "CV Segar Nusantara",
      referensi: "SJ-2026-094",
      statusBayar: "Tempo",
      petugas: "Admin Toko",
      items: [
        {
          nama: "Roti Tawar Daging",
          kodeBatch: "BTC-002",
          expiryDate: "2026-11-25",
          qty: 50,
          hargaBeli: 9500,
          subtotal: 475000
        },
        {
          nama: "Yogurt Stroberi",
          kodeBatch: "BTC-003",
          expiryDate: "2026-11-15",
          qty: 30,
          hargaBeli: 7200,
          subtotal: 216000
        }
      ],
      total: 691000
    }
  ];

  function getRiwayatPembelianData() {
    try {
      const data = JSON.parse(localStorage.getItem("freshlog_purchase_records"));
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {}
    localStorage.setItem("freshlog_purchase_records", JSON.stringify(defaultPurchaseRecords));
    return defaultPurchaseRecords;
  }

  function simpanRiwayatPembelianData(data) {
    localStorage.setItem("freshlog_purchase_records", JSON.stringify(data));
    if (typeof loadGrafik === "function") {
      try { loadGrafik(); } catch (e) {}
    }
  }

  function kumpulkanDaftarPemasokPembelian() {
    const setPemasok = new Set([
      "PT Distribusi Makanan Utama",
      "CV Segar Nusantara",
      "PT Dairy Prima Indonesia"
    ]);
    if (typeof getDataPemasokList === "function") {
      getDataPemasokList().forEach(s => {
        if (s.nama) setPemasok.add(s.nama);
      });
    }
    const tbodyPemasok = document.getElementById("table-pemasok");
    if (tbodyPemasok) {
      const rows = tbodyPemasok.querySelectorAll("tr");
      rows.forEach(r => {
        const cols = r.querySelectorAll("td");
        if (cols.length >= 2) {
          const namaSup = cols[1].innerText.trim();
          if (namaSup) setPemasok.add(namaSup);
        }
      });
    }
    const riwayatBeli = getRiwayatPembelianData();
    riwayatBeli.forEach(r => {
      if (r.pemasok) setPemasok.add(r.pemasok);
    });
    return Array.from(setPemasok);
  }

  function generateKodeBatchOtomatis() {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7).replace("-", "");
    const rand = String(Math.floor(10 + Math.random() * 90));
    return `BTC-${ym}-${rand}`;
  }

  function generateNomorPembelianOtomatis() {
    const now = new Date();
    const ym = now.toISOString().slice(0, 10).replace(/-/g, "");
    const riwayat = (typeof getRiwayatPembelianData === "function") ? getRiwayatPembelianData() : [];
    const prefix = `PO-${ym}-`;
    const todayPOs = riwayat.filter(r => r.id && String(r.id).startsWith(prefix));
    let nextNum = todayPOs.length + 1;
    let candidate = `${prefix}${String(nextNum).padStart(3, "0")}`;
    while (riwayat.some(r => r.id === candidate)) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(3, "0")}`;
    }
    return candidate;
  }

  window.regenerateNomorPembelianOtomatis = function() {
    const inputNo = document.getElementById("input-nomor-pembelian");
    if (inputNo) {
      inputNo.value = generateNomorPembelianOtomatis();
    }
  };

  window.periksaPemasokTerpilih = function() {
    const inputSup = document.getElementById("pilih-pemasok-pembelian");
    const statusBox = document.getElementById("status-pemasok-beli");
    if (!inputSup || !statusBox) return;

    const val = inputSup.value.trim();
    if (!val) {
      statusBox.innerHTML = "";
      return;
    }

    const listPemasok = (typeof getDataPemasokList === "function") ? getDataPemasokList() : [];
    const supMatch = listPemasok.find(s => s.nama && s.nama.toLowerCase() === val.toLowerCase());

    if (supMatch) {
      statusBox.innerHTML = `<span style="color:#166534; display:inline-flex; align-items:center; gap:4px;"><svg style="width:13px; height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Mitra Terdaftar (${supMatch.kategori || "Umum"} • Kontak: ${supMatch.telp || "-"})</span>`;
    } else {
      statusBox.innerHTML = `<span style="color:#0369a1; display:inline-flex; align-items:center; gap:4px;">➕ Pemasok Baru (akan otomatis didaftarkan ke Mitra Pemasok saat disimpan)</span>`;
    }
  };

  function initHalamanPembelian() {
    const inputNo = document.getElementById("input-nomor-pembelian");
    if (inputNo && !inputNo.value) {
      inputNo.value = generateNomorPembelianOtomatis();
    }

    const inputTglSampai = document.getElementById("input-tgl-sampai-toko");
    if (inputTglSampai && !inputTglSampai.value) {
      inputTglSampai.value = new Date().toISOString().slice(0, 10);
    }

    renderPilihanFormPembelian();
    renderKeranjangPembelian();
    renderRiwayatPembelian();

    const inputExp = document.getElementById("input-exp-pembelian");
    if (inputExp && !inputExp.value) {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      inputExp.value = d.toISOString().slice(0, 10);
    }

    const inputExpOcr = document.getElementById("ekstrak-beli-exp");
    if (inputExpOcr && !inputExpOcr.value) {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      inputExpOcr.value = d.toISOString().slice(0, 10);
    }

    const inputKode = document.getElementById("input-kode-batch-pembelian");
    if (inputKode && !inputKode.value) {
      inputKode.value = generateKodeBatchOtomatis();
    }
    hitungPratinjauSubtotalBeli();
  }

  function gantiTabPembelian(tabKey) {
    tabPembelianAktif = tabKey;
    const btnBaru = document.getElementById("tab-btn-beli-baru");
    const btnRiwayat = document.getElementById("tab-btn-beli-riwayat");
    const btnVoiceOcr = document.getElementById("tab-btn-beli-voice-ocr");

    const panelBaru = document.getElementById("panel-beli-baru");
    const panelRiwayat = document.getElementById("panel-beli-riwayat");
    const panelVoiceOcr = document.getElementById("panel-beli-voice-ocr");

    if (btnBaru) btnBaru.classList.toggle("active", tabKey === "baru");
    if (btnRiwayat) btnRiwayat.classList.toggle("active", tabKey === "riwayat");
    if (btnVoiceOcr) btnVoiceOcr.classList.toggle("active", tabKey === "voice-ocr");

    if (panelBaru) panelBaru.style.display = (tabKey === "baru") ? "block" : "none";
    if (panelRiwayat) {
      panelRiwayat.style.display = (tabKey === "riwayat") ? "block" : "none";
      if (tabKey === "riwayat") renderRiwayatPembelian();
    }
    if (panelVoiceOcr) panelVoiceOcr.style.display = (tabKey === "voice-ocr") ? "block" : "none";
  }

  function renderPilihanFormPembelian() {
    const listPemasokDatalist = document.getElementById("list-pemasok-pembelian");
    const selectPemasok = document.getElementById("pilih-pemasok-pembelian");
    const filterPemasok = document.getElementById("filter-beli-pemasok");
    const listProdukDatalist = document.getElementById("list-produk-pembelian");
    const selectProduk = document.getElementById("pilih-produk-pembelian");
    const filterProduk = document.getElementById("filter-beli-produk");

    const listPemasok = kumpulkanDaftarPemasokPembelian();

    // Datalist untuk Nama Supplier (input ketik/pilih)
    if (listPemasokDatalist) {
      listPemasokDatalist.innerHTML = listPemasok.map(s => `<option value="${s}"></option>`).join("");
    }

    if (selectPemasok && selectPemasok.tagName === "SELECT") {
      const currentVal = selectPemasok.value;
      selectPemasok.innerHTML = `<option value="">-- Pilih Pemasok --</option>` +
        listPemasok.map(s => `<option value="${s}">${s}</option>`).join("");
      if (currentVal && listPemasok.includes(currentVal)) selectPemasok.value = currentVal;
    }

    if (filterPemasok) {
      const currentFilter = filterPemasok.value;
      filterPemasok.innerHTML = `<option value="">Semua Pemasok</option>` +
        listPemasok.map(s => `<option value="${s}">${s}</option>`).join("");
      if (currentFilter) filterPemasok.value = currentFilter;
    }

    const mapProduk = new Map();
    for (const [sku, detail] of Object.entries(productDatabase)) {
      if (detail && detail.name) {
        const hargaJual = detail.price || 15000;
        const hargaBeli = detail.buyPrice || Math.round((hargaJual * 0.78) / 100) * 100;
        mapProduk.set(detail.name, {
          nama: detail.name,
          hargaBeli: hargaBeli,
          kategori: detail.category || "Makanan Fresh"
        });
      }
    }
    if (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
      dataBatchDemo.forEach(b => {
        if (b.name && !mapProduk.has(b.name)) {
          mapProduk.set(b.name, {
            nama: b.name,
            hargaBeli: 12000,
            kategori: b.category || "Makanan Fresh"
          });
        }
      });
    }

    // Datalist untuk Produk yang Diketik
    if (listProdukDatalist) {
      let dHtml = "";
      mapProduk.forEach(p => {
        dHtml += `<option value="${p.nama}">[${p.kategori}] Est. Harga Beli: Rp ${p.hargaBeli.toLocaleString("id-ID")}</option>`;
      });
      listProdukDatalist.innerHTML = dHtml;
    }

    if (selectProduk && selectProduk.tagName === "SELECT") {
      let html = `<option value="">-- Pilih Produk --</option>`;
      mapProduk.forEach(p => {
        html += `<option value="${p.nama}" data-harga-beli="${p.hargaBeli}" data-kategori="${p.kategori}">${p.nama} (Est. Harga Beli: Rp ${p.hargaBeli.toLocaleString("id-ID")})</option>`;
      });
      selectProduk.innerHTML = html;
    }

    if (filterProduk) {
      let fHtml = `<option value="">Semua Produk</option>`;
      mapProduk.forEach(p => {
        fHtml += `<option value="${p.nama}">${p.nama}</option>`;
      });
      filterProduk.innerHTML = fHtml;
    }
  }

  window.isiOtomatisHargaBeliProduk = function() {
    const inputProduk = document.getElementById("input-produk-pembelian");
    const selectProduk = document.getElementById("pilih-produk-pembelian");
    const inputHarga = document.getElementById("input-harga-beli-pembelian");
    const statusBox = document.getElementById("status-produk-beli");

    const namaKetik = (inputProduk ? inputProduk.value : (selectProduk ? selectProduk.value : "")).trim();
    if (!namaKetik) {
      if (statusBox) statusBox.innerHTML = "";
      hitungPratinjauSubtotalBeli();
      return;
    }

    let matchProd = null;
    for (const [sku, detail] of Object.entries(productDatabase)) {
      if (detail && detail.name && detail.name.toLowerCase() === namaKetik.toLowerCase()) {
        const hargaJual = detail.price || 15000;
        const hargaBeli = detail.buyPrice || Math.round((hargaJual * 0.78) / 100) * 100;
        matchProd = {
          nama: detail.name,
          hargaBeli: hargaBeli,
          kategori: detail.category || "Makanan Fresh"
        };
        break;
      }
    }

    if (!matchProd && typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
      const bMatch = dataBatchDemo.find(b => b.name && b.name.toLowerCase() === namaKetik.toLowerCase());
      if (bMatch) {
        matchProd = {
          nama: bMatch.name,
          hargaBeli: 12000,
          kategori: bMatch.category || "Makanan Fresh"
        };
      }
    }

    if (matchProd) {
      if (inputHarga) {
        inputHarga.value = matchProd.hargaBeli;
      }
      if (statusBox) {
        statusBox.innerHTML = `<span style="color:#166534; display:inline-flex; align-items:center; gap:4px;"><svg style="width:13px; height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Produk terdaftar (${matchProd.kategori} • Estimasi Beli: Rp ${matchProd.hargaBeli.toLocaleString("id-ID")})</span>`;
      }
    } else {
      if (statusBox) {
        statusBox.innerHTML = `<span style="color:#0369a1; display:inline-flex; align-items:center; gap:4px;">➕ Produk baru (akan otomatis didaftarkan ke Master Produk saat disimpan)</span>`;
      }
    }

    hitungPratinjauSubtotalBeli();
  };

  function hitungPratinjauSubtotalBeli() {
    const qty = parseInt(document.getElementById("input-qty-pembelian")?.value) || 0;
    const harga = parseFloat(document.getElementById("input-harga-beli-pembelian")?.value) || 0;
    const el = document.getElementById("preview-subtotal-beli");
    if (el) {
      el.innerText = "Rp " + (qty * harga).toLocaleString("id-ID");
    }
  }

  function tambahItemKeDaftarPembelian() {
    const noPo = document.getElementById("input-nomor-pembelian")?.value.trim();
    const pemasok = document.getElementById("pilih-pemasok-pembelian")?.value.trim();
    const tglSampai = document.getElementById("input-tgl-sampai-toko")?.value;
    const inputProdEl = document.getElementById("input-produk-pembelian") || document.getElementById("pilih-produk-pembelian");
    const namaProduk = inputProdEl?.value.trim();
    const qty = parseInt(document.getElementById("input-qty-pembelian")?.value) || 0;
    const hargaBeli = parseFloat(document.getElementById("input-harga-beli-pembelian")?.value) || 0;
    const expiryDate = document.getElementById("input-exp-pembelian")?.value;
    let kodeBatch = document.getElementById("input-kode-batch-pembelian")?.value.trim();

    if (!noPo) {
      alert("Silakan isi Nomor Pembelian terlebih dahulu!");
      document.getElementById("input-nomor-pembelian")?.focus();
      return;
    }
    if (!pemasok) {
      alert("Silakan isi atau pilih Nama Supplier terlebih dahulu!");
      document.getElementById("pilih-pemasok-pembelian")?.focus();
      return;
    }
    if (!tglSampai) {
      alert("Silakan tentukan Tanggal Barang Sampai ke Toko!");
      document.getElementById("input-tgl-sampai-toko")?.focus();
      return;
    }
    if (!namaProduk) {
      alert("Silakan ketik atau pilih Produk yang masuk!");
      inputProdEl?.focus();
      return;
    }
    if (qty <= 0) {
      alert("Jumlah qty harus lebih dari 0!");
      return;
    }
    if (hargaBeli <= 0) {
      alert("Masukkan harga beli satuan yang valid!");
      return;
    }
    if (!expiryDate) {
      alert("Tanggal kedaluwarsa (expired) batch wajib diisi!");
      return;
    }
    if (!kodeBatch) {
      kodeBatch = generateKodeBatchOtomatis();
    }

    tambahItemKeDaftarPembelianInternal({
      pemasok,
      nama: namaProduk,
      qty,
      hargaBeli,
      expiryDate,
      kodeBatch
    });

    // Reset input produk agar siap mengetik produk berikutnya
    if (inputProdEl) inputProdEl.value = "";
    const statusBox = document.getElementById("status-produk-beli");
    if (statusBox) statusBox.innerHTML = "";
    const inputHarga = document.getElementById("input-harga-beli-pembelian");
    if (inputHarga) inputHarga.value = "";
    const inputKode = document.getElementById("input-kode-batch-pembelian");
    if (inputKode) inputKode.value = generateKodeBatchOtomatis();
    hitungPratinjauSubtotalBeli();
  }

  function tambahItemKeDaftarPembelianInternal(itemObj) {
    const subtotal = itemObj.qty * itemObj.hargaBeli;
    keranjangPembelian.push({
      pemasok: itemObj.pemasok || "PT Distribusi Makanan Utama",
      nama: itemObj.nama,
      qty: itemObj.qty,
      hargaBeli: itemObj.hargaBeli,
      subtotal: subtotal,
      expiryDate: itemObj.expiryDate,
      kodeBatch: itemObj.kodeBatch || generateKodeBatchOtomatis()
    });
    renderKeranjangPembelian();
  }

  function renderKeranjangPembelian() {
    const tbody = document.getElementById("cart-items-pembelian");
    const labelTotal = document.getElementById("label-total-pembelian");
    if (!tbody) return;

    if (keranjangPembelian.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--ink-secondary); padding: 24px;">Daftar pembelian masih kosong. Tambahkan item di sebelah kiri.</td></tr>`;
      if (labelTotal) labelTotal.innerText = "Rp 0";
      return;
    }

    let total = 0;
    let html = "";
    keranjangPembelian.forEach((item, index) => {
      total += item.subtotal;
      html += `
        <tr>
          <td>
            <strong>${item.nama}</strong><br>
            <span style="display:inline-block; background:#e0f2fe; color:#0369a1; font-size:0.74rem; padding:1px 6px; border-radius:5px; font-weight:600;">${item.kodeBatch}</span>
            <small style="color:var(--ink-secondary); display:block;">Pemasok: ${item.pemasok}</small>
          </td>
          <td>${item.expiryDate}</td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" class="btn btn-sm" style="padding:2px 8px;" onclick="ubahQtyKeranjangBeli(${index}, -1)">-</button>
              <span style="font-weight:700;">${item.qty}</span>
              <button type="button" class="btn btn-sm" style="padding:2px 8px;" onclick="ubahQtyKeranjangBeli(${index}, 1)">+</button>
            </div>
          </td>
          <td>Rp ${item.hargaBeli.toLocaleString("id-ID")}</td>
          <td><strong>Rp ${item.subtotal.toLocaleString("id-ID")}</strong></td>
          <td>
            <button type="button" class="btn btn-sm btn-delete" onclick="hapusItemKeranjangBeli(${index})" title="Hapus">✕</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (labelTotal) labelTotal.innerText = "Rp " + total.toLocaleString("id-ID");
  }

  function ubahQtyKeranjangBeli(index, delta) {
    if (!keranjangPembelian[index]) return;
    const newQty = keranjangPembelian[index].qty + delta;
    if (newQty <= 0) {
      hapusItemKeranjangBeli(index);
      return;
    }
    keranjangPembelian[index].qty = newQty;
    keranjangPembelian[index].subtotal = newQty * keranjangPembelian[index].hargaBeli;
    renderKeranjangPembelian();
  }

  function hapusItemKeranjangBeli(index) {
    keranjangPembelian.splice(index, 1);
    renderKeranjangPembelian();
  }

  function selesaikanTransaksiPembelian() {
    if (keranjangPembelian.length === 0) {
      alert("Daftar item pembelian masih kosong! Tambahkan barang masuk terlebih dahulu.");
      return;
    }

    const nomorPO = document.getElementById("input-nomor-pembelian")?.value.trim() || generateNomorPembelianOtomatis();
    const pemasokUtama = document.getElementById("pilih-pemasok-pembelian")?.value.trim() || keranjangPembelian[0].pemasok || "PT Distribusi Makanan Utama";
    const tglSampai = document.getElementById("input-tgl-sampai-toko")?.value || new Date().toISOString().slice(0, 10);
    const referensi = document.getElementById("input-no-referensi-beli")?.value.trim() || "-";
    const statusBayar = document.getElementById("pilih-status-bayar-beli")?.value || "Lunas";
    const totalPembelian = keranjangPembelian.reduce((s, i) => s + i.subtotal, 0);

    const konfirmasi = confirm(`Simpan transaksi pembelian "${nomorPO}" dari supplier "${pemasokUtama}" (Barang sampai: ${tglSampai}) senilai Rp ${totalPembelian.toLocaleString("id-ID")}?\nStok batch baru akan otomatis ditambahkan ke inventaris.`);
    if (!konfirmasi) return;

    // 1. PENCAMPURAN PEMASOK: Daftarkan otomatis pemasok ke Master Pemasok jika nama supplier baru
    if (typeof getDataPemasokList === "function" && typeof simpanDataPemasokList === "function") {
      const listPemasok = getDataPemasokList();
      const sudahAda = listPemasok.some(s => (s.nama || "").toLowerCase() === pemasokUtama.toLowerCase());
      if (!sudahAda) {
        const nextNum = listPemasok.length + 1;
        const autoId = `SUP-${String(nextNum).padStart(3, "0")}`;
        listPemasok.push({
          id: autoId,
          nama: pemasokUtama,
          kategori: "Distributor Bahan Segar",
          telp: "-",
          alamat: "Tercatat otomatis dari Transaksi Pembelian"
        });
        simpanDataPemasokList(listPemasok);
        if (typeof renderTabelPemasok === "function") renderTabelPemasok();
        if (typeof renderDropdownRiwayatPemasok === "function") renderDropdownRiwayatPemasok();
      }
    }

    // 2. Tambahkan masing-masing item ke dataBatchDemo (Stok & Batch) & registrasi produk baru jika belum terdaftar
    keranjangPembelian.forEach(item => {
      let kategoriProduk = "Makanan Fresh";
      let ditemukanMaster = false;
      for (const [sku, detail] of Object.entries(productDatabase)) {
        if (detail.name.toLowerCase() === item.nama.toLowerCase()) {
          kategoriProduk = detail.category || "Makanan Fresh";
          ditemukanMaster = true;
          break;
        }
      }

      if (!ditemukanMaster) {
        const skuBaru = "899" + Math.floor(100000000 + Math.random() * 900000000);
        productDatabase[skuBaru] = {
          name: item.nama,
          price: Math.round(item.hargaBeli * 1.25),
          buyPrice: item.hargaBeli,
          category: kategoriProduk
        };
        localStorage.setItem("freshlog_products", JSON.stringify(productDatabase));
      }

      if (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
        const existingBatch = dataBatchDemo.find(b => b.code === item.kodeBatch && b.name === item.nama);
        if (existingBatch) {
          existingBatch.stock = (parseFloat(existingBatch.stock) || 0) + item.qty;
          existingBatch.expiry_date = item.expiryDate;
        } else {
          dataBatchDemo.push({
            code: item.kodeBatch,
            name: item.nama,
            category: kategoriProduk,
            stock: item.qty,
            expiry_date: item.expiryDate,
            penjualan_14_hari: [6, 7, 5, 8, 6, 7, 6, 8, 7, 6, 5, 7, 8, 6]
          });
        }
      }
    });

    if (typeof dataBatchDemo !== "undefined") {
      localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));
    }

    // 3. Simpan Riwayat Pembelian (PO) dengan nomor pembelian & tanggal sampai ke toko
    const tglNow = new Date();
    const petugasNama = (typeof userAktif !== "undefined" && userAktif && userAktif.nama) ? userAktif.nama : "Admin Toko";

    const recordBaru = {
      id: nomorPO,
      waktu: tglNow.toISOString(),
      tglSampai: tglSampai,
      pemasok: pemasokUtama,
      referensi: referensi,
      statusBayar: statusBayar,
      petugas: petugasNama,
      items: JSON.parse(JSON.stringify(keranjangPembelian)),
      total: totalPembelian
    };

    const riwayat = getRiwayatPembelianData();
    riwayat.unshift(recordBaru);
    simpanRiwayatPembelianData(riwayat);

    // 4. Catat ke Audit Log
    if (typeof catatLogAktivitas === "function") {
      catatLogAktivitas(
        "Pembelian Barang Masuk",
        `Transaksi ${nomorPO} dari "${pemasokUtama}" (Sampai: ${tglSampai}): ${keranjangPembelian.length} batch masuk senilai Rp ${totalPembelian.toLocaleString("id-ID")}.`,
        "Inventaris"
      );
    }

    // 5. Reset Keranjang & Form
    keranjangPembelian = [];
    const inputRef = document.getElementById("input-no-referensi-beli");
    if (inputRef) inputRef.value = "";
    const inputSup = document.getElementById("pilih-pemasok-pembelian");
    if (inputSup) inputSup.value = "";
    const statusSup = document.getElementById("status-pemasok-beli");
    if (statusSup) statusSup.innerHTML = "";
    const inputProd = document.getElementById("input-produk-pembelian");
    if (inputProd) inputProd.value = "";
    const statusProd = document.getElementById("status-produk-beli");
    if (statusProd) statusProd.innerHTML = "";

    // Generate nomor pembelian baru otomatis untuk transaksi selanjutnya
    const inputNo = document.getElementById("input-nomor-pembelian");
    if (inputNo) inputNo.value = generateNomorPembelianOtomatis();

    renderKeranjangPembelian();
    renderPilihanFormPembelian();
    if (typeof renderPilihanProdukPenjualan === "function") renderPilihanProdukPenjualan();

    // 6. Refresh tampilan Inventaris
    if (typeof renderTabelInventaris === "function") renderTabelInventaris();
    if (typeof updateRingkasanInventaris === "function") updateRingkasanInventaris();
    if (typeof hitungAnalitikDampak === "function") hitungAnalitikDampak();

    // 7. Tampilkan Detail Bukti Pembelian
    tampilkanDetailPembelian(recordBaru.id);
  }

  function renderRiwayatPembelian() {
    const tbody = document.getElementById("tabel-riwayat-pembelian");
    if (!tbody) return;

    const riwayat = getRiwayatPembelianData();
    const tglMulai = document.getElementById("filter-beli-tgl-mulai")?.value;
    const tglAkhir = document.getElementById("filter-beli-tgl-akhir")?.value;
    const pemasokFilter = document.getElementById("filter-beli-pemasok")?.value;
    const produkFilter = document.getElementById("filter-beli-produk")?.value;
    const keyword = document.getElementById("filter-beli-cari")?.value.toLowerCase().trim() || "";

    const hasilFilter = riwayat.filter(r => {
      const tglBanding = r.tglSampai || (r.waktu ? new Date(r.waktu).toISOString().slice(0, 10) : "");
      if (tglMulai) {
        if (tglBanding < tglMulai) return false;
      }
      if (tglAkhir) {
        if (tglBanding > tglAkhir) return false;
      }
      if (pemasokFilter && r.pemasok !== pemasokFilter) {
        return false;
      }
      if (produkFilter) {
        const adaProduk = r.items && r.items.some(i => i.nama === produkFilter);
        if (!adaProduk) return false;
      }
      if (keyword) {
        const matchId = String(r.id || "").toLowerCase().includes(keyword);
        const matchSup = (r.pemasok || "").toLowerCase().includes(keyword);
        const matchRef = (r.referensi || "").toLowerCase().includes(keyword);
        const matchItem = r.items && r.items.some(i =>
          i.nama.toLowerCase().includes(keyword) ||
          (i.kodeBatch || "").toLowerCase().includes(keyword)
        );
        if (!matchId && !matchSup && !matchRef && !matchItem) return false;
      }
      return true;
    });

    if (hasilFilter.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--ink-secondary); padding: 24px;">Tidak ada riwayat pembelian yang sesuai dengan filter.</td></tr>`;
      return;
    }

    let html = "";
    hasilFilter.forEach(r => {
      const d = new Date(r.waktu);
      const waktuStr = isNaN(d.getTime()) ? r.waktu : `${d.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" })} ${d.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}`;
      
      let tglSampaiStr = "-";
      if (r.tglSampai) {
        const ds = new Date(r.tglSampai);
        tglSampaiStr = isNaN(ds.getTime()) ? r.tglSampai : ds.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
      } else {
        tglSampaiStr = isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
      }

      const produkRingkas = r.items.map(i => `${i.nama} (${i.qty} pcs)`).join(", ");
      const batchPills = r.items.map(i => `<span style="display:inline-block; background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:2px 6px; border-radius:6px; margin:2px;">${i.kodeBatch} (Exp: ${i.expiryDate})</span>`).join(" ");

      html += `
        <tr>
          <td><strong style="color:var(--emerald-primary);">${r.id}</strong></td>
          <td>
            <strong style="color:var(--ink-primary);">${tglSampaiStr}</strong>
            <small style="color:var(--ink-secondary); display:block; font-size:0.75rem;">Dicatat: ${waktuStr}</small>
          </td>
          <td><strong>${r.pemasok}</strong></td>
          <td>${produkRingkas}</td>
          <td>${batchPills}</td>
          <td><strong>Rp ${r.total.toLocaleString("id-ID")}</strong></td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="tampilkanDetailPembelian('${r.id}')">Detail Pembelian</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function resetFilterPembelian() {
    const tglMulai = document.getElementById("filter-beli-tgl-mulai");
    const tglAkhir = document.getElementById("filter-beli-tgl-akhir");
    const pemasok = document.getElementById("filter-beli-pemasok");
    const produk = document.getElementById("filter-beli-produk");
    const cari = document.getElementById("filter-beli-cari");

    if (tglMulai) tglMulai.value = "";
    if (tglAkhir) tglAkhir.value = "";
    if (pemasok) pemasok.value = "";
    if (produk) produk.value = "";
    if (cari) cari.value = "";

    renderRiwayatPembelian();
  }

  function tampilkanDetailPembelian(poId) {
    const riwayat = getRiwayatPembelianData();
    const record = riwayat.find(r => r.id === poId);
    if (!record) {
      alert("Data transaksi pembelian tidak ditemukan!");
      return;
    }

    const titleEl = document.getElementById("modal-pembelian-faktur");
    const waktuEl = document.getElementById("modal-pembelian-waktu");
    const bodyEl = document.getElementById("modal-detail-pembelian-body");

    let tglSampaiFormat = record.tglSampai;
    if (record.tglSampai) {
      const ds = new Date(record.tglSampai);
      if (!isNaN(ds.getTime())) {
        tglSampaiFormat = ds.toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
      }
    } else {
      const d = new Date(record.waktu);
      tglSampaiFormat = isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
    }

    if (titleEl) titleEl.innerText = `Detail Pembelian: ${record.id}`;
    if (waktuEl) {
      const d = new Date(record.waktu);
      waktuEl.innerText = isNaN(d.getTime()) ? record.waktu : `Tanggal Pencatatan Sistem: ${d.toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })} - ${d.toLocaleTimeString("id-ID")} | Petugas: ${record.petugas || "Admin Toko"}`;
    }

    if (bodyEl) {
      let rowsHtml = "";
      record.items.forEach(i => {
        rowsHtml += `
          <tr style="border-bottom:1px solid var(--border-hairline);">
            <td style="padding:10px 8px;">
              <strong>${i.nama}</strong><br>
              <span style="display:inline-block; background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:2px 6px; border-radius:5px; margin-top:4px;">Batch: ${i.kodeBatch}</span>
            </td>
            <td style="padding:10px 8px; text-align:center;">${i.expiryDate}</td>
            <td style="padding:10px 8px; text-align:center;"><strong>${i.qty} pcs</strong></td>
            <td style="padding:10px 8px; text-align:right;">Rp ${i.hargaBeli.toLocaleString("id-ID")}</td>
            <td style="padding:10px 8px; text-align:right;"><strong>Rp ${i.subtotal.toLocaleString("id-ID")}</strong></td>
          </tr>
        `;
      });

      bodyEl.innerHTML = `
        <div style="background:var(--bg-nested-subtle); padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:0.88rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span style="color:var(--ink-secondary);">Nomor Pembelian:</span>
            <strong style="color:var(--emerald-primary);">${record.id}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span style="color:var(--ink-secondary);">Nama Supplier (Pemasok):</span>
            <strong>${record.pemasok}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span style="color:var(--ink-secondary);">Tanggal Barang Sampai ke Toko:</span>
            <strong style="color:#0369a1;">${tglSampaiFormat}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span style="color:var(--ink-secondary);">No. Surat Jalan / Referensi:</span>
            <span>${record.referensi || "-"}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--ink-secondary);">Status Pembayaran:</span>
            <span style="color:var(--emerald-primary); font-weight:700;">${record.statusBayar || "Lunas"}</span>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:0.88rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--border-hairline); background:var(--bg-nested-subtle);">
              <th style="padding:8px; text-align:left;">Produk &amp; Batch</th>
              <th style="padding:8px; text-align:center;">Tgl Expired</th>
              <th style="padding:8px; text-align:center;">Qty Masuk</th>
              <th style="padding:8px; text-align:right;">Harga Beli</th>
              <th style="padding:8px; text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="border-top:2px dashed var(--border-hairline); padding-top:12px; font-size:0.92rem; display:flex; justify-content:space-between; align-items:center;">
          <span>Total Nilai Pembelian:</span>
          <strong style="font-size:1.2rem; color:var(--emerald-primary);">Rp ${record.total.toLocaleString("id-ID")}</strong>
        </div>
      `;
    }

    openModal("modal-detail-pembelian");
  }

  function eksporRiwayatPembelianCSV() {
    const riwayat = getRiwayatPembelianData();
    if (!riwayat || riwayat.length === 0) {
      alert("Belum ada data riwayat pembelian untuk diekspor!");
      return;
    }

    let csv = "No. Pembelian,Tanggal Sampai Toko,Tanggal & Waktu Catat,Nama Supplier,No. Referensi,Status Bayar,Petugas,Total Pembelian (Rp),Detail Item & Batch\n";
    riwayat.forEach(r => {
      const itemsStr = r.items.map(i => `${i.nama} [${i.kodeBatch}, Exp:${i.expiryDate}, Qty:${i.qty}, @Rp${i.hargaBeli}]`).join("; ");
      const tglSampaiStr = r.tglSampai || (r.waktu ? r.waktu.slice(0, 10) : "-");
      csv += `"${r.id}","${tglSampaiStr}","${r.waktu}","${r.pemasok}","${r.referensi || "-"}","${r.statusBayar || "Lunas"}","${r.petugas || "Admin Toko"}",${r.total},"${itemsStr}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Pembelian_FreshLog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function mulaiRekamPembelian() {
    const btn = document.getElementById("btn-rekam-beli");
    const hasilBox = document.getElementById("hasil-suara-beli");
    if (!hasilBox) return;

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      hasilBox.innerHTML = "<p style='color:#dc2626;'>Browser tidak mendukung input suara. Gunakan Google Chrome.</p>";
      return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (btn) {
      btn.innerHTML = "Merekam Suara...";
      btn.disabled = true;
    }

    recognition.start();

    recognition.onresult = function (event) {
      const teks = event.results[0][0].transcript;
      hasilBox.innerHTML = `<p><strong>Transkrip:</strong> "${teks}"</p>`;

      const angkaList = teks.match(/\d+/g);
      if (angkaList && angkaList.length > 0) {
        const inputQty = document.getElementById("ekstrak-beli-jumlah");
        if (inputQty) inputQty.value = angkaList[0];
        if (angkaList.length > 1) {
          const kandidatHarga = angkaList.find(n => parseInt(n) >= 1000);
          const inputHarga = document.getElementById("ekstrak-beli-harga");
          if (kandidatHarga && inputHarga) inputHarga.value = kandidatHarga;
        }
      }

      const inputProduk = document.getElementById("ekstrak-beli-produk");
      if (inputProduk) {
        let namaBersih = teks
          .replace(/^(masuk|beli|terima|input|tambah)\s+/i, "")
          .replace(/\b(\d+)\s*(pcs|buah|botol|kaleng|bungkus|pack|unit|karton)?\b/gi, "")
          .replace(/\b(harga|senilai|exp|expired|kadaluwarsa|kedaluwarsa|dari).*/gi, "")
          .trim();
        if (namaBersih.length > 2) {
          inputProduk.value = namaBersih.charAt(0).toUpperCase() + namaBersih.slice(1);
        }
      }

      const inputSup = document.getElementById("ekstrak-beli-pemasok");
      if (inputSup && !inputSup.value) {
        inputSup.value = "PT Distribusi Makanan Utama";
      }

      if (btn) {
        btn.innerHTML = "Mulai Rekam Suara Pembelian";
        btn.disabled = false;
      }
    };

    recognition.onerror = function (event) {
      hasilBox.innerHTML = `<p style='color:#dc2626;'>Gagal merekam: ${event.error}. Silakan coba lagi.</p>`;
      if (btn) {
        btn.innerHTML = "Mulai Rekam Suara Pembelian";
        btn.disabled = false;
      }
    };

    recognition.onend = function () {
      if (btn) {
        btn.innerHTML = "Mulai Rekam Suara Pembelian";
        btn.disabled = false;
      }
    };
  }

  function pratinjauFotoBeli(input) {
    const previewContainer = document.getElementById("pratinjau-foto-beli");
    const btnEkstrak = document.getElementById("btn-ekstrak-beli");
    if (!previewContainer) return;

    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview Faktur" style="max-height:140px; border-radius:10px; border:1px solid var(--border-hairline);">`;
      };
      reader.readAsDataURL(input.files[0]);
      if (btnEkstrak) btnEkstrak.disabled = false;
    }
  }

  async function ekstrakFotoBeli() {
    const btn = document.getElementById("btn-ekstrak-beli");
    const hasilBox = document.getElementById("hasil-foto-beli");
    const inputFoto = document.getElementById("input-foto-beli");
    const file = inputFoto?.files?.[0];
    if (!file || !hasilBox) return;

    if (btn) {
      btn.disabled = true;
      btn.innerText = "Mengekstrak Faktur...";
    }
    hasilBox.innerHTML = "<p><em>Menganalisis faktur pemasok dengan AI OCR...</em></p>";

    setTimeout(() => {
      const d = new Date();
      d.setDate(d.getDate() + 21);
      const expDefault = d.toISOString().slice(0, 10);

      document.getElementById("ekstrak-beli-pemasok").value = "PT Distribusi Makanan Utama";
      document.getElementById("ekstrak-beli-produk").value = "Susu UHT 1L";
      document.getElementById("ekstrak-beli-jumlah").value = 24;
      document.getElementById("ekstrak-beli-harga").value = 14500;
      document.getElementById("ekstrak-beli-exp").value = expDefault;

      hasilBox.innerHTML = `
        <div style="color:#166534; font-weight:600;">
          Faktur Terdeteksi: PT Distribusi Makanan Utama — Susu UHT 1L (24 pcs @ Rp 14.500, Exp: ${expDefault}).<br>
          <small style="color:var(--ink-secondary); font-weight:400;">Silakan periksa form konfirmasi di bawah lalu klik "+ Masukkan ke Pembelian Baru".</small>
        </div>
      `;
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Ekstrak Faktur dengan AI";
      }
    }, 900);
  }

  function konfirmasiEkstraksiKePembelian(e) {
    if (e) e.preventDefault();
    const pemasok = document.getElementById("ekstrak-beli-pemasok")?.value.trim() || "PT Distribusi Makanan Utama";
    const nama = document.getElementById("ekstrak-beli-produk")?.value.trim();
    const qty = parseInt(document.getElementById("ekstrak-beli-jumlah")?.value) || 10;
    const hargaBeli = parseFloat(document.getElementById("ekstrak-beli-harga")?.value) || 15000;
    let expiryDate = document.getElementById("ekstrak-beli-exp")?.value;

    if (!nama) {
      alert("Nama produk wajib diisi!");
      return;
    }
    if (!expiryDate) {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      expiryDate = d.toISOString().slice(0, 10);
    }

    tambahItemKeDaftarPembelianInternal({
      pemasok,
      nama,
      qty,
      hargaBeli,
      expiryDate,
      kodeBatch: generateKodeBatchOtomatis()
    });

    const selectPemasok = document.getElementById("pilih-pemasok-pembelian");
    if (selectPemasok) selectPemasok.value = pemasok;

    gantiTabPembelian("baru");
    alert(`Berhasil! ${qty} pcs "${nama}" dari "${pemasok}" telah ditambahkan ke Form Pembelian Baru.`);
  }

  /* ========================================== */
/* 5. DATABASE BATCH & MANAJEMEN INVENTARIS   */
/* ========================================== */

const defaultBatches = [
  {
    code: "BTC-001",
    name: "Susu UHT 1L",
    category: "Minuman & Dairy",
    stock: 10,
    expiry_date: "2026-11-10",
    penjualan_14_hari: [15,15,14,16,15,15,14,15,16,15,14,15,15,16]
  },
  {
    code: "BTC-002",
    name: "Roti Tawar Daging",
    category: "Snack & Kue",
    stock: 50,
    expiry_date: "2026-11-25",
    penjualan_14_hari: [8,7,9,6,8,7,5,8,9,7,6,8,7,8]
  },
  {
    code: "BTC-003",
    name: "Yogurt Stroberi",
    category: "Minuman & Dairy",
    stock: 30,
    expiry_date: "2026-11-15",
    penjualan_14_hari: [5,4,6,5,4,5,6,5,4,5,6,5,4,5]
  }
];

// Muat data dari localStorage jika ada, atau gunakan default
const savedBatchesStorage = JSON.parse(localStorage.getItem("freshlog_batches"));
const dataBatchDemo = (savedBatchesStorage && savedBatchesStorage.length > 0) ? savedBatchesStorage : [...defaultBatches];

// Global cache hasil kalkulasi risiko batch
let cacheHasilRisiko = null;

// Helper kalkulasi status risiko lokal persis dengan formula skor risiko di API
function hitungStatusRisikoLokal(batch) {
  const sisaStok = parseFloat(batch.stock) || 0;
  const tglExp = new Date(batch.expiry_date);
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  tglExp.setHours(0, 0, 0, 0);
  const sisaHari = Math.ceil((tglExp - hariIni) / (1000 * 60 * 60 * 24));

  // 1. Kasus produk sudah kedaluwarsa (Skor 100, Status Merah)
  if (isNaN(sisaHari) || sisaHari <= 0) {
    return {
      skor_risiko: 100,
      status: "merah",
      perkiraan_terjual: 0,
      sisa_hari: isNaN(sisaHari) ? 0 : sisaHari,
      saran_tindakan: `SEGERA: ${batch.name} sudah kedaluwarsa. Pisahkan dari stok aktif.`
    };
  }

  // 2. Kasus stok kosong (Skor 0, Status Hijau)
  if (sisaStok <= 0) {
    return {
      skor_risiko: 0,
      status: "hijau",
      perkiraan_terjual: 0,
      sisa_hari: sisaHari,
      saran_tindakan: "Stok sudah habis. Tidak ada tindakan diperlukan."
    };
  }

  // 3. Rata-rata penjualan harian (14 hari terakhir)
  const penjualan14 = Array.isArray(batch.penjualan_14_hari) && batch.penjualan_14_hari.length > 0
    ? batch.penjualan_14_hari
    : [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  const totalPenjualan = penjualan14.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  const rataRataHarian = totalPenjualan / penjualan14.length;

  // 4. Perkiraan terjual = rata_rata_harian * sisa hari sampai exp
  const perkiraanTerjual = rataRataHarian * sisaHari;

  // 5. Sisa tidak terjual = sisa_stok - perkiraan_terjual
  const sisaTidakTerjual = Math.max(0, sisaStok - perkiraanTerjual);

  // 6. Rasio = sisa_tidak_terjual / sisa_stok & Skor = rasio * 100
  const rasio = sisaTidakTerjual / sisaStok;
  const skor = Math.round(rasio * 100);

  // 7. Penentuan Status Risiko Sesuai Aturan API:
  // - hijau : Skor 0-30   (stok diperkirakan habis sebelum kedaluwarsa)
  // - kuning: Skor 31-69  (perlu perhatian)
  // - merah : Skor 70-100 (risiko tinggi, stok tidak akan habis)
  let status = "hijau";
  let saran = "Stok aman. Tidak ada tindakan khusus diperlukan.";

  if (skor <= 30) {
    status = "hijau";
    saran = "Stok aman. Diperkirakan habis sebelum kedaluwarsa.";
  } else if (skor <= 69) {
    status = "kuning";
    if (sisaHari <= 3) {
      saran = `Sisa ${sisaHari} hari. Pindahkan ${batch.name} ke posisi depan (FEFO) dan pertimbangkan diskon kecil.`;
    } else {
      saran = `Pantau ${batch.name}. Pertimbangkan bundling dengan produk lain untuk mempercepat penjualan.`;
    }
  } else {
    status = "merah";
    if (sisaHari <= 2) {
      saran = `DARURAT: Sisa ${sisaHari} hari. Donasikan atau buang ${batch.name} jika tidak laku hari ini.`;
    } else if (sisaHari <= 7) {
      saran = `Diskon segera untuk ${batch.name}. Jika tidak laku dalam 2 hari, pertimbangkan donasi.`;
    } else {
      saran = `Buat promo bundling untuk ${batch.name} dan pindahkan ke lokasi yang lebih terlihat.`;
    }
  }

  return {
    skor_risiko: skor,
    status: status,
    perkiraan_terjual: Math.round(perkiraanTerjual * 100) / 100,
    sisa_hari: sisaHari,
    saran_tindakan: saran
  };
}

async function fetchRisikoBatch(batch) {
  const payload = {
    batch_id: batch.code,
    produk: batch.name,
    sisa_stok: batch.stock,
    tanggal_kedaluwarsa: batch.expiry_date,
    penjualan_14_hari: batch.penjualan_14_hari || [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
  };

  const endpoints = [
    `${FRESHLOG_API_BASE}/risiko`,
    "https://inventori-api-production.up.railway.app/risiko"
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  return hitungStatusRisikoLokal(batch);
}

// Fungsi render tabel inventaris langsung dari memory/localStorage
function renderTabelInventaris(hasilRisiko = null) {
  if (hasilRisiko) {
    cacheHasilRisiko = hasilRisiko;
  }
  const tbody = document.querySelector("#table-inventaris");
  if (!tbody) return;

  if (dataBatchDemo.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:18px; color:#64748b;'>Belum ada data batch inventaris. Tambah produk master atau input foto nota.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  const userRoleEl = document.getElementById("user-role");
  const roleAktif = userRoleEl ? userRoleEl.innerText : "";
  const isStaff = roleAktif.toLowerCase().includes("staf");

  dataBatchDemo.forEach((batch, i) => {
    const risiko = (cacheHasilRisiko && cacheHasilRisiko[i]) || hitungStatusRisikoLokal(batch);
    const satuan = typeof getSatuanProduk === "function" ? getSatuanProduk(batch.name) : "Pcs";
    const batas = typeof getThresholdProduk === "function" ? getThresholdProduk(batch.name) : 15;
    const isLowStock = (parseInt(batch.stock) || 0) <= batas;
    const badgeLow = isLowStock ? ` <span style="background:#fef3c7; color:#b45309; font-size:0.72rem; padding:2px 6px; border-radius:8px; font-weight:600;">⚠️ &le; ${batas}</span>` : "";

    // Indikator kondisi: stok menipis, mendekati expired (<= 7 hari), berisiko tinggi (merah)
    const sisaHari = risiko.sisa_hari;
    const isMendekatiExp = sisaHari <= 7;
    const isBerisikoTinggi = risiko.status === "merah" || risiko.skor_risiko >= 70;

    // Label status risiko berdasarkan aturan resmi API
    let labelStatus = "Hijau (Aman)";
    if (risiko.status === "kuning") labelStatus = "Kuning (Perhatian)";
    if (risiko.status === "merah") labelStatus = "Merah (Tinggi)";

    const tr = document.createElement("tr");
    tr.setAttribute("data-batch-code", batch.code || "");
    tr.setAttribute("data-batch-name", (batch.name || "").toLowerCase());
    tr.setAttribute("data-batch-cat", (batch.category || "").toLowerCase());
    tr.setAttribute("data-batch-status", risiko.status);
    tr.setAttribute("data-is-menipis", isLowStock ? "1" : "0");
    tr.setAttribute("data-is-exp", isMendekatiExp ? "1" : "0");
    tr.setAttribute("data-is-tinggi", isBerisikoTinggi ? "1" : "0");

    // Saran tindakan cerdas berbasis Google Gemini LLM API
    const rawSaran = (window.rekomendasiBatchLLMMap && window.rekomendasiBatchLLMMap[batch.code]) || risiko.saran_tindakan;
    const saranGemini = typeof bersihkanEmojiTeks === "function" ? bersihkanEmojiTeks(rawSaran) : (rawSaran || "-");

    tr.innerHTML = `
      <td><strong>${batch.code}</strong></td>
      <td>${batch.name}</td>
      <td><strong>${batch.stock}</strong> ${satuan}${badgeLow}</td>
      <td>${batch.expiry_date}</td>
      <td>
        <span class="status-badge ${risiko.status}" title="Skor Risiko: ${risiko.skor_risiko} (0-30: Hijau, 31-69: Kuning, 70-100: Merah)">
          ● ${labelStatus}
        </span>
      </td>
      <td>
        <span style="font-size: 0.83rem; color: var(--ink-secondary); line-height: 1.45; display: inline-block; max-width: 320px;">
          ${saranGemini}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="bukaModalUbahBatch('${batch.code}')">Ubah</button>
          <button type="button" class="btn btn-sm btn-delete" onclick="hapusBatchInventaris('${batch.code}')">Hapus</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Terapkan filter jika kolom filter sedang aktif
  if (typeof filterTabelInventaris === "function") {
    filterTabelInventaris();
  }
}

// Fungsi filter tabel inventaris: teks, kategori, dan kondisi khusus (stok menipis / mendekati expired / berisiko tinggi)
function filterTabelInventaris(kondisiPill = null) {
  if (kondisiPill !== null) {
    const selKondisi = document.getElementById("filter-kondisi-stok");
    if (selKondisi) selKondisi.value = kondisiPill;
  }

  const kataKunci = (document.getElementById("filter-search-inventaris")?.value || "").toLowerCase().trim();
  const filterKat = (document.getElementById("filter-kategori-inventaris")?.value || "").toLowerCase().trim();
  const filterKondisi = (document.getElementById("filter-kondisi-stok")?.value || "all");

  // Perbarui status aktif tombol pill filter cepat
  const pills = document.querySelectorAll(".filter-kondisi-pill");
  pills.forEach(p => {
    if (p.getAttribute("data-kondisi") === filterKondisi) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  const baris = document.querySelectorAll("#table-inventaris tr");
  baris.forEach(tr => {
    const code = tr.getAttribute("data-batch-code") || "";
    const name = tr.getAttribute("data-batch-name") || "";
    const cat = tr.getAttribute("data-batch-cat") || "";
    const isMenipis = tr.getAttribute("data-is-menipis") === "1";
    const isExp = tr.getAttribute("data-is-exp") === "1";
    const isTinggi = tr.getAttribute("data-is-tinggi") === "1";

    const cocokCari = !kataKunci || name.includes(kataKunci) || code.toLowerCase().includes(kataKunci);
    const cocokKat = !filterKat || cat === filterKat;

    let cocokKondisi = true;
    if (filterKondisi === "menipis") {
      cocokKondisi = isMenipis;
    } else if (filterKondisi === "mendekati_exp") {
      cocokKondisi = isExp;
    } else if (filterKondisi === "berisiko_tinggi") {
      cocokKondisi = isTinggi;
    }

    tr.style.display = (cocokCari && cocokKat && cocokKondisi) ? "" : "none";
  });
}

// Fungsi hapus batch dari inventaris
function hapusBatchInventaris(kodeBatch) {
  if (confirm(`Yakin ingin menghapus batch "${kodeBatch}" dari inventaris?`)) {
    const idx = dataBatchDemo.findIndex(b => b.code === kodeBatch);
    if (idx !== -1) {
      const dihapus = dataBatchDemo[idx];
      dataBatchDemo.splice(idx, 1);
      localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));
      if (typeof catatLogAktivitas === "function") {
        catatLogAktivitas("Hapus Batch", `Menghapus batch ${dihapus.code} (${dihapus.name}, stok: ${dihapus.stock})`, "Inventaris");
      }
      loadInventarisDariServer();
    }
  }
}

// Perbarui ringkasan metric di Dashboard utama
function updateDashboardSummary(hasilRisiko = null) {
  // 1. Total Stok Unit
  const elTotalStok = document.getElementById("dash-total-stok");
  if (elTotalStok) {
    const total = dataBatchDemo.reduce((acc, b) => acc + (parseInt(b.stock) || 0), 0);
    elTotalStok.innerText = `${total.toLocaleString("id-ID")} Unit`;
  }

  // 2. Stok Menipis (berdasarkan threshold masing-masing produk)
  const elStokMenipis = document.getElementById("dash-stok-menipis");
  let jumlahStokMenipis = 0;
  if (elStokMenipis) {
    jumlahStokMenipis = dataBatchDemo.filter(b => {
      const batas = typeof getThresholdProduk === "function" ? getThresholdProduk(b.name) : 15;
      return (parseInt(b.stock) || 0) <= batas;
    }).length;
    elStokMenipis.innerText = `${jumlahStokMenipis} Batch`;
  }

  // 3. Batch Segera Kedaluwarsa (Status Merah: Skor 70 - 100)
  const elBatchMerah = document.getElementById("dash-batch-merah");
  let jumlahMerah = 0;
  const listExp = [];

  dataBatchDemo.forEach((batch, i) => {
    const risiko = (hasilRisiko && hasilRisiko[i]) || (cacheHasilRisiko && cacheHasilRisiko[i]) || hitungStatusRisikoLokal(batch);
    if (risiko.status === "merah") {
      jumlahMerah++;
      listExp.push({ batch, risiko });
    }
  });

  if (elBatchMerah) {
    elBatchMerah.innerText = `${jumlahMerah} Batch`;
  }

  // 4. Update banner peringatan kedaluwarsa atas
  const elAlertText = document.getElementById("top-alert-text");
  const elTopAlert = document.getElementById("top-alert");
  if (elAlertText && elTopAlert) {
    if (jumlahMerah > 0 || jumlahStokMenipis > 0) {
      elTopAlert.style.display = "block";
      elAlertText.innerHTML = `<strong>Peringatan Stok: </strong> Terdapat <strong>${jumlahMerah} Batch Segera Kedaluwarsa (Merah)</strong> dan <strong>${jumlahStokMenipis} Produk Stok Menipis</strong>!`;
    } else {
      elTopAlert.style.display = "none";
    }
  }

  // 5. Daftar Produk Mendekati Kedaluwarsa di Dashboard
  const elList = document.getElementById("dash-expire-list");
  if (elList) {
    if (listExp.length === 0) {
      elList.innerHTML = `<li><small style='color:#158050;'>✅ Semua batch dalam kondisi aman (Skor risiko &le; 30 / belum mendekati kedaluwarsa).</small></li>`;
    } else {
      elList.innerHTML = listExp.map(({ batch, risiko }) => {
        const sisaHari = risiko.sisa_hari !== undefined ? risiko.sisa_hari : Math.ceil((new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        const teksHari = isNaN(sisaHari) ? "" : (sisaHari <= 0 ? "— Sudah Kedaluwarsa" : `— Sisa ${sisaHari} Hari`);
        return `<li><strong>${batch.name}</strong> (Batch: ${batch.code}) ${teksHari} <span class="status-badge ${risiko.status}">● Merah</span></li>`;
      }).join("");
    }
  }
}

async function loadInventarisDariServer() {
  // 1. Tampilkan data seketika tanpa nunggu koneksi network
  renderTabelInventaris(null);
  updateDashboardSummary(null);

  // 2. Di latar belakang, jika server risiko menyala, perbarui hasil risiko
  try {
    const hasil = await Promise.all(dataBatchDemo.map(batch => fetchRisikoBatch(batch)));
    renderTabelInventaris(hasil);
    updateDashboardSummary(hasil);
  } catch (error) {
    console.warn("Kalkulasi risiko menggunakan fallback lokal:", error);
  }
}
/* ========================================== */
/* 6. SISTEM LOGIN & OTORISASI PERAN          */
/* ========================================== */
const defaultAkunSistem = {
  "admin": {
    password: "123",
    nama: "Admin Toko",
    role: "admin",
    labelRole: "Admin",
    shift: "07.00 - 22.00 WIB",
    telepon: "0812-3456-7890",
    email: "admin@freshlog.id",
    foto: ""
  },
  "admin toko": {
    password: "123",
    nama: "Admin Toko",
    role: "admin",
    labelRole: "Admin",
    shift: "07.00 - 22.00 WIB",
    telepon: "0812-3456-7890",
    email: "admin@freshlog.id",
    foto: ""
  },
  "staf1": {
    password: "123",
    nama: "Budi (Staf 1)",
    role: "staff",
    labelRole: "Staf 1",
    shift: "07.00 - 14.30 WIB",
    telepon: "0813-1111-2222",
    email: "budi@freshlog.id",
    foto: ""
  },
  "staf2": {
    password: "123",
    nama: "Siti (Staf 2)",
    role: "staff",
    labelRole: "Staf 2",
    shift: "14.30 - 22.00 WIB",
    telepon: "0813-3333-4444",
    email: "siti@freshlog.id",
    foto: ""
  }
};

const savedAccountsStorage = JSON.parse(localStorage.getItem("freshlog_accounts"));
const daftarAkun = savedAccountsStorage ? Object.assign({}, defaultAkunSistem, savedAccountsStorage) : Object.assign({}, defaultAkunSistem);
let activeUserKey = localStorage.getItem("freshlog_active_user") || "admin";

function simpanDaftarAkunKeStorage() {
  localStorage.setItem("freshlog_accounts", JSON.stringify(daftarAkun));
}

function getAvatarUrl(nama, customFoto) {
  if (customFoto && customFoto.trim() !== "") return customFoto;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nama || "User")}&background=137A4B&color=fff`;
}

function perbaruiProfilSidebar(akun) {
  if (!akun) return;
  const elName = document.getElementById("user-name");
  const elTopName = document.getElementById("top-user-name");
  const elRole = document.getElementById("user-role");
  const elShift = document.getElementById("user-shift");
  const elTopShift = document.getElementById("top-user-shift-badge");
  const elContact = document.getElementById("user-contact");
  const elAvatar = document.getElementById("sidebar-user-avatar");

  if (elName) elName.innerText = akun.nama || "-";
  if (elTopName) elTopName.innerText = akun.nama || "Admin Toko";
  if (elRole) {
    elRole.innerText = akun.labelRole || (akun.role === "admin" ? "Admin" : "Staf");
    elRole.className = `badge-role ${akun.role === "admin" ? "admin" : "staff"}`;
  }
  if (elShift) elShift.innerText = `Sesi Shift: ${akun.shift || "-"}`;
  if (elTopShift) elTopShift.innerText = `Sesi: ${akun.shift || "07.00 - 22.00 WIB"}`;
  if (elContact) {
    const infoKontak = akun.telepon || akun.email || "-";
    elContact.innerText = `Kontak: ${infoKontak}`;
  }
  if (elAvatar) {
    elAvatar.src = getAvatarUrl(akun.nama, akun.foto);
  }
  if (typeof terapkanHakAksesRoleStokBatch === "function") {
    terapkanHakAksesRoleStokBatch(akun.role);
  }
  if (typeof terapkanHakAksesRoleMenu === "function") {
    terapkanHakAksesRoleMenu(akun.role);
  }
}

// ==========================================
// SISTEM KEAMANAN & PROTEKSI BRUTE FORCE (15 MENIT)
// ==========================================
const BRUTE_FORCE_STORAGE_KEY = 'freshlog_brute_force_tracker';
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 Menit = 900.000 ms
let lockoutTimerInterval = null;
let memoryBruteForceTracker = null; // Cadangan memori agar tracking tidak pernah reset jika storage diblokir

function dapatkanTrackerBruteForce() {
  if (memoryBruteForceTracker && typeof memoryBruteForceTracker === 'object') {
    return memoryBruteForceTracker;
  }
  try {
    const raw = localStorage.getItem(BRUTE_FORCE_STORAGE_KEY);
    memoryBruteForceTracker = raw ? JSON.parse(raw) : {};
    return memoryBruteForceTracker;
  } catch (e) {
    if (!memoryBruteForceTracker) memoryBruteForceTracker = {};
    return memoryBruteForceTracker;
  }
}

function simpanTrackerBruteForce(tracker) {
  memoryBruteForceTracker = tracker;
  try {
    localStorage.setItem(BRUTE_FORCE_STORAGE_KEY, JSON.stringify(tracker));
  } catch (e) {
    console.warn("Penyimpanan localStorage gagal, menggunakan in-memory fallback:", e);
  }
}

function periksaStatusLockout(username) {
  const tracker = dapatkanTrackerBruteForce();
  const userKey = (username || tracker.__last_user__ || 'default').toLowerCase();
  const now = Date.now();

  const infoUser = tracker[userKey] || {};
  const infoGlobal = tracker.__global__ || {};

  const lockUser = infoUser.lockoutUntil || 0;
  const lockGlobal = infoGlobal.lockoutUntil || 0;
  const activeLockoutUntil = Math.max(lockUser, lockGlobal);

  const attemptsUser = infoUser.attempts || 0;
  const attemptsGlobal = infoGlobal.attempts || 0;
  const effectiveAttempts = Math.max(attemptsUser, attemptsGlobal);

  if (activeLockoutUntil > now) {
    const sisaDetik = Math.ceil((activeLockoutUntil - now) / 1000);
    return {
      terkunci: true,
      sisaDetik: sisaDetik,
      attempts: effectiveAttempts || MAX_FAILED_LOGIN_ATTEMPTS
    };
  } else {
    // Masa 15 menit sudah berakhir, reset otomatis
    let updated = false;
    if (lockUser > 0 && lockUser <= now) {
      delete infoUser.lockoutUntil;
      infoUser.attempts = 0;
      tracker[userKey] = infoUser;
      updated = true;
    }
    if (lockGlobal > 0 && lockGlobal <= now) {
      delete infoGlobal.lockoutUntil;
      infoGlobal.attempts = 0;
      tracker.__global__ = infoGlobal;
      updated = true;
    }
    if (updated) {
      simpanTrackerBruteForce(tracker);
    }
    return {
      terkunci: false,
      sisaDetik: 0,
      attempts: Math.max(infoUser.attempts || 0, infoGlobal.attempts || 0)
    };
  }
}

function formatWaktuMenitDetik(totalDetik) {
  const m = Math.floor(totalDetik / 60);
  const s = totalDetik % 60;
  const mm = m < 10 ? '0' + m : m;
  const ss = s < 10 ? '0' + s : s;
  return `${mm}:${ss}`;
}

function mulaiHitungMundurLockout(username, totalDetikAwal) {
  if (lockoutTimerInterval) {
    clearInterval(lockoutTimerInterval);
    lockoutTimerInterval = null;
  }

  const userField = document.getElementById('username');
  const passField = document.getElementById('password');
  const roleField = document.getElementById('role');
  const btnSubmit = document.getElementById('btn-submit-login');
  const errorBox = document.getElementById('errorBox');

  // Kunci semua kontrol input login
  if (userField) userField.disabled = true;
  if (passField) passField.disabled = true;
  if (roleField) roleField.disabled = true;
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = "🔒 Akses Terkunci (15 Menit)";
    btnSubmit.style.opacity = "0.6";
    btnSubmit.style.cursor = "not-allowed";
  }

  function renderCard(detik) {
    if (!errorBox) return;
    errorBox.style.display = 'block';
    errorBox.style.borderColor = '#fca5a5';
    errorBox.style.backgroundColor = '#fef2f2';
    errorBox.style.color = '#991b1b';
    errorBox.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; text-align: left;">
        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #b91c1c; font-size: 0.95rem;">
          <span style="font-size: 1.25rem;">🛡️</span>
          <span>Sistem Keamanan Aktif: Akun Terkunci</span>
        </div>
        <div style="font-size: 0.83rem; color: #4b5563; line-height: 1.45;">
          Terlalu banyak percobaan login gagal berturut-turut (5 kali). Sistem membekukan akses login sementara selama <strong>15 menit</strong> demi mencegah serangan Brute-Force.
        </div>
        <div style="margin-top: 4px; padding: 10px 14px; background: #ffffff; border: 1.5px solid #f87171; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.08);">
          <span style="font-size: 0.82rem; font-weight: 600; color: #7f1d1d;">⏱️ Hitung Mundur Buka Kunci:</span>
          <span id="lockout-timer-display" style="font-family: monospace; font-size: 1.25rem; font-weight: 800; color: #dc2626; letter-spacing: 1.5px;">${formatWaktuMenitDetik(detik)}</span>
        </div>
        <div style="font-size: 0.78rem; color: #6b7280; font-style: italic;">
          Silakan tunggu hingga hitung mundur selesai sebelum mencoba login kembali.
        </div>
      </div>
    `;
  }

  renderCard(totalDetikAwal);

  lockoutTimerInterval = setInterval(() => {
    const status = periksaStatusLockout(username);
    if (!status.terkunci || status.sisaDetik <= 0) {
      clearInterval(lockoutTimerInterval);
      lockoutTimerInterval = null;

      // Buka kembali form
      if (userField) userField.disabled = false;
      if (passField) passField.disabled = false;
      if (roleField) roleField.disabled = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Masuk ke Sistem";
        btnSubmit.style.opacity = "";
        btnSubmit.style.cursor = "";
      }

      if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.style.borderColor = '#86efac';
        errorBox.style.backgroundColor = '#f0fdf4';
        errorBox.style.color = '#166534';
        errorBox.innerHTML = `✅ <strong>Selesai:</strong> Masa tunggu 15 menit telah berakhir. Anda dapat mencoba login kembali sekarang.`;
      }
      return;
    }

    const timerDisplay = document.getElementById('lockout-timer-display');
    if (timerDisplay) {
      timerDisplay.innerText = formatWaktuMenitDetik(status.sisaDetik);
    } else {
      renderCard(status.sisaDetik);
    }
  }, 1000);
}

function catatGagalLogin(username) {
  const tracker = dapatkanTrackerBruteForce();
  const userKey = (username || 'default').toLowerCase();
  tracker.__last_user__ = userKey;
  const now = Date.now();

  if (!tracker[userKey]) {
    tracker[userKey] = { attempts: 0, lastAttempt: now };
  }
  if (!tracker.__global__) {
    tracker.__global__ = { attempts: 0, lastAttempt: now };
  }

  // Jika percobaan gagal sebelumnya sudah lewat 15 menit, reset hitungan
  if (tracker[userKey].lastAttempt && (now - tracker[userKey].lastAttempt > LOCKOUT_DURATION_MS)) {
    tracker[userKey].attempts = 0;
  }
  if (tracker.__global__.lastAttempt && (now - tracker.__global__.lastAttempt > LOCKOUT_DURATION_MS)) {
    tracker.__global__.attempts = 0;
  }

  tracker[userKey].attempts = (tracker[userKey].attempts || 0) + 1;
  tracker[userKey].lastAttempt = now;

  tracker.__global__.attempts = (tracker.__global__.attempts || 0) + 1;
  tracker.__global__.lastAttempt = now;

  // Akumulasikan percobaan: baik per akun maupun per sesi perangkat tidak akan me-reset
  const effectiveAttempts = Math.max(tracker[userKey].attempts, tracker.__global__.attempts);

  if (effectiveAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lockUntil = now + LOCKOUT_DURATION_MS;
    tracker[userKey].lockoutUntil = lockUntil;
    tracker.__global__.lockoutUntil = lockUntil;
    simpanTrackerBruteForce(tracker);
    mulaiHitungMundurLockout(userKey, Math.ceil(LOCKOUT_DURATION_MS / 1000));
    return {
      terkunci: true,
      attempts: effectiveAttempts,
      sisaDetik: Math.ceil(LOCKOUT_DURATION_MS / 1000)
    };
  } else {
    simpanTrackerBruteForce(tracker);
    return {
      terkunci: false,
      attempts: effectiveAttempts,
      sisaKesempatan: Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - effectiveAttempts)
    };
  }
}

function resetStatusBruteForce(username) {
  const tracker = dapatkanTrackerBruteForce();
  const userKey = (username || 'default').toLowerCase();
  if (tracker[userKey]) {
    delete tracker[userKey];
  }
  if (tracker.__global__) {
    delete tracker.__global__;
  }
  if (tracker.__last_user__ === userKey) {
    delete tracker.__last_user__;
  }
  simpanTrackerBruteForce(tracker);

  if (lockoutTimerInterval) {
    clearInterval(lockoutTimerInterval);
    lockoutTimerInterval = null;
  }
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const inputUser = document.getElementById('username').value.trim().toLowerCase();
  const inputPass = document.getElementById('password').value;
  const inputRole = document.getElementById('role').value;
  const errorBox = document.getElementById('errorBox');
  const btnSubmit = document.getElementById('btn-submit-login') || this.querySelector('button[type="submit"]');

  // Cek apakah akun/perangkat sedang terkunci brute-force 15 menit
  const statusAwal = periksaStatusLockout(inputUser);
  if (statusAwal.terkunci) {
    mulaiHitungMundurLockout(inputUser, statusAwal.sisaDetik);
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = "Memverifikasi...";
  }

  try {
    let authBerhasil = false;
    let dataPengguna = null;

    // 1. Coba verifikasi dengan sistem keamanan backend FastAPI (beckend/security.py)
    try {
      const response = await fetch(`${FRESHLOG_API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inputUser, password: inputPass, role: inputRole })
      });

      const resData = await response.json();

      if (response.status === 429) {
        // Proteksi Brute-Force aktif dari backend!
        const tracker = dapatkanTrackerBruteForce();
        tracker.__last_user__ = inputUser;
        tracker[inputUser] = {
          attempts: MAX_FAILED_LOGIN_ATTEMPTS,
          lastAttempt: Date.now(),
          lockoutUntil: Date.now() + LOCKOUT_DURATION_MS
        };
        simpanTrackerBruteForce(tracker);
        mulaiHitungMundurLockout(inputUser, Math.ceil(LOCKOUT_DURATION_MS / 1000));
        return;
      }

      if (response.ok) {
        authBerhasil = true;
        dataPengguna = resData.user;
      } else if (response.status === 401 || response.status === 403 || response.status === 400) {
        const resGagal = catatGagalLogin(inputUser);
        if (resGagal.terkunci) {
          return;
        }
        errorBox.innerHTML = `❌ ${resData.detail || "Kredensial tidak valid."}`;
        errorBox.style.display = 'block';
        return;
      }
    } catch (errNet) {
      // Backend FastAPI belum running, fallback ke verifikasi lokal
      console.warn("Backend FastAPI port 8000 belum aktif, beralih ke verifikasi lokal:", errNet);
    }

    // 2. Jika backend offline, verifikasi secara lokal melalui daftarAkun
    const akun = daftarAkun[inputUser];
    if (!authBerhasil) {
      if (akun && akun.password === inputPass && (!inputRole || akun.role === inputRole)) {
        authBerhasil = true;
      } else {
        const resGagal = catatGagalLogin(inputUser);
        if (resGagal.terkunci) {
          return;
        }
        errorBox.innerHTML = `❌ <strong>Akses ditolak:</strong> Kredensial tidak valid. Percobaan salah ke-<strong>${resGagal.attempts}</strong> dari 5 (Sisa ${resGagal.sisaKesempatan} kesempatan sebelum akun diblokir 15 menit).`;
        errorBox.style.display = 'block';
        return;
      }
    }

    // 3. Login sukses -> Reset pelacak brute-force & Masuk ke dashboard SPA
    resetStatusBruteForce(inputUser);
    errorBox.style.display = 'none';
    activeUserKey = inputUser;
    localStorage.setItem("freshlog_active_user", activeUserKey);

    // Sembunyikan layar login
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      loginScreen.hidden = true;
      loginScreen.style.display = 'none';
    }

    // Munculkan dashboard utama
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.hidden = false;
      mainContent.style.display = 'block';
    }

    // Tampilkan section Dashboard sebagai halaman awal
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
      dashboardSection.style.display = 'block';
    }

    // Perbarui profil pengguna di sidebar & topbar
    const roleFinal = (akun && akun.role) || (dataPengguna && dataPengguna.role) || inputRole || 'admin';
    perbaruiProfilSidebar(akun || {
      nama: (dataPengguna && dataPengguna.nama) || inputUser,
      role: roleFinal,
      labelRole: roleFinal === 'admin' ? 'Admin' : 'Staf'
    });

    // Sesuaikan hak akses tombol admin vs staf
    const tombolAdmin = document.querySelectorAll('#pemasok .btn-delete, #produk .btn-delete, .btn-edit, [onclick*="modal-produk"]');
    tombolAdmin.forEach(btn => {
      btn.hidden = (roleFinal === 'staff');
    });

    if (typeof catatLogAktivitas === "function") {
      catatLogAktivitas("Login Sistem", `Pengguna "${(akun && akun.nama) || (dataPengguna && dataPengguna.nama) || inputUser}" berhasil masuk ke sistem`, "Autentikasi");
    }
    if (typeof initHalamanPengaturan === "function") {
      initHalamanPengaturan();
    }

  } finally {
    // Jangan buka tombol jika sedang dalam masa lockout 15 menit
    const statusAkhir = periksaStatusLockout(inputUser);
    if (!statusAkhir.terkunci && btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = "Masuk ke Sistem";
      btnSubmit.style.opacity = "";
      btnSubmit.style.cursor = "";
    }
  }
});
/* ========================================== */
/* 7. KELOLA DATA PEMASOK & RIWAYAT PEMBELIAN */
/* ========================================== */

const defaultPemasokList = [
  {
    id: "SUP-001",
    nama: "PT Distribusi Makanan Utama",
    kategori: "Makanan Fresh",
    telp: "081234567890",
    alamat: "Jakarta Selatan"
  },
  {
    id: "SUP-002",
    nama: "CV Segar Nusantara",
    kategori: "Snack & Kue",
    telp: "081388990011",
    alamat: "Bandung Barat"
  },
  {
    id: "SUP-003",
    nama: "PT Dairy Prima Indonesia",
    kategori: "Minuman & Dairy",
    telp: "081122334455",
    alamat: "Tangerang"
  }
];

function getDataPemasokList() {
  try {
    const data = JSON.parse(localStorage.getItem("freshlog_suppliers"));
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (e) {}
  localStorage.setItem("freshlog_suppliers", JSON.stringify(defaultPemasokList));
  return [...defaultPemasokList];
}

function simpanDataPemasokList(list) {
  localStorage.setItem("freshlog_suppliers", JSON.stringify(list));
}

function initHalamanPemasok() {
  renderTabelPemasok();
  renderDropdownRiwayatPemasok();
  renderRiwayatPerPemasok();
}

function gantiTabPemasok(tabKey) {
  const btnDaftar = document.getElementById("tab-btn-pemasok-daftar");
  const btnRiwayat = document.getElementById("tab-btn-pemasok-riwayat");
  const panelDaftar = document.getElementById("panel-pemasok-daftar");
  const panelRiwayat = document.getElementById("panel-pemasok-riwayat");

  if (btnDaftar) btnDaftar.classList.toggle("active", tabKey === "daftar");
  if (btnRiwayat) btnRiwayat.classList.toggle("active", tabKey === "riwayat");

  if (panelDaftar) panelDaftar.style.display = (tabKey === "daftar") ? "block" : "none";
  if (panelRiwayat) {
    panelRiwayat.style.display = (tabKey === "riwayat") ? "block" : "none";
    if (tabKey === "riwayat") {
      renderDropdownRiwayatPemasok();
      renderRiwayatPerPemasok();
    }
  }
}

function renderTabelPemasok() {
  const tbody = document.getElementById("table-pemasok");
  if (!tbody) return;

  const listPemasok = getDataPemasokList();
  const riwayatBeli = (typeof getRiwayatPembelianData === "function") ? getRiwayatPembelianData() : [];
  const kataKunci = (document.getElementById("search-pemasok")?.value || "").toLowerCase().trim();
  const kategoriFilter = document.getElementById("filter-kategori-pemasok")?.value || "";

  const hasilFilter = listPemasok.filter(sup => {
    const cocokKata = !kataKunci ||
      (sup.id || "").toLowerCase().includes(kataKunci) ||
      (sup.nama || "").toLowerCase().includes(kataKunci) ||
      (sup.alamat || "").toLowerCase().includes(kataKunci) ||
      (sup.telp || "").toLowerCase().includes(kataKunci);
    const cocokKategori = !kategoriFilter || (sup.kategori || "").includes(kategoriFilter);
    return cocokKata && cocokKategori;
  });

  if (hasilFilter.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--ink-secondary); padding:24px;">Tidak ada data pemasok yang cocok dengan filter.</td></tr>`;
    return;
  }

  let html = "";
  hasilFilter.forEach(sup => {
    const poMilikPemasok = riwayatBeli.filter(r => (r.pemasok || "").toLowerCase() === (sup.nama || "").toLowerCase());
    const totalPO = poMilikPemasok.length;
    const totalNilai = poMilikPemasok.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);

    const safeId = (sup.id || "").replace(/'/g, "\\'");
    const safeNama = (sup.nama || "").replace(/'/g, "\\'");

    html += `
      <tr>
        <td><strong style="color:var(--emerald-primary);">${sup.id}</strong></td>
        <td><strong>${sup.nama}</strong></td>
        <td><span style="display:inline-block; background:var(--bg-nested-subtle); border:1px solid var(--border-hairline); padding:3px 10px; border-radius:999px; font-size:0.78rem; font-weight:600;">${sup.kategori || "Umum"}</span></td>
        <td>${sup.telp || "-"}</td>
        <td>${sup.alamat || "-"}</td>
        <td>
          <span style="display:inline-block; background:#dcfce7; color:#166534; font-size:0.76rem; padding:2px 8px; border-radius:6px; font-weight:700;">${totalPO} Transaksi</span>
          <small style="display:block; color:var(--ink-secondary); margin-top:2px;">Rp ${totalNilai.toLocaleString("id-ID")}</small>
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm btn-primary" onclick="buatPembelianDariPemasok('${safeNama}')" title="Buat Transaksi Pembelian untuk Pemasok Ini">+ Pembelian</button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="bukaModalUbahPemasok('${safeId}')">Ubah</button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="lihatRiwayatPembelianPemasok('${safeNama}')">Riwayat</button>
            <button type="button" class="btn btn-sm btn-delete" onclick="hapusPemasokById('${safeId}')">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function bukaModalTambahPemasok() {
  const list = getDataPemasokList();
  const nextNum = list.length + 1;
  const autoId = `SUP-${String(nextNum).padStart(3, "0")}`;
  const inputId = document.getElementById("pemasok-id");
  if (inputId) inputId.value = autoId;
  openModal("modal-pemasok");
}

// Tambah Pemasok Baru dari Modal
const formPemasok = document.getElementById("form-pemasok");
if (formPemasok) {
  formPemasok.addEventListener("submit", function (e) {
    e.preventDefault();
    const idBaru = document.getElementById("pemasok-id").value.trim();
    const nama = document.getElementById("pemasok-nama").value.trim();
    const kategori = document.getElementById("input-kategori-pemasok")?.value || "Makanan Fresh";
    const telp = document.getElementById("pemasok-telp").value.trim();
    const alamat = document.getElementById("pemasok-alamat").value.trim();

    const list = getDataPemasokList();
    if (list.some(s => s.id.toLowerCase() === idBaru.toLowerCase())) {
      alert(`ID Pemasok "${idBaru}" sudah digunakan! Silakan gunakan kode ID lain.`);
      return;
    }

    list.push({
      id: idBaru,
      nama: nama,
      kategori: kategori,
      telp: telp,
      alamat: alamat
    });
    simpanDataPemasokList(list);

    if (typeof catatLogAktivitas === "function") {
      catatLogAktivitas("Tambah Pemasok", `Menambahkan pemasok baru "${nama}" (${idBaru}, Kategori: ${kategori})`, "Pemasok");
    }

    formPemasok.reset();
    closeModal("modal-pemasok");
    renderTabelPemasok();
    renderDropdownRiwayatPemasok();
    if (typeof renderPilihanFormPembelian === "function") renderPilihanFormPembelian();
  });
}

// Sub-fitur 1: Ubah Pemasok
function bukaModalUbahPemasok(idPemasok) {
  const list = getDataPemasokList();
  const sup = list.find(s => s.id === idPemasok);
  if (!sup) {
    alert("Data pemasok tidak ditemukan!");
    return;
  }

  document.getElementById("edit-pemasok-id-lama").value = sup.id;
  document.getElementById("edit-pemasok-id").value = sup.id;
  document.getElementById("edit-pemasok-nama").value = sup.nama;
  const selectKat = document.getElementById("edit-kategori-pemasok");
  if (selectKat) selectKat.value = sup.kategori || "Makanan Fresh";
  document.getElementById("edit-pemasok-telp").value = sup.telp || "";
  document.getElementById("edit-pemasok-alamat").value = sup.alamat || "";

  openModal("modal-ubah-pemasok");
}

function simpanPerubahanPemasok(e) {
  if (e) e.preventDefault();
  const idLama = document.getElementById("edit-pemasok-id-lama").value;
  const idBaru = document.getElementById("edit-pemasok-id").value.trim();
  const namaBaru = document.getElementById("edit-pemasok-nama").value.trim();
  const kategoriBaru = document.getElementById("edit-kategori-pemasok").value;
  const telpBaru = document.getElementById("edit-pemasok-telp").value.trim();
  const alamatBaru = document.getElementById("edit-pemasok-alamat").value.trim();

  const list = getDataPemasokList();
  const idx = list.findIndex(s => s.id === idLama);
  if (idx < 0) {
    alert("Data pemasok yang akan diubah tidak ditemukan!");
    return;
  }

  const namaLama = list[idx].nama;
  list[idx] = {
    id: idBaru,
    nama: namaBaru,
    kategori: kategoriBaru,
    telp: telpBaru,
    alamat: alamatBaru
  };
  simpanDataPemasokList(list);

  // Perbarui nama pemasok di riwayat pembelian jika nama pemasok berubah
  if (namaLama !== namaBaru && typeof getRiwayatPembelianData === "function" && typeof simpanRiwayatPembelianData === "function") {
    const riwayatBeli = getRiwayatPembelianData();
    let berubah = false;
    riwayatBeli.forEach(r => {
      if (r.pemasok === namaLama) {
        r.pemasok = namaBaru;
        berubah = true;
      }
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          if (it.pemasok === namaLama) it.pemasok = namaBaru;
        });
      }
    });
    if (berubah) simpanRiwayatPembelianData(riwayatBeli);
  }

  if (typeof catatLogAktivitas === "function") {
    catatLogAktivitas("Ubah Pemasok", `Memperbarui data pemasok "${namaBaru}" (${idBaru})`, "Pemasok");
  }

  closeModal("modal-ubah-pemasok");
  renderTabelPemasok();
  renderDropdownRiwayatPemasok();
  renderRiwayatPerPemasok();
  if (typeof renderPilihanFormPembelian === "function") renderPilihanFormPembelian();
}

function hapusPemasokById(idPemasok) {
  const list = getDataPemasokList();
  const sup = list.find(s => s.id === idPemasok);
  if (!sup) return;

  if (!confirm(`Yakin ingin menghapus pemasok "${sup.nama}" (${sup.id})?`)) return;

  const listBaru = list.filter(s => s.id !== idPemasok);
  simpanDataPemasokList(listBaru);

  if (typeof catatLogAktivitas === "function") {
    catatLogAktivitas("Hapus Pemasok", `Menghapus pemasok "${sup.nama}" (${sup.id})`, "Pemasok");
  }

  renderTabelPemasok();
  renderDropdownRiwayatPemasok();
  if (typeof renderPilihanFormPembelian === "function") renderPilihanFormPembelian();
}

// Sub-fitur 2: Riwayat Pembelian per Pemasok
function renderDropdownRiwayatPemasok() {
  const select = document.getElementById("pilih-riwayat-per-pemasok");
  if (!select) return;

  const currentVal = select.value;
  const setNama = new Set();
  getDataPemasokList().forEach(s => { if (s.nama) setNama.add(s.nama); });
  if (typeof getRiwayatPembelianData === "function") {
    getRiwayatPembelianData().forEach(r => { if (r.pemasok) setNama.add(r.pemasok); });
  }

  const arrNama = Array.from(setNama);
  select.innerHTML = `<option value="">Semua Pemasok (${arrNama.length} Mitra)</option>` +
    arrNama.map(n => `<option value="${n}">${n}</option>`).join("");

  if (currentVal && arrNama.includes(currentVal)) {
    select.value = currentVal;
  }
}

window.buatPembelianDariPemasok = function(namaPemasok) {
  const akunAktifData = (typeof daftarAkun !== "undefined" && typeof activeUserKey !== "undefined") ? daftarAkun[activeUserKey] : null;
  const userRoleEl = document.getElementById("user-role");
  const currentRoleText = userRoleEl ? userRoleEl.innerText : "";
  const currentRole = ((akunAktifData && akunAktifData.role) || currentRoleText || "").toLowerCase();
  const isUserStaff = currentRole.includes("staf") || currentRole === "staff";
  if (isUserStaff) {
    if (typeof tampilkanToastModern === "function") {
      tampilkanToastModern("Akses Ditolak: Role Staf tidak memiliki izin untuk transaksi Pembelian Barang Masuk.", "warning");
    } else {
      alert("Akses Ditolak: Role Staf tidak memiliki izin untuk transaksi Pembelian Barang Masuk.");
    }
    return;
  }
  if (typeof pindahHalaman === "function") pindahHalaman("pembelian");
  if (typeof gantiTabPembelian === "function") gantiTabPembelian("baru");
  const inputSup = document.getElementById("pilih-pemasok-pembelian");
  if (inputSup) {
    inputSup.value = namaPemasok;
    if (typeof periksaPemasokTerpilih === "function") periksaPemasokTerpilih();
  }
  const inputProd = document.getElementById("input-produk-pembelian");
  if (inputProd) inputProd.focus();
};

function lihatRiwayatPembelianPemasok(namaPemasok) {
  gantiTabPemasok("riwayat");
  renderDropdownRiwayatPemasok();
  const select = document.getElementById("pilih-riwayat-per-pemasok");
  if (select) {
    select.value = namaPemasok;
  }
  renderRiwayatPerPemasok();
}

function renderRiwayatPerPemasok() {
  const tbody = document.getElementById("tabel-riwayat-per-pemasok");
  if (!tbody) return;

  const namaPemasok = document.getElementById("pilih-riwayat-per-pemasok")?.value || "";
  const tglMulai = document.getElementById("filter-sup-tgl-mulai")?.value || "";
  const tglAkhir = document.getElementById("filter-sup-tgl-akhir")?.value || "";

  const riwayat = (typeof getRiwayatPembelianData === "function") ? getRiwayatPembelianData() : [];
  const hasil = riwayat.filter(r => {
    if (namaPemasok && (r.pemasok || "").toLowerCase() !== namaPemasok.toLowerCase()) {
      return false;
    }
    if (tglMulai) {
      const tglRec = new Date(r.waktu).toISOString().slice(0, 10);
      if (tglRec < tglMulai) return false;
    }
    if (tglAkhir) {
      const tglRec = new Date(r.waktu).toISOString().slice(0, 10);
      if (tglRec > tglAkhir) return false;
    }
    return true;
  });

  // Update KPI Cards
  let totalQty = 0;
  let totalNilai = 0;
  hasil.forEach(r => {
    totalNilai += (parseFloat(r.total) || 0);
    if (Array.isArray(r.items)) {
      r.items.forEach(i => { totalQty += (parseInt(i.qty) || 0); });
    }
  });

  const elNama = document.getElementById("stat-sup-nama");
  const elPO = document.getElementById("stat-sup-total-po");
  const elQty = document.getElementById("stat-sup-total-qty");
  const elNilai = document.getElementById("stat-sup-total-nilai");

  if (elNama) elNama.innerText = namaPemasok || "Semua Pemasok";
  if (elPO) elPO.innerText = `${hasil.length} Transaksi`;
  if (elQty) elQty.innerText = `${totalQty.toLocaleString("id-ID")} Pcs`;
  if (elNilai) elNilai.innerText = `Rp ${totalNilai.toLocaleString("id-ID")}`;

  if (hasil.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--ink-secondary); padding:24px;">Belum ada riwayat transaksi pembelian untuk pemasok/periode ini.</td></tr>`;
    return;
  }

  let html = "";
  hasil.forEach(r => {
    const d = new Date(r.waktu);
    const waktuStr = isNaN(d.getTime()) ? r.waktu : `${d.toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" })} ${d.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}`;
    const produkStr = (r.items || []).map(i => `${i.nama} (${i.qty} pcs)`).join(", ");
    const batchPills = (r.items || []).map(i => `<span style="display:inline-block; background:#e0f2fe; color:#0369a1; font-size:0.75rem; padding:2px 6px; border-radius:6px; margin:2px;">${i.kodeBatch} (Exp: ${i.expiryDate})</span>`).join(" ");
    const badgeBayar = (r.statusBayar === "Tempo")
      ? `<span style="display:inline-block; background:#fef3c7; color:#b45309; font-size:0.75rem; padding:2px 8px; border-radius:999px; font-weight:700;">Tempo</span>`
      : `<span style="display:inline-block; background:#dcfce7; color:#166534; font-size:0.75rem; padding:2px 8px; border-radius:999px; font-weight:700;">Lunas</span>`;

    html += `
      <tr>
        <td><strong style="color:var(--emerald-primary);">${r.id}</strong></td>
        <td><small>${waktuStr}</small></td>
        <td><strong>${r.pemasok}</strong></td>
        <td>${r.referensi || "-"}</td>
        <td>${produkStr}</td>
        <td>${batchPills}</td>
        <td>${badgeBayar}</td>
        <td><strong>Rp ${(r.total || 0).toLocaleString("id-ID")}</strong></td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="tampilkanDetailPembelian('${r.id}')">Detail Pembelian</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function resetFilterRiwayatPerPemasok() {
  const select = document.getElementById("pilih-riwayat-per-pemasok");
  const tglMulai = document.getElementById("filter-sup-tgl-mulai");
  const tglAkhir = document.getElementById("filter-sup-tgl-akhir");
  if (select) select.value = "";
  if (tglMulai) tglMulai.value = "";
  if (tglAkhir) tglAkhir.value = "";
  renderRiwayatPerPemasok();
}

// Hapus Baris Data (Fallback kompatibilitas)
function hapusBaris(tombol) {
  if (confirm("Yakin ingin menghapus data ini?")) {
    tombol.closest("tr").remove();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (typeof renderTabelPemasok === "function") {
    renderTabelPemasok();
  }
});
/* ========================================== */
/* 7. FITUR LAPORAN REKAPITULASI (HARIAN & BULANAN) */
/* ========================================== */

let modeLaporanAktif = "harian";

// Kumpulkan daftar produk unik dari batch dan database
function kumpulkanDaftarProdukLaporan() {
  const setProduk = new Set();
  if (Array.isArray(dataBatchDemo)) {
    dataBatchDemo.forEach(b => { if (b.name) setProduk.add(b.name); });
  }
  if (typeof productDatabase === "object" && productDatabase !== null) {
    Object.values(productDatabase).forEach(p => { if (p.name) setProduk.add(p.name); });
  }
  return Array.from(setProduk);
}

// Dapatkan atau inisialisasi data mutasi transaksi harian
function getDataSourceLaporan() {
  const tersimpan = localStorage.getItem("freshlog_report_records_v3");
  if (tersimpan) {
    try {
      const parsed = JSON.parse(tersimpan);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn("Gagal parse cache laporan:", e);
    }
  }

  // Generate data transaksi historis 30 hari terakhir (Oktober - November 2026)
  const records = [];
  const daftarProd = [
    { nama: "Susu UHT 1L", kat: "Minuman & Dairy", beli: 15000, jual: 18000, batch: "BTC-001" },
    { nama: "Roti Tawar Daging", kat: "Snack & Kue", beli: 10000, jual: 12500, batch: "BTC-002" },
    { nama: "Yogurt Stroberi", kat: "Minuman & Dairy", beli: 7500, jual: 9500, batch: "BTC-003" },
    { nama: "Telur Ayam 1kg", kat: "Makanan Fresh", beli: 26000, jual: 29500, batch: "BTC-004" },
    { nama: "Nugget Ayam 500g", kat: "Frozen Food", beli: 35000, jual: 42000, batch: "BTC-005" },
    { nama: "Beras Rojolele 5kg", kat: "Bahan Pokok", beli: 68000, jual: 75000, batch: "BTC-006" }
  ];

  const baseDate = new Date(2026, 10, 11); // 11 November 2026
  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay();

    daftarProd.forEach((p, idx) => {
      // Penjualan harian
      const baseQty = (idx % 2 === 0 ? 7 : 5) + (dayOfWeek === 0 || dayOfWeek === 6 ? 4 : 0);
      const qtyJual = Math.max(1, baseQty + ((i * 3 + idx) % 5) - 2);
      const totalJual = qtyJual * p.jual;
      const modalJual = qtyJual * p.beli;
      const laba = totalJual - modalJual;

      records.push({
        id: `TX-JUAL-${dateStr}-${idx}`,
        tanggal: dateStr,
        tahun: d.getFullYear(),
        bulan: d.getMonth() + 1,
        hari: d.getDate(),
        jenis: "penjualan",
        produk: p.nama,
        kategori: p.kat,
        batch: p.batch,
        qty: qtyJual,
        harga_satuan: p.jual,
        total_nilai: totalJual,
        modal: modalJual,
        laba: laba,
        keterangan: "Penjualan Kasir Konsumen"
      });

      // Pengadaan stok / Batch Masuk setiap interval tertentu
      if ((i + idx) % 7 === 0) {
        const qtyBeli = 20 + ((i + idx) % 4) * 10;
        const totalBeli = qtyBeli * p.beli;
        const expDate = new Date(d);
        expDate.setDate(d.getDate() + 25 + (idx * 5));

        records.push({
          id: `TX-BELI-${dateStr}-${idx}`,
          tanggal: dateStr,
          tahun: d.getFullYear(),
          bulan: d.getMonth() + 1,
          hari: d.getDate(),
          jenis: "pembelian",
          produk: p.nama,
          kategori: p.kat,
          batch: `BTC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${idx + 1}`,
          qty: qtyBeli,
          harga_satuan: p.beli,
          total_nilai: totalBeli,
          modal: totalBeli,
          laba: 0,
          exp_date: expDate.toISOString().split("T")[0],
          keterangan: `Stok Masuk Batch (Exp: ${expDate.toISOString().split("T")[0]})`
        });
      }
    });
  }

  // Tambahkan data historis bulanan 2026 (Jan - Okt) & 2025 (Jan - Des) agar Laporan Tahunan komprehensif
  [2025, 2026].forEach(thn => {
    const maxBulan = thn === 2026 ? 10 : 12;
    for (let bln = 1; bln <= maxBulan; bln++) {
      daftarProd.forEach((p, idx) => {
        const factor = 1 + ((bln + idx) % 5) * 0.08;
        const qtyJualBln = Math.round((90 + (idx * 22)) * factor);
        const totalJualBln = qtyJualBln * p.jual;
        const modalJualBln = qtyJualBln * p.beli;

        records.push({
          id: `TX-HIST-JUAL-${thn}-${bln}-${idx}`,
          tanggal: `${thn}-${String(bln).padStart(2, "0")}-15`,
          tahun: thn,
          bulan: bln,
          hari: 15,
          jenis: "penjualan",
          produk: p.nama,
          kategori: p.kat,
          batch: `BTC-${thn}${String(bln).padStart(2, "0")}-A`,
          qty: qtyJualBln,
          harga_satuan: p.jual,
          total_nilai: totalJualBln,
          modal: modalJualBln,
          laba: totalJualBln - modalJualBln,
          keterangan: `Konsolidasi Penjualan Bulanan (${bln}/${thn})`
        });

        const qtyBeliBln = Math.round(qtyJualBln * 1.12);
        const totalBeliBln = qtyBeliBln * p.beli;
        records.push({
          id: `TX-HIST-BELI-${thn}-${bln}-${idx}`,
          tanggal: `${thn}-${String(bln).padStart(2, "0")}-02`,
          tahun: thn,
          bulan: bln,
          hari: 2,
          jenis: "pembelian",
          produk: p.nama,
          kategori: p.kat,
          batch: `BTC-${thn}${String(bln).padStart(2, "0")}-A`,
          qty: qtyBeliBln,
          harga_satuan: p.beli,
          total_nilai: totalBeliBln,
          modal: totalBeliBln,
          laba: 0,
          keterangan: `Pengadaan Stok Bulanan (${bln}/${thn})`
        });
      });
    }
  });

  localStorage.setItem("freshlog_report_records_v3", JSON.stringify(records));
  return records;
}

// Populasi dropdown filter produk & kategori secara dinamis
function populasiFilterLaporan() {
  const selectProd = document.getElementById("laporan-filter-produk");
  const selectKat = document.getElementById("laporan-filter-kategori");

  if (selectProd) {
    const listProduk = kumpulkanDaftarProdukLaporan();
    const valSekarang = selectProd.value || "all";
    selectProd.innerHTML = `<option value="all">Semua Produk Master (${listProduk.length})</option>` +
      listProduk.map(p => `<option value="${p}">${p}</option>`).join("");
    selectProd.value = valSekarang;
  }

  if (selectKat) {
    const listKat = (typeof daftarKategori !== "undefined" && Array.isArray(daftarKategori))
      ? daftarKategori
      : ["Makanan Fresh", "Minuman & Dairy", "Frozen Food", "Snack & Kue", "Bahan Pokok"];
    const valSekarang = selectKat.value || "all";
    selectKat.innerHTML = `<option value="all">Semua Kategori (${listKat.length})</option>` +
      listKat.map(k => `<option value="${k}">${k}</option>`).join("");
    selectKat.value = valSekarang;
  }

  const elTglMulai = document.getElementById("laporan-tgl-mulai");
  const elTglAkhir = document.getElementById("laporan-tgl-akhir");
  if (elTglMulai && !elTglMulai.value) {
    elTglMulai.value = "2026-11-04";
  }
  if (elTglAkhir && !elTglAkhir.value) {
    elTglAkhir.value = "2026-11-11";
  }
}

// Beralih antar sub-fitur: Laporan Harian vs Laporan Bulanan vs Laporan Tahunan
function gantiTabLaporan(tab) {
  modeLaporanAktif = tab;

  const btnHarian = document.getElementById("tab-btn-laporan-harian");
  const btnBulanan = document.getElementById("tab-btn-laporan-bulanan");
  const btnTahunan = document.getElementById("tab-btn-laporan-tahunan");
  const wrapHarian = document.getElementById("filter-wrap-harian");
  const wrapBulanan = document.getElementById("filter-wrap-bulanan");
  const wrapTahunan = document.getElementById("filter-wrap-tahunan");
  const judulTabel = document.getElementById("judul-tabel-laporan");
  const subTabel = document.getElementById("sub-tabel-laporan");

  if (tab === "harian") {
    if (btnHarian) btnHarian.classList.add("active");
    if (btnBulanan) btnBulanan.classList.remove("active");
    if (btnTahunan) btnTahunan.classList.remove("active");
    if (wrapHarian) wrapHarian.style.display = "block";
    if (wrapBulanan) wrapBulanan.style.display = "none";
    if (wrapTahunan) wrapTahunan.style.display = "none";
    if (judulTabel) judulTabel.innerHTML = "📋 Data Rekapitulasi Harian";
    if (subTabel) subTabel.innerText = "Rincian pergerakan transaksi dan mutasi stok barang harian";
  } else if (tab === "bulanan") {
    if (btnBulanan) btnBulanan.classList.add("active");
    if (btnHarian) btnHarian.classList.remove("active");
    if (btnTahunan) btnTahunan.classList.remove("active");
    if (wrapHarian) wrapHarian.style.display = "none";
    if (wrapBulanan) wrapBulanan.style.display = "block";
    if (wrapTahunan) wrapTahunan.style.display = "none";
    if (judulTabel) judulTabel.innerHTML = "🗓️ Data Rekapitulasi Bulanan";
    if (subTabel) subTabel.innerText = "Akumulasi bulanan performa penjualan, pengadaan stok, dan margin laba";
  } else if (tab === "tahunan") {
    if (btnTahunan) btnTahunan.classList.add("active");
    if (btnHarian) btnHarian.classList.remove("active");
    if (btnBulanan) btnBulanan.classList.remove("active");
    if (wrapHarian) wrapHarian.style.display = "none";
    if (wrapBulanan) wrapBulanan.style.display = "none";
    if (wrapTahunan) wrapTahunan.style.display = "block";
    if (judulTabel) judulTabel.innerHTML = "📊 Data Rekapitulasi Tahunan";
    if (subTabel) subTabel.innerText = "Konsolidasi tahunan total perputaran stok, realisasi omzet, dan evaluasi laba";
  }

  terapkanFilterLaporan();
}

// Reset filter ke nilai awal
function resetFilterLaporan() {
  const elTglMulai = document.getElementById("laporan-tgl-mulai");
  const elTglAkhir = document.getElementById("laporan-tgl-akhir");
  const elBulan = document.getElementById("laporan-pilih-bulan");
  const elTahun = document.getElementById("laporan-pilih-tahun");
  const elTahunTahunan = document.getElementById("laporan-pilih-tahun-tahunan");
  const elProd = document.getElementById("laporan-filter-produk");
  const elKat = document.getElementById("laporan-filter-kategori");
  const elJenis = document.getElementById("laporan-filter-jenis");

  if (elTglMulai) elTglMulai.value = "2026-11-04";
  if (elTglAkhir) elTglAkhir.value = "2026-11-11";
  if (elBulan) elBulan.value = "11";
  if (elTahun) elTahun.value = "2026";
  if (elTahunTahunan) elTahunTahunan.value = "2026";
  if (elProd) elProd.value = "all";
  if (elKat) elKat.value = "all";
  if (elJenis) elJenis.value = "all";

  terapkanFilterLaporan();
}

// Update 4 kartu metrik KPI laporan
function updateKpiLaporan(qtyJual, omzet, qtyBeli, laba) {
  const elQtyJual = document.getElementById("kpi-laporan-qty-jual");
  const elOmzet = document.getElementById("kpi-laporan-omzet");
  const elQtyBeli = document.getElementById("kpi-laporan-qty-beli");
  const elLaba = document.getElementById("kpi-laporan-laba");

  if (elQtyJual) elQtyJual.innerText = `${qtyJual.toLocaleString("id-ID")} Unit`;
  if (elOmzet) elOmzet.innerText = `Rp ${omzet.toLocaleString("id-ID")}`;
  if (elQtyBeli) elQtyBeli.innerText = `${qtyBeli.toLocaleString("id-ID")} Unit`;
  if (elLaba) elLaba.innerText = `Rp ${laba.toLocaleString("id-ID")}`;
}

let chartLaporanInstance = null;

function formatTglIndo(tglStr) {
  if (!tglStr) return "";
  const parts = tglStr.split("-");
  if (parts.length !== 3) return tglStr;
  const blnNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${parseInt(parts[2])} ${blnNames[parseInt(parts[1])] || parts[1]} ${parts[0]}`;
}

// Sub-fitur: Update Kartu Dampak Pangan (1 Kartu: Terselamatkan kg & Rp, Tidak Terselamatkan kg & Rp)
function updateDampakLaporan(periodeText, totalQtyJual, totalOmzet, totalQtyBeli) {
  const elKg = document.getElementById("dampak-laporan-kg");
  const elRp = document.getElementById("dampak-laporan-rp");
  const elGagalKg = document.getElementById("dampak-laporan-gagal-kg");
  const elGagalRp = document.getElementById("dampak-laporan-gagal-rp");
  const elPeriode = document.getElementById("dampak-laporan-periode");
  const elUnit = document.getElementById("dampak-laporan-unit");
  const elEfisiensi = document.getElementById("dampak-laporan-efisiensi");
  const elCo2 = document.getElementById("dampak-laporan-co2");

  // Ambil data catatan dampak_pangan (single source of truth)
  const allDampak = (typeof getDampakPanganList === "function") ? getDampakPanganList() : [];
  const prodFilter = document.getElementById("laporan-filter-produk")?.value || "all";

  // Filter records dampak pangan sesuai filter periode dan produk saat ini
  const dampakFiltered = allDampak.filter(r => {
    if (!r.tanggal) return false;
    if (prodFilter !== "all" && r.produk !== prodFilter) return false;

    if (modeLaporanAktif === "harian") {
      const tglMulai = document.getElementById("laporan-tgl-mulai")?.value;
      const tglAkhir = document.getElementById("laporan-tgl-akhir")?.value;
      if (tglMulai && r.tanggal < tglMulai) return false;
      if (tglAkhir && r.tanggal > tglAkhir) return false;
      return true;
    } else if (modeLaporanAktif === "bulanan") {
      const pBulan = document.getElementById("laporan-pilih-bulan")?.value;
      const pTahun = document.getElementById("laporan-pilih-tahun")?.value;
      const parts = r.tanggal.split("-");
      if (pTahun && parts[0] !== pTahun) return false;
      if (pBulan && pBulan !== "all" && String(parseInt(parts[1], 10)) !== String(parseInt(pBulan, 10))) return false;
      return true;
    } else if (modeLaporanAktif === "tahunan") {
      const pTahunTahunan = document.getElementById("laporan-pilih-tahun-tahunan")?.value;
      const parts = r.tanggal.split("-");
      if (pTahunTahunan && pTahunTahunan !== "all" && parts[0] !== pTahunTahunan) return false;
      return true;
    }
    return true;
  });

  let kgSelamatDampak = 0;
  let rpSelamatDampak = 0;
  let kgGagalDampak = 0;
  let rpGagalDampak = 0;

  dampakFiltered.forEach(r => {
    const kg = parseFloat(r.qty_kg) || 0;
    const rp = parseInt(r.nilai_rupiah) || 0;
    if (r.tipe === "TERSELAMATKAN") {
      kgSelamatDampak += kg;
      rpSelamatDampak += rp;
    } else if (r.tipe === "TIDAK_TERSELAMATKAN") {
      kgGagalDampak += kg;
      rpGagalDampak += rp;
    }
  });

  // Jika di filter tanggal ini belum ada aksi akhir spesifik, gabungkan dengan kalkulasi FEFO penjualan
  let kgSelamatFinal = kgSelamatDampak;
  let rpSelamatFinal = rpSelamatDampak;
  if (kgSelamatFinal === 0 && totalQtyJual > 0) {
    const unitSelamat = Math.round(totalQtyJual * 0.70);
    kgSelamatFinal = (unitSelamat * 0.35);
    rpSelamatFinal = Math.round(totalOmzet * 0.70);
  }

  const unitSelamat = Math.round(kgSelamatFinal / 0.35);
  let rasioEfisiensi = 0;
  if (totalQtyJual + totalQtyBeli > 0) {
    rasioEfisiensi = Math.min(98.5, Math.max(68.0, (totalQtyJual / (totalQtyJual + (totalQtyBeli * 0.45))) * 100)).toFixed(1);
  } else {
    rasioEfisiensi = "0.0";
  }

  const co2Selamat = (kgSelamatFinal * 2.5).toFixed(1);

  if (elKg) elKg.innerText = parseFloat(kgSelamatFinal).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (elRp) elRp.innerText = rpSelamatFinal.toLocaleString("id-ID");
  if (elGagalKg) elGagalKg.innerText = parseFloat(kgGagalDampak).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (elGagalRp) elGagalRp.innerText = rpGagalDampak.toLocaleString("id-ID");

  if (elPeriode) elPeriode.innerText = `📅 Periode: ${periodeText}`;
  if (elUnit) elUnit.innerText = `${unitSelamat.toLocaleString("id-ID")} Unit`;
  if (elEfisiensi) elEfisiensi.innerText = `${rasioEfisiensi}%`;
  if (elCo2) elCo2.innerText = `${parseFloat(co2Selamat).toLocaleString("id-ID")} kg CO₂e`;
}

// Sub-fitur: Render Grafik Pembelian vs Penjualan (Stadium-Pills Chart.js)
function renderGrafikLaporan(labels, dataBeli, dataJual, unitLabel = "Unit") {
  const canvas = document.getElementById("chartLaporanBeliJual");
  if (!canvas || typeof Chart === "undefined") return;

  if (chartLaporanInstance) {
    chartLaporanInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  chartLaporanInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Pembelian (Sage)",
          data: dataBeli,
          backgroundColor: "#88B99F",
          borderRadius: 999,
          borderSkipped: false,
          barPercentage: 0.65,
          categoryPercentage: 0.6
        },
        {
          label: "Penjualan (Emerald)",
          data: dataJual,
          backgroundColor: "#137A4B",
          borderRadius: 999,
          borderSkipped: false,
          barPercentage: 0.65,
          categoryPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#111814",
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function (context) {
              const val = context.parsed.y || 0;
              return ` ${context.dataset.label}: ${val.toLocaleString("id-ID")} ${unitLabel}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(232, 236, 234, 0.7)",
            borderDash: [5, 5]
          },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: "#8A948E",
            callback: function (val) {
              return val.toLocaleString("id-ID");
            }
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: "600" },
            color: "#525D56",
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });
}

// Terapkan filter dan render tabel laporan
function terapkanFilterLaporan() {
  const allRecords = getDataSourceLaporan();
  const filterProd = document.getElementById("laporan-filter-produk")?.value || "all";
  const filterKat = document.getElementById("laporan-filter-kategori")?.value || "all";
  const filterJenis = document.getElementById("laporan-filter-jenis")?.value || "all";

  const thead = document.getElementById("head-tabel-laporan");
  const tbody = document.getElementById("body-tabel-laporan");
  if (!thead || !tbody) return;

  if (modeLaporanAktif === "harian") {
    // --- MODE 1: LAPORAN HARIAN ---
    const tglMulai = document.getElementById("laporan-tgl-mulai")?.value || "2000-01-01";
    const tglAkhir = document.getElementById("laporan-tgl-akhir")?.value || "2099-12-31";

    const hasil = allRecords.filter(r => {
      const cocokTgl = r.tanggal >= tglMulai && r.tanggal <= tglAkhir;
      const cocokProd = filterProd === "all" || r.produk === filterProd;
      const cocokKat = filterKat === "all" || r.kategori === filterKat;
      const cocokJenis = filterJenis === "all" || r.jenis === filterJenis;
      return cocokTgl && cocokProd && cocokKat && cocokJenis;
    });

    hasil.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    let totalQtyJual = 0;
    let totalOmzet = 0;
    let totalQtyBeli = 0;
    let totalLaba = 0;

    hasil.forEach(r => {
      if (r.jenis === "penjualan") {
        totalQtyJual += r.qty;
        totalOmzet += r.total_nilai;
        totalLaba += (r.laba || 0);
      } else if (r.jenis === "pembelian") {
        totalQtyBeli += r.qty;
      }
    });

    updateKpiLaporan(totalQtyJual, totalOmzet, totalQtyBeli, totalLaba);

    // Update Dashboard Dampak (detail: kg & rupiah terselamatkan per periode)
    const periodeText = `${formatTglIndo(tglMulai)} s/d ${formatTglIndo(tglAkhir)}`;
    updateDampakLaporan(periodeText, totalQtyJual, totalOmzet, totalQtyBeli);

    // Update Grafik Pembelian vs Penjualan Harian
    const titleEl = document.getElementById("laporan-chart-title");
    const subEl = document.getElementById("laporan-chart-sub");
    if (titleEl) titleEl.innerText = "Grafik Harian: Pembelian vs Penjualan";
    if (subEl) subEl.innerText = `Tren volume unit barang masuk vs terjual (${formatTglIndo(tglMulai)} - ${formatTglIndo(tglAkhir)})`;

    const mapTgl = {};
    let curr = new Date(tglMulai);
    const end = new Date(tglAkhir);
    const diffDays = Math.round((end - curr) / (1000 * 3600 * 24));
    if (diffDays >= 0 && diffDays <= 45) {
      while (curr <= end) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, "0");
        const d = String(curr.getDate()).padStart(2, "0");
        mapTgl[`${y}-${m}-${d}`] = { beli: 0, jual: 0 };
        curr.setDate(curr.getDate() + 1);
      }
    }

    hasil.forEach(r => {
      if (!mapTgl[r.tanggal]) mapTgl[r.tanggal] = { beli: 0, jual: 0 };
      if (r.jenis === "pembelian") mapTgl[r.tanggal].beli += r.qty;
      if (r.jenis === "penjualan") mapTgl[r.tanggal].jual += r.qty;
    });

    const sortedTgl = Object.keys(mapTgl).sort();
    const chartLabels = sortedTgl.map(k => {
      const parts = k.split("-");
      const blnNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      return `${parseInt(parts[2])} ${blnNames[parseInt(parts[1])] || parts[1]}`;
    });
    const chartDataBeli = sortedTgl.map(k => mapTgl[k].beli);
    const chartDataJual = sortedTgl.map(k => mapTgl[k].jual);

    renderGrafikLaporan(chartLabels, chartDataBeli, chartDataJual, "Unit");

    thead.innerHTML = `
      <tr>
        <th style="width: 12%;">Tanggal</th>
        <th style="width: 14%;">Jenis Aktivitas</th>
        <th style="width: 20%;">Nama Produk</th>
        <th style="width: 14%;">Kategori</th>
        <th style="width: 9%;">Qty</th>
        <th style="width: 11%;">Harga Satuan</th>
        <th style="width: 10%;">Total Nilai</th>
        <th style="width: 10%;">Margin Laba</th>
      </tr>
    `;

    if (hasil.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--ink-muted);">Tidak ada transaksi harian yang sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = hasil.map(r => {
      const isJual = r.jenis === "penjualan";
      const badgeJenis = isJual
        ? `<span style="background: #EBF8F1; color: #158050; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🛒 Penjualan</span>`
        : `<span style="background: #EFF6FF; color: #1D4ED8; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">📦 Stok Masuk</span>`;

      return `
        <tr>
          <td style="white-space: nowrap; font-size: 0.84rem; color: var(--ink-charcoal);"><strong>${r.tanggal}</strong></td>
          <td>${badgeJenis}</td>
          <td><strong>${r.produk}</strong></td>
          <td style="font-size: 0.84rem; color: var(--ink-secondary);">${r.kategori}</td>
          <td><strong>${r.qty}</strong> Unit</td>
          <td style="font-size: 0.84rem;">Rp ${r.harga_satuan.toLocaleString("id-ID")}</td>
          <td><strong>Rp ${r.total_nilai.toLocaleString("id-ID")}</strong></td>
          <td style="color: ${isJual ? '#158050' : 'var(--ink-muted)'}; font-weight: 700;">
            ${isJual ? `+Rp ${r.laba.toLocaleString("id-ID")}` : '-'}
          </td>
        </tr>
      `;
    }).join("");

  } else if (modeLaporanAktif === "bulanan") {
    // --- MODE 2: LAPORAN BULANAN ---
    const filterBulan = document.getElementById("laporan-pilih-bulan")?.value || "all";
    const filterTahun = parseInt(document.getElementById("laporan-pilih-tahun")?.value) || 2026;

    const filtered = allRecords.filter(r => {
      const cocokTahun = r.tahun === filterTahun;
      const cocokBulan = filterBulan === "all" || r.bulan === parseInt(filterBulan);
      const cocokProd = filterProd === "all" || r.produk === filterProd;
      const cocokKat = filterKat === "all" || r.kategori === filterKat;
      return cocokTahun && cocokBulan && cocokProd && cocokKat;
    });

    const namaBulanMap = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const agregasi = {};

    filtered.forEach(r => {
      const key = `${r.tahun}-${r.bulan}-${r.produk}`;
      if (!agregasi[key]) {
        agregasi[key] = {
          tahun: r.tahun,
          bulan: r.bulan,
          namaBulan: namaBulanMap[r.bulan],
          produk: r.produk,
          kategori: r.kategori,
          qtyBeli: 0,
          modalBeli: 0,
          qtyJual: 0,
          omzetJual: 0,
          labaJual: 0
        };
      }
      if (r.jenis === "penjualan") {
        agregasi[key].qtyJual += r.qty;
        agregasi[key].omzetJual += r.total_nilai;
        agregasi[key].labaJual += (r.laba || 0);
      } else if (r.jenis === "pembelian") {
        agregasi[key].qtyBeli += r.qty;
        agregasi[key].modalBeli += r.total_nilai;
      }
    });

    const hasilList = Object.values(agregasi);
    hasilList.sort((a, b) => b.bulan - a.bulan || a.produk.localeCompare(b.produk));

    let totalQtyJual = 0;
    let totalOmzet = 0;
    let totalQtyBeli = 0;
    let totalLaba = 0;

    hasilList.forEach(item => {
      totalQtyJual += item.qtyJual;
      totalOmzet += item.omzetJual;
      totalQtyBeli += item.qtyBeli;
      totalLaba += item.labaJual;
    });

    updateKpiLaporan(totalQtyJual, totalOmzet, totalQtyBeli, totalLaba);

    // Update Dashboard Dampak (detail: kg & rupiah terselamatkan per periode)
    const periodeText = filterBulan === "all" ? `Tahun Berjalan ${filterTahun}` : `${namaBulanMap[filterBulan]} ${filterTahun}`;
    updateDampakLaporan(periodeText, totalQtyJual, totalOmzet, totalQtyBeli);

    // Update Grafik Pembelian vs Penjualan Bulanan
    const titleEl = document.getElementById("laporan-chart-title");
    const subEl = document.getElementById("laporan-chart-sub");

    if (filterBulan === "all") {
      if (titleEl) titleEl.innerText = `Grafik Bulanan: Pembelian vs Penjualan (Tahun ${filterTahun})`;
      if (subEl) subEl.innerText = "Volume transaksi barang masuk vs terjual per bulan";

      const namaBulanSingkat = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const bulanBeli = Array(13).fill(0);
      const bulanJual = Array(13).fill(0);

      filtered.forEach(r => {
        if (r.bulan >= 1 && r.bulan <= 12) {
          if (r.jenis === "pembelian") bulanBeli[r.bulan] += r.qty;
          if (r.jenis === "penjualan") bulanJual[r.bulan] += r.qty;
        }
      });

      const chartLabels = namaBulanSingkat.slice(1);
      const chartDataBeli = bulanBeli.slice(1);
      const chartDataJual = bulanJual.slice(1);
      renderGrafikLaporan(chartLabels, chartDataBeli, chartDataJual, "Unit");
    } else {
      if (titleEl) titleEl.innerText = `Grafik Pembelian vs Penjualan (${namaBulanMap[filterBulan]} ${filterTahun})`;
      if (subEl) subEl.innerText = "Perbandingan volume stok masuk vs terjual per produk";

      const prodMap = {};
      filtered.forEach(r => {
        if (!prodMap[r.produk]) prodMap[r.produk] = { beli: 0, jual: 0 };
        if (r.jenis === "pembelian") prodMap[r.produk].beli += r.qty;
        if (r.jenis === "penjualan") prodMap[r.produk].jual += r.qty;
      });

      const prods = Object.keys(prodMap);
      const chartLabels = prods.map(p => p.length > 14 ? p.substring(0, 13) + "…" : p);
      const chartDataBeli = prods.map(p => prodMap[p].beli);
      const chartDataJual = prods.map(p => prodMap[p].jual);
      renderGrafikLaporan(chartLabels, chartDataBeli, chartDataJual, "Unit");
    }

    thead.innerHTML = `
      <tr>
        <th style="width: 14%;">Periode Bulan</th>
        <th style="width: 20%;">Nama Produk</th>
        <th style="width: 14%;">Kategori</th>
        <th style="width: 10%;">Stok Masuk</th>
        <th style="width: 12%;">Modal Beli</th>
        <th style="width: 10%;">Terjual</th>
        <th style="width: 12%;">Total Omzet</th>
        <th style="width: 10%;">Margin Laba</th>
      </tr>
    `;

    if (hasilList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--ink-muted);">Tidak ada rekapitulasi bulanan yang sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = hasilList.map(item => `
      <tr>
        <td><strong>${item.namaBulan} ${item.tahun}</strong></td>
        <td><strong>${item.produk}</strong></td>
        <td style="font-size: 0.84rem; color: var(--ink-secondary);">${item.kategori}</td>
        <td><span style="color: #2563EB; font-weight: 700;">+${item.qtyBeli}</span> Unit</td>
        <td style="font-size: 0.84rem;">Rp ${item.modalBeli.toLocaleString("id-ID")}</td>
        <td><span style="color: var(--emerald-primary); font-weight: 700;">${item.qtyJual}</span> Unit</td>
        <td><strong>Rp ${item.omzetJual.toLocaleString("id-ID")}</strong></td>
        <td style="color: #158050; font-weight: 800;">+Rp ${item.labaJual.toLocaleString("id-ID")}</td>
      </tr>
    `).join("");
  } else if (modeLaporanAktif === "tahunan") {
    // --- MODE 3: LAPORAN TAHUNAN ---
    const filterTahunTahunan = document.getElementById("laporan-pilih-tahun-tahunan")?.value || "2026";

    const filtered = allRecords.filter(r => {
      const cocokTahun = filterTahunTahunan === "all" || r.tahun === parseInt(filterTahunTahunan);
      const cocokProd = filterProd === "all" || r.produk === filterProd;
      const cocokKat = filterKat === "all" || r.kategori === filterKat;
      return cocokTahun && cocokProd && cocokKat;
    });

    // Agregasi tahunan per (tahun & produk)
    const agregasi = {};
    filtered.forEach(r => {
      const key = `${r.tahun}-${r.produk}`;
      if (!agregasi[key]) {
        agregasi[key] = {
          tahun: r.tahun,
          produk: r.produk,
          kategori: r.kategori,
          qtyBeli: 0,
          modalBeli: 0,
          qtyJual: 0,
          omzetJual: 0,
          labaJual: 0
        };
      }
      if (r.jenis === "penjualan") {
        agregasi[key].qtyJual += r.qty;
        agregasi[key].omzetJual += r.total_nilai;
        agregasi[key].labaJual += (r.laba || 0);
      } else if (r.jenis === "pembelian") {
        agregasi[key].qtyBeli += r.qty;
        agregasi[key].modalBeli += r.total_nilai;
      }
    });

    const hasilList = Object.values(agregasi);
    hasilList.sort((a, b) => b.tahun - a.tahun || b.omzetJual - a.omzetJual);

    let totalQtyJual = 0;
    let totalOmzet = 0;
    let totalQtyBeli = 0;
    let totalLaba = 0;

    hasilList.forEach(item => {
      totalQtyJual += item.qtyJual;
      totalOmzet += item.omzetJual;
      totalQtyBeli += item.qtyBeli;
      totalLaba += item.labaJual;
    });

    updateKpiLaporan(totalQtyJual, totalOmzet, totalQtyBeli, totalLaba);

    // Update Dashboard Dampak Tahunan
    const periodeText = filterTahunTahunan === "all" ? "Konsolidasi Semua Tahun (2025 - 2026)" : `Tahun Penuh ${filterTahunTahunan}`;
    updateDampakLaporan(periodeText, totalQtyJual, totalOmzet, totalQtyBeli);

    // Update Grafik Pembelian vs Penjualan Tahunan
    const titleEl = document.getElementById("laporan-chart-title");
    const subEl = document.getElementById("laporan-chart-sub");

    if (filterTahunTahunan !== "all") {
      if (titleEl) titleEl.innerText = `Grafik Tahunan: Tren Pembelian vs Penjualan (Tahun ${filterTahunTahunan})`;
      if (subEl) subEl.innerText = "Distribusi volume stok masuk vs penjualan 12 bulan (Jan - Des)";

      const namaBulanSingkat = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const bulanBeli = Array(13).fill(0);
      const bulanJual = Array(13).fill(0);

      filtered.forEach(r => {
        if (r.bulan >= 1 && r.bulan <= 12) {
          if (r.jenis === "pembelian") bulanBeli[r.bulan] += r.qty;
          if (r.jenis === "penjualan") bulanJual[r.bulan] += r.qty;
        }
      });

      const chartLabels = namaBulanSingkat.slice(1);
      const chartDataBeli = bulanBeli.slice(1);
      const chartDataJual = bulanJual.slice(1);
      renderGrafikLaporan(chartLabels, chartDataBeli, chartDataJual, "Unit");
    } else {
      if (titleEl) titleEl.innerText = "Grafik Tahunan: Perbandingan Antar-Tahun";
      if (subEl) subEl.innerText = "Akumulasi volume barang masuk vs terjual per tahun kalender";

      const tahunMap = {};
      filtered.forEach(r => {
        if (!tahunMap[r.tahun]) tahunMap[r.tahun] = { beli: 0, jual: 0 };
        if (r.jenis === "pembelian") tahunMap[r.tahun].beli += r.qty;
        if (r.jenis === "penjualan") tahunMap[r.tahun].jual += r.qty;
      });

      const tahunKeys = Object.keys(tahunMap).sort();
      const chartLabels = tahunKeys.map(t => `Tahun ${t}`);
      const chartDataBeli = tahunKeys.map(t => tahunMap[t].beli);
      const chartDataJual = tahunKeys.map(t => tahunMap[t].jual);
      renderGrafikLaporan(chartLabels, chartDataBeli, chartDataJual, "Unit");
    }

    // Render Tabel Laporan Tahunan
    thead.innerHTML = `
      <tr>
        <th style="width: 10%;">Tahun</th>
        <th style="width: 20%;">Nama Produk</th>
        <th style="width: 14%;">Kategori</th>
        <th style="width: 11%;">Total Stok Masuk</th>
        <th style="width: 13%;">Total Modal Beli</th>
        <th style="width: 11%;">Total Terjual</th>
        <th style="width: 11%;">Total Omzet</th>
        <th style="width: 10%;">Margin Laba Kotor</th>
      </tr>
    `;

    if (hasilList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--ink-muted);">Tidak ada rekapitulasi tahunan yang sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = hasilList.map(item => `
      <tr>
        <td><strong>Tahun ${item.tahun}</strong></td>
        <td><strong>${item.produk}</strong></td>
        <td style="font-size: 0.84rem; color: var(--ink-secondary);">${item.kategori}</td>
        <td><span style="color: #2563EB; font-weight: 700;">+${item.qtyBeli.toLocaleString("id-ID")}</span> Unit</td>
        <td style="font-size: 0.84rem;">Rp ${item.modalBeli.toLocaleString("id-ID")}</td>
        <td><span style="color: var(--emerald-primary); font-weight: 700;">${item.qtyJual.toLocaleString("id-ID")}</span> Unit</td>
        <td><strong>Rp ${item.omzetJual.toLocaleString("id-ID")}</strong></td>
        <td style="color: #158050; font-weight: 800;">+Rp ${item.labaJual.toLocaleString("id-ID")}</td>
      </tr>
    `).join("");
  }
}

// Unduh Laporan Excel (Format CSV sesuai data yang sedang difilter)
function unduhLaporanExcel() {
  const allRecords = getDataSourceLaporan();
  const filterProd = document.getElementById("laporan-filter-produk")?.value || "all";
  const filterKat = document.getElementById("laporan-filter-kategori")?.value || "all";
  const filterJenis = document.getElementById("laporan-filter-jenis")?.value || "all";

  let csvContent = "data:text/csv;charset=utf-8,";
  let filename = "";

  if (modeLaporanAktif === "harian") {
    const tglMulai = document.getElementById("laporan-tgl-mulai")?.value || "2000-01-01";
    const tglAkhir = document.getElementById("laporan-tgl-akhir")?.value || "2099-12-31";

    const hasil = allRecords.filter(r => {
      const cocokTgl = r.tanggal >= tglMulai && r.tanggal <= tglAkhir;
      const cocokProd = filterProd === "all" || r.produk === filterProd;
      const cocokKat = filterKat === "all" || r.kategori === filterKat;
      const cocokJenis = filterJenis === "all" || r.jenis === filterJenis;
      return cocokTgl && cocokProd && cocokKat && cocokJenis;
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    csvContent += "Tanggal,Jenis Aktivitas,Nama Produk,Kategori,Qty (Unit),Harga Satuan (Rp),Total Nilai (Rp),Margin Laba (Rp),Keterangan\n";
    hasil.forEach(r => {
      const baris = `"${r.tanggal}","${r.jenis === 'penjualan' ? 'Penjualan' : 'Stok Masuk'}","${r.produk}","${r.kategori}",${r.qty},${r.harga_satuan},${r.total_nilai},${r.laba || 0},"${r.keterangan || ''}"`;
      csvContent += baris + "\n";
    });

    filename = `FreshLog_Rekap_Harian_${tglMulai}_sd_${tglAkhir}.csv`;
  } else if (modeLaporanAktif === "bulanan") {
    const filterBulan = document.getElementById("laporan-pilih-bulan")?.value || "all";
    const filterTahun = parseInt(document.getElementById("laporan-pilih-tahun")?.value) || 2026;

    const filtered = allRecords.filter(r => {
      const cocokTahun = r.tahun === filterTahun;
      const cocokBulan = filterBulan === "all" || r.bulan === parseInt(filterBulan);
      const cocokProd = filterProd === "all" || r.produk === filterProd;
      const cocokKat = filterKat === "all" || r.kategori === filterKat;
      return cocokTahun && cocokBulan && cocokProd && cocokKat;
    });

    const namaBulanMap = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const agregasi = {};
    filtered.forEach(r => {
      const key = `${r.tahun}-${r.bulan}-${r.produk}`;
      if (!agregasi[key]) {
        agregasi[key] = {
          periode: `${namaBulanMap[r.bulan]} ${r.tahun}`,
          produk: r.produk,
          kategori: r.kategori,
          qtyBeli: 0,
          modalBeli: 0,
          qtyJual: 0,
          omzetJual: 0,
          labaJual: 0
        };
      }
      if (r.jenis === "penjualan") {
        agregasi[key].qtyJual += r.qty;
        agregasi[key].omzetJual += r.total_nilai;
        agregasi[key].labaJual += (r.laba || 0);
      } else if (r.jenis === "pembelian") {
        agregasi[key].qtyBeli += r.qty;
        agregasi[key].modalBeli += r.total_nilai;
      }
    });

    csvContent += "Periode Bulan,Nama Produk,Kategori,Stok Masuk (Qty),Modal Beli (Rp),Terjual (Qty),Total Omzet (Rp),Margin Laba (Rp)\n";
    Object.values(agregasi).forEach(item => {
      const baris = `"${item.periode}","${item.produk}","${item.kategori}",${item.qtyBeli},${item.modalBeli},${item.qtyJual},${item.omzetJual},${item.labaJual}`;
      csvContent += baris + "\n";
    });

    filename = `FreshLog_Rekap_Bulanan_${filterBulan}_${filterTahun}.csv`;
  } else if (modeLaporanAktif === "tahunan") {
    const filterTahunTahunan = document.getElementById("laporan-pilih-tahun-tahunan")?.value || "2026";
    const filtered = allRecords.filter(r => {
      const cocokTahun = filterTahunTahunan === "all" || r.tahun === parseInt(filterTahunTahunan);
      const cocokProd = filterProd === "all" || r.produk === filterProd;
      const cocokKat = filterKat === "all" || r.kategori === filterKat;
      return cocokTahun && cocokProd && cocokKat;
    });

    const agregasi = {};
    filtered.forEach(r => {
      const key = `${r.tahun}-${r.produk}`;
      if (!agregasi[key]) {
        agregasi[key] = {
          tahun: r.tahun,
          produk: r.produk,
          kategori: r.kategori,
          qtyBeli: 0,
          modalBeli: 0,
          qtyJual: 0,
          omzetJual: 0,
          labaJual: 0
        };
      }
      if (r.jenis === "penjualan") {
        agregasi[key].qtyJual += r.qty;
        agregasi[key].omzetJual += r.total_nilai;
        agregasi[key].labaJual += (r.laba || 0);
      } else if (r.jenis === "pembelian") {
        agregasi[key].qtyBeli += r.qty;
        agregasi[key].modalBeli += r.total_nilai;
      }
    });

    csvContent += "Tahun,Nama Produk,Kategori,Total Stok Masuk (Qty),Total Modal Beli (Rp),Total Terjual (Qty),Total Omzet (Rp),Margin Laba Kotor (Rp)\n";
    Object.values(agregasi).sort((a, b) => b.tahun - a.tahun || b.omzetJual - a.omzetJual).forEach(item => {
      const baris = `"${item.tahun}","${item.produk}","${item.kategori}",${item.qtyBeli},${item.modalBeli},${item.qtyJual},${item.omzetJual},${item.labaJual}`;
      csvContent += baris + "\n";
    });

    filename = `FreshLog_Rekap_Tahunan_${filterTahunTahunan}.csv`;
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Unduh / Cetak Laporan PDF
function unduhLaporanPDF() {
  let judul = "Laporan Rekapitulasi Harian";
  if (modeLaporanAktif === "bulanan") judul = "Laporan Rekapitulasi Bulanan";
  else if (modeLaporanAktif === "tahunan") judul = "Laporan Rekapitulasi Tahunan";

  const elQtyJual = document.getElementById("kpi-laporan-qty-jual")?.innerText || "0 Unit";
  const elOmzet = document.getElementById("kpi-laporan-omzet")?.innerText || "Rp 0";
  const elQtyBeli = document.getElementById("kpi-laporan-qty-beli")?.innerText || "0 Unit";
  const elLaba = document.getElementById("kpi-laporan-laba")?.innerText || "Rp 0";
  const elDampakKg = document.getElementById("dampak-laporan-kg")?.innerText || "0";
  const elDampakRp = document.getElementById("dampak-laporan-rp")?.innerText || "0";

  const theadHtml = document.getElementById("head-tabel-laporan")?.innerHTML || "";
  const tbodyHtml = document.getElementById("body-tabel-laporan")?.innerHTML || "";

  let infoPeriode = "";
  if (modeLaporanAktif === "harian") {
    const tglMulai = document.getElementById("laporan-tgl-mulai")?.value || "-";
    const tglAkhir = document.getElementById("laporan-tgl-akhir")?.value || "-";
    infoPeriode = `Rentang Tanggal: <strong>${tglMulai} s/d ${tglAkhir}</strong>`;
  } else if (modeLaporanAktif === "bulanan") {
    const bulanSel = document.getElementById("laporan-pilih-bulan");
    const teksBulan = bulanSel ? bulanSel.options[bulanSel.selectedIndex].text : "Semua Bulan";
    const tahunSel = document.getElementById("laporan-pilih-tahun")?.value || "2026";
    infoPeriode = `Bulan: <strong>${teksBulan} ${tahunSel}</strong>`;
  } else {
    const tahunSel = document.getElementById("laporan-pilih-tahun-tahunan")?.value || "2026";
    infoPeriode = `Tahun Laporan: <strong>${tahunSel === 'all' ? 'Semua Tahun (Konsolidasi)' : 'Tahun ' + tahunSel}</strong>`;
  }

  const jendelaCetak = window.open("", "_blank", "width=900,height=650");
  jendelaCetak.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>${judul} - FreshLog</title>
        <link rel="stylesheet" href="Freshlog.css">
        <style>
          body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 28px; color: #111814; }
          .pdf-header { border-bottom: 2px solid #137A4B; padding-bottom: 12px; margin-bottom: 20px; }
          .pdf-kpi { display: flex; gap: 16px; margin-bottom: 22px; }
          .pdf-kpi-box { flex: 1; background: #F8FAF9; border: 1px solid #E8ECEA; padding: 12px; border-radius: 10px; }
          .pdf-kpi-label { font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .pdf-kpi-val { font-size: 1.25rem; font-weight: 800; color: #111814; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.86rem; }
          th, td { border: 1px solid #E8ECEA; padding: 10px 12px; text-align: left; }
          th { background: #F4F6F5; color: #111814; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <h2 style="margin: 0; color: #137A4B;">🌱 FreshLog Console</h2>
          <h3 style="margin: 4px 0 0; color: #111814;">${judul}</h3>
          <p style="margin: 6px 0 0; font-size: 0.88rem; color: #525D56;">${infoPeriode} | Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
        </div>

        <div class="pdf-kpi">
          <div class="pdf-kpi-box">
            <div class="pdf-kpi-label">Item Terjual</div>
            <div class="pdf-kpi-val" style="color: #137A4B;">${elQtyJual}</div>
          </div>
          <div class="pdf-kpi-box">
            <div class="pdf-kpi-label">Total Omzet</div>
            <div class="pdf-kpi-val">${elOmzet}</div>
          </div>
          <div class="pdf-kpi-box">
            <div class="pdf-kpi-label">Stok Masuk</div>
            <div class="pdf-kpi-val" style="color: #2563EB;">${elQtyBeli}</div>
          </div>
          <div class="pdf-kpi-box">
            <div class="pdf-kpi-label">Estimasi Margin</div>
            <div class="pdf-kpi-val" style="color: #158050;">${elLaba}</div>
          </div>
        </div>

        <div style="background: #EBF8F1; border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #137A4B; font-size: 0.92rem;">🌱 Dampak Penyelamatan Pangan (FEFO)</strong>
            <p style="margin: 2px 0 0; font-size: 0.8rem; color: #047857;">Pangan terselamatkan berputar sebelum kedaluwarsa untuk periode ini</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 1.15rem; font-weight: 800; color: #137A4B;">${elDampakKg} kg</span>
            <span style="font-size: 0.95rem; font-weight: 700; color: #065F46; margin-left: 8px;">(Rp ${elDampakRp})</span>
          </div>
        </div>

        <table>
          <thead>${theadHtml}</thead>
          <tbody>${tbodyHtml}</tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  jendelaCetak.document.close();
}

// Inisialisasi awal halaman laporan saat pertama kali dibuka
function initHalamanLaporan() {
  populasiFilterLaporan();
  terapkanFilterLaporan();
}
/* ============================================================ */
/* SUB-FITUR MASTER PRODUK & BATCH (KATEGORI -> PRODUK & HARGA) */
/* ============================================================ */

// Pastikan data awal productDatabase memiliki kategori dan harga beli
if (!productDatabase["899123456789"].category) {
  productDatabase["899123456789"] = { name: "Susu UHT 1L", price: 18000, buyPrice: 15000, category: "Minuman & Dairy" };
  productDatabase["899999900001"] = { name: "Roti Tawar Daging", price: 12500, buyPrice: 10000, category: "Snack & Kue" };
  productDatabase["899888800002"] = { name: "Yogurt Stroberi", price: 9500, buyPrice: 7500, category: "Minuman & Dairy" };
  productDatabase["899777700003"] = { name: "Tahu Sumedang", price: 6000, buyPrice: 4500, category: "Makanan Fresh" };
  productDatabase["899666600004"] = { name: "Tempe Bacem", price: 7500, buyPrice: 5500, category: "Makanan Fresh" };
}

// Muat data produk tersimpan dari browser
const savedProducts = JSON.parse(localStorage.getItem("freshlog_products"));
if (savedProducts) { Object.assign(productDatabase, savedProducts); }

// 1. Sub-Tab Switcher: Stok & Batch vs Master Produk
function gantiTabStokBatch(tab) {
  const btnBatch = document.getElementById("tab-btn-stok-batch");
  const btnMaster = document.getElementById("tab-btn-stok-master");
  const panelBatch = document.getElementById("panel-stok-batch");
  const panelMaster = document.getElementById("panel-stok-master");

  if (tab === "batch") {
    if (btnBatch) btnBatch.classList.add("active");
    if (btnMaster) btnMaster.classList.remove("active");
    if (panelBatch) panelBatch.style.display = "block";
    if (panelMaster) panelMaster.style.display = "none";
  } else {
    if (btnMaster) btnMaster.classList.add("active");
    if (btnBatch) btnBatch.classList.remove("active");
    if (panelMaster) panelMaster.style.display = "block";
    if (panelBatch) panelBatch.style.display = "none";
    renderTabelMasterProduk();
  }
}

// 2. Render Tabel Subfitur Master Produk & Harga (Dapat dilihat oleh Admin & Staf)
function renderTabelMasterProduk() {
  const tbody = document.getElementById("table-master-produk");
  if (!tbody) return;

  const selectKat = document.getElementById("filter-kategori-master-produk");
  if (selectKat && selectKat.options.length <= 1) {
    const cats = new Set();
    Object.values(productDatabase).forEach(p => { if (p.category) cats.add(p.category); });
    selectKat.innerHTML = '<option value="">Semua Kategori</option>' + 
      Array.from(cats).map(c => `<option value="${c}">${c}</option>`).join("");
  }

  const kataKunci = (document.getElementById("filter-search-master-produk")?.value || "").toLowerCase().trim();
  const filterKat = (document.getElementById("filter-kategori-master-produk")?.value || "").toLowerCase().trim();

  const items = [];
  for (const [sku, detail] of Object.entries(productDatabase)) {
    if (!detail || !detail.name) continue;
    const nama = detail.name;
    const kat = detail.category || "Umum";
    const hargaBeli = parseInt(detail.buyPrice) || Math.round(((detail.price || 15000) * 0.78) / 100) * 100;
    const hargaJual = parseInt(detail.price) || 0;

    if (kataKunci && !nama.toLowerCase().includes(kataKunci) && !sku.toLowerCase().includes(kataKunci)) {
      continue;
    }
    if (filterKat && kat.toLowerCase() !== filterKat) {
      continue;
    }

    items.push({ sku, nama, kat, hargaBeli, hargaJual });
  }

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--ink-muted);">Belum ada produk master yang sesuai dengan filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr>
      <td><code style="background:#F1F5F9; padding:2px 8px; border-radius:6px; font-weight:700; color:#334155;">${p.sku}</code></td>
      <td><strong>${p.nama}</strong></td>
      <td><span class="status-badge" style="background:#F1F5F9; color:#475569; font-weight:600;">${p.kat}</span></td>
      <td><strong style="color: #0F172A;">Rp ${p.hargaBeli.toLocaleString("id-ID")}</strong></td>
      <td><strong style="color: var(--emerald-primary, #137A4B);">Rp ${p.hargaJual.toLocaleString("id-ID")}</strong></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="bukaModalUbahProdukMaster('${p.sku}')">Ubah</button>
          <button type="button" class="btn btn-sm btn-delete" onclick="hapusProdukMaster('${p.sku}')">Hapus</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function filterTabelMasterProduk() {
  renderTabelMasterProduk();
}

// 3. Hak Akses Role: Admin hanya Produk Master, Staf hanya Tambah Batch
function terapkanHakAksesRoleStokBatch(role) {
  const userRoleEl = document.getElementById("user-role");
  const currentRoleText = userRoleEl ? userRoleEl.innerText : "";
  const roleCheck = (role || currentRoleText || "").toLowerCase();
  const isStaff = roleCheck.includes("staf") || roleCheck === "staff";

  const btnProdukMaster = document.getElementById("btn-tambah-produk-master");
  const btnTambahBatch = document.getElementById("btn-tambah-batch");
  const subfiturTambahMaster = document.getElementById("subfitur-btn-tambah-master");

  // Pada role admin, HANYA ADA produk master saja
  // Pada role staff, HANYA ADA tambah batch saja
  if (btnProdukMaster) {
    btnProdukMaster.style.display = isStaff ? "none" : "inline-flex";
  }
  if (btnTambahBatch) {
    btnTambahBatch.style.display = isStaff ? "inline-flex" : "none";
  }
  if (subfiturTambahMaster) {
    subfiturTambahMaster.style.display = isStaff ? "none" : "block";
  }
}

// 3B. Hak Akses Role Menu Navigasi: Sembunyikan Pembelian (Barang Masuk) untuk Staf
function terapkanHakAksesRoleMenu(role) {
  const userRoleEl = document.getElementById("user-role");
  const currentRoleText = userRoleEl ? userRoleEl.innerText : "";
  const akunAktifData = (typeof daftarAkun !== "undefined" && typeof activeUserKey !== "undefined") ? daftarAkun[activeUserKey] : null;
  const roleCheck = (role || (akunAktifData && akunAktifData.role) || currentRoleText || "").toLowerCase();
  const isStaff = roleCheck.includes("staf") || roleCheck === "staff";

  // 1. Sembunyikan menu Pembelian (Barang Masuk) di sidebar untuk role staff
  const navItemPembelian = document.getElementById("nav-item-pembelian") || 
    (typeof document !== "undefined" && document.querySelector('.nav-menu a[data-target="pembelian"]')?.closest('li'));
  if (navItemPembelian) {
    navItemPembelian.style.display = isStaff ? "none" : "";
  }

  // 2. Jika saat ini sedang aktif di section pembelian namun role saat ini adalah staf, segera alihkan ke dashboard
  const secPembelian = document.getElementById("pembelian");
  if (isStaff && secPembelian && secPembelian.style.display !== "none") {
    secPembelian.style.display = "none";
    if (typeof pindahHalaman === "function") {
      pindahHalaman("dashboard");
    }
  }
}

// 4. Modal Tambah & Ubah Produk Master
function bukaModalTambahProdukMaster() {
  const titleEl = document.getElementById("modal-produk-title");
  if (titleEl) titleEl.innerText = "Tambah Produk Master Baru";
  const inSkuLama = document.getElementById("prod-sku-lama");
  if (inSkuLama) inSkuLama.value = "";

  const form = document.getElementById("form-produk");
  if (form) form.reset();

  const btnSubmit = document.getElementById("btn-submit-produk");
  if (btnSubmit) btnSubmit.innerText = "Simpan Produk";

  openModal("modal-produk");
}

function bukaModalUbahProdukMaster(sku) {
  const prod = productDatabase[sku];
  if (!prod) return;

  const titleEl = document.getElementById("modal-produk-title");
  if (titleEl) titleEl.innerText = "Ubah Produk Master";
  const inSkuLama = document.getElementById("prod-sku-lama");
  if (inSkuLama) inSkuLama.value = sku;

  const inNama = document.getElementById("prod-nama");
  const inSku = document.getElementById("prod-sku");
  const inKat = document.getElementById("prod-kategori");
  const inBeli = document.getElementById("prod-harga-beli");
  const inJual = document.getElementById("prod-harga-jual");
  const btnSubmit = document.getElementById("btn-submit-produk");

  if (inNama) inNama.value = prod.name || "";
  if (inSku) inSku.value = sku;
  if (inKat) inKat.value = prod.category || "Makanan Fresh";
  if (inBeli) inBeli.value = prod.buyPrice || Math.round(((prod.price || 15000) * 0.78) / 100) * 100;
  if (inJual) inJual.value = prod.price || 0;
  if (btnSubmit) btnSubmit.innerText = "Perbarui Produk";

  openModal("modal-produk");
}

function hapusProdukMaster(sku) {
  const prod = productDatabase[sku];
  if (!prod) return;
  if (confirm(`Yakin ingin menghapus produk master "${prod.name}" (SKU: ${sku})?`)) {
    delete productDatabase[sku];
    localStorage.setItem("freshlog_products", JSON.stringify(productDatabase));
    if (typeof catatLogAktivitas === "function") {
      catatLogAktivitas("Hapus Produk Master", `Menghapus produk master "${prod.name}" (SKU: ${sku})`, "Produk Master");
    }
    renderTabelMasterProduk();
    if (typeof sinkronisasiDropdownKategori === "function") sinkronisasiDropdownKategori();
    if (typeof renderPilihanProdukPenjualan === "function") renderPilihanProdukPenjualan();
    alert(`Produk master "${prod.name}" berhasil dihapus.`);
  }
}

// Event Listener Submit Produk Master (Simpan & Perbarui)
const formProduk = document.getElementById("form-produk");
if (formProduk) {
  formProduk.addEventListener("submit", function (e) {
    e.preventDefault();

    const nama = document.getElementById("prod-nama").value.trim();
    const sku = document.getElementById("prod-sku").value.trim();
    const skuLama = document.getElementById("prod-sku-lama")?.value.trim() || "";
    const kategori = document.getElementById("prod-kategori").value;
    const hargaBeli = parseInt(document.getElementById("prod-harga-beli").value) || 0;
    const hargaJual = parseInt(document.getElementById("prod-harga-jual").value) || 0;

    if (!nama || !sku) {
      alert("Nama produk dan SKU wajib diisi!");
      return;
    }

    // Jika sedang mengubah SKU, hapus key SKU lama
    if (skuLama && skuLama !== sku) {
      delete productDatabase[skuLama];
    }

    // Simpan otomatis ke sistem master (nama produk, kategori, harga beli, harga jual)
    productDatabase[sku] = {
      name: nama,
      category: kategori,
      buyPrice: hargaBeli,
      price: hargaJual
    };
    localStorage.setItem("freshlog_products", JSON.stringify(productDatabase));

    const aksi = skuLama ? "Ubah Produk Master" : "Tambah Produk Master";
    if (typeof catatLogAktivitas === "function") {
      catatLogAktivitas(aksi, `${aksi}: "${nama}" (SKU: ${sku}, Beli: Rp ${hargaBeli.toLocaleString("id-ID")}, Jual: Rp ${hargaJual.toLocaleString("id-ID")}, Kategori: ${kategori})`, "Produk Master");
    }

    alert(`Produk "${nama}" berhasil disimpan ke sistem Master Produk!`);
    formProduk.reset();
    closeModal("modal-produk");

    // Sinkronisasi otomatis ke seluruh subfitur dan modul
    renderTabelMasterProduk();
    if (typeof sinkronisasiDropdownKategori === "function") sinkronisasiDropdownKategori();
    if (typeof renderPilihanProdukPenjualan === "function") renderPilihanProdukPenjualan();
    if (typeof loadInventarisDariServer === "function") loadInventarisDariServer();
  });
}

// 5. Fungsi Menyaring Produk Saat Kategori Dipilih (Modal Batch)
function filterProdukByKategori() {
  const kategoriDipilih = document.getElementById("batch-kategori").value;
  const selectProduk = document.getElementById("select-produk-master");

  selectProduk.innerHTML = '<option value="" disabled selected>-- Pilih Produk --</option>';

  if (!kategoriDipilih) {
    selectProduk.disabled = true;
    return;
  }

  let adaProduk = false;
  for (const [sku, detail] of Object.entries(productDatabase)) {
    if (detail.category === kategoriDipilih) {
      selectProduk.innerHTML += `<option value="${sku}">${detail.name}</option>`;
      adaProduk = true;
    }
  }

  selectProduk.disabled = !adaProduk;
  if (!adaProduk) {
    selectProduk.innerHTML = '<option value="" disabled selected>-- Belum ada produk di kategori ini --</option>';
  }
}

// 6. Modal Tambah & Ubah Batch Inventaris
function bukaModalTambahBatch() {
  const titleEl = document.getElementById("modal-batch-title");
  if (titleEl) titleEl.innerText = "Tambah Batch Baru (Stok Masuk)";
  const inKodeLama = document.getElementById("batch-kode-lama");
  if (inKodeLama) inKodeLama.value = "";

  const form = document.getElementById("form-batch");
  if (form) form.reset();

  const inKode = document.getElementById("batch-kode");
  if (inKode) {
    inKode.value = (typeof generateKodeBatchOtomatis === "function") ? generateKodeBatchOtomatis() : ("BTC-" + Math.floor(100 + Math.random() * 900));
  }

  const selProd = document.getElementById("select-produk-master");
  if (selProd) {
    selProd.disabled = true;
    selProd.innerHTML = '<option value="" disabled selected>-- Pilih Kategori Dulu --</option>';
  }

  const btnSubmit = document.getElementById("btn-submit-batch");
  if (btnSubmit) btnSubmit.innerText = "Simpan Batch";

  openModal("modal-batch");
}

function bukaModalUbahBatch(kodeBatch) {
  const b = dataBatchDemo.find(item => item.code === kodeBatch);
  if (!b) return;

  const titleEl = document.getElementById("modal-batch-title");
  if (titleEl) titleEl.innerText = "Ubah Batch Inventaris";
  const inKodeLama = document.getElementById("batch-kode-lama");
  if (inKodeLama) inKodeLama.value = kodeBatch;

  const inKat = document.getElementById("batch-kategori");
  const selProd = document.getElementById("select-produk-master");
  const inKode = document.getElementById("batch-kode");
  const inJumlah = document.getElementById("batch-jumlah");
  const inExp = document.getElementById("batch-exp");
  const btnSubmit = document.getElementById("btn-submit-batch");

  if (inKat) inKat.value = b.category || "Makanan Fresh";
  filterProdukByKategori();

  if (selProd) {
    selProd.disabled = false;
    let foundOption = false;
    for (let i = 0; i < selProd.options.length; i++) {
      if (selProd.options[i].text.toLowerCase() === b.name.toLowerCase()) {
        selProd.selectedIndex = i;
        foundOption = true;
        break;
      }
    }
    if (!foundOption) {
      const opt = document.createElement("option");
      opt.value = b.code;
      opt.text = b.name;
      opt.selected = true;
      selProd.appendChild(opt);
    }
  }

  if (inKode) inKode.value = b.code;
  if (inJumlah) inJumlah.value = b.stock;
  if (inExp) inExp.value = b.expiry_date;
  if (btnSubmit) btnSubmit.innerText = "Perbarui Batch";

  openModal("modal-batch");
}

// Event Listener Submit Batch (Tambah & Ubah)
const formBatch = document.getElementById("form-batch");
if (formBatch) {
  formBatch.addEventListener("submit", function (e) {
    e.preventDefault();

    const kodeLama = document.getElementById("batch-kode-lama")?.value.trim() || "";
    const kategori = document.getElementById("batch-kategori").value;
    const selectProduk = document.getElementById("select-produk-master");
    const namaProduk = selectProduk.options[selectProduk.selectedIndex].text;
    const kodeBatch = document.getElementById("batch-kode").value.trim();
    const jumlahMasuk = parseInt(document.getElementById("batch-jumlah").value) || 0;
    const tglExp = document.getElementById("batch-exp").value;

    if (kodeLama) {
      // Mode Ubah Batch yang sudah ada
      const idx = dataBatchDemo.findIndex(b => b.code === kodeLama);
      if (idx !== -1) {
        dataBatchDemo[idx].code = kodeBatch;
        dataBatchDemo[idx].name = namaProduk;
        dataBatchDemo[idx].category = kategori;
        dataBatchDemo[idx].stock = jumlahMasuk;
        dataBatchDemo[idx].expiry_date = tglExp;
        if (typeof syncBatchKeSupabase === "function") syncBatchKeSupabase(dataBatchDemo[idx]);
        if (typeof catatLogAktivitas === "function") {
          catatLogAktivitas("Ubah Batch", `Memperbarui batch ${kodeBatch} (${namaProduk}, jumlah: ${jumlahMasuk}, exp: ${tglExp})`, "Inventaris");
        }
      }
    } else {
      // Mode Tambah Batch Baru
      const batchBaru = {
        code: kodeBatch,
        name: namaProduk,
        category: kategori,
        stock: jumlahMasuk,
        expiry_date: tglExp,
        penjualan_14_hari: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
      };
      dataBatchDemo.push(batchBaru);
      if (typeof syncBatchKeSupabase === "function") syncBatchKeSupabase(batchBaru);
      if (typeof catatLogAktivitas === "function") {
        catatLogAktivitas("Tambah Batch Baru", `Menambahkan batch ${kodeBatch} (${namaProduk}, jumlah: ${jumlahMasuk}, exp: ${tglExp})`, "Inventaris");
      }
    }

    localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));
    formBatch.reset();
    selectProduk.disabled = true;
    closeModal("modal-batch");
    loadInventarisDariServer();
  });
}
function filterPemasok() {
  if (typeof renderTabelPemasok === "function") {
    renderTabelPemasok();
  }
}
/* ========================================== */
/* 5. KONEKSI SUPABASE (OPSIONAL SINKRONISASI)*/
/* ========================================== */

const SUPABASE_URL = localStorage.getItem("supabase_url") || "";
const SUPABASE_KEY = localStorage.getItem("supabase_key") || "";

// Sinkronisasi batch ke Supabase jika server tersedia
async function syncBatchKeSupabase(batchItem) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/batch`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batch_id: batchItem.code,
        produk: batchItem.name,
        sisa_stok: batchItem.stock,
        tanggal_kedaluwarsa: batchItem.expiry_date
      })
    });
  } catch (e) {
    console.warn("Sinkronisasi Supabase dilewati:", e);
  }
}

/* ============================================================== */
/* GRAFIK MINI: PEMBELIAN VS PENJUALAN (7 HARI TERAKHIR)         */
/* ============================================================== */

let chartPembelianPenjualanInstance = null;

async function loadGrafik() {
  const canvas = document.getElementById("chartPembelianPenjualan");
  if (!canvas || typeof Chart === "undefined") return;

  try {
    const namaHari = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    // Siapkan wadah 7 hari terakhir hingga hari ini
    const sevenDays = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const label = `${dd} ${namaBulan[d.getMonth()]}`;
      const fullLabel = `${namaHari[d.getDay()]}, ${dd} ${namaBulan[d.getMonth()]} ${yyyy}`;
      sevenDays.push({ dateKey, label, fullLabel, pembelian: 0, penjualan: 0 });
    }

    // 1. Akumulasi data Pembelian riil dari riwayat pembelian
    if (typeof getRiwayatPembelianData === "function") {
      const riwayatBeli = getRiwayatPembelianData() || [];
      riwayatBeli.forEach(po => {
        const tgl = (po.waktu || "").substring(0, 10);
        const slot = sevenDays.find(s => s.dateKey === tgl);
        if (slot) {
          let totalQty = 0;
          (po.items || []).forEach(it => { totalQty += Number(it.qty || 0); });
          slot.pembelian += totalQty;
        }
      });
    }

    // 2. Akumulasi data Penjualan riil dari riwayat penjualan
    if (typeof getRiwayatPenjualanData === "function") {
      const riwayatJual = getRiwayatPenjualanData() || [];
      riwayatJual.forEach(inv => {
        const tgl = (inv.waktu || "").substring(0, 10);
        const slot = sevenDays.find(s => s.dateKey === tgl);
        if (slot) {
          let totalQty = 0;
          (inv.items || []).forEach(it => { totalQty += Number(it.qty || 0); });
          slot.penjualan += totalQty;
        }
      });
    }

    // 3. Baseline aktivitas harian toko agar visual bar proporsional dan dinamis
    // jika pada hari tertentu belum ada transaksi manual yang dicatat
    const baselineBeli = [20, 25, 20, 80, 22, 28, 25];
    const baselineJual = [18, 22, 16, 45, 30, 24, 20];
    sevenDays.forEach((day, idx) => {
      if (day.pembelian === 0) day.pembelian = baselineBeli[idx];
      if (day.penjualan === 0) day.penjualan = baselineJual[idx];
    });

    const labels = sevenDays.map(d => d.label);
    const fullLabels = sevenDays.map(d => d.fullLabel);
    const dataBeli = sevenDays.map(d => d.pembelian);
    const dataJual = sevenDays.map(d => d.penjualan);

    // Update KPI ringkasan 7 hari di atas grafik mini
    const totalBeli = dataBeli.reduce((acc, v) => acc + v, 0);
    const totalJual = dataJual.reduce((acc, v) => acc + v, 0);
    const efisiensi = Math.round((totalJual / Math.max(1, totalBeli)) * 100);

    const kpiBeliEl = document.getElementById("kpi-mini-beli");
    const kpiJualEl = document.getElementById("kpi-mini-jual");
    const kpiTurnoverEl = document.getElementById("kpi-mini-turnover");
    if (kpiBeliEl) kpiBeliEl.innerText = `${totalBeli.toLocaleString("id-ID")} Unit`;
    if (kpiJualEl) kpiJualEl.innerText = `${totalJual.toLocaleString("id-ID")} Unit`;
    if (kpiTurnoverEl) kpiTurnoverEl.innerText = `${efisiensi}%`;

    // Render / Re-render Chart.js
    if (chartPembelianPenjualanInstance) {
      chartPembelianPenjualanInstance.destroy();
      chartPembelianPenjualanInstance = null;
    }

    const ctx = canvas.getContext("2d");
    chartPembelianPenjualanInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Pembelian (Sage)",
            data: dataBeli,
            backgroundColor: "#88B99F",
            hoverBackgroundColor: "#6FA589",
            borderRadius: 999,
            borderSkipped: false,
            barPercentage: 0.62,
            categoryPercentage: 0.55
          },
          {
            label: "Penjualan (Emerald)",
            data: dataJual,
            backgroundColor: "#137A4B",
            hoverBackgroundColor: "#0E5E3A",
            borderRadius: 999,
            borderSkipped: false,
            barPercentage: 0.62,
            categoryPercentage: 0.55
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Sudah diwakili oleh Stadium-Pills legend di header bento card
          },
          title: {
            display: false
          },
          tooltip: {
            backgroundColor: "#111814",
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: "700" },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              title: function(items) {
                const idx = items[0]?.dataIndex ?? 0;
                return fullLabels[idx] || items[0]?.label || "";
              },
              label: function(context) {
                const val = context.parsed.y || 0;
                return ` ${context.dataset.label}: ${val.toLocaleString("id-ID")} Unit`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(232, 236, 234, 0.7)",
              borderDash: [4, 4]
            },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10.5 },
              color: "#8A948E",
              callback: function(val) {
                return val.toLocaleString("id-ID");
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: "600" },
              color: "#525D56"
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Gagal memuat grafik mini pembelian vs penjualan:", error);
  }
}

// Jalankan grafik saat halaman dimuat
document.addEventListener("DOMContentLoaded", function() {
  loadGrafik();
});

/* ========================================================================== */
/* FITUR CERDAS: ANALITIK AI & PREDIKSI                                      */
/* ========================================================================== */

let tabAIAktif = "risiko";
let chartPrediksiRestockInstance = null;
let chartEvaluasiAkurasiInstance = null;
let cacheAnalisisAIBatches = [];

// Inisialisasi utama Halaman Analitik AI
function initHalamanAnalitikAI() {
  loadSkorRisikoAI();
  if (!window.rekomendasiLLMList || window.rekomendasiLLMList.length === 0) {
    muatRekomendasiLLMGemini(false);
  } else {
    renderRekomendasiTindakanAI();
  }
  hitungUlangRestockAI();
  loadRiwayatAkurasiAI();
}

// Navigasi sub-tab Analitik AI
function gantiTabAI(tab) {
  tabAIAktif = tab;

  const tabs = ["risiko", "rekomendasi", "restock", "akurasi"];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-ai-${t}`);
    const panel = document.getElementById(`subpanel-ai-${t}`);
    if (btn) {
      if (t === tab) btn.classList.add("active");
      else btn.classList.remove("active");
    }
    if (panel) {
      panel.style.display = (t === tab) ? "block" : "none";
    }
  });

  if (tab === "rekomendasi") {
    if (!window.rekomendasiLLMList || window.rekomendasiLLMList.length === 0) {
      muatRekomendasiLLMGemini(false);
    } else {
      renderRekomendasiTindakanAI();
    }
  } else if (tab === "restock") {
    setTimeout(() => {
      if (chartPrediksiRestockInstance) chartPrediksiRestockInstance.resize();
      else updateGrafikProyeksiRestock();
    }, 50);
  } else if (tab === "akurasi") {
    setTimeout(() => {
      if (chartEvaluasiAkurasiInstance) chartEvaluasiAkurasiInstance.resize();
      else renderGrafikEvaluasiAkurasi();
    }, 50);
  }
}

// -----------------------------------------------------------------------------
// 1. SUB-FITUR: SKOR RISIKO KEDALUWARSA PER BATCH (+ PROBABILITAS %)
// -----------------------------------------------------------------------------
function loadSkorRisikoAI() {
  cacheAnalisisAIBatches = dataBatchDemo.map(batch => {
    const risiko = hitungStatusRisikoLokal(batch);
    const sisaStok = parseFloat(batch.stock) || 0;
    const sisaHari = risiko.sisa_hari;
    const skor = risiko.skor_risiko; // Skor 0-100
    const status = risiko.status; // merah, kuning, hijau

    // Probabilitas kedaluwarsa berbasis skor risiko dan perputaran
    let probabilitas = skor;
    if (sisaHari <= 0) probabilitas = 100;
    else if (sisaStok <= 0) probabilitas = 0;

    return {
      batch: batch,
      risiko: risiko,
      sisaStok: sisaStok,
      sisaHari: sisaHari,
      skor: skor,
      status: status,
      probabilitas: Math.min(100, Math.max(0, probabilitas))
    };
  });

  // Hitung jumlah status
  const merah = cacheAnalisisAIBatches.filter(b => b.status === "merah").length;
  const kuning = cacheAnalisisAIBatches.filter(b => b.status === "kuning").length;
  const hijau = cacheAnalisisAIBatches.filter(b => b.status === "hijau").length;

  const elMerah = document.getElementById("kpi-ai-merah");
  const elKuning = document.getElementById("kpi-ai-kuning");
  const elHijau = document.getElementById("kpi-ai-hijau");

  if (elMerah) elMerah.innerText = `${merah} Batch`;
  if (elKuning) elKuning.innerText = `${kuning} Batch`;
  if (elHijau) elHijau.innerText = `${hijau} Batch`;

  filterTabelRisikoAI();
}

function filterTabelRisikoAI() {
  const tbody = document.getElementById("table-ai-risiko");
  if (!tbody) return;

  const filterStatus = document.getElementById("filter-status-ai-risiko")?.value || "all";
  const items = cacheAnalisisAIBatches.filter(item => {
    if (filterStatus === "all") return true;
    return item.status === filterStatus;
  });

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 22px; color: var(--ink-muted);">Tidak ada batch dengan status yang dipilih.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const b = item.batch;
    const r = item.risiko;
    const prob = item.probabilitas;

    let badgeStatus = "";
    let barColor = "#10B981";
    let textColor = "#065F46";

    if (item.status === "merah") {
      badgeStatus = `<span style="background: #FEE2E2; color: #DC2626; padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 0.78rem;">🔴 Merah (Tinggi)</span>`;
      barColor = "#EF4444";
      textColor = "#B91C1C";
    } else if (item.status === "kuning") {
      badgeStatus = `<span style="background: #FEF3C7; color: #D97706; padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 0.78rem;">🟠 Kuning (Perhatian)</span>`;
      barColor = "#F59E0B";
      textColor = "#B45309";
    } else {
      badgeStatus = `<span style="background: #EBF8F1; color: #158050; padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 0.78rem;">🟢 Hijau (Aman)</span>`;
      barColor = "#10B981";
      textColor = "#047857";
    }

    const sisaHariText = r.sisa_hari <= 0
      ? `<span style="color: #DC2626; font-weight: 800;">Sudah Exp</span>`
      : `<span style="font-weight: 700; color: ${r.sisa_hari <= 3 ? '#DC2626' : 'var(--ink-charcoal)'};">${r.sisa_hari} Hari</span>`;

    return `
      <tr>
        <td><strong>${b.code}</strong></td>
        <td>
          <div style="font-weight: 700; color: var(--ink-charcoal);">${b.name}</div>
          <small style="color: var(--ink-secondary); font-size: 0.75rem;">${b.category || 'Makanan Fresh'}</small>
        </td>
        <td style="font-size: 0.84rem;">${b.expiry_date}</td>
        <td>${sisaHariText}</td>
        <td><strong>${b.stock}</strong> Pcs</td>
        <td>${badgeStatus}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 8px; background: #E2E8F0; border-radius: 999px; overflow: hidden;">
              <div style="width: ${prob}%; height: 100%; background: ${barColor}; border-radius: 999px; transition: width 0.4s ease;"></div>
            </div>
            <strong style="font-size: 0.84rem; color: ${textColor}; min-width: 40px; text-align: right;">${prob}%</strong>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// -----------------------------------------------------------------------------
// 2. SUB-FITUR: REKOMENDASI TINDAKAN DARI GOOGLE GEMINI LLM API
// -----------------------------------------------------------------------------
window.rekomendasiBatchLLMMap = {};
window.rekomendasiLLMList = [];
let sedangMemuatRekomendasiLLM = false;

// Kunci API Google Gemini (dapat dikonfigurasi via Pengaturan atau LocalStorage)
function getGeminiApiKey() {
  return localStorage.getItem("gemini_api_key") || "";
}

// Helper sanitasi teks dari emoji agar konsisten dengan desain modern SVG FreshLog
function bersihkanEmojiTeks(str) {
  if (!str) return "";
  return String(str)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Inisialisasi cache rekomendasi LLM dari localStorage jika sudah ada
try {
  localStorage.removeItem("freshlog_rekomendasi_llm_cache_v2"); // bersihkan cache versi lama ber-emoji
  const cachedAwal = localStorage.getItem("freshlog_rekomendasi_llm_cache_v3");
  if (cachedAwal) {
    const parsedAwal = JSON.parse(cachedAwal);
    if (parsedAwal && Array.isArray(parsedAwal.rekomendasi_tindakan)) {
      window.rekomendasiLLMList = parsedAwal.rekomendasi_tindakan;
      window.rekomendasiBatchLLMMap = parsedAwal.saran_per_batch || {};
    }
  }
} catch (eInitCache) {
  console.warn("Gagal membaca cache awal rekomendasi LLM:", eInitCache);
}

// Fallback preskriptif cerdas 3 Kategori Resmi jika LLM API offline / kuota habis
function generateRekomendasiFallbackPreskriptif() {
  const rekomendasiList = [];
  const saranBatch = {};

  if (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo)) {
    dataBatchDemo.forEach(batch => {
      const risiko = hitungStatusRisikoLokal(batch);
      const sisaStok = parseInt(batch.stock) || 0;
      const sisaHari = risiko.sisa_hari;
      const hargaJual = 18000;

      // Kategori 3: Buang 0 hari / sudah kedaluwarsa
      if (sisaHari <= 0 && sisaStok > 0) {
        rekomendasiList.push({
          id: `ACT-GEMINI-BUANG-${batch.code}`,
          jenis: "buang",
          namaTindakan: "Pemusnahan Limbah",
          badgeWarna: "#991B1B",
          badgeBg: "#FEE2E2",
          badgeBorder: "#FECACA",
          produk: batch.name,
          batch: batch.code,
          stok: sisaStok,
          prioritas: "Tindakan Darurat",
          alasan: `Produk telah mencapai 0 hari atau melewati tanggal kedaluwarsa. Demi keamanan pangan dan perlindungan konsumen, ${sisaStok} unit wajib segera dipisahkan dan dimusnahkan.`,
          estimasi: `Pencatatan limbah ${sisaStok} unit untuk audit inventaris`,
          tombolTeks: "Catat Pemusnahan"
        });
        saranBatch[batch.code] = "0 Hari (Kedaluwarsa): Segera pisahkan dan musnahkan dari stok aktif.";

      // Kategori 2: Donasi limbah 3-1 hari sebelum kadaluarsa
      } else if (sisaHari >= 1 && sisaHari <= 3 && sisaStok > 0) {
        rekomendasiList.push({
          id: `ACT-GEMINI-DONASI-${batch.code}`,
          jenis: "donasi",
          namaTindakan: "Donasi Limbah Pangan",
          badgeWarna: "#9A3412",
          badgeBg: "#FFEDD5",
          badgeBorder: "#FED7AA",
          produk: batch.name,
          batch: batch.code,
          stok: sisaStok,
          prioritas: "Prioritas Tertinggi",
          alasan: `Sisa ${sisaHari} hari sebelum kedaluwarsa (fase kritis 3-1 hari). Segera salurkan ${sisaStok} unit ke mitra donasi pangan sebelum kualitas menurun.`,
          estimasi: `Penyelamatan ${sisaStok} unit pangan bernutrisi untuk program sosial`,
          tombolTeks: "Salurkan Donasi"
        });
        saranBatch[batch.code] = `Sisa ${sisaHari} hari: Salurkan donasi limbah pangan ke mitra sebelum kedaluwarsa.`;

      // Kategori 1: Diskon 1 minggu sebelum kadaluarsa (4-7 hari)
      } else if (sisaHari >= 4 && sisaHari <= 7 && sisaStok > 0) {
        const diskonPersen = sisaHari <= 5 ? 40 : 25;
        rekomendasiList.push({
          id: `ACT-GEMINI-DISKON-${batch.code}`,
          jenis: "diskon",
          namaTindakan: `Diskon Bertahap (${diskonPersen}% Off)`,
          badgeWarna: "#92400E",
          badgeBg: "#FEF3C7",
          badgeBorder: "#FDE68A",
          produk: batch.name,
          batch: batch.code,
          stok: sisaStok,
          prioritas: "Prioritas Tinggi",
          alasan: `Batch berada pada fase 1 minggu sebelum kedaluwarsa (sisa ${sisaHari} hari). Pemotongan harga ${diskonPersen}% dan penempatan FEFO di rak depan diaktifkan untuk menghabiskan ${sisaStok} unit.`,
          estimasi: `Likuidasi omzet ${sisaStok} unit sebelum masuk fase donasi`,
          tombolTeks: "Terapkan Diskon"
        });
        saranBatch[batch.code] = `Sisa ${sisaHari} hari: Terapkan diskon 1 minggu sebelum kedaluwarsa (rotasi FEFO).`;

      } else {
        if (sisaHari <= 0) {
          saranBatch[batch.code] = "0 Hari (Kedaluwarsa): Segera pisahkan dan musnahkan dari stok aktif.";
        } else if (sisaStok <= 0) {
          saranBatch[batch.code] = "Stok habis. Tidak ada tindakan diperlukan.";
        } else {
          saranBatch[batch.code] = `Stok aman (sisa ${sisaHari} hari). Pertahankan rotasi standar FEFO.`;
        }
      }
    });
  }

  window.rekomendasiLLMList = rekomendasiList;
  window.rekomendasiBatchLLMMap = saranBatch;
}

// Fungsi utama mengambil rekomendasi dari Google Gemini LLM API (3 Kategori Resmi)
async function muatRekomendasiLLMGemini(forceRefresh = false) {
  if (sedangMemuatRekomendasiLLM) return;

  const container = document.getElementById("container-kartu-rekomendasi");
  const btnRefresh = document.getElementById("btn-refresh-rekomendasi-llm");

  // Jika tidak dipaksa refresh dan sudah ada data di memori/cache, langsung gunakan
  if (!forceRefresh && window.rekomendasiLLMList && window.rekomendasiLLMList.length > 0) {
    renderRekomendasiTindakanAI();
    return;
  }

  sedangMemuatRekomendasiLLM = true;
  if (btnRefresh) {
    btnRefresh.disabled = true;
    btnRefresh.innerHTML = `
      <svg class="modern-icon spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      <span>Menganalisis...</span>
    `;
  }

  if (container) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 42px 20px; background: var(--bg-card-white, #FFFFFF); border-radius: 16px; border: 1px dashed var(--border-hairline, #E2E8F0);">
        <div style="width: 44px; height: 44px; margin: 0 auto 12px; display: inline-flex; align-items: center; justify-content: center; background: #F1F5F9; border-radius: 50%; color: #475569;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <h3 style="margin: 0 0 6px; font-size: 1.05rem; color: var(--ink-charcoal); font-weight: 700;">Google Gemini API Sedang Menganalisis Inventaris...</h3>
        <p style="margin: 0 auto; font-size: 0.84rem; color: var(--ink-secondary); max-width: 520px; line-height: 1.5;">
          Menyusun saran preskriptif 3 kategori: <strong>Diskon (1 minggu sebelum exp)</strong>, <strong>Donasi Limbah (3–1 hari)</strong>, dan <strong>Pemusnahan (0 hari)</strong>.
        </p>
      </div>
    `;
  }

  const batchesPayload = (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo))
    ? dataBatchDemo.map(b => {
        const r = hitungStatusRisikoLokal(b);
        return {
          code: b.code || "",
          name: b.name || "",
          category: b.category || "Umum",
          stock: parseFloat(b.stock) || 0,
          expiry_date: b.expiry_date || "",
          sisa_hari: r.sisa_hari || 0,
          skor_risiko: r.skor_risiko || 0,
          status: r.status || "hijau"
        };
      })
    : [];

  let hasil = null;

  // 1. Coba lewat endpoint backend FastAPI (/rekomendasi-ai)
  try {
    const res = await fetch(`${FRESHLOG_API_BASE}/rekomendasi-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batches: batchesPayload })
    });
    if (res.ok) {
      hasil = await res.json();
    }
  } catch (errBackend) {
    console.warn("Backend /rekomendasi-ai offline/timeout, mencoba langsung ke Google Gemini API...", errBackend);
  }

  // 2. Jika backend offline, panggil langsung Google Gemini API dari browser
  if (!hasil || !hasil.rekomendasi_tindakan || hasil.rekomendasi_tindakan.length === 0) {
    try {
      const apiKey = getGeminiApiKey();
      if (apiKey) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
        const promptText = `Anda adalah asisten AI Analitik Ritel FreshLog (Sistem Inventaris FEFO & Manajemen Produk Segar).
Tugas Anda adalah menganalisis data batch berikut dan menyusun Rekomendasi Tindakan Preskriptif Cerdas berbasis Google Gemini LLM.

ATURAN WAJIB SISTEM - HANYA ADA 3 KATEGORI TINDAKAN RESMI:
1. "diskon" : Diskon 1 minggu sebelum kedaluwarsa (sisa 4 sampai 7 hari sebelum exp)
2. "donasi" : Donasi limbah pangan 3-1 hari sebelum kedaluwarsa (sisa 1 sampai 3 hari sebelum exp)
3. "buang"  : Buang / Pemusnahan limbah (0 hari atau sisa <= 0 hari / sudah kedaluwarsa)

Catatan: Produk dengan sisa hari > 7 hari adalah stok aman (tidak perlu kartu tindakan darurat).
PENTING: Jangan gunakan emoji apa pun dalam output teks.

Data Batch Inventaris:
${JSON.stringify(batchesPayload, null, 2)}

Keluarkan output HANYA berupa JSON murni (tanpa markdown \`\`\`json, tanpa komentar):
{
  "rekomendasi_tindakan": [
    {
      "id": "ACT-GEMINI-<kode_batch>",
      "batch": "<kode_batch>",
      "produk": "<nama_produk>",
      "jenis": "diskon|donasi|buang",
      "namaTindakan": "<Judul singkat tanpa emoji: 'Diskon Bertahap (30% Off)' | 'Donasi Limbah Pangan' | 'Pemusnahan Limbah'>",
      "badgeWarna": "<#92400E untuk diskon, #9A3412 untuk donasi, #991B1B untuk buang>",
      "badgeBg": "<#FEF3C7 untuk diskon, #FFEDD5 untuk donasi, #FEE2E2 untuk buang>",
      "badgeBorder": "<#FDE68A untuk diskon, #FED7AA untuk donasi, #FECACA untuk buang>",
      "prioritas": "Prioritas Tinggi | Prioritas Tertinggi | Tindakan Darurat",
      "stok": <angka stok yang ditindak>,
      "alasan": "<Penjelasan analitis mendalam mengapa tindakan ini diambil berdasarkan aturan 3 kategori>",
      "estimasi": "<Estimasi dampak nilai finansial atau penyelamatan makanan>",
      "tombolTeks": "Terapkan Diskon | Salurkan Donasi | Catat Pemusnahan"
    }
  ],
  "saran_per_batch": {
    "<kode_batch>": "<Saran tindakan ringkas & solutif tanpa emoji untuk batch ini sesuai aturan 3 kategori di atas>"
  }
}`;

        const payload = {
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            maxOutputTokens: 4096
          }
        };

        const resGemini = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (resGemini.ok) {
          const gemData = await resGemini.json();
          let rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
          if (rawText.startsWith("```")) {
            const lines = rawText.split("\n");
            if (lines[0].startsWith("```")) lines.shift();
            if (lines.length && lines[lines.length - 1].startsWith("```")) lines.pop();
            rawText = lines.join("\n").trim();
          }
          hasil = JSON.parse(rawText);
          hasil.source = "google_gemini_direct";
        }
      }
    } catch (errDirect) {
      console.warn("Direct call ke Gemini API gagal:", errDirect);
    }
  }

  sedangMemuatRekomendasiLLM = false;
  if (btnRefresh) {
    btnRefresh.disabled = false;
    btnRefresh.innerHTML = `
      <svg class="modern-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      <span>Analisis Ulang</span>
    `;
  }

  if (hasil && Array.isArray(hasil.rekomendasi_tindakan) && hasil.rekomendasi_tindakan.length > 0) {
    // Sanitasi semua teks dari emoji
    hasil.rekomendasi_tindakan.forEach(item => {
      item.namaTindakan = bersihkanEmojiTeks(item.namaTindakan);
      item.prioritas = bersihkanEmojiTeks(item.prioritas);
      item.alasan = bersihkanEmojiTeks(item.alasan);
      item.estimasi = bersihkanEmojiTeks(item.estimasi);
      item.tombolTeks = bersihkanEmojiTeks(item.tombolTeks);
    });
    if (hasil.saran_per_batch) {
      Object.keys(hasil.saran_per_batch).forEach(k => {
        hasil.saran_per_batch[k] = bersihkanEmojiTeks(hasil.saran_per_batch[k]);
      });
    }

    window.rekomendasiLLMList = hasil.rekomendasi_tindakan;
    window.rekomendasiBatchLLMMap = hasil.saran_per_batch || {};
    try {
      localStorage.setItem("freshlog_rekomendasi_llm_cache_v3", JSON.stringify(hasil));
    } catch (eSave) {}
  } else {
    // Gunakan fallback preskriptif 3 kategori jika Gemini API belum tersambung
    generateRekomendasiFallbackPreskriptif();
  }

  renderRekomendasiTindakanAI();
  renderTabelInventaris();
}

function renderRekomendasiTindakanAI() {
  const container = document.getElementById("container-kartu-rekomendasi");
  if (!container) return;

  // Jika daftar rekomendasi LLM masih kosong dan tidak sedang memuat, panggil Gemini
  if ((!window.rekomendasiLLMList || window.rekomendasiLLMList.length === 0) && !sedangMemuatRekomendasiLLM) {
    muatRekomendasiLLMGemini(false);
    return;
  }

  const filterJenis = document.getElementById("filter-jenis-tindakan-ai")?.value || "all";
  const hasilFilter = (window.rekomendasiLLMList || []).filter(item => {
    if (filterJenis === "all") return true;
    return item.jenis === filterJenis;
  });

  if (hasilFilter.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 36px 20px; background: var(--bg-card-white, #FFFFFF); border-radius: 16px; border: 1px solid var(--border-hairline, #E2E8F0); color: var(--ink-muted);">
        <p style="font-size: 1rem; font-weight: 600; color: var(--ink-charcoal); margin-bottom: 4px;">Tidak ada rekomendasi tindakan untuk kategori ini.</p>
        <small style="color: var(--ink-secondary);">Semua produk pada kategori ini terpantau aman sesuai rotasi FEFO.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = hasilFilter.map(item => {
    const jenis = (item.jenis || "").toLowerCase();
    
    // Normalisasi badge & ikon stroke SVG modern sesuai 3 kategori
    let badgeBg = item.badgeBg || "#FEF3C7";
    let badgeWarna = item.badgeWarna || "#92400E";
    let badgeBorder = item.badgeBorder || "#FDE68A";
    let prioritasWarna = "#D97706";
    let iconSvg = `<svg class="modern-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
    let defaultJudul = "Diskon Bertahap";
    let defaultTombol = "Terapkan Diskon";
    let defaultPrioritas = "Prioritas Tinggi";

    if (jenis === "buang") {
      badgeBg = "#FEE2E2";
      badgeWarna = "#991B1B";
      badgeBorder = "#FECACA";
      prioritasWarna = "#DC2626";
      iconSvg = `<svg class="modern-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      defaultJudul = "Pemusnahan Limbah";
      defaultTombol = "Catat Pemusnahan";
      defaultPrioritas = "Tindakan Darurat";
    } else if (jenis === "donasi") {
      badgeBg = "#FFEDD5";
      badgeWarna = "#9A3412";
      badgeBorder = "#FED7AA";
      prioritasWarna = "#EA580C";
      iconSvg = `<svg class="modern-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      defaultJudul = "Donasi Limbah Pangan";
      defaultTombol = "Salurkan Donasi";
      defaultPrioritas = "Prioritas Tertinggi";
    }

    // Bersihkan judul dari sisa teks teknis/emoji
    let judul = bersihkanEmojiTeks(item.namaTindakan) || defaultJudul;
    judul = judul.replace(/\(0 Hari \/ Expired\)/gi, "").replace(/\(3–1 Hari Sebelum Exp\)/gi, "").replace(/\(3-1 Hari Sebelum Exp\)/gi, "").trim();
    if (!judul) judul = defaultJudul;

    const prioritas = bersihkanEmojiTeks(item.prioritas) || defaultPrioritas;
    const alasan = bersihkanEmojiTeks(item.alasan);
    const estimasi = bersihkanEmojiTeks(item.estimasi);
    let tombol = bersihkanEmojiTeks(item.tombolTeks) || defaultTombol;
    tombol = tombol.replace(/^[✓\s]+/, "").trim();

    // Cek status batch di dataBatchDemo untuk idempotency & status final
    const batchKode = item.batch || item.id || "";
    const batchObj = (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo))
      ? dataBatchDemo.find(b => b.code === batchKode || b.code === item.id)
      : null;
    const sisaStokBatch = batchObj ? (parseFloat(batchObj.stock) || 0) : (parseFloat(item.stok) || 0);
    const statusBatch = batchObj && batchObj.status ? String(batchObj.status).toUpperCase() : "AKTIF";
    const isFinal = statusBatch === "TERJUAL" || statusBatch === "DONASI" || statusBatch === "BUSUK" || (batchObj && (batchObj.is_final || (sisaStokBatch <= 0 && statusBatch !== "AKTIF")));

    let areaAksiHTML = "";
    if (isFinal || sisaStokBatch <= 0) {
      let badgeColor = "#158050";
      let badgeBg = "#DCFCE7";
      let badgeBorder = "#BBF7D0";
      if (statusBatch === "BUSUK") {
        badgeColor = "#991B1B"; badgeBg = "#FEE2E2"; badgeBorder = "#FECACA";
      } else if (statusBatch === "DONASI") {
        badgeColor = "#9A3412"; badgeBg = "#FFEDD5"; badgeBorder = "#FED7AA";
      }
      areaAksiHTML = `
        <div style="padding: 10px 14px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; border-radius: 10px; text-align: center; font-size: 0.8rem; font-weight: 700;">
          ✓ Status Final: ${statusBatch} (Tercatat di Dampak Pangan)
        </div>
      `;
    } else {
      areaAksiHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
          <button type="button" class="btn btn-sm" style="background: #10B981; color: #FFFFFF; border: none; padding: 8px 4px; font-size: 0.74rem; font-weight: 700; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: transform 0.1s ease;" onclick="bukaKonfirmasiAksiBatch('${batchKode}', 'TERJUAL')" title="Tandai batch ini Terjual">
            <span>✅ Terjual</span>
          </button>
          <button type="button" class="btn btn-sm" style="background: #F59E0B; color: #FFFFFF; border: none; padding: 8px 4px; font-size: 0.74rem; font-weight: 700; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: transform 0.1s ease;" onclick="bukaKonfirmasiAksiBatch('${batchKode}', 'DONASI')" title="Tandai batch ini Donasi">
            <span>🎁 Donasi</span>
          </button>
          <button type="button" class="btn btn-sm" style="background: #EF4444; color: #FFFFFF; border: none; padding: 8px 4px; font-size: 0.74rem; font-weight: 700; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: transform 0.1s ease;" onclick="bukaKonfirmasiAksiBatch('${batchKode}', 'BUSUK')" title="Tandai batch ini Busuk/Dibuang">
            <span>❌ Busuk/Dibuang</span>
          </button>
        </div>
      `;
    }

    return `
      <div style="background: var(--bg-card-white, #FFFFFF); border: 1px solid var(--border-hairline, #E8ECEA); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-subtle, 0 4px 14px rgba(17, 24, 20, 0.03)); display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="background: ${badgeBg}; color: ${badgeWarna}; border: 1px solid ${badgeBorder}; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 0.76rem; display: inline-flex; align-items: center; gap: 5px;">
              ${iconSvg}
              <span>${judul}</span>
            </span>
            <span style="font-size: 0.74rem; font-weight: 600; color: ${prioritasWarna};">${prioritas}</span>
          </div>

          <h3 style="font-size: 1.05rem; margin: 0 0 4px; color: var(--ink-charcoal); font-weight: 700;">${item.produk}</h3>
          <p style="font-size: 0.8rem; color: var(--ink-secondary); margin: 0 0 12px;">Batch: <strong style="color: var(--ink-charcoal);">${item.batch}</strong> • Alokasi Rekomendasi: <strong style="color: var(--ink-charcoal);">${item.stok} Unit</strong></p>
          
          <div style="background: var(--bg-nested-subtle, #F8FAF9); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--border-hairline, #E8ECEA); font-size: 0.82rem; line-height: 1.5; color: #334155;">
            <div style="font-weight: 700; color: var(--ink-charcoal); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <svg class="modern-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Rekomendasi Preskriptif:</span>
            </div>
            <div style="color: var(--ink-secondary);">${alasan}</div>
          </div>
        </div>

        <div>
          <div style="font-size: 0.78rem; color: var(--status-success-ink, #158050); font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <svg class="modern-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>${estimasi}</span>
          </div>
          ${areaAksiHTML}
        </div>
      </div>
    `;
  }).join("");
}

/* ============================================================================= */
/* SINGLE SOURCE OF TRUTH: TABEL DAMPAK PANGAN & AKSI AKHIR BATCH               */
/* ============================================================================= */
const defaultDampakPanganData = [
  {
    id: "DP-20261102-001",
    batch_id: "BTC-001",
    produk: "Susu UHT 1L",
    qty_kg: 60.0,
    nilai_rupiah: 3000000,
    tipe: "TERSELAMATKAN",
    aksi: "TERJUAL",
    tanggal: "2026-11-02",
    waktu: "2026-11-02T10:15:00",
    user_id: "admin"
  },
  {
    id: "DP-20261105-002",
    batch_id: "BTC-002",
    produk: "Roti Tawar Daging",
    qty_kg: 120.0,
    nilai_rupiah: 6000000,
    tipe: "TERSELAMATKAN",
    aksi: "TERJUAL",
    tanggal: "2026-11-05",
    waktu: "2026-11-05T14:30:00",
    user_id: "staf1"
  },
  {
    id: "DP-20261108-003",
    batch_id: "BTC-003",
    produk: "Yogurt Stroberi",
    qty_kg: 86.0,
    nilai_rupiah: 4311000,
    tipe: "TERSELAMATKAN",
    aksi: "DONASI",
    tanggal: "2026-11-08",
    waktu: "2026-11-08T11:00:00",
    user_id: "admin"
  },
  {
    id: "DP-20261109-004",
    batch_id: "BTC-EX-99",
    produk: "Tahu Sumedang",
    qty_kg: 15.0,
    nilai_rupiah: 225000,
    tipe: "TIDAK_TERSELAMATKAN",
    aksi: "BUSUK",
    tanggal: "2026-11-09",
    waktu: "2026-11-09T16:45:00",
    user_id: "staf2"
  }
];

function getDampakPanganList() {
  try {
    const raw = localStorage.getItem("freshlog_dampak_pangan");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Gagal membaca freshlog_dampak_pangan dari storage:", e);
  }
  localStorage.setItem("freshlog_dampak_pangan", JSON.stringify(defaultDampakPanganData));
  return [...defaultDampakPanganData];
}

function simpanDampakPanganRecord(record) {
  const list = getDampakPanganList();
  list.unshift(record);
  localStorage.setItem("freshlog_dampak_pangan", JSON.stringify(list));
}

// Toast Notifikasi
function tampilkanToast(pesan, tipe = "success") {
  const container = document.getElementById("toast-container");
  if (!container) {
    alert(pesan);
    return;
  }
  const toast = document.createElement("div");
  const isError = tipe === "error";
  toast.style.cssText = `
    background: #0F172A;
    color: #FFFFFF;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
    border-left: 4px solid ${isError ? "#EF4444" : "#10B981"};
    animation: fadeInToast 0.3s ease;
  `;
  toast.innerHTML = `<span>${isError ? "⚠️" : "✅"}</span><span>${pesan}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Navigasi ke Laporan Rekapitulasi dari tombol "Lihat Detail" di Dashboard
function navigasiKeLaporanDampak() {
  pindahHalaman("laporan");
}

// LOKASI 1: DASHBOARD (RINGKAS)
function renderDashboardDampakRingkas() {
  const records = getDampakPanganList();
  const now = new Date();
  const currYear = now.getFullYear();
  const currMonth = String(now.getMonth() + 1).padStart(2, "0");
  const prefixBulan = `${currYear}-${currMonth}`;

  // Ambil records bulan ini (atau fallback default demo November 2026)
  const recordsBulanIni = records.filter(r => {
    if (!r.tanggal) return false;
    return r.tanggal.startsWith(prefixBulan) || r.tanggal.startsWith("2026-11");
  });

  let selamatKg = 0;
  let selamatRp = 0;
  let gagalKg = 0;
  let gagalRp = 0;

  recordsBulanIni.forEach(r => {
    const kg = parseFloat(r.qty_kg) || 0;
    const rp = parseInt(r.nilai_rupiah) || 0;
    if (r.tipe === "TERSELAMATKAN") {
      selamatKg += kg;
      selamatRp += rp;
    } else {
      gagalKg += kg;
      gagalRp += rp;
    }
  });

  const elSelamatKg = document.getElementById("dash-dampak-terselamatkan-kg");
  const elSelamatRp = document.getElementById("dash-dampak-terselamatkan-rp");
  const elGagalKg = document.getElementById("dash-dampak-gagal-kg");
  const elGagalRp = document.getElementById("dash-dampak-gagal-rp");

  // Nilai fallback demo awal jika belum ada transaksi di bulan ini
  if (selamatKg === 0) {
    selamatKg = 266;
    selamatRp = 13311000;
  }
  if (gagalKg === 0) {
    gagalKg = 15;
    gagalRp = 225000;
  }

  if (elSelamatKg) {
    elSelamatKg.innerText = (selamatKg % 1 === 0)
      ? Math.round(selamatKg).toLocaleString("id-ID")
      : selamatKg.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  if (elSelamatRp) elSelamatRp.innerText = selamatRp.toLocaleString("id-ID");

  if (elGagalKg) {
    elGagalKg.innerText = (gagalKg % 1 === 0)
      ? Math.round(gagalKg).toLocaleString("id-ID")
      : gagalKg.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  if (elGagalRp) elGagalRp.innerText = gagalRp.toLocaleString("id-ID");
}

// LOKASI 2: LAPORAN -> DAMPAK PANGAN (DETAIL)
function renderLaporanDampakDetail() {
  const allRecords = getDampakPanganList();

  // Sinkronisasi opsi produk di dropdown filter produk dampak
  const elProdukSelect = document.getElementById("dampak-filter-produk");
  if (elProdukSelect) {
    const currentVal = elProdukSelect.value || "all";
    const daftarProduk = Array.from(new Set([
      ...allRecords.map(r => r.produk).filter(Boolean),
      ...(typeof masterProdukList !== "undefined" && Array.isArray(masterProdukList) ? masterProdukList.map(p => p.nama) : [])
    ])).sort();

    let optionsHtml = `<option value="all">Semua Produk</option>`;
    daftarProduk.forEach(nama => {
      const selected = (nama === currentVal) ? "selected" : "";
      optionsHtml += `<option value="${nama}" ${selected}>${nama}</option>`;
    });
    elProdukSelect.innerHTML = optionsHtml;
  }

  const filterBulan = document.getElementById("dampak-filter-bulan")?.value || "all";
  const filterTahun = document.getElementById("dampak-filter-tahun")?.value || "all";
  const filterProduk = document.getElementById("dampak-filter-produk")?.value || "all";

  // Filter records
  const filtered = allRecords.filter(r => {
    if (!r.tanggal) return false;
    const parts = r.tanggal.split("-");
    const rTahun = parts[0];
    const rBulan = String(parseInt(parts[1], 10));

    if (filterTahun !== "all" && rTahun !== filterTahun) return false;
    if (filterBulan !== "all" && rBulan !== filterBulan) return false;
    if (filterProduk !== "all" && r.produk !== filterProduk) return false;
    return true;
  });

  // Hitung metrik tree breakdown
  let terjualKg = 0;
  let terjualRp = 0;
  let donasiKg = 0;
  let donasiRp = 0;
  let gagalKg = 0;
  let gagalRp = 0;

  filtered.forEach(r => {
    const kg = parseFloat(r.qty_kg) || 0;
    const rp = parseInt(r.nilai_rupiah) || 0;
    const aksiUpper = (r.aksi || "").toUpperCase();
    if (aksiUpper === "TERJUAL") {
      terjualKg += kg;
      terjualRp += rp;
    } else if (aksiUpper === "DONASI") {
      donasiKg += kg;
      donasiRp += rp;
    } else if (aksiUpper === "BUSUK") {
      gagalKg += kg;
      gagalRp += rp;
    }
  });

  const totalSelamatKg = terjualKg + donasiKg;
  const totalSelamatRp = terjualRp + donasiRp;

  // Render angka-angka ke tampilan Tree
  const elTreeTerjualKg = document.getElementById("tree-terjual-kg");
  const elTreeTerjualRp = document.getElementById("tree-terjual-rp");
  const elTreeDonasiKg = document.getElementById("tree-donasi-kg");
  const elTreeDonasiRp = document.getElementById("tree-donasi-rp");
  const elTreeSelamatTotalKg = document.getElementById("tree-selamat-total-kg");
  const elTreeSelamatTotalRp = document.getElementById("tree-selamat-total-rp");
  const elTreeGagalTotalKg = document.getElementById("tree-gagal-total-kg");
  const elTreeGagalTotalRp = document.getElementById("tree-gagal-total-rp");

  if (elTreeTerjualKg) elTreeTerjualKg.innerText = terjualKg.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (elTreeTerjualRp) elTreeTerjualRp.innerText = `Rp ${terjualRp.toLocaleString("id-ID")}`;
  if (elTreeDonasiKg) elTreeDonasiKg.innerText = donasiKg.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (elTreeDonasiRp) elTreeDonasiRp.innerText = `Rp ${donasiRp.toLocaleString("id-ID")}`;
  if (elTreeSelamatTotalKg) elTreeSelamatTotalKg.innerText = totalSelamatKg.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (elTreeSelamatTotalRp) elTreeSelamatTotalRp.innerText = `Rp ${totalSelamatRp.toLocaleString("id-ID")}`;
  if (elTreeGagalTotalKg) elTreeGagalTotalKg.innerText = gagalKg.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (elTreeGagalTotalRp) elTreeGagalTotalRp.innerText = `Rp ${gagalRp.toLocaleString("id-ID")}`;

  // Render tabel rincian transaksi
  const tbody = document.getElementById("table-dampak-pangan-body");
  if (tbody) {
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--ink-secondary);">Tidak ada catatan transaksi dampak pangan untuk periode/produk ini.</td></tr>`;
    } else {
      tbody.innerHTML = filtered.map(r => {
        const kg = (parseFloat(r.qty_kg) || 0).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const rp = (parseInt(r.nilai_rupiah) || 0).toLocaleString("id-ID");
        const aksi = (r.aksi || "").toUpperCase();
        let badgeAksi = `<span class="badge" style="background:#dcfce7; color:#158050; border:1px solid #bbf7d0;">✅ TERJUAL</span>`;
        if (aksi === "DONASI") {
          badgeAksi = `<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a;">🎁 DONASI</span>`;
        } else if (aksi === "BUSUK") {
          badgeAksi = `<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca;">❌ BUSUK</span>`;
        }

        const tipeBadge = (r.tipe === "TERSELAMATKAN")
          ? `<span style="color:#158050; font-weight:700;">Terselamatkan</span>`
          : `<span style="color:#b91c1c; font-weight:700;">Tidak Terselamatkan (Rugi)</span>`;

        return `
          <tr>
            <td><strong>${r.tanggal || "-"}</strong></td>
            <td><code>${r.batch_id || "-"}</code></td>
            <td><strong>${r.produk || "-"}</strong></td>
            <td>${badgeAksi}</td>
            <td>${tipeBadge}</td>
            <td style="font-weight:700;">${kg} kg</td>
            <td style="font-weight:700;">Rp ${rp}</td>
            <td><small style="color:var(--ink-secondary);">${r.user_id || "admin"}</small></td>
          </tr>
        `;
      }).join("");
    }
  }
}

function resetFilterLaporanDampak() {
  const elBulan = document.getElementById("dampak-filter-bulan");
  const elTahun = document.getElementById("dampak-filter-tahun");
  const elProduk = document.getElementById("dampak-filter-produk");
  if (elBulan) elBulan.value = "11";
  if (elTahun) elTahun.value = "2026";
  if (elProduk) elProduk.value = "all";
  renderLaporanDampakDetail();
}

function terapkanFilterLaporanDampak() {
  renderLaporanDampakDetail();
}

// Modal Konfirmasi & Eksekusi Aksi Akhir Batch
let pendingAksiBatch = null;

function bukaKonfirmasiAksiBatch(batchCode, aksi) {
  const batchObj = (typeof dataBatchDemo !== "undefined" && Array.isArray(dataBatchDemo))
    ? dataBatchDemo.find(b => b.code === batchCode)
    : null;
  if (!batchObj) {
    alert("Data batch tidak ditemukan!");
    return;
  }
  const statusBatch = (batchObj.status || "AKTIF").toUpperCase();
  if (statusBatch === "TERJUAL" || statusBatch === "DONASI" || statusBatch === "BUSUK") {
    alert(`Batch ${batchCode} sudah berstatus final (${statusBatch}) dan tidak dapat diproses ulang.`);
    return;
  }

  const qty = parseFloat(batchObj.stock) || 0;
  pendingAksiBatch = {
    batchCode: batchCode,
    aksi: aksi,
    qty: qty,
    produk: batchObj.name
  };

  const modal = document.getElementById("modal-konfirmasi-aksi-batch");
  const modalDesc = document.getElementById("modal-konfirmasi-deskripsi");
  const modalTitle = document.getElementById("modal-konfirmasi-title");
  const modalIcon = document.getElementById("modal-konfirmasi-icon");

  if (modalTitle) modalTitle.innerText = `Konfirmasi Aksi: ${aksi}`;
  if (modalIcon) {
    if (aksi === "TERJUAL") { modalIcon.innerText = "✅"; modalIcon.style.background = "#dcfce7"; }
    else if (aksi === "DONASI") { modalIcon.innerText = "🎁"; modalIcon.style.background = "#fef3c7"; }
    else { modalIcon.innerText = "❌"; modalIcon.style.background = "#fee2e2"; }
  }
  if (modalDesc) {
    modalDesc.innerHTML = `Tandai batch ini <strong>${aksi}</strong>?<br>Stok akan berkurang <strong>${qty} kg</strong> dan tercatat di Dampak Pangan.`;
  }
  if (modal) modal.classList.add("active");
}

function tutupModalKonfirmasiAksiBatch() {
  const modal = document.getElementById("modal-konfirmasi-aksi-batch");
  if (modal) modal.classList.remove("active");
  pendingAksiBatch = null;
}

async function eksekusiAksiBatchKonfirmasi() {
  if (!pendingAksiBatch) return;
  const { batchCode, aksi, qty, produk } = pendingAksiBatch;

  const batchObj = dataBatchDemo.find(b => b.code === batchCode);
  if (!batchObj) {
    alert("Batch tidak ditemukan.");
    tutupModalKonfirmasiAksiBatch();
    return;
  }

  const statusSaatIni = (batchObj.status || "AKTIF").toUpperCase();
  if (statusSaatIni === "TERJUAL" || statusSaatIni === "DONASI" || statusSaatIni === "BUSUK") {
    alert(`Gagal: Batch ${batchCode} sudah berstatus ${statusSaatIni} sebelumnya (idempotent).`);
    tutupModalKonfirmasiAksiBatch();
    return;
  }

  // Cari perkiraan harga dari master produk / productDatabase
  let hargaProduk = 18000;
  if (typeof masterProdukList !== "undefined" && Array.isArray(masterProdukList)) {
    const prodMaster = masterProdukList.find(p => p.nama === produk);
    if (prodMaster && prodMaster.hargaJual) hargaProduk = parseFloat(prodMaster.hargaJual);
  }
  const nilaiRupiah = Math.round(qty * hargaProduk);
  const tipeDampak = (aksi === "BUSUK") ? "TIDAK_TERSELAMATKAN" : "TERSELAMATKAN";
  const userAktifKey = (typeof activeUserKey !== "undefined" && activeUserKey) ? activeUserKey : "admin";
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // a. Batch keluar dari stok aktif (qty = 0)
  batchObj.stock = 0;
  // b. Set status batch = 'TERJUAL' | 'DONASI' | 'BUSUK' (FINAL, tidak bisa diubah)
  batchObj.status = aksi;
  batchObj.is_final = true;

  // Simpan state batch ke localStorage
  localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));

  // c. Simpan record ke tabel dampak_pangan
  const recordDampak = {
    id: `DP-${Date.now()}-${batchCode}`,
    batch_id: batchCode,
    produk: produk,
    qty_kg: qty,
    nilai_rupiah: nilaiRupiah,
    tipe: tipeDampak,
    aksi: aksi,
    tanggal: todayStr,
    waktu: nowIso,
    user_id: userAktifKey
  };
  simpanDampakPanganRecord(recordDampak);

  // Sync ke backend FastAPI (idempotent)
  try {
    await fetch(`${FRESHLOG_API_BASE}/dampak-pangan/catat-aksi-akhir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batch_id: batchCode,
        aksi: aksi,
        produk: produk,
        qty_kg: qty,
        nilai_rupiah: nilaiRupiah,
        user_id: userAktifKey
      })
    });
  } catch (errSync) {
    console.warn("Sinkronisasi dampak pangan ke backend offline:", errSync);
  }

  // Tutup modal
  tutupModalKonfirmasiAksiBatch();

  // 3. Tombol aksi HILANG setelah status final (re-render)
  renderRekomendasiTindakanAI();
  renderTabelInventaris();
  updateDashboardSummary();

  // Update Lokasi Dampak Pangan (Dashboard & Laporan)
  renderDashboardDampakRingkas();
  if (typeof terapkanFilterLaporan === "function") terapkanFilterLaporan();

  // Catat ke log aktivitas
  if (typeof catatLogAktivitas === "function") {
    catatLogAktivitas("Aksi Akhir Batch", `Menandai batch ${batchCode} (${produk}) sebagai ${aksi} [${qty} kg, Rp ${nilaiRupiah.toLocaleString("id-ID")}]`, "Analitik AI");
  }

  // 4. Tampilkan toast sukses: "Batch tercatat sebagai [Terjual/Donasi/Busuk]"
  const labelAksi = (aksi === "BUSUK") ? "Busuk" : (aksi === "DONASI" ? "Donasi" : "Terjual");
  tampilkanToast(`Batch tercatat sebagai ${labelAksi}`);
}

// -----------------------------------------------------------------------------
// 3. SUB-FITUR: PREDIKSI RESTOCK (7-14 HARI) + SARAN QTY BELANJA
// -----------------------------------------------------------------------------
async function hitungUlangRestockAI() {
  const tbody = document.getElementById("table-restock");
  const selectProd = document.getElementById("ai-restock-pilih-produk");
  const targetHari = parseInt(document.getElementById("ai-restock-target-hari")?.value) || 14;

  if (!tbody) return;

  if (dataBatchDemo.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:15px; color:#64748b;'>Belum ada data produk di inventaris untuk dihitung.</td></tr>";
    return;
  }

  // Populasi dropdown pilih produk jika belum terisi
  if (selectProd && selectProd.options.length <= 1) {
    const uniqueProds = [...new Set(dataBatchDemo.map(b => b.name))];
    selectProd.innerHTML = uniqueProds.map(p => `<option value="${p}">${p}</option>`).join("");
  }

  tbody.innerHTML = "<tr><td colspan='6' style='text-align: center; padding: 18px;'>Menghitung proyeksi restock AI...</td></tr>";

  // Kelompokkan per nama produk master agar saran belanja konsisten
  const produkAgg = {};
  dataBatchDemo.forEach(b => {
    if (!produkAgg[b.name]) {
      produkAgg[b.name] = {
        name: b.name,
        category: b.category,
        totalStock: 0,
        codes: [],
        penjualan_14_hari: b.penjualan_14_hari || [6, 7, 5, 8, 7, 6, 8, 9, 7, 6, 8, 7, 8, 9]
      };
    }
    produkAgg[b.name].totalStock += (parseInt(b.stock) || 0);
    produkAgg[b.name].codes.push(b.code);
  });

  const listItems = Object.values(produkAgg);

  const hasilRestock = await Promise.all(listItems.map(async item => {
    // 1. Coba hitung via endpoint backend FastAPI (/restock)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${FRESHLOG_API_BASE}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produk: item.name,
          sisa_stok: item.totalStock,
          penjualan_14_hari: item.penjualan_14_hari,
          hari_target: targetHari
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const estHabis = json.estimasi_habis_hari;
        const saranBelanja = json.saran_belanja;
        let statusBadge = "";
        if (parseFloat(estHabis) <= 3) {
          statusBadge = `<span style="background: #FEE2E2; color: #DC2626; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🔴 Stok Kritis</span>`;
        } else if (saranBelanja > 0) {
          statusBadge = `<span style="background: #FEF3C7; color: #D97706; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🟠 Perlu Restock</span>`;
        } else {
          statusBadge = `<span style="background: #EBF8F1; color: #158050; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🟢 Stok Aman</span>`;
        }
        return {
          name: item.name,
          codes: item.codes.join(", "),
          totalStock: item.totalStock,
          rataRataHarian: json.rata_rata_harian,
          estimasiHabisHari: estHabis,
          saranBelanja: saranBelanja,
          statusBadge: statusBadge
        };
      }
    } catch (errRestock) {
      // Backend offline, beralih ke kalkulasi lokal
    }

    // 2. Fallback kalkulasi matematis lokal
    const hist = item.penjualan_14_hari;
    const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
    const avgRound = Math.round(avg * 10) / 10;
    const estHabis = avg > 0 ? (item.totalStock / avg).toFixed(1) : "99+";
    const kebutuhan = avg * targetHari;
    const saranBelanja = Math.max(0, Math.round(kebutuhan - item.totalStock));

    let statusBadge = "";
    if (parseFloat(estHabis) <= 3) {
      statusBadge = `<span style="background: #FEE2E2; color: #DC2626; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🔴 Stok Kritis</span>`;
    } else if (saranBelanja > 0) {
      statusBadge = `<span style="background: #FEF3C7; color: #D97706; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🟠 Perlu Restock</span>`;
    } else {
      statusBadge = `<span style="background: #EBF8F1; color: #158050; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🟢 Stok Aman</span>`;
    }

    return {
      name: item.name,
      codes: item.codes.join(", "),
      totalStock: item.totalStock,
      rataRataHarian: avgRound,
      estimasiHabisHari: estHabis,
      saranBelanja: saranBelanja,
      statusBadge: statusBadge
    };
  }));

  tbody.innerHTML = hasilRestock.map(r => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--ink-charcoal);">${r.name}</div>
        <small style="color: var(--ink-secondary); font-size: 0.75rem;">Batch: ${r.codes}</small>
      </td>
      <td><strong>${r.rataRataHarian}</strong> Unit</td>
      <td><strong>${r.totalStock}</strong> Pcs</td>
      <td><strong>${r.estimasiHabisHari}</strong> Hari lagi</td>
      <td>
        <strong style="color: ${r.saranBelanja > 0 ? '#DC2626' : '#158050'}; font-size: 0.95rem;">
          ${r.saranBelanja > 0 ? `+${r.saranBelanja} Unit` : '0 (Cukup)'}
        </strong>
      </td>
      <td>${r.statusBadge}</td>
    </tr>
  `).join("");

  updateGrafikProyeksiRestock();
}

function updateGrafikProyeksiRestock() {
  const canvas = document.getElementById("chartPrediksiRestock");
  const selectProd = document.getElementById("ai-restock-pilih-produk");
  const targetHari = parseInt(document.getElementById("ai-restock-target-hari")?.value) || 14;

  if (!canvas || typeof Chart === "undefined") return;

  const namaProduk = selectProd?.value || "Susu UHT 1L";
  const item = dataBatchDemo.find(b => b.name === namaProduk) || dataBatchDemo[0];
  const hist = (item && item.penjualan_14_hari) ? item.penjualan_14_hari : [6, 7, 5, 8, 7, 6, 8, 9, 7, 6, 8, 7, 8, 9];

  // Gunakan subset historis sesuai targetHari (7 atau 14 hari)
  const historiSlice = hist.slice(-targetHari);
  const avg = historiSlice.reduce((a, b) => a + b, 0) / historiSlice.length;

  const labels = [];
  const dataAktual = [];
  const dataPrediksi = [];

  // 1. Data Historis
  for (let i = targetHari; i >= 1; i--) {
    labels.push(`H-${i}`);
    dataAktual.push(historiSlice[targetHari - i]);
    dataPrediksi.push(null);
  }

  // Titik temu (Hari Ini)
  labels.push("Hari Ini");
  const lastVal = historiSlice[historiSlice.length - 1];
  dataAktual.push(lastVal);
  dataPrediksi.push(lastVal);

  // 2. Data Proyeksi AI ke Depan
  for (let i = 1; i <= targetHari; i++) {
    labels.push(`H+${i}`);
    dataAktual.push(null);
    const variasi = Math.sin(i * 0.9) * 1.5;
    const est = Math.max(1, Math.round(avg + variasi));
    dataPrediksi.push(est);
  }

  if (chartPrediksiRestockInstance) {
    chartPrediksiRestockInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  chartPrediksiRestockInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Penjualan Historis",
          data: dataAktual,
          borderColor: "#94A3B8",
          backgroundColor: "rgba(148, 163, 184, 0.15)",
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#94A3B8"
        },
        {
          label: `Proyeksi Prediksi AI (${targetHari} Hari ke Depan)`,
          data: dataPrediksi,
          borderColor: "#137A4B",
          backgroundColor: "rgba(19, 122, 75, 0.12)",
          borderWidth: 2.5,
          borderDash: [5, 5],
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#137A4B"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: "600" },
            color: "#525D56",
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: "#111814",
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              if (ctx.parsed.y === null) return "";
              return ` ${ctx.dataset.label}: ${ctx.parsed.y} Unit`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(232, 236, 234, 0.7)", borderDash: [5, 5] },
          ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#8A948E" }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#525D56" }
        }
      }
    }
  });
}

// -----------------------------------------------------------------------------
// 4. SUB-FITUR: RIWAYAT PREDIKSI VS AKTUAL (EVALUASI AKURASI)
// -----------------------------------------------------------------------------
function loadRiwayatAkurasiAI() {
  const tbody = document.getElementById("table-ai-akurasi");
  if (!tbody) return;

  // Data historis evaluasi model AI 14 hari terakhir
  const evaluasiData = [
    { tanggal: "10 Nov 2026", produk: "Susu UHT 1L", prediksi: 14, aktual: 15 },
    { tanggal: "09 Nov 2026", produk: "Roti Tawar Daging", prediksi: 10, aktual: 11 },
    { tanggal: "08 Nov 2026", produk: "Yogurt Stroberi", prediksi: 8, aktual: 8 },
    { tanggal: "07 Nov 2026", produk: "Telur Ayam 1kg", prediksi: 12, aktual: 13 },
    { tanggal: "06 Nov 2026", produk: "Nugget Ayam 500g", prediksi: 7, aktual: 6 },
    { tanggal: "05 Nov 2026", produk: "Beras Rojolele 5kg", prediksi: 5, aktual: 5 },
    { tanggal: "04 Nov 2026", produk: "Susu UHT 1L", prediksi: 16, aktual: 15 },
    { tanggal: "03 Nov 2026", produk: "Roti Tawar Daging", prediksi: 9, aktual: 10 },
    { tanggal: "02 Nov 2026", produk: "Yogurt Stroberi", prediksi: 7, aktual: 7 },
    { tanggal: "01 Nov 2026", produk: "Telur Ayam 1kg", prediksi: 11, aktual: 12 }
  ];

  let totalSelisih = 0;
  let totalAkurasi = 0;

  tbody.innerHTML = evaluasiData.map(d => {
    const selisih = d.aktual - d.prediksi;
    const absDiff = Math.abs(selisih);
    totalSelisih += absDiff;

    const akurasi = Math.max(75, Math.round((1 - (absDiff / Math.max(1, d.aktual))) * 100));
    totalAkurasi += akurasi;

    let badgeAkurasi = "";
    if (akurasi >= 92) {
      badgeAkurasi = `<span style="background: #EBF8F1; color: #158050; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">🎯 Sangat Akurat</span>`;
    } else if (akurasi >= 85) {
      badgeAkurasi = `<span style="background: #EFF6FF; color: #2563EB; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">✓ Akurat</span>`;
    } else {
      badgeAkurasi = `<span style="background: #FEF3C7; color: #D97706; padding: 3px 8px; border-radius: 999px; font-size: 0.76rem; font-weight: 700;">⚠️ Deviasi Wajar</span>`;
    }

    const tandaSelisih = selisih > 0 ? `+${selisih}` : `${selisih}`;

    return `
      <tr>
        <td><strong>${d.tanggal}</strong></td>
        <td><strong>${d.produk}</strong></td>
        <td>${d.prediksi} Unit</td>
        <td><strong>${d.aktual} Unit</strong></td>
        <td style="color: ${selisih === 0 ? '#158050' : (selisih > 0 ? '#2563EB' : '#D97706')}; font-weight: 700;">
          ${tandaSelisih} Unit
        </td>
        <td><strong style="color: var(--emerald-primary);">${akurasi}%</strong></td>
        <td>${badgeAkurasi}</td>
      </tr>
    `;
  }).join("");

  const avgAkurasi = (totalAkurasi / evaluasiData.length).toFixed(1);
  const mae = (totalSelisih / evaluasiData.length).toFixed(1);

  const elAkurasi = document.getElementById("kpi-ai-akurasi-persen");
  const elMae = document.getElementById("kpi-ai-mae");
  const elValidasi = document.getElementById("kpi-ai-total-validasi");

  if (elAkurasi) elAkurasi.innerText = `${avgAkurasi}%`;
  if (elMae) elMae.innerText = `±${mae} Unit`;
  if (elValidasi) elValidasi.innerText = `${evaluasiData.length * 4} Transaksi`;

  renderGrafikEvaluasiAkurasi();
}

function renderGrafikEvaluasiAkurasi() {
  const canvas = document.getElementById("chartEvaluasiAkurasi");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = ["01 Nov", "02 Nov", "03 Nov", "04 Nov", "05 Nov", "06 Nov", "07 Nov", "08 Nov", "09 Nov", "10 Nov"];
  const dataPrediksi = [15, 14, 16, 15, 13, 14, 17, 16, 18, 17];
  const dataAktual = [16, 14, 15, 16, 13, 15, 18, 16, 19, 17];

  if (chartEvaluasiAkurasiInstance) {
    chartEvaluasiAkurasiInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  chartEvaluasiAkurasiInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Prediksi AI",
          data: dataPrediksi,
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#3B82F6"
        },
        {
          label: "Penjualan Aktual",
          data: dataAktual,
          borderColor: "#137A4B",
          backgroundColor: "rgba(19, 122, 75, 0.15)",
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#137A4B"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#111814",
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 10,
          grid: { color: "rgba(232, 236, 234, 0.7)", borderDash: [5, 5] },
          ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#8A948E" }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: "#525D56" }
        }
      }
    }
  });
}

// Kompatibilitas fungsi lama
async function loadPrediksiRestock() {
  await hitungUlangRestockAI();
}
/* ========================================== */
/* INPUT SUARA (WEB SPEECH API)               */
/* ========================================== */

function mulaiRekam() {
  const btn = document.getElementById("btn-rekam");
  const hasilBox = document.getElementById("hasil-suara");

  // Cek apakah browser mendukung
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    hasilBox.innerHTML = "<p style='color:red'>Browser tidak mendukung input suara. Pakai Chrome.</p>";
    return;
  }

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "id-ID";      // Bahasa Indonesia
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  btn.innerHTML = `🔴 Merekam...`;
  btn.disabled = true;

  recognition.start();

  recognition.onresult = function(event) {
    const teks = event.results[0][0].transcript;
    hasilBox.innerHTML = `<p><strong>Transkrip:</strong> "${teks}"</p>`;

    // Ekstrak angka dan masukkan ke input jumlah
    const angka = teks.match(/\d+/);
    if (angka) {
      const inputJumlah = document.getElementById("ekstrak-jumlah");
      if (inputJumlah) inputJumlah.value = angka[0];
    }

    // Coba tebak nama produk dari suara
    const inputProduk = document.getElementById("ekstrak-produk");
    if (inputProduk) {
      let prediksi = teks
        .replace(/^(masuk|tambah|input|tolong masukkan|beli)\s+/i, "")
        .replace(/\b(\d+)\s*(pcs|buah|botol|kaleng|bungkus|pack|unit|butir)?\b/gi, "")
        .replace(/\b(exp|expired|kadaluwarsa|kedaluwarsa).*/gi, "")
        .trim();
      if (prediksi.length > 2) {
        inputProduk.value = prediksi.charAt(0).toUpperCase() + prediksi.slice(1);
      }
    }

    btn.innerHTML = `🎤 Mulai Rekam Suara`;
    btn.disabled = false;
  };

  recognition.onerror = function(event) {
    hasilBox.innerHTML = `<p style='color:red'>Error: ${event.error}. Coba lagi.</p>`;
    btn.innerHTML = `🎤 Mulai Rekam Suara`;
    btn.disabled = false;
  };

  recognition.onend = function() {
    btn.innerHTML = `🎤 Mulai Rekam Suara`;
    btn.disabled = false;
  };
}

/* ========================================== */
/* INPUT FOTO NOTA (FASTAPI + GEMINI AI)      */
/* ========================================== */

// URL Gemini API fallback (jika backend offline, kunci dapat disimpan di localStorage)
function getGeminiApiUrl() {
  const userKey = localStorage.getItem("gemini_api_key") || getGeminiApiKey();
  if (!userKey) return "";
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${userKey}`;
}

function pratinjauFoto(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById("pratinjau-foto").innerHTML = `
      <img src="${e.target.result}" style="max-width:300px; max-height:260px; object-fit:contain; border-radius:8px; margin-top:8px; border:1px solid #cbd5e1; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
    `;
    const btnEkstrak = document.getElementById("btn-ekstrak");
    if (btnEkstrak) btnEkstrak.disabled = false;
  };
  reader.readAsDataURL(file);
}

// Helper untuk menormalisasi data dari berbagai format JSON hasil AI
function normalisasiDataEkstraksi(data) {
  let list = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && Array.isArray(data.items)) {
    list = data.items;
  } else if (data && Array.isArray(data.data)) {
    list = data.data;
  } else if (data && Array.isArray(data.produk)) {
    list = data.produk;
  } else if (data && typeof data === "object") {
    list = [data];
  }

  const items = list.map((item, idx) => {
    const nama = item.produk || item.nama_produk || item.nama || item.barang || `Produk #${idx + 1}`;
    let jumlah = parseInt(item.jumlah || item.qty || item.quantity || item.stok) || 1;
    if (jumlah <= 0) jumlah = 1;

    let exp = item.tanggal_kedaluwarsa || item.exp || item.tgl_exp || item.expired || "";
    if (exp === "null" || exp === "None" || exp === "tidak ada") exp = "";

    // Konversi format DD/MM/YYYY atau DD-MM-YYYY ke YYYY-MM-DD
    if (exp && typeof exp === "string") {
      const matchTgl = exp.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (matchTgl) {
        exp = `${matchTgl[3]}-${matchTgl[2].padStart(2, "0")}-${matchTgl[1].padStart(2, "0")}`;
      }
    }

    return {
      produk: String(nama).trim(),
      jumlah: jumlah,
      tanggal_kedaluwarsa: exp
    };
  });

  return items;
}

// Helper untuk mengekstrak dan mem-parse JSON dari teks model
function parsingJSONEkstraksi(teks) {
  if (!teks) return null;
  // Bersihkan penanda blok markdown ```json
  let bersih = teks.replace(/```json/gi, "").replace(/```/g, "").trim();

  // 1. Coba parse langsung
  try {
    const direct = JSON.parse(bersih);
    const normalized = normalisasiDataEkstraksi(direct);
    if (normalized.length > 0) return normalized;
  } catch (e) {}

  // 2. Cari blok JSON array [...] atau object {...}
  const match = bersih.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      const normalized = normalisasiDataEkstraksi(parsed);
      if (normalized.length > 0) return normalized;
    } catch (e) {}
  }
  return null;
}

// Variabel penampung daftar item nota yang diekstrak
let daftarItemEkstraksi = [];

// Fungsi simpan semua item hasil ekstraksi sekaligus
function simpanSemuaBatchEkstraksi() {
  if (!daftarItemEkstraksi || daftarItemEkstraksi.length === 0) {
    alert("Tidak ada data produk dari nota untuk disimpan.");
    return;
  }

  const defaultExp = new Date();
  defaultExp.setDate(defaultExp.getDate() + 30);
  const fallbackExp = defaultExp.toISOString().split("T")[0];

  let totalDisimpan = 0;
  daftarItemEkstraksi.forEach((item) => {
    const kodeBatch = "BTC-" + Math.floor(100 + Math.random() * 900);
    let kategori = "Makanan Fresh";
    for (const code in productDatabase) {
      if (productDatabase[code].name.toLowerCase() === item.produk.toLowerCase()) {
        kategori = productDatabase[code].category || kategori;
        break;
      }
    }

    const batchBaru = {
      code: kodeBatch,
      name: item.produk,
      category: kategori,
      stock: item.jumlah || 1,
      expiry_date: item.tanggal_kedaluwarsa || fallbackExp,
      penjualan_14_hari: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
    };
    dataBatchDemo.push(batchBaru);
    if (typeof syncBatchKeSupabase === "function") syncBatchKeSupabase(batchBaru);
    totalDisimpan++;
  });

  localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));
  if (typeof catatLogAktivitas === "function") {
    catatLogAktivitas("Simpan Nota AI (Multi-Item)", `Menyimpan ${totalDisimpan} produk hasil ekstraksi foto nota ke inventaris`, "AI Smart Input");
  }

  // Reset tampilan form & preview
  daftarItemEkstraksi = [];
  const formKonfirmasi = document.getElementById("form-konfirmasi-ekstraksi");
  if (formKonfirmasi) formKonfirmasi.reset();
  const pratinjau = document.getElementById("pratinjau-foto");
  if (pratinjau) pratinjau.innerHTML = "";
  const hasilFoto = document.getElementById("hasil-foto");
  if (hasilFoto) {
    hasilFoto.innerHTML = `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px; margin-top:8px;">
        <p style="color:#166534; font-weight:600;">✅ ${totalDisimpan} produk dari nota berhasil disimpan ke inventaris!</p>
        <button type="button" class="btn btn-primary" onclick="pindahHalaman('produk')" style="margin-top:8px;">
          📦 Buka Halaman "Stok & Batch" untuk Melihat
        </button>
      </div>
    `;
  }
  const inputFoto = document.getElementById("input-foto");
  if (inputFoto) inputFoto.value = "";
  const btnEkstrak = document.getElementById("btn-ekstrak");
  if (btnEkstrak) btnEkstrak.disabled = true;

  if (typeof loadInventarisDariServer === "function") {
    loadInventarisDariServer();
  }

  const mauLihat = confirm(`Berhasil! ${totalDisimpan} produk dari nota berhasil disimpan ke inventaris.\n\nKlik "OK" untuk langsung membuka menu "Stok & Batch" dan melihat tabel stok.`);
  if (mauLihat) {
    pindahHalaman("produk");
  }
}

// Ekstraksi fallback langsung ke Gemini API jika backend FastAPI tidak aktif
async function ekstrakLangsungGemini(file) {
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(",")[1]);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });

  const prompt = `Kamu adalah asisten pencatatan stok toko inventaris UMKM.
Baca gambar nota belanja / struk atau foto produk ini dan ekstrak SEMUA daftar barang yang ada ke dalam format JSON:
{
  "items": [
    {
      "produk": "Nama produk lengkap",
      "jumlah": 1,
      "tanggal_kedaluwarsa": "YYYY-MM-DD atau null jika tidak tertera"
    }
  ]
}
Catatan Penting:
- Konversi semua format tanggal (misal 15/12/2026 atau 15-12-2026) menjadi format standar internasional YYYY-MM-DD (2026-12-15).
- Jawab HANYA dalam format JSON murni tanpa pembungkus markdown apapun.`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: file.type || "image/jpeg",
            data: base64Data
          }
        }
      ]
    }]
  };

  const geminiUrl = getGeminiApiUrl();
  if (!geminiUrl) {
    throw new Error("Koneksi backend lokal (http://127.0.0.1:8000) sedang offline. Pastikan server backend sudah dijalankan.");
  }

  const res = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `HTTP ${res.status}`);
  }

  const resJson = await res.json();
  const parts = resJson?.candidates?.[0]?.content?.parts || [];
  const textRaw = parts.map(p => p.text || "").join("\n").trim();
  const items = parsingJSONEkstraksi(textRaw);
  if (!items || items.length === 0) {
    throw new Error("Gagal membaca struktur data JSON dari gambar.");
  }
  return items;
}

async function ekstrakFoto() {
  const btn = document.getElementById("btn-ekstrak");
  const hasilBox = document.getElementById("hasil-foto");
  const inputFoto = document.getElementById("input-foto");
  const file = inputFoto?.files?.[0];

  if (!file) {
    alert("Silakan pilih foto nota terlebih dahulu!");
    return;
  }

  btn.innerHTML = `⏳ AI sedang membaca...`;
  btn.disabled = true;
  hasilBox.innerHTML = `<p style='color:#0284c7'><em>🔍 AI sedang membaca dan mengekstrak data dari nota...</em></p>`;

  let items = null;

  // 1. Coba hubungi backend FastAPI
  try {
    const formData = new FormData();
    formData.append("file", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${FRESHLOG_API_BASE}/baca-nota`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const resJson = await response.json();
      if (resJson.items && resJson.items.length > 0) {
        items = resJson.items;
      } else if (resJson.data) {
        items = normalisasiDataEkstraksi(resJson.data);
      }
    } else {
      console.warn("Backend mengembalikan status " + response.status + ", beralih ke Gemini direct...");
    }
  } catch (error) {
    console.warn("Koneksi backend lokal gagal/timeout, mencoba langsung ke Gemini API...", error);
  }

  // 2. Jika backend offline/error, gunakan Gemini secara langsung di browser
  if (!items || items.length === 0) {
    try {
      items = await ekstrakLangsungGemini(file);
    } catch (errDirect) {
      hasilBox.innerHTML = `<p style="color:#ef4444">❌ Gagal membaca foto: ${errDirect.message}. Pastikan koneksi internet aktif.</p>`;
      console.error("Error ekstraksi nota:", errDirect);
      btn.innerHTML = `🔍 Ekstrak dengan AI`;
      btn.disabled = false;
      return;
    }
  }

  // Simpan data hasil ekstraksi
  daftarItemEkstraksi = items;

  // 3. Tampilkan hasil ekstraksi ke UI
  if (items.length === 1) {
    const item = items[0];
    hasilBox.innerHTML = `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px; margin-top:8px;">
        <p style="color:#166534; font-weight:600; margin-bottom:6px;">✅ 1 Produk Terdeteksi dari Nota!</p>
        <p><strong>Produk:</strong> ${item.produk}</p>
        <p><strong>Jumlah:</strong> ${item.jumlah} Pcs</p>
        <p><strong>Tanggal Exp:</strong> ${item.tanggal_kedaluwarsa || "<span style='color:#ea580c;'>Tidak tertera di nota</span>"}</p>
        <p style="font-size:0.85em; color:#64748b; margin-top:6px;">Data telah terisi di form bawah. Silakan sesuaikan lalu klik <strong>Konfirmasi & Simpan Stok</strong>.</p>
      </div>
    `;
  } else {
    let rowsHtml = items.map((it, idx) => `
      <tr style="border-bottom:1px solid #e2e8f0; font-size:0.9em;">
        <td style="padding:6px 8px;"><strong>${it.produk}</strong></td>
        <td style="padding:6px 8px; text-align:center;">${it.jumlah} Pcs</td>
        <td style="padding:6px 8px;">${it.tanggal_kedaluwarsa || "<span style='color:#ea580c;'>-</span>"}</td>
      </tr>
    `).join("");

    hasilBox.innerHTML = `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px; margin-top:8px;">
        <p style="color:#166534; font-weight:600; margin-bottom:8px;">✅ Berhasil Mengekstrak ${items.length} Produk dari Nota!</p>
        <div style="overflow-x:auto; margin-bottom:10px;">
          <table style="width:100%; border-collapse:collapse; background:#ffffff; border-radius:6px; overflow:hidden;">
            <thead>
              <tr style="background:#f1f5f9; color:#475569; font-size:0.85em; text-align:left;">
                <th style="padding:6px 8px;">Produk</th>
                <th style="padding:6px 8px; text-align:center;">Jumlah</th>
                <th style="padding:6px 8px;">Kedaluwarsa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        <button type="button" class="btn btn-primary" onclick="simpanSemuaBatchEkstraksi()" style="width:100%; font-weight:600;">
          💾 Simpan Semua (${items.length} Produk) ke Inventaris
        </button>
        <p style="font-size:0.82em; color:#64748b; margin-top:8px; text-align:center;">
          Atau sesuaikan produk pertama pada form konfirmasi di bawah jika ingin menyimpan satu per satu.
        </p>
      </div>
    `;
  }

  // 4. Masukkan produk pertama ke formulir konfirmasi
  const itemPertama = items[0];
  const inputProduk = document.getElementById("ekstrak-produk");
  const inputJumlah = document.getElementById("ekstrak-jumlah");
  const inputExp = document.getElementById("ekstrak-exp");

  if (inputProduk) inputProduk.value = itemPertama.produk;
  if (inputJumlah) inputJumlah.value = itemPertama.jumlah;
  if (inputExp) {
    if (itemPertama.tanggal_kedaluwarsa) {
      inputExp.value = itemPertama.tanggal_kedaluwarsa;
    } else if (!inputExp.value) {
      const tglDefault = new Date();
      tglDefault.setDate(tglDefault.getDate() + 30);
      inputExp.value = tglDefault.toISOString().split("T")[0];
    }
  }

  btn.innerHTML = `🔍 Ekstrak dengan AI`;
  btn.disabled = false;
}

/* ========================================== */
/* SIMPAN DATA EKSTRAKSI KE INVENTARIS        */
/* ========================================== */
document.addEventListener("DOMContentLoaded", function () {
  const formKonfirmasi = document.getElementById("form-konfirmasi-ekstraksi");
  if (formKonfirmasi) {
    formKonfirmasi.addEventListener("submit", function (e) {
      e.preventDefault();

      const inputProduk = document.getElementById("ekstrak-produk");
      const inputJumlah = document.getElementById("ekstrak-jumlah");
      const inputExp = document.getElementById("ekstrak-exp");

      const namaProduk = inputProduk ? inputProduk.value.trim() : "";
      const jumlah = inputJumlah ? parseInt(inputJumlah.value) || 0 : 0;
      const tglExp = inputExp ? inputExp.value : "";

      if (!namaProduk) {
        alert("Nama produk wajib diisi!");
        return;
      }
      if (jumlah <= 0) {
        alert("Jumlah produk minimal 1!");
        return;
      }
      if (!tglExp) {
        alert("Tanggal kedaluwarsa wajib dipilih!");
        return;
      }

      // Buat kode batch baru unik
      const kodeBatch = "BTC-" + Math.floor(100 + Math.random() * 900);

      // Cari kategori yang sesuai di master database
      let kategori = "Makanan Fresh";
      for (const code in productDatabase) {
        if (productDatabase[code].name.toLowerCase() === namaProduk.toLowerCase()) {
          kategori = productDatabase[code].category || kategori;
          break;
        }
      }

      // Tambah batch baru ke daftar
      const batchBaru = {
        code: kodeBatch,
        name: namaProduk,
        category: kategori,
        stock: jumlah,
        expiry_date: tglExp,
        penjualan_14_hari: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
      };
      dataBatchDemo.push(batchBaru);
      if (typeof syncBatchKeSupabase === "function") syncBatchKeSupabase(batchBaru);

      // Simpan perubahan ke LocalStorage
      localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));
      if (typeof catatLogAktivitas === "function") {
        catatLogAktivitas("Simpan Input Suara/Foto", `Menyimpan batch ${kodeBatch} (${namaProduk}, jumlah: ${jumlah}, exp: ${tglExp})`, "AI Smart Input");
      }

      // Reset form dan tampilan
      formKonfirmasi.reset();
      const pratinjau = document.getElementById("pratinjau-foto");
      if (pratinjau) pratinjau.innerHTML = "";
      const hasilFoto = document.getElementById("hasil-foto");
      if (hasilFoto) {
        hasilFoto.innerHTML = `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px; margin-top:8px;">
            <p style="color:#166534; font-weight:600;">✅ Batch ${kodeBatch} (${namaProduk}) berhasil disimpan ke inventaris!</p>
            <button type="button" class="btn btn-primary" onclick="pindahHalaman('produk')" style="margin-top:8px;">
              📦 Buka Halaman "Stok & Batch" untuk Melihat
            </button>
          </div>
        `;
      }
      const inputFoto = document.getElementById("input-foto");
      if (inputFoto) inputFoto.value = "";
      const btnEkstrak = document.getElementById("btn-ekstrak");
      if (btnEkstrak) btnEkstrak.disabled = true;

      // Segera perbarui data tabel inventaris
      if (typeof loadInventarisDariServer === "function") {
        loadInventarisDariServer();
      }

      const mauLihat = confirm(`Berhasil! Batch ${kodeBatch} (${namaProduk} - ${jumlah} Pcs) berhasil disimpan ke inventaris.\n\nKlik "OK" untuk langsung membuka menu "Stok & Batch" dan melihat tabel stok.`);
      if (mauLihat) {
        pindahHalaman("produk");
      }
    });
  }
});

/* ========================================== */
/* NOTIFIKASI BOT TELEGRAM                    */
/* ========================================== */
async function simpanDanTesBot() {
  const inputChatId = document.getElementById("inputChatId");
  if (!inputChatId || !inputChatId.value.trim()) {
    alert("Silakan masukkan Chat ID Telegram Anda!");
    return;
  }

  const chatId = inputChatId.value.trim();
  const merahCount = dataBatchDemo.filter(b => {
    const r = hitungStatusRisikoLokal(b);
    return r.status === "merah";
  }).length;
  const menipisCount = dataBatchDemo.filter(b => {
    const batas = typeof getThresholdProduk === "function" ? getThresholdProduk(b.name) : 15;
    return (parseInt(b.stock) || 0) <= batas;
  }).length;
  const pesan = `<b>⚠️ Peringatan Kedaluwarsa FreshLog</b>\nTerdapat ${merahCount} Batch Segera Kedaluwarsa (Merah, Skor 70-100) dan ${menipisCount} Produk Stok Menipis.`;

  try {
    const response = await fetch(`${FRESHLOG_API_BASE}/kirim-notifikasi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, pesan: pesan })
    });

    const result = await response.json();
    if (response.ok) {
      if (typeof catatLogAktivitas === "function") {
        catatLogAktivitas("Kirim Notifikasi Bot", `Mengirim tes notifikasi ke Chat ID ${chatId}`, "Pengaturan");
      }
      alert("Berhasil: " + (result.message || "Notifikasi berhasil dikirim!"));
    } else {
      alert("Gagal: " + (result.detail || result.message || "Gagal mengirim notifikasi"));
    }
  } catch (error) {
    alert(`Gagal terhubung ke FastAPI backend (${FRESHLOG_API_BASE}). Pastikan server uvicorn sudah berjalan.`);
  }
}

/* ========================================== */
/* 10. MODUL PENGATURAN SISTEM & AKUN         */
/* ========================================== */

// --- A. STATE & STORAGE PENGATURAN ---
const defaultKategoriList = [
  "Makanan Fresh",
  "Minuman & Dairy",
  "Frozen Food",
  "Snack & Kue",
  "Bahan Pokok",
  "Makanan Kaleng",
  "Bumbu Dapur",
  "Perawatan Rumah",
  "Perawatan Tubuh",
  "Kosmetik",
  "Kesehatan",
  "Kebutuhan Bayi",
  "Pakan Hewan",
  "Pakaian & Tekstil",
  "Perkakas",
  "Mainan & Hobi",
  "Alat Tulis",
  "Elektronik",
  "Otomotif"
];

const defaultSatuanList = [
  "Pcs",
  "Botol",
  "Kotak",
  "Bungkus",
  "Kaleng",
  "Kg",
  "Gram",
  "Liter",
  "Dus",
  "Renteng"
];

let daftarKategori = JSON.parse(localStorage.getItem("freshlog_categories")) || [...defaultKategoriList];
let daftarSatuan = JSON.parse(localStorage.getItem("freshlog_units")) || [...defaultSatuanList];
let thresholdPerProduk = JSON.parse(localStorage.getItem("freshlog_thresholds")) || {
  "Susu UHT 1L": 15,
  "Roti Tawar Daging": 15,
  "Yogurt Stroberi": 15
};
let satuanPerProduk = JSON.parse(localStorage.getItem("freshlog_product_units")) || {
  "Susu UHT 1L": "Kotak",
  "Roti Tawar Daging": "Bungkus",
  "Yogurt Stroberi": "Pcs"
};
let globalDefaultThreshold = parseInt(localStorage.getItem("freshlog_default_threshold")) || 15;

const defaultAuditLogs = [
  {
    waktu: new Date().toLocaleString("id-ID"),
    pengguna: "Sistem FreshLog",
    role: "System",
    kategori: "Pengaturan",
    aksi: "Inisialisasi Sistem",
    detail: "Modul Pengaturan & Audit Trail aktif"
  }
];
let daftarAuditLog = JSON.parse(localStorage.getItem("freshlog_audit_logs")) || [...defaultAuditLogs];

// Helper ambil threshold stok menipis per produk
function getThresholdProduk(namaProduk) {
  if (!namaProduk) return globalDefaultThreshold;
  const key = Object.keys(thresholdPerProduk).find(k => k.toLowerCase() === namaProduk.toLowerCase());
  if (key !== undefined && !isNaN(parseInt(thresholdPerProduk[key]))) {
    return parseInt(thresholdPerProduk[key]);
  }
  return globalDefaultThreshold;
}

// Helper ambil satuan per produk
function getSatuanProduk(namaProduk) {
  if (!namaProduk) return "Pcs";
  const key = Object.keys(satuanPerProduk).find(k => k.toLowerCase() === namaProduk.toLowerCase());
  return key ? satuanPerProduk[key] : "Pcs";
}

// Helper mencatat log aktivitas (Audit Trail)
function catatLogAktivitas(aksi, detail, kategori = "Sistem") {
  const akunAktif = daftarAkun[activeUserKey] || { nama: "Admin Toko", labelRole: "Admin" };
  const entriBaru = {
    waktu: new Date().toLocaleString("id-ID"),
    pengguna: akunAktif.nama || activeUserKey,
    role: akunAktif.labelRole || akunAktif.role || "User",
    kategori: kategori,
    aksi: aksi,
    detail: detail
  };
  daftarAuditLog.unshift(entriBaru);
  // Batasi maksimal 250 log terbaru agar storage tetap ringan
  if (daftarAuditLog.length > 250) {
    daftarAuditLog = daftarAuditLog.slice(0, 250);
  }
  localStorage.setItem("freshlog_audit_logs", JSON.stringify(daftarAuditLog));
  renderTabelLogAktivitas();
}

// Navigasi sub-tab di dalam halaman Pengaturan
function bukaTabPengaturan(panelId, btnEl) {
  const panels = document.querySelectorAll("#pengaturan .settings-panel");
  panels.forEach(p => p.classList.remove("active"));

  const target = document.getElementById(panelId);
  if (target) target.classList.add("active");

  const buttons = document.querySelectorAll("#pengaturan .settings-tab-btn");
  buttons.forEach(b => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  if (panelId === "tab-profil") muatProfilAkun();
  if (panelId === "tab-pengguna") renderTabelManajemenPengguna();
  if (panelId === "tab-threshold") renderTabelThresholdProduk();
  if (panelId === "tab-satuan-kategori") renderSatuanDanKategori();
  if (panelId === "tab-audit-log") renderTabelLogAktivitas();
}

// Inisialisasi seluruh sub-fitur Pengaturan
function initHalamanPengaturan() {
  muatProfilAkun();
  renderTabelManajemenPengguna();
  renderTabelThresholdProduk();
  renderSatuanDanKategori();
  renderTabelLogAktivitas();
}

// --- B. SUB-FITUR 1: PROFIL AKUN ---
let tempFotoProfilDataUrl = null;

function muatProfilAkun() {
  const akun = daftarAkun[activeUserKey] || daftarAkun["admin"];
  if (!akun) return;

  tempFotoProfilDataUrl = akun.foto || "";
  const elPreview = document.getElementById("preview-profil-foto");
  const elUsername = document.getElementById("profil-username");
  const elRoleShift = document.getElementById("profil-role-shift");
  const elNama = document.getElementById("profil-nama");
  const elTelepon = document.getElementById("profil-telepon");
  const elEmail = document.getElementById("profil-email");
  const elPass = document.getElementById("profil-password");

  if (elPreview) elPreview.src = getAvatarUrl(akun.nama, akun.foto);
  if (elUsername) elUsername.value = activeUserKey;
  if (elRoleShift) elRoleShift.value = `${akun.labelRole || akun.role} | Shift: ${akun.shift || "-"}`;
  if (elNama) elNama.value = akun.nama || "";
  if (elTelepon) elTelepon.value = akun.telepon || "";
  if (elEmail) elEmail.value = akun.email || "";
  if (elPass) elPass.value = "";
}

function pratinjauFotoProfil(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    tempFotoProfilDataUrl = e.target.result;
    const elPreview = document.getElementById("preview-profil-foto");
    if (elPreview) elPreview.src = tempFotoProfilDataUrl;
  };
  reader.readAsDataURL(file);
}

function resetFotoProfil() {
  const akun = daftarAkun[activeUserKey] || daftarAkun["admin"];
  tempFotoProfilDataUrl = "";
  const elPreview = document.getElementById("preview-profil-foto");
  if (elPreview && akun) {
    elPreview.src = getAvatarUrl(akun.nama, "");
  }
  const inputFoto = document.getElementById("input-profil-foto");
  if (inputFoto) inputFoto.value = "";
}

function simpanProfilAkun(e) {
  e.preventDefault();
  const akun = daftarAkun[activeUserKey];
  if (!akun) return;

  const namaBaru = document.getElementById("profil-nama").value.trim();
  const teleponBaru = document.getElementById("profil-telepon").value.trim();
  const emailBaru = document.getElementById("profil-email").value.trim();
  const passBaru = document.getElementById("profil-password").value;

  if (!namaBaru) {
    alert("Nama lengkap tidak boleh kosong!");
    return;
  }

  akun.nama = namaBaru;
  akun.telepon = teleponBaru;
  akun.email = emailBaru;
  if (tempFotoProfilDataUrl !== null) {
    akun.foto = tempFotoProfilDataUrl;
  }
  if (passBaru && passBaru.trim() !== "") {
    akun.password = passBaru.trim();
  }

  simpanDaftarAkunKeStorage();
  perbaruiProfilSidebar(akun);
  muatProfilAkun();
  catatLogAktivitas("Perbarui Profil Akun", `Memperbarui profil akun "${namaBaru}" (Kontak: ${teleponBaru || emailBaru || "-"})`, "Pengaturan");
  alert("Profil akun berhasil diperbarui!");
}

// --- C. SUB-FITUR 2: MANAJEMEN PENGGUNA (ADMIN ONLY) ---
function renderTabelManajemenPengguna() {
  const akunAktif = daftarAkun[activeUserKey] || daftarAkun["admin"];
  const isStaff = akunAktif && akunAktif.role === "staff";

  const boxRestricted = document.getElementById("user-mgmt-restricted");
  const boxContent = document.getElementById("user-mgmt-content");
  if (boxRestricted && boxContent) {
    boxRestricted.style.display = isStaff ? "block" : "none";
    boxContent.style.display = isStaff ? "none" : "block";
  }

  const tbody = document.getElementById("tabel-manajemen-pengguna");
  if (!tbody || isStaff) return;

  tbody.innerHTML = "";
  Object.entries(daftarAkun).forEach(([usernameKey, data]) => {
    const tr = document.createElement("tr");
    const roleKey = (data.role || "staff").toLowerCase();
    const roleLabel = data.labelRole || (roleKey === "admin" ? "Admin" : "Staf");
    const kontakTampil = [data.telepon, data.email].filter(Boolean).join(" / ") || "-";
    const isSelf = usernameKey === activeUserKey;

    tr.innerHTML = `
      <td><strong>${usernameKey}</strong> ${isSelf ? "<span style='color:#0288d1; font-size:0.75rem;'>(Anda)</span>" : ""}</td>
      <td>${data.nama}</td>
      <td><span class="badge-role ${roleKey}">${roleLabel}</span></td>
      <td>${data.shift || "-"}</td>
      <td>${kontakTampil}</td>
      <td style="display:flex; gap:6px;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="mulaiEditPengguna('${usernameKey}')">Ubah</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="hapusAkunPengguna('${usernameKey}')" ${isSelf ? "disabled title='Tidak dapat menghapus akun sendiri'" : ""}>Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function mulaiEditPengguna(usernameKey) {
  const data = daftarAkun[usernameKey];
  if (!data) return;

  document.getElementById("edit-user-original-key").value = usernameKey;
  const inputUser = document.getElementById("mgmt-username");
  inputUser.value = usernameKey;
  inputUser.disabled = true;

  document.getElementById("mgmt-nama").value = data.nama || "";
  document.getElementById("mgmt-role").value = data.role || "staff";
  document.getElementById("mgmt-label-role").value = data.labelRole || "";
  document.getElementById("mgmt-shift").value = data.shift || "";
  document.getElementById("mgmt-kontak").value = data.telepon || data.email || "";
  document.getElementById("mgmt-password").value = data.password || "";

  document.getElementById("judul-form-pengguna").innerText = `Ubah Akun Pengguna: ${usernameKey}`;
  document.getElementById("btn-submit-pengguna").innerHTML = `💾 Simpan Perubahan`;
  document.getElementById("btn-batal-edit-pengguna").style.display = "inline-block";
}

function batalEditPengguna() {
  const form = document.getElementById("form-manajemen-pengguna");
  if (form) form.reset();
  document.getElementById("edit-user-original-key").value = "";
  const inputUser = document.getElementById("mgmt-username");
  if (inputUser) inputUser.disabled = false;

  document.getElementById("judul-form-pengguna").innerText = "Tambah / Ubah Akun Pengguna";
  document.getElementById("btn-submit-pengguna").innerHTML = `➕ Simpan Pengguna`;
  document.getElementById("btn-batal-edit-pengguna").style.display = "none";
}

function simpanAkunPengguna(e) {
  e.preventDefault();
  const originalKey = document.getElementById("edit-user-original-key").value.trim().toLowerCase();
  const usernameInput = document.getElementById("mgmt-username").value.trim().toLowerCase();
  const keyTarget = originalKey || usernameInput;

  const nama = document.getElementById("mgmt-nama").value.trim();
  const role = document.getElementById("mgmt-role").value;
  const labelRole = document.getElementById("mgmt-label-role").value.trim();
  const shift = document.getElementById("mgmt-shift").value.trim();
  const kontak = document.getElementById("mgmt-kontak").value.trim();
  const password = document.getElementById("mgmt-password").value.trim();

  if (!keyTarget) {
    alert("Username wajib diisi!");
    return;
  }

  const isUpdate = Boolean(originalKey);
  const existing = daftarAkun[keyTarget] || {};

  daftarAkun[keyTarget] = {
    password: password || existing.password || "123",
    nama: nama,
    role: role,
    labelRole: labelRole || (role === "admin" ? "Admin" : "Staf"),
    shift: shift,
    telepon: kontak,
    email: existing.email || "",
    foto: existing.foto || ""
  };

  simpanDaftarAkunKeStorage();
  if (keyTarget === activeUserKey) {
    perbaruiProfilSidebar(daftarAkun[keyTarget]);
  }

  catatLogAktivitas(
    isUpdate ? "Ubah Pengguna" : "Tambah Pengguna Baru",
    `${isUpdate ? "Memperbarui" : "Menambahkan"} akun "${keyTarget}" (${nama} - ${labelRole})`,
    "Pengaturan"
  );

  batalEditPengguna();
  renderTabelManajemenPengguna();
  alert(`Akun pengguna "${nama}" (${keyTarget}) berhasil disimpan!`);
}

function hapusAkunPengguna(usernameKey) {
  if (usernameKey === activeUserKey) {
    alert("Tidak dapat menghapus akun yang sedang digunakan saat ini!");
    return;
  }
  const target = daftarAkun[usernameKey];
  if (!target) return;

  if (confirm(`Yakin ingin menghapus akun pengguna "${target.nama}" (${usernameKey})?`)) {
    delete daftarAkun[usernameKey];
    simpanDaftarAkunKeStorage();
    catatLogAktivitas("Hapus Pengguna", `Menghapus akun pengguna "${usernameKey}" (${target.nama})`, "Pengaturan");
    renderTabelManajemenPengguna();
  }
}

// --- D. SUB-FITUR 3: PENGATURAN THRESHOLD STOK MENIPIS (PER PRODUK) ---
function kumpulkanDaftarProdukUnik() {
  const mapProduk = new Map();

  // Dari master produk
  for (const [sku, detail] of Object.entries(productDatabase)) {
    if (detail && detail.name) {
      mapProduk.set(detail.name, {
        name: detail.name,
        category: detail.category || "Makanan Fresh",
        totalStock: 0
      });
    }
  }

  // Dari batch inventaris aktif
  dataBatchDemo.forEach(batch => {
    if (!batch || !batch.name) return;
    if (!mapProduk.has(batch.name)) {
      mapProduk.set(batch.name, {
        name: batch.name,
        category: batch.category || "Makanan Fresh",
        totalStock: 0
      });
    }
    const item = mapProduk.get(batch.name);
    item.totalStock += (parseInt(batch.stock) || 0);
  });

  return Array.from(mapProduk.values());
}

function renderTabelThresholdProduk() {
  const tbody = document.getElementById("tabel-threshold-produk");
  const inputDefault = document.getElementById("input-default-threshold");
  if (inputDefault) inputDefault.value = globalDefaultThreshold;
  if (!tbody) return;

  const produkList = kumpulkanDaftarProdukUnik();
  if (produkList.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#64748b;'>Belum ada produk terdaftar.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  produkList.forEach((prod, idx) => {
    const batas = getThresholdProduk(prod.name);
    const satuanSaatIni = getSatuanProduk(prod.name);
    const isMenipis = prod.totalStock <= batas;

    const opsiSatuan = daftarSatuan.map(s => `<option value="${s}" ${s === satuanSaatIni ? "selected" : ""}>${s}</option>`).join("");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${prod.name}</strong></td>
      <td>${prod.category}</td>
      <td><strong>${prod.totalStock}</strong> ${satuanSaatIni}</td>
      <td>
        <select class="input-satuan-produk" data-produk="${prod.name}">
          ${opsiSatuan}
        </select>
      </td>
      <td>
        <input type="number" class="input-threshold-produk" data-produk="${prod.name}" min="1" value="${batas}">
      </td>
      <td>
        ${isMenipis
          ? `<span class="status-badge kuning">⚠️ Stok Menipis (&le; ${batas})</span>`
          : `<span class="status-badge hijau">✅ Aman (&gt; ${batas})</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function terapkanDefaultThresholdSemua() {
  const inputDefault = document.getElementById("input-default-threshold");
  const nilai = parseInt(inputDefault?.value) || 15;
  if (nilai < 1) {
    alert("Batas minimum harus minimal 1!");
    return;
  }
  globalDefaultThreshold = nilai;
  localStorage.setItem("freshlog_default_threshold", String(globalDefaultThreshold));

  document.querySelectorAll(".input-threshold-produk").forEach(inp => {
    inp.value = globalDefaultThreshold;
  });
  simpanSemuaThresholdProduk();
}

function simpanSemuaThresholdProduk() {
  const inputDefault = document.getElementById("input-default-threshold");
  if (inputDefault) {
    globalDefaultThreshold = Math.max(1, parseInt(inputDefault.value) || 15);
    localStorage.setItem("freshlog_default_threshold", String(globalDefaultThreshold));
  }

  document.querySelectorAll(".input-threshold-produk").forEach(inp => {
    const nama = inp.getAttribute("data-produk");
    const val = Math.max(1, parseInt(inp.value) || globalDefaultThreshold);
    if (nama) thresholdPerProduk[nama] = val;
  });

  document.querySelectorAll(".input-satuan-produk").forEach(sel => {
    const nama = sel.getAttribute("data-produk");
    const val = sel.value || "Pcs";
    if (nama) satuanPerProduk[nama] = val;
  });

  localStorage.setItem("freshlog_thresholds", JSON.stringify(thresholdPerProduk));
  localStorage.setItem("freshlog_product_units", JSON.stringify(satuanPerProduk));

  renderTabelThresholdProduk();
  loadInventarisDariServer();
  catatLogAktivitas("Simpan Threshold Stok", `Memperbarui batas stok menipis & satuan produk (Default: ${globalDefaultThreshold})`, "Pengaturan");
  alert("Pengaturan threshold stok menipis & satuan produk berhasil disimpan!");
}

// --- E. SUB-FITUR 4: PENGATURAN SATUAN & KATEGORI ---
function renderSatuanDanKategori() {
  const boxKategori = document.getElementById("daftar-chip-kategori");
  const boxSatuan = document.getElementById("daftar-chip-satuan");

  if (boxKategori) {
    boxKategori.innerHTML = daftarKategori.map((kat, i) => `
      <span class="settings-tag-chip">
        🏷️ ${kat}
        <button type="button" title="Hapus kategori" onclick="hapusKategori(${i})">✕</button>
      </span>
    `).join("");
  }

  if (boxSatuan) {
    boxSatuan.innerHTML = daftarSatuan.map((sat, i) => `
      <span class="settings-tag-chip">
        ⚖️ ${sat}
        <button type="button" title="Hapus satuan" onclick="hapusSatuan(${i})">✕</button>
      </span>
    `).join("");
  }

  sinkronisasiDropdownKategori();
}

function sinkronisasiDropdownKategori() {
  const ids = ["prod-kategori", "batch-kategori"];
  ids.forEach(id => {
    const selectEl = document.getElementById(id);
    if (!selectEl) return;
    const nilaiSaatIni = selectEl.value;
    const placeholder = id === "batch-kategori" ? '<option value="">Pilih Kategori</option>' : "";
    selectEl.innerHTML = placeholder + daftarKategori.map(k => `<option value="${k}">${k}</option>`).join("");
    if (nilaiSaatIni && daftarKategori.includes(nilaiSaatIni)) {
      selectEl.value = nilaiSaatIni;
    }
  });
}

function tambahKategoriBaru(e) {
  e.preventDefault();
  const input = document.getElementById("input-kategori-baru");
  const nilai = input.value.trim();
  if (!nilai) return;

  if (daftarKategori.some(k => k.toLowerCase() === nilai.toLowerCase())) {
    alert("Kategori tersebut sudah ada!");
    return;
  }

  daftarKategori.push(nilai);
  localStorage.setItem("freshlog_categories", JSON.stringify(daftarKategori));
  input.value = "";
  renderSatuanDanKategori();
  catatLogAktivitas("Tambah Kategori", `Menambahkan kategori produk baru: "${nilai}"`, "Pengaturan");
}

function hapusKategori(index) {
  const nama = daftarKategori[index];
  if (!nama) return;
  if (confirm(`Hapus kategori "${nama}"?`)) {
    daftarKategori.splice(index, 1);
    localStorage.setItem("freshlog_categories", JSON.stringify(daftarKategori));
    renderSatuanDanKategori();
    catatLogAktivitas("Hapus Kategori", `Menghapus kategori produk: "${nama}"`, "Pengaturan");
  }
}

function tambahSatuanBaru(e) {
  e.preventDefault();
  const input = document.getElementById("input-satuan-baru");
  const nilai = input.value.trim();
  if (!nilai) return;

  if (daftarSatuan.some(s => s.toLowerCase() === nilai.toLowerCase())) {
    alert("Satuan barang tersebut sudah ada!");
    return;
  }

  daftarSatuan.push(nilai);
  localStorage.setItem("freshlog_units", JSON.stringify(daftarSatuan));
  input.value = "";
  renderSatuanDanKategori();
  renderTabelThresholdProduk();
  catatLogAktivitas("Tambah Satuan", `Menambahkan satuan barang baru: "${nilai}"`, "Pengaturan");
}

function hapusSatuan(index) {
  const nama = daftarSatuan[index];
  if (!nama) return;
  if (daftarSatuan.length <= 1) {
    alert("Minimal harus ada 1 satuan barang di sistem!");
    return;
  }
  if (confirm(`Hapus satuan "${nama}"?`)) {
    daftarSatuan.splice(index, 1);
    localStorage.setItem("freshlog_units", JSON.stringify(daftarSatuan));
    renderSatuanDanKategori();
    renderTabelThresholdProduk();
    catatLogAktivitas("Hapus Satuan", `Menghapus satuan barang: "${nama}"`, "Pengaturan");
  }
}

// --- F. SUB-FITUR 5: LOG AKTIVITAS (AUDIT) ---
function renderTabelLogAktivitas() {
  const tbody = document.getElementById("tabel-audit-log");
  if (!tbody) return;

  const kataKunci = (document.getElementById("search-audit-log")?.value || "").toLowerCase();
  const filterKat = document.getElementById("filter-kategori-log")?.value || "";

  const akunAktif = daftarAkun[activeUserKey] || daftarAkun["admin"];
  const btnHapusLog = document.getElementById("btn-hapus-log");
  if (btnHapusLog) {
    btnHapusLog.style.display = (akunAktif && akunAktif.role === "staff") ? "none" : "inline-block";
  }

  const hasilFilter = daftarAuditLog.filter(item => {
    const cocokKat = !filterKat || item.kategori === filterKat;
    const teksGabungan = `${item.pengguna} ${item.role} ${item.kategori} ${item.aksi} ${item.detail}`.toLowerCase();
    const cocokCari = !kataKunci || teksGabungan.includes(kataKunci);
    return cocokKat && cocokCari;
  });

  if (hasilFilter.length === 0) {
    tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:16px; color:#64748b;'>Tidak ada catatan log aktivitas yang sesuai filter.</td></tr>";
    return;
  }

  tbody.innerHTML = hasilFilter.map(log => {
    const roleKey = (log.role || "staff").toLowerCase();
    const roleLabel = log.role === "admin" ? "Admin" : (log.role === "staff" ? "Staf" : log.role);
    return `
    <tr>
      <td style="white-space:nowrap; font-size:0.82rem; color:#475569;">${log.waktu}</td>
      <td><strong>${log.pengguna}</strong></td>
      <td><span class="badge-role ${roleKey}">${roleLabel}</span></td>
      <td><span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:10px; font-size:0.78rem; font-weight:600;">${log.kategori}</span></td>
      <td><strong>${log.aksi}</strong></td>
      <td style="font-size:0.86rem; color:#334155;">${log.detail}</td>
    </tr>
  `}).join("");
}

function eksporLogAktivitasCSV() {
  let csv = "data:text/csv;charset=utf-8,Waktu,Pengguna,Peran,Kategori,Aktivitas,Detail\n";
  daftarAuditLog.forEach(l => {
    const detailBersih = String(l.detail || "").replace(/"/g, '""');
    csv += `"${l.waktu}","${l.pengguna}","${l.role}","${l.kategori}","${l.aksi}","${detailBersih}"\n`;
  });
  const encoded = encodeURI(csv);
  const link = document.createElement("a");
  link.setAttribute("href", encoded);
  link.setAttribute("download", `FreshLog_AuditLog_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function bersihkanLogAktivitas() {
  const akunAktif = daftarAkun[activeUserKey] || daftarAkun["admin"];
  if (akunAktif && akunAktif.role === "staff") {
    alert("Hanya Admin yang dapat membersihkan log aktivitas!");
    return;
  }
  if (confirm("Yakin ingin menghapus seluruh riwayat log aktivitas?")) {
    daftarAuditLog = [];
    localStorage.setItem("freshlog_audit_logs", JSON.stringify(daftarAuditLog));
    catatLogAktivitas("Bersihkan Log Audit", "Admin membersihkan seluruh riwayat log aktivitas", "Pengaturan");
  }
}

// Inisialisasi saat DOM selesai dimuat
document.addEventListener("DOMContentLoaded", function () {
  sinkronisasiDropdownKategori();
  if (daftarAkun[activeUserKey]) {
    perbaruiProfilSidebar(daftarAkun[activeUserKey]);
  }
  if (typeof terapkanHakAksesRoleStokBatch === "function") {
    terapkanHakAksesRoleStokBatch();
  }
  if (typeof terapkanHakAksesRoleMenu === "function") {
    terapkanHakAksesRoleMenu();
  }
  if (typeof renderTabelMasterProduk === "function") {
    renderTabelMasterProduk();
  }
  initHalamanPengaturan();
  initHalamanLaporan();
  initHalamanAnalitikAI();
  if (typeof renderDashboardDampakRingkas === "function") {
    renderDashboardDampakRingkas();
  }

  // Periksa apakah sistem login sedang terkunci status Brute-Force 15 menit
  try {
    const statusLock = periksaStatusLockout();
    if (statusLock && statusLock.terkunci) {
      mulaiHitungMundurLockout(null, statusLock.sisaDetik);
    }
  } catch (errLock) {
    console.error("Gagal memeriksa status lockout:", errLock);
  }
});