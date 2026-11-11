import os
import json
import base64
from datetime import date
from typing import List

# Muat environment variable dari .env jika ada
env_file = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import re
import requests
from pydantic import BaseModel, field_validator

from skor_risiko import hitung_skor_risiko
from rekomendasi import tentukan_saran
from restock import hitung_restock
from riwayat import hitung_riwayat
from beckend.bot import kirim_pesan_telegram

# ── Inisialisasi aplikasi FastAPI ──────────────────────────────────────────
app = FastAPI(
    title="API Inventori Pintar UMKM",
    description="Menghitung skor risiko kedaluwarsa dan saran tindakan per batch.",
    version="1.0.0"
)

# ── CORS middleware ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Inisialisasi Gemini API Key ────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-flash-lite-latest"


# ── Definisi bentuk data yang masuk (request) ──────────────────────────────
class BatchInput(BaseModel):
    batch_id             : str
    produk               : str
    sisa_stok            : float
    tanggal_kedaluwarsa  : str
    penjualan_14_hari    : List[float]

    @field_validator("sisa_stok")
    @classmethod
    def stok_tidak_negatif(cls, v):
        if v < 0:
            raise ValueError("sisa_stok tidak boleh negatif.")
        return v

    @field_validator("tanggal_kedaluwarsa")
    @classmethod
    def format_tanggal_valid(cls, v):
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("tanggal_kedaluwarsa harus format YYYY-MM-DD")
        return v

    @field_validator("penjualan_14_hari")
    @classmethod
    def penjualan_tidak_kosong(cls, v):
        if len(v) == 0:
            raise ValueError("penjualan_14_hari tidak boleh daftar kosong.")
        if any(x < 0 for x in v):
            raise ValueError("Nilai penjualan tidak boleh negatif.")
        return v


# ── Endpoint risiko ────────────────────────────────────────────────────────
@app.post("/risiko")
def hitung_risiko(data: BatchInput):
    hasil_skor = hitung_skor_risiko(
        sisa_stok           = data.sisa_stok,
        tanggal_kedaluwarsa = data.tanggal_kedaluwarsa,
        penjualan_14_hari   = data.penjualan_14_hari
    )
    hasil_saran = tentukan_saran(
        status      = hasil_skor["status"],
        sisa_hari   = hasil_skor["sisa_hari"],
        sisa_stok   = data.sisa_stok,
        nama_produk = data.produk
    )
    return {
        "batch_id"                     : data.batch_id,
        "produk"                       : data.produk,
        "skor_risiko"                  : hasil_skor["skor_risiko"],
        "status"                       : hasil_skor["status"],
        "perkiraan_terjual_sampai_exp" : hasil_skor["perkiraan_terjual"],
        "sisa_hari"                    : hasil_skor["sisa_hari"],
        "saran_tindakan"               : hasil_saran["saran"],
        "prioritas"                    : hasil_saran["prioritas"],
        "catatan"                      : hasil_skor.get("catatan", "")
    }


# ── Endpoint restock ───────────────────────────────────────────────────────
class RestockInput(BaseModel):
    produk            : str
    sisa_stok         : float
    penjualan_14_hari : List[float]
    hari_target       : int = 14

    @field_validator("sisa_stok")
    @classmethod
    def stok_tidak_negatif(cls, v):
        if v < 0:
            raise ValueError("sisa_stok tidak boleh negatif.")
        return v

    @field_validator("penjualan_14_hari")
    @classmethod
    def penjualan_tidak_kosong(cls, v):
        if len(v) == 0:
            raise ValueError("penjualan_14_hari tidak boleh daftar kosong.")
        if any(x < 0 for x in v):
            raise ValueError("Nilai penjualan tidak boleh negatif.")
        return v

    @field_validator("hari_target")
    @classmethod
    def hari_target_valid(cls, v):
        if v <= 0:
            raise ValueError("hari_target harus lebih dari 0.")
        return v


@app.post("/restock")
def prediksi_restock(data: RestockInput):
    hasil = hitung_restock(
        sisa_stok         = data.sisa_stok,
        penjualan_14_hari = data.penjualan_14_hari,
        hari_target       = data.hari_target
    )
    return {
        "produk"             : data.produk,
        "rata_rata_harian"   : hasil["rata_rata_harian"],
        "sisa_stok"          : data.sisa_stok,
        "estimasi_habis_hari": hasil["estimasi_habis_hari"],
        "saran_belanja"      : hasil["saran_belanja"],
        "catatan"            : hasil["catatan"]
    }


# ── Endpoint riwayat ───────────────────────────────────────────────────────
@app.get("/riwayat")
def get_riwayat(tahun: int = 2026):
    if tahun < 2000 or tahun > 2100:
        return {"error": "Tahun tidak valid."}
    return hitung_riwayat(tahun)


# ── Endpoint cek kesehatan ─────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "API berjalan", "versi": "1.0.0"}


# ── Endpoint notifikasi bot ────────────────────────────────────────────────
class NotifikasiRequest(BaseModel):
    chat_id: str
    pesan: str


@app.post("/kirim-notifikasi")
def api_kirim_notifikasi(data: NotifikasiRequest):
    if not data.chat_id:
        raise HTTPException(status_code=400, detail="Chat ID wajib diisi")

    hasil = kirim_pesan_telegram(data.chat_id, data.pesan)

    if hasil.get("ok"):
        return {"status": "success", "message": "Notifikasi Telegram berhasil terkirim!"}
    else:
        raise HTTPException(status_code=400, detail=hasil.get("description", "Gagal mengirim pesan"))


# ── Endpoint Ekstraksi Nota dengan Gemini Vision ────────────────────────────
@app.post("/baca-nota")
async def baca_nota(file: UploadFile = File(...)):
    # Validasi format file gambar
    valid_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"]
    if file.content_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Format file '{file.content_type}' tidak didukung. Unggah gambar bertipe JPEG, PNG, WEBP, atau GIF."
        )

    try:
        # Konversi gambar ke base64
        file_bytes = await file.read()
        image_base64 = base64.b64encode(file_bytes).decode("utf-8")
        mime_type = "image/jpeg" if file.content_type == "image/jpg" else file.content_type

        prompt = """Kamu adalah asisten pencatatan stok toko inventaris UMKM.
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
- Konversi semua format tanggal (misal 15/12/2026 atau 15-12-2026) menjadi format standar internasional YYYY-MM-DD (contoh: 2026-12-15).
- Jawab HANYA dalam JSON murni, tanpa pembungkus markdown ```json atau komentar teks apa pun."""

        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_base64
                        }
                    }
                ]
            }]
        }

        resp = requests.post(gemini_url, json=payload, timeout=25)
        if resp.status_code != 200:
            error_detail = "Gagal memproses gambar dengan Gemini API."
            try:
                error_detail = resp.json().get("error", {}).get("message", error_detail)
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=error_detail)

        res_json = resp.json()
        candidates = res_json.get("candidates", [])
        if not candidates or "content" not in candidates[0]:
            raise HTTPException(status_code=500, detail="Tidak ada respon konten dari AI.")

        # Ambil teks dari parts
        parts = candidates[0]["content"].get("parts", [])
        teks_raw = "\n".join(p.get("text", "") for p in parts if "text" in p).strip()

        # Pembersihan pembungkus markdown
        teks_bersih = re.sub(r"^```[a-zA-Z]*\n?", "", teks_raw).strip()
        teks_bersih = re.sub(r"```$", "", teks_bersih).strip()

        hasil_parsed = None
        # Coba parse langsung
        try:
            hasil_parsed = json.loads(teks_bersih)
        except Exception:
            # Cari substring JSON array atau object
            match = re.search(r"(\[[\s\S]*\]|\{[\s\S]*\})", teks_bersih)
            if match:
                try:
                    hasil_parsed = json.loads(match.group(0))
                except Exception:
                    pass

        if hasil_parsed is None:
            raise HTTPException(status_code=500, detail="Gagal menemukan format data JSON dari foto nota.")

        # Normalisasi ke daftar item
        raw_items = []
        if isinstance(hasil_parsed, list):
            raw_items = hasil_parsed
        elif isinstance(hasil_parsed, dict):
            if "items" in hasil_parsed and isinstance(hasil_parsed["items"], list):
                raw_items = hasil_parsed["items"]
            elif "data" in hasil_parsed and isinstance(hasil_parsed["data"], list):
                raw_items = hasil_parsed["data"]
            elif "produk" in hasil_parsed or "nama" in hasil_parsed:
                raw_items = [hasil_parsed]

        items_hasil = []
        for idx, item in enumerate(raw_items):
            nama = item.get("produk") or item.get("nama_produk") or item.get("nama") or item.get("barang") or f"Produk #{idx+1}"
            try:
                jumlah = int(item.get("jumlah") or item.get("qty") or item.get("stok") or 1)
                if jumlah <= 0:
                    jumlah = 1
            except (ValueError, TypeError):
                jumlah = 1

            tgl_exp = item.get("tanggal_kedaluwarsa") or item.get("exp") or item.get("expired")
            if tgl_exp in ["null", "None", "", None]:
                tgl_exp = None
            elif isinstance(tgl_exp, str) and re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", tgl_exp.strip()):
                parts = tgl_exp.strip().split("/")
                tgl_exp = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"

            items_hasil.append({
                "produk": str(nama).strip(),
                "jumlah": jumlah,
                "tanggal_kedaluwarsa": tgl_exp
            })

        if not items_hasil:
            items_hasil = [{
                "produk": "Produk Tidak Dikenal",
                "jumlah": 1,
                "tanggal_kedaluwarsa": None
            }]

        return {
            "status": "success",
            "items": items_hasil,
            "data": items_hasil[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)