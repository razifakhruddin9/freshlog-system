/* ========================================== */
/* 1. NAVIGASI HALAMAN (SINGLE PAGE APP)      */
/* ========================================== */
function pindahHalaman(targetId) {
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
    if (targetId === "produk") {
      loadInventarisDariServer();
    }
    if (targetId === "prediksi") {
      loadPrediksiRestock();
    }
  }

  // Perbarui status kelas active pada menu navigasi
  navLinks.forEach((nav) => {
    if (nav.getAttribute("href") === "#" + targetId) {
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
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      pindahHalaman(targetId);
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
  /* 4. SIMULASI KASIR (AUTOMATIC SCANNING)     */
  /* ========================================== */
  const barcodeInput = document.getElementById("barcode-scanner");
  const cartItemsTable = document.getElementById("cart-items");
  
  // 1. Dipindah ke luar (di atas if) & ditambahkan kategori
const productDatabase = {
  "899123456789": { name: "Susu UHT 1L", price: 18000, category: "Minuman & Dairy" },
  "899999900001": { name: "Roti Tawar Daging", price: 12500, category: "Snack & Kue" },
  "899888800002": { name: "Yogurt Stroberi", price: 9500, category: "Minuman & Dairy" }
};

// 2. Baru diikuti blok if kasir seperti biasa
if (barcodeInput && cartItemsTable) {
  barcodeInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = this.value.trim();

      if (productDatabase[code]) {
        const item = productDatabase[code];

               // Tambah baris baru ke tabel keranjang belanja
               const newRow = document.createElement("tr");
               newRow.setAttribute("data-code", code);
               newRow.setAttribute("data-name", item.name);
               newRow.innerHTML = `
                 <td>${item.name}</td>
                 <td class="qty-cell">1</td>
                 <td>Rp ${item.price.toLocaleString("id-ID")}</td>
                 <td class="subtotal-cell" data-subtotal="${item.price}">Rp ${item.price.toLocaleString("id-ID")}</td>
                 <td><button type="button" class="btn btn-sm btn-delete" onclick="removeItem(this)">✕</button></td>
               `;
               cartItemsTable.appendChild(newRow);
               
               // Panggil fungsi hitung total jika sudah Anda pasang di bawah
               if (typeof hitungTotalBelanja === "function") hitungTotalBelanja();
       

        // Bersihkan kolom input scanner setelah berhasil discan
        this.value = "";
      } else if (code !== "") {
        alert("Barcode produk tidak ditemukan dalam database!");
        this.value = "";
      }
    }
  });
}

  // Fungsi menghapus item dari keranjang kasir
  function removeItem(button) {
    const row = button.closest("tr");
    if (row) {
      row.remove();
    }
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

// Helper kalkulasi status risiko lokal cepat
function hitungStatusRisikoLokal(batch) {
  const sisaHari = Math.ceil((new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
  let status = "hijau";
  let saran = "Monitor stok normal";

  if (isNaN(sisaHari)) {
    return { status: "hijau", saran_tindakan: "Monitor stok", sisa_hari: 30 };
  }
  if (sisaHari <= 0) {
    status = "merah";
    saran = "Segera tarik produk (Kedaluwarsa)";
  } else if (sisaHari <= 14) {
    status = "merah";
    saran = "Beri diskon 50% / FEFO Prioritas";
  } else if (sisaHari <= 30) {
    status = "kuning";
    saran = "Promosikan di etalase depan";
  }
  return { status, saran_tindakan: saran, sisa_hari: sisaHari };
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
    "http://127.0.0.1:8000/risiko",
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
    const risiko = (hasilRisiko && hasilRisiko[i]) || hitungStatusRisikoLokal(batch);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${batch.code}</strong></td>
      <td>${batch.name}</td>
      <td><strong>${batch.stock}</strong> Pcs</td>
      <td>${batch.expiry_date}</td>
      <td><span class="status-badge ${risiko.status}">${risiko.status}</span></td>
      <td><select class="form-select"><option>${risiko.saran_tindakan}</option></select></td>
      <td>
        <button type="button" class="btn btn-sm btn-delete" onclick="hapusBatchInventaris('${batch.code}')" ${isStaff ? "hidden" : ""}>Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Fungsi hapus batch dari inventaris
function hapusBatchInventaris(kodeBatch) {
  if (confirm(`Yakin ingin menghapus batch "${kodeBatch}" dari inventaris?`)) {
    const idx = dataBatchDemo.findIndex(b => b.code === kodeBatch);
    if (idx !== -1) {
      dataBatchDemo.splice(idx, 1);
      localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));
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
    elTotalStok.innerText = `${total.toLocaleString("id-ID")} Pcs`;
  }

  // 2. Stok Menipis (<= 15 pcs)
  const elStokMenipis = document.getElementById("dash-stok-menipis");
  if (elStokMenipis) {
    const menipis = dataBatchDemo.filter(b => (parseInt(b.stock) || 0) <= 15).length;
    elStokMenipis.innerText = `${menipis} Batch`;
  }

  // 3. Batch Status Merah
  const elBatchMerah = document.getElementById("dash-batch-merah");
  let jumlahMerah = 0;
  const listExp = [];

  dataBatchDemo.forEach((batch, i) => {
    const risiko = (hasilRisiko && hasilRisiko[i]) || hitungStatusRisikoLokal(batch);
    if (risiko.status === "merah" || risiko.status === "hitam") {
      jumlahMerah++;
      listExp.push({ batch, risiko });
    }
  });

  if (elBatchMerah) {
    elBatchMerah.innerText = `${jumlahMerah} Batch`;
  }

  // 4. Daftar Produk Mendekati Kedaluwarsa
  const elList = document.getElementById("dash-expire-list");
  if (elList) {
    if (listExp.length === 0) {
      elList.innerHTML = "<li><small style='color:#16a34a;'>✅ Semua batch dalam kondisi aman / belum mendekati kedaluwarsa.</small></li>";
    } else {
      elList.innerHTML = listExp.map(({ batch, risiko }) => {
        const sisaHari = Math.ceil((new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        const teksHari = isNaN(sisaHari) ? "" : (sisaHari <= 0 ? "— Sudah Kedaluwarsa" : `— Sisa ${sisaHari} Hari`);
        return `<li><strong>${batch.name}</strong> (Batch: ${batch.code}) ${teksHari} <span class="status-badge ${risiko.status}">${risiko.status}</span></li>`;
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
const daftarAkun = {
  "admin": {
    password: "123",
    nama: "Admin Toko",
    role: "admin",
    labelRole: "Admin",
    shift: "07.00 - 22.00 WIB"
  },
  "admin toko": {
    password: "123",
    nama: "Admin Toko",
    role: "admin",
    labelRole: "Admin",
    shift: "07.00 - 22.00 WIB"
  },
  "staf1": {
    password: "123",
    nama: "Budi (Staf 1)",
    role: "staff",
    labelRole: "Staf 1",
    shift: "07.00 - 14.30 WIB"
  },
  "staf2": {
    password: "123",
    nama: "Siti (Staf 2)",
    role: "staff",
    labelRole: "Staf 2",
    shift: "14.30 - 22.00 WIB"
  }
};

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const inputUser = document.getElementById('username').value.trim().toLowerCase();
  const inputPass = document.getElementById('password').value;
  const inputRole = document.getElementById('role').value;
  const errorBox = document.getElementById('errorBox');

  const akun = daftarAkun[inputUser];

  if (akun && akun.password === inputPass && akun.role === inputRole) {
    errorBox.style.display = 'none';

    // 1. Sembunyikan layar login
    const loginScreen = document.getElementById('login-screen');
    loginScreen.hidden = true;
    loginScreen.style.display = 'none';

    // 2. Munculkan dashboard utama (mencegah layar blank)
    const mainContent = document.getElementById('main-content');
    mainContent.hidden = false;
    mainContent.style.display = 'block';

    // 3. Tampilkan section Dashboard sebagai halaman awal
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
      dashboardSection.style.display = 'block';
    }

    // 4. Perbarui informasi profil di sidebar
    document.getElementById('user-name').innerText = akun.nama;
    document.getElementById('user-role').innerText = akun.labelRole;
    
    const shiftEl = document.getElementById('user-shift');
    if (shiftEl) {
      shiftEl.innerText = `Sesi Shift: ${akun.shift}`;
    }

    // 5. Sembunyikan tombol edit/hapus khusus admin jika staf yang masuk
    const tombolAdmin = document.querySelectorAll('#pemasok .btn-delete, #produk .btn-delete, .btn-edit, [onclick*="modal-produk"]');
    tombolAdmin.forEach(btn => {
      btn.hidden = (akun.role === 'staff');
    });

  } else {
    errorBox.style.display = 'block';
  }
});
/* ========================================== */
/* 7. KELOLA DATA PEMASOK (TAMBAH & HAPUS)    */
/* ========================================== */

// Tambah Pemasok Baru dari Modal
const formPemasok = document.getElementById("form-pemasok");
if (formPemasok) {
  formPemasok.addEventListener("submit", function (e) {
    e.preventDefault();
    const idBaru = document.getElementById("pemasok-id").value;
    const nama = document.getElementById("pemasok-nama").value;
    const telp = document.getElementById("pemasok-telp").value;
    const alamat = document.getElementById("pemasok-alamat").value;
    const tbody = document.getElementById("table-pemasok");

    const barisBaru = `
      <tr>
        <td>${idBaru}</td>
        <td>${nama}</td>
        <td>${telp}</td>
        <td>${alamat}</td>
        <td>
          <button class="btn btn-sm btn-delete" onclick="hapusBaris(this)">Hapus</button>
        </td>
      </tr>
    `;

    tbody.insertAdjacentHTML("beforeend", barisBaru);
    formPemasok.reset();
    closeModal("modal-pemasok");
  });
}

// Hapus Baris Data
function hapusBaris(tombol) {
  if (confirm("Yakin ingin menghapus data ini?")) {
    tombol.closest("tr").remove();
  }
}
/* ========================================== */
/* EKSPOR LAPORAN REKAPITULASI (EXCEL & PDF)  */
/* ========================================== */

// 1. Fungsi Unduh Excel (Format CSV)
function unduhLaporanExcel() {
  const jenis = document.getElementById("jenis-laporan").value;
  const tanggal = document.getElementById("tanggal-laporan").value || new Date().toISOString().split("T")[0];

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Kode Batch,Nama Produk,Kategori,Sisa Stok (Pcs),Tanggal Kedaluwarsa\n";

  dataBatchDemo.forEach((item) => {
    const baris = `${item.code},"${item.name}",${item.category},${item.stock},${item.expiry_date}`;
    csvContent += baris + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `FreshLog_${jenis}_${tanggal}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Fungsi Unduh PDF (Memanggil Freshlog.css secara terpisah)
function unduhLaporanPDF() {
  const jenisSelect = document.getElementById("jenis-laporan");
  const judulLaporan = jenisSelect.options[jenisSelect.selectedIndex].text;
  const tanggal = document.getElementById("tanggal-laporan").value || new Date().toLocaleDateString("id-ID");

  let barisTabel = "";
  dataBatchDemo.forEach((item) => {
    barisTabel += `
      <tr>
        <td>${item.code}</td>
        <td>${item.name}</td>
        <td>${item.stock} Pcs</td>
        <td>${item.expiry_date}</td>
      </tr>
    `;
  });

  const jendelaCetak = window.open("", "_blank", "width=800,height=600");
  jendelaCetak.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>${judulLaporan} - FreshLog</title>
        <link rel="stylesheet" href="Freshlog.css">
      </head>
      <body class="print-body">
        <h2 class="print-title">FreshLog - ${judulLaporan}</h2>
        <p class="print-subtitle">Tanggal Cetak / Periode: <strong>${tanggal}</strong></p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Kode Batch</th>
              <th>Nama Produk</th>
              <th>Sisa Stok</th>
              <th>Tanggal Kedaluwarsa</th>
            </tr>
          </thead>
          <tbody>${barisTabel}</tbody>
        </table>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  jendelaCetak.document.close();
}
/* ========================================== */
/* SIMPAN PRODUK MASTER & BATCH (KATEGORI->PRODUK) */
/* ========================================== */

// Pastikan data awal productDatabase memiliki kategori
if (!productDatabase["899123456789"].category) {
  productDatabase["899123456789"] = { name: "Susu UHT 1L", price: 18000, category: "Minuman & Dairy" };
  productDatabase["899999900001"] = { name: "Roti Tawar Daging", price: 12500, category: "Snack & Kue" };
  productDatabase["899888800002"] = { name: "Yogurt Stroberi", price: 9500, category: "Minuman & Dairy" };
}

// Muat data produk tersimpan dari browser (agar tidak hilang saat refresh)
const savedProducts = JSON.parse(localStorage.getItem("freshlog_products"));
if (savedProducts) {Object.assign(productDatabase, savedProducts);}

// 1. Proses Simpan Produk Master Baru (Modal 1)
const formProduk = document.getElementById("form-produk");
if (formProduk) {
  formProduk.addEventListener("submit", function (e) {
    e.preventDefault();

    const nama = document.getElementById("prod-nama").value.trim();
    const sku = document.getElementById("prod-sku").value.trim();
    const kategori = document.getElementById("prod-kategori").value;
    const hargaJual = parseInt(document.getElementById("prod-harga-jual").value) || 0;

    // Simpan produk baru beserta kategorinya
    productDatabase[sku] = { name: nama, price: hargaJual, category: kategori };
    localStorage.setItem("freshlog_products", JSON.stringify(productDatabase));

    alert(`Produk "${nama}" berhasil disimpan ke kategori ${kategori}!`);
    formProduk.reset();
    closeModal("modal-produk");
  });
}

// 2. Fungsi Menyaring Produk Saat Kategori Dipilih (Modal 2)
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

// 3. Proses Simpan Batch Baru ke Tabel (Modal 2)
const formBatch = document.getElementById("form-batch");
if (formBatch) {
  formBatch.addEventListener("submit", function (e) {
    e.preventDefault();

    const kategori = document.getElementById("batch-kategori").value;
    const selectProduk = document.getElementById("select-produk-master");
    const namaProduk = selectProduk.options[selectProduk.selectedIndex].text;
    const kodeBatch = document.getElementById("batch-kode").value.trim();
    const jumlahMasuk = parseInt(document.getElementById("batch-jumlah").value) || 0;
    const tglExp = document.getElementById("batch-exp").value;

    // Tambahkan ke daftar inventaris & simpan di browser
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
    localStorage.setItem("freshlog_batches", JSON.stringify(dataBatchDemo));

    // Reset form, tutup modal, dan langsung muat ulang tabel
    formBatch.reset();
    selectProduk.disabled = true;
    closeModal("modal-batch");
    loadInventarisDariServer();
  });
}
function filterPemasok() {
    // Ganti ID sesuai dengan ID <input> search dan <select> filter Anda di halaman Pemasok
    const kataKunci = document.getElementById("search-pemasok").value.toLowerCase();
    const kategoriDipilih = document.getElementById("filter-kategori-pemasok").value; 
    
    // Pastikan selector mengarah ke tbody tabel pemasok Anda
    const barisTabel = document.querySelectorAll("#tabel-pemasok tbody tr");

    barisTabel.forEach(baris => {
        // Asumsi: kolom ke-2 (indeks 1) adalah Nama Pemasok, kolom ke-3 (indeks 2) adalah Kategori
        const namaPemasok = baris.cells[1]?.textContent.toLowerCase() || "";
        const kategoriPemasok = baris.cells[2]?.textContent.trim() || "";

        const cocokNama = namaPemasok.includes(kataKunci);
        // Jika value "" ("Semua Kategori"), tampilkan semua; jika tidak, cek apakah mengandung value kategori
        const cocokKategori = (kategoriDipilih === "") || kategoriPemasok.includes(kategoriDipilih);

        baris.style.display = (cocokNama && cocokKategori) ? "" : "none";
    });
}
/* ========================================== */
/* 5. KONEKSI SUPABASE (OPSIONAL SINKRONISASI)*/
/* ========================================== */

const SUPABASE_URL = "https://hogrejhcoctnzjbtemuj.supabase.co";
const SUPABASE_KEY = "sb_publishable_BQZNmS6X4l8p2o9y8v8nEA_phPKoc9W";

// Sinkronisasi batch ke Supabase jika server tersedia
async function syncBatchKeSupabase(batchItem) {
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

/* ========================================== */
/* GRAFIK PEMBELIAN VS PENJUALAN (CHART.JS)   */
/* ========================================== */

async function loadGrafik() {
  try {
    const res = await fetch(
      "https://inventori-api-production.up.railway.app/riwayat?tahun=2026"
    );
    const data = await res.json();

    const labels    = data.data.map(d => d.bulan);
    const pembelian = data.data.map(d => d.pembelian);
    const penjualan = data.data.map(d => d.penjualan);

    const ctx = document.getElementById("chartPembelianPenjualan").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Pembelian",
            data: pembelian,
            backgroundColor: "#0288d1",
            borderRadius: 4
          },
          {
            label: "Penjualan",
            data: penjualan,
            backgroundColor: "#2e7d32",
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: {
            display: true,
            text: "Pembelian vs Penjualan 2026 (DATA SIMULASI)"
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

  } catch (error) {
    console.error("Gagal memuat grafik:", error);
  }
}

// Jalankan grafik saat halaman dimuat
document.addEventListener("DOMContentLoaded", function() {
  loadGrafik();
});

/* ========================================== */
/* PREDIKSI KEBUTUHAN RESTOCK                 */
/* ========================================== */

async function loadPrediksiRestock() {
  const tbody = document.querySelector("#table-restock");
  if (!tbody) return;

  if (dataBatchDemo.length === 0) {
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:15px; color:#64748b;'>Belum ada data produk di inventaris untuk dihitung.</td></tr>";
    return;
  }

  tbody.innerHTML = "<tr><td colspan='5'>Menghitung estimasi kebutuhan restock...</td></tr>";

  try {
    const hasil = await Promise.all(
      dataBatchDemo.map(async batch => {
        const payload = {
          produk: batch.name,
          sisa_stok: batch.stock,
          penjualan_14_hari: batch.penjualan_14_hari || [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
          hari_target: 14
        };

        const endpoints = [
          "http://127.0.0.1:8000/restock",
          "https://inventori-api-production.up.railway.app/restock"
        ];

        for (const ep of endpoints) {
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(ep, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
            clearTimeout(tid);
            if (res.ok) return await res.json();
          } catch (e) {}
        }

        // Fallback kalkulasi restock lokal
        const hist = batch.penjualan_14_hari || [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
        const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
        const avgRound = Math.round(avg * 10) / 10;
        const estHabis = avg > 0 ? Math.round(batch.stock / avg) : 99;
        const saran = Math.max(0, Math.round(avg * 14 - batch.stock));
        return {
          rata_rata_harian: avgRound,
          estimasi_habis_hari: estHabis,
          saran_belanja: saran
        };
      })
    );

    tbody.innerHTML = "";
    dataBatchDemo.forEach((batch, i) => {
      const restock = hasil[i];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${batch.name}</strong> (${batch.code})</td>
        <td>${restock.rata_rata_harian} Unit</td>
        <td>${batch.stock} Pcs</td>
        <td>${restock.estimasi_habis_hari} Hari lagi</td>
        <td><strong style="color:${restock.saran_belanja > 0 ? '#dc2626' : '#16a34a'};">+${restock.saran_belanja} Unit</strong></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Gagal memuat prediksi restock:", error);
    tbody.innerHTML = "<tr><td colspan='5'>Gagal memuat data prediksi.</td></tr>";
  }
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

  btn.textContent = "🔴 Merekam...";
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

    btn.textContent = "🎤 Mulai Rekam Suara";
    btn.disabled = false;
  };

  recognition.onerror = function(event) {
    hasilBox.innerHTML = `<p style='color:red'>Error: ${event.error}. Coba lagi.</p>`;
    btn.textContent = "🎤 Mulai Rekam Suara";
    btn.disabled = false;
  };

  recognition.onend = function() {
    btn.textContent = "🎤 Mulai Rekam Suara";
    btn.disabled = false;
  };
}

/* ========================================== */
/* INPUT FOTO NOTA (FASTAPI + GEMINI AI)      */
/* ========================================== */

// URL Gemini API fallback (jika backend offline, kunci dapat disimpan di localStorage)
function getGeminiApiUrl() {
  const userKey = localStorage.getItem("gemini_api_key") || "";
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
          📦 Buka Halaman "Produk & Batch FEFO" untuk Melihat
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

  const mauLihat = confirm(`✅ Berhasil! ${totalDisimpan} produk dari nota berhasil disimpan ke inventaris.\n\nKlik "OK" untuk langsung membuka menu "Produk & Batch FEFO" dan melihat tabel stok.`);
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

  btn.textContent = "⏳ AI sedang membaca...";
  btn.disabled = true;
  hasilBox.innerHTML = "<p style='color:#0284c7'><em>🔍 AI sedang membaca dan mengekstrak data dari nota...</em></p>";

  let items = null;

  // 1. Coba hubungi backend FastAPI
  try {
    const formData = new FormData();
    formData.append("file", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("http://127.0.0.1:8000/baca-nota", {
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
      btn.textContent = "🔍 Ekstrak dengan AI";
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

  btn.textContent = "🔍 Ekstrak dengan AI";
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
              📦 Buka Halaman "Produk & Batch FEFO" untuk Melihat
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

      const mauLihat = confirm(`✅ Berhasil! Batch ${kodeBatch} (${namaProduk} - ${jumlah} Pcs) berhasil disimpan ke inventaris.\n\nKlik "OK" untuk langsung membuka menu "Produk & Batch FEFO" dan melihat tabel stok.`);
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
  const pesan = "<b>⚠️ Peringatan Kedaluwarsa FreshLog</b>\nTerdapat 2 Batch Status Hitam (Kurang dari 1 Bulan) dan 3 Produk Stok Menipis.";

  try {
    const response = await fetch("http://127.0.0.1:8000/kirim-notifikasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, pesan: pesan })
    });

    const result = await response.json();
    if (response.ok) {
      alert("✅ Berhasil: " + (result.message || "Notifikasi berhasil dikirim!"));
    } else {
      alert("⚠️ Gagal: " + (result.detail || result.message || "Gagal mengirim notifikasi"));
    }
  } catch (error) {
    alert("⚠️ Gagal terhubung ke FastAPI backend (http://127.0.0.1:8000). Pastikan server uvicorn sudah berjalan.");
  }
}