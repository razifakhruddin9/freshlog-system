# API Inventori Pintar UMKM

API untuk menghitung skor risiko kedaluwarsa dan saran tindakan per batch produk.

## Endpoint

### POST /risiko
Input:
- batch_id, produk, sisa_stok, tanggal_kedaluwarsa, penjualan_14_hari

Output:
- skor_risiko (0-100), status (hijau/kuning/merah), perkiraan_terjual_sampai_exp, saran_tindakan, prioritas

## Asumsi
- Rata-rata penjualan dihitung dari data 14 hari terakhir
- Batas status: hijau ≤ 30, kuning 31-69, merah ≥ 70
- Batas saran kuning mendesak: sisa hari ≤ 3
- Batas saran merah darurat: sisa hari ≤ 2

## Catatan Data
Semua data yang digunakan untuk pengujian dan demonstrasi adalah DATA SIMULASI,
bukan data transaksi nyata.

Diagram Alur Logika (Mermaid Flowchart): Alur visual dari data batch masuk 
→ pengecekan kondisi khusus 
→
→ perhitungan kecepatan jual 
→
→ skor risiko 
→
→ pohon keputusan status warna & saran FEFO.
Formula Perhitungan POST /risiko: Detail rumus langkah demi langkah (
𝑆
𝑖
𝑠
𝑎
𝐻
𝑎
𝑟
𝑖
SisaHari, 
𝑉
harian
V
harian
	​

, Proyeksi Terjual, Stok Tak Terjual, hingga Skor 0–100).
Matriks Keputusan (Decision Matrix): Kriteria batas skor (Hijau 
≤
30
≤30, Kuning 
31
–
69
31–69, Merah 
≥
70
≥70, Expired 
≤
0
≤0 hari) beserta saran tindakan operasional toko dan tingkat prioritasnya.
Alur Kerja Restock POST /restock: Rumus estimasi hari habis dan kalkulasi jumlah saran belanja untuk target waktu.
Catatan Data: Penegasan penggunaan data simulasi