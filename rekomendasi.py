import os
import re
import json
import requests
import logging

logger = logging.getLogger(__name__)

def tentukan_saran(status, sisa_hari, sisa_stok, nama_produk="produk ini"):
    """
    Menentukan saran tindakan berdasarkan 3 kategori resmi:
    1. Diskon: 1 minggu sebelum kadaluarsa (4-7 hari)
    2. Donasi Limbah: 3-1 hari sebelum kadaluarsa (1-3 hari)
    3. Buang: 0 hari (atau <= 0 hari / expired)
    """
    if sisa_stok <= 0:
        return {
            "saran"    : "Stok sudah habis. Tidak ada tindakan diperlukan.",
            "prioritas": 1
        }

    # Kategori 3: Buang 0 hari / sudah kedaluwarsa
    if sisa_hari <= 0:
        return {
            "saran"    : f"0 Hari (Expired): Segera buang / musnahkan {nama_produk} dari stok aktif.",
            "prioritas": 3
        }

    # Kategori 2: Donasi limbah 3-1 hari sebelum kadaluarsa
    if 1 <= sisa_hari <= 3:
        return {
            "saran"    : f"Sisa {sisa_hari} hari: Donasikan limbah pangan {nama_produk} ke mitra sebelum kedaluwarsa.",
            "prioritas": 3
        }

    # Kategori 1: Diskon 1 minggu sebelum kadaluarsa (4-7 hari)
    if 4 <= sisa_hari <= 7:
        return {
            "saran"    : f"Sisa {sisa_hari} hari: Terapkan diskon 1 minggu sebelum exp untuk {nama_produk} (FEFO rak depan).",
            "prioritas": 2
        }

    # Stok aman (> 7 hari)
    return {
        "saran"    : f"Stok aman (sisa {sisa_hari} hari). Pertahankan rotasi standar FEFO.",
        "prioritas": 1
    }


def generate_rekomendasi_gemini(batches: list, api_key: str = None) -> dict:
    """
    Menghasilkan rekomendasi tindakan preskriptif untuk Analitik AI dan
    saran tindakan per batch inventaris menggunakan Google Gemini LLM API,
    dengan 3 KATEGORI TINDAKAN RESMI:
    1. Diskon (1 minggu sebelum kedaluwarsa / 4-7 hari)
    2. Donasi Limbah (3-1 hari sebelum kedaluwarsa / 1-3 hari)
    3. Buang (0 hari / <= 0 hari)
    """
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY", "")
    
    model = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

    # Siapkan ringkasan data batch untuk dianalisis LLM
    data_ringkasan = []
    for b in batches:
        code = b.get("code") or b.get("batch_id") or ""
        name = b.get("name") or b.get("produk") or "Produk"
        cat = b.get("category") or "Umum"
        stock = b.get("stock", b.get("sisa_stok", 0))
        exp = b.get("expiry_date") or b.get("tanggal_kedaluwarsa") or ""
        sisa_hari = b.get("sisa_hari", 0)
        status = b.get("status", "hijau")
        skor = b.get("skor_risiko", 0)

        data_ringkasan.append({
            "code": code,
            "nama": name,
            "kategori": cat,
            "stok": stock,
            "tgl_exp": exp,
            "sisa_hari": sisa_hari,
            "skor_risiko": skor,
            "status": status
        })

    prompt_instruksi = f"""Anda adalah asisten AI Analitik Ritel FreshLog (Sistem Inventaris FEFO & Manajemen Produk Segar).
Tugas Anda adalah menganalisis data batch berikut dan menyusun Rekomendasi Tindakan Preskriptif Cerdas berbasis Google Gemini LLM.

ATURAN WAJIB SISTEM - HANYA ADA 3 KATEGORI TINDAKAN RESMI:
1. "diskon" : Diskon 1 minggu sebelum kedaluwarsa (sisa 4 sampai 7 hari sebelum exp)
2. "donasi" : Donasi limbah pangan 3-1 hari sebelum kedaluwarsa (sisa 1 sampai 3 hari sebelum exp)
3. "buang"  : Buang / Pemusnahan limbah (0 hari atau sisa <= 0 hari / sudah kedaluwarsa)

Catatan: Produk dengan sisa hari > 7 hari dan stok normal adalah stok aman (tidak perlu dimasukkan ke kartu tindakan darurat).
PENTING: Jangan gunakan emoji apa pun dalam teks (ikon akan dirender oleh sistem SVG UI).

Data Batch Inventaris:
{json.dumps(data_ringkasan, indent=2, ensure_ascii=False)}

Keluarkan output HANYA berupa JSON murni (tanpa markdown ```json, tanpa komentar tambahan) dengan skema berikut:
{{
  "rekomendasi_tindakan": [
    {{
      "id": "ACT-GEMINI-<kode_batch>",
      "batch": "<kode_batch>",
      "produk": "<nama_produk>",
      "jenis": "<diskon|donasi|buang>",
      "namaTindakan": "<Judul singkat tanpa emoji: 'Diskon Bertahap (30% Off)' untuk diskon | 'Donasi Limbah Pangan' untuk donasi | 'Pemusnahan Limbah' untuk buang>",
      "badgeWarna": "<#D97706 untuk diskon, #EA580C untuk donasi, #DC2626 untuk buang>",
      "badgeBg": "<#FEF3C7 untuk diskon, #FFEDD5 untuk donasi, #FEE2E2 untuk buang>",
      "prioritas": "<Prioritas Tinggi untuk diskon | Prioritas Tertinggi untuk donasi | Tindakan Darurat untuk buang>",
      "stok": <jumlah unit yang direkomendasikan ditindak>,
      "alasan": "<Penjelasan analitis mendalam dari Gemini LLM mengapa tindakan ini harus diambil berdasarkan aturan 3 kategori di atas>",
      "estimasi": "<Estimasi dampak nilai finansial atau penyelamatan makanan/limbah tanpa emoji>",
      "tombolTeks": "<Terapkan Diskon untuk diskon | Salurkan Donasi untuk donasi | Catat Pemusnahan untuk buang>"
    }}
  ],
  "saran_per_batch": {{
    "<kode_batch>": "<Saran tindakan ringkas spesifik tanpa emoji untuk batch ini sesuai aturan (Diskon 1 minggu / Donasi limbah 3-1 hari / Buang 0 hari / Stok aman)>"
  }}
}}
"""

    if not api_key:
        logger.warning("GEMINI_API_KEY tidak tersedia, menggunakan fallback cerdas 3 kategori...")
        return _fallback_rekomendasi(data_ringkasan)

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [{"text": prompt_instruksi}]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.95,
                "maxOutputTokens": 4096
            }
        }
        res = requests.post(url, json=payload, timeout=25)
        if res.status_code == 200:
            res_json = res.json()
            raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            if raw_text.startswith("```"):
                lines = raw_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_text = "\n".join(lines).strip()
            
            parsed = json.loads(raw_text)
            parsed["source"] = "google_gemini_llm"
            parsed["model"] = model

            # Sanitasi teks dari emoji agar sesuai sistem ikonik SVG FreshLog
            if isinstance(parsed.get("rekomendasi_tindakan"), list):
                for item in parsed["rekomendasi_tindakan"]:
                    for k in ["namaTindakan", "alasan", "estimasi", "tombolTeks", "prioritas"]:
                        if isinstance(item.get(k), str):
                            item[k] = re.sub(r'[\U00010000-\U0010ffff]', '', item[k]).strip()
            if isinstance(parsed.get("saran_per_batch"), dict):
                for b_code, b_saran in parsed["saran_per_batch"].items():
                    if isinstance(b_saran, str):
                        parsed["saran_per_batch"][b_code] = re.sub(r'[\U00010000-\U0010ffff]', '', b_saran).strip()

            return parsed
        else:
            logger.error(f"Gemini API returned status {res.status_code}: {res.text}")
            return _fallback_rekomendasi(data_ringkasan)
    except Exception as e:
        logger.error(f"Error memanggil Gemini LLM API: {e}")
        return _fallback_rekomendasi(data_ringkasan)


def _fallback_rekomendasi(data_ringkasan: list) -> dict:
    """
    Fallback preskriptif cerdas yang secara ketat menerapkan 3 kategori:
    1. Diskon: 1 minggu sebelum kadaluarsa (4-7 hari)
    2. Donasi Limbah: 3-1 hari sebelum kadaluarsa (1-3 hari)
    3. Buang: 0 hari (atau <= 0 hari / expired)
    """
    rekomendasi_list = []
    saran_per_batch = {}

    for b in data_ringkasan:
        code = b["code"]
        name = b["nama"]
        stock = b["stok"]
        sisa_hari = b["sisa_hari"]

        # Kategori 3: Buang 0 hari / Expired
        if sisa_hari <= 0 and stock > 0:
            rekomendasi_list.append({
                "id": f"ACT-GEMINI-BUANG-{code}",
                "batch": code,
                "produk": name,
                "jenis": "buang",
                "namaTindakan": "Pemusnahan Limbah",
                "badgeWarna": "#DC2626",
                "badgeBg": "#FEE2E2",
                "prioritas": "Tindakan Darurat",
                "stok": stock,
                "alasan": f"Produk telah mencapai 0 hari atau melewati batas kedaluwarsa. Sesuai standar mutu dan keamanan pangan, {stock} unit harus segera dipisahkan dan dimusnahkan.",
                "estimasi": f"Pencatatan limbah {stock} unit untuk audit inventaris",
                "tombolTeks": "Catat Pemusnahan"
            })
            saran_per_batch[code] = f"0 Hari (Kedaluwarsa): Segera pisahkan dan musnahkan dari stok aktif."

        # Kategori 2: Donasi limbah 3-1 hari sebelum kadaluarsa
        elif 1 <= sisa_hari <= 3 and stock > 0:
            rekomendasi_list.append({
                "id": f"ACT-GEMINI-DONASI-{code}",
                "batch": code,
                "produk": name,
                "jenis": "donasi",
                "namaTindakan": "Donasi Limbah Pangan",
                "badgeWarna": "#EA580C",
                "badgeBg": "#FFEDD5",
                "prioritas": "Prioritas Tertinggi",
                "stok": stock,
                "alasan": f"Sisa {sisa_hari} hari sebelum kedaluwarsa. Kecepatan penjualan reguler tidak mencukupi untuk menghabiskan {stock} unit. Salurkan sebagai donasi pangan ke mitra sosial.",
                "estimasi": f"Penyelamatan {stock} unit makanan bernutrisi untuk program sosial",
                "tombolTeks": "Salurkan Donasi"
            })
            saran_per_batch[code] = f"Sisa {sisa_hari} hari: Salurkan donasi limbah pangan ke mitra sebelum kedaluwarsa."

        # Kategori 1: Diskon 1 minggu sebelum kadaluarsa (4-7 hari)
        elif 4 <= sisa_hari <= 7 and stock > 0:
            pct = 40 if sisa_hari <= 5 else 25
            rekomendasi_list.append({
                "id": f"ACT-GEMINI-DISKON-{code}",
                "batch": code,
                "produk": name,
                "jenis": "diskon",
                "namaTindakan": f"Diskon Bertahap ({pct}% Off)",
                "badgeWarna": "#D97706",
                "badgeBg": "#FEF3C7",
                "prioritas": "Prioritas Tinggi",
                "stok": stock,
                "alasan": f"Batch berada pada periode 1 minggu sebelum kedaluwarsa (sisa {sisa_hari} hari). Pemotongan harga {pct}% pada rak depan FEFO diaktifkan untuk menghabiskan {stock} unit.",
                "estimasi": f"Likuidasi omzet {stock} unit sebelum masuk fase donasi",
                "tombolTeks": "Terapkan Diskon"
            })
            saran_per_batch[code] = f"Sisa {sisa_hari} hari: Terapkan diskon 1 minggu sebelum kedaluwarsa (rotasi FEFO)."

        else:
            if sisa_hari <= 0:
                saran_per_batch[code] = "0 Hari (Expired): Segera buang / musnahkan dari stok aktif."
            elif stock <= 0:
                saran_per_batch[code] = "Stok habis. Tidak ada tindakan diperlukan."
            else:
                saran_per_batch[code] = f"Stok aman (sisa {sisa_hari} hari). Pertahankan rotasi standar FEFO."

    return {
        "source": "smart_prescriptive_fallback",
        "model": "rule_assisted_engine_3_kategori",
        "rekomendasi_tindakan": rekomendasi_list,
        "saran_per_batch": saran_per_batch
    }
