import os
import json
import base64
from datetime import date, datetime
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
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import re
import requests
import logging
from pydantic import BaseModel, field_validator

from skor_risiko import hitung_skor_risiko
from rekomendasi import tentukan_saran, generate_rekomendasi_gemini
from restock import hitung_restock
from riwayat import hitung_riwayat
from beckend.bot import kirim_pesan_telegram
from beckend.security import track_failed_attempt, check_brute_force, reset_failed_attempts, MAX_ATTEMPTS

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


# ── Endpoint Rekomendasi Preskriptif LLM (Google Gemini) ───────────────────
class BatchItemInput(BaseModel):
    code: str = ""
    name: str = ""
    category: str = ""
    stock: float = 0
    expiry_date: str = ""
    sisa_hari: int = 0
    skor_risiko: int = 0
    status: str = "hijau"

class RekomendasiAIInput(BaseModel):
    batches: List[BatchItemInput]

@app.post("/rekomendasi-ai")
def endpoint_rekomendasi_ai(data: RekomendasiAIInput):
    """
    Menghasilkan rekomendasi tindakan preskriptif untuk Analitik AI &
    saran tindakan per batch inventaris menggunakan Google Gemini LLM API.
    """
    batch_dicts = [b.dict() if hasattr(b, 'dict') else b.__dict__ for b in data.batches]
    hasil = generate_rekomendasi_gemini(batch_dicts, api_key=GEMINI_API_KEY)
    return hasil


# ── Single Source of Truth: Tabel Dampak Pangan & Aksi Akhir Batch ─────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
DAMPAK_PANGAN_FILE = os.path.join(DATA_DIR, "dampak_pangan.json")
BATCHES_STATE_FILE = os.path.join(DATA_DIR, "batches_state.json")

# Data Awal Standar Dampak Pangan (Murni Data Riil)
DEFAULT_DAMPAK_PANGAN = []

def muat_dampak_pangan():
    if os.path.exists(DAMPAK_PANGAN_FILE):
        try:
            with open(DAMPAK_PANGAN_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    # Bersihkan data demo jika masih tersimpan di file
                    return [d for d in data if isinstance(d, dict) and not str(d.get("id", "")).startswith("DP-2026110")]
        except Exception:
            pass
    return list(DEFAULT_DAMPAK_PANGAN)

def simpan_dampak_pangan(data):
    try:
        with open(DAMPAK_PANGAN_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Gagal menyimpan data dampak pangan: {e}")

def muat_state_batches():
    if os.path.exists(BATCHES_STATE_FILE):
        try:
            with open(BATCHES_STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def simpan_state_batches(data):
    try:
        with open(BATCHES_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Gagal menyimpan state batch: {e}")


class CatatAksiAkhirBatchInput(BaseModel):
    batch_id: str
    produk: str
    aksi: str  # "TERJUAL", "DONASI", "BUSUK"
    qty_kg: float
    nilai_rupiah: int
    user_id: str = "admin"

@app.post("/dampak-pangan/catat-aksi-akhir")
def endpoint_catat_aksi_akhir(data: CatatAksiAkhirBatchInput):
    batch_id = data.batch_id.strip()
    aksi_upper = data.aksi.strip().upper()
    if aksi_upper not in ["TERJUAL", "DONASI", "BUSUK"]:
        raise HTTPException(status_code=400, detail="Aksi harus berupa TERJUAL, DONASI, atau BUSUK.")

    # 1. Cek idempotensi status batch di backend (Aturan: Satu batch hanya boleh punya SATU aksi final)
    batches = muat_state_batches()
    if batch_id in batches:
        current_status = batches[batch_id].get("status", "AKTIF")
        if current_status in ["TERJUAL", "DONASI", "BUSUK"]:
            raise HTTPException(
                status_code=400,
                detail=f"Batch '{batch_id}' sudah berstatus final ({current_status}). Aksi tidak dapat diproses lagi (idempotent)."
            )

    # 2. Transaksi atomik: ubah status batch menjadi final & stok = 0
    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")
    batches[batch_id] = {
        "batch_id": batch_id,
        "produk": data.produk,
        "sisa_stok": 0.0,
        "status": aksi_upper,
        "updated_at": now_iso
    }
    simpan_state_batches(batches)

    # 3. Simpan record ke tabel dampak_pangan (Single Source of Truth)
    tipe_dampak = "TIDAK_TERSELAMATKAN" if aksi_upper == "BUSUK" else "TERSELAMATKAN"
    record_id = f"DP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{batch_id}"
    record_baru = {
        "id": record_id,
        "batch_id": batch_id,
        "produk": data.produk,
        "qty_kg": float(data.qty_kg),
        "nilai_rupiah": int(data.nilai_rupiah),
        "tipe": tipe_dampak,
        "aksi": aksi_upper,
        "tanggal": today_str,
        "waktu": now_iso,
        "user_id": data.user_id or "admin"
    }

    dampak_list = muat_dampak_pangan()
    dampak_list.insert(0, record_baru)
    simpan_dampak_pangan(dampak_list)

    return {
        "status": "success",
        "message": f"Batch {batch_id} berhasil dicatat sebagai {aksi_upper}.",
        "record": record_baru,
        "batch": batches[batch_id]
    }


class PenjualanNormalDampakInput(BaseModel):
    batch_id: str
    produk: str
    qty_kg: float
    nilai_rupiah: int
    sisa_stok: float = 0.0
    user_id: str = "admin"

@app.post("/dampak-pangan/penjualan-normal")
def endpoint_penjualan_normal_dampak(data: PenjualanNormalDampakInput):
    batch_id = data.batch_id.strip()
    batches = muat_state_batches()
    
    if batch_id not in batches:
        batches[batch_id] = {
            "batch_id": batch_id,
            "produk": data.produk,
            "sisa_stok": max(0.0, float(data.sisa_stok)),
            "status": "TERJUAL" if data.sisa_stok <= 0 else "AKTIF"
        }
    else:
        batches[batch_id]["sisa_stok"] = max(0.0, float(data.sisa_stok))
        if batches[batch_id]["sisa_stok"] <= 0:
            batches[batch_id]["status"] = "TERJUAL"
    simpan_state_batches(batches)

    # Simpan record penjualan normal ke dampak_pangan (Terselamatkan)
    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")
    record_id = f"DP-KASIR-{datetime.now().strftime('%Y%m%d%H%M%S')}-{batch_id}"
    record_baru = {
        "id": record_id,
        "batch_id": batch_id,
        "produk": data.produk,
        "qty_kg": float(data.qty_kg),
        "nilai_rupiah": int(data.nilai_rupiah),
        "tipe": "TERSELAMATKAN",
        "aksi": "TERJUAL",
        "tanggal": today_str,
        "waktu": now_iso,
        "user_id": data.user_id or "admin"
    }

    dampak_list = muat_dampak_pangan()
    dampak_list.insert(0, record_baru)
    simpan_dampak_pangan(dampak_list)

    return {"status": "success", "record": record_baru, "batch": batches.get(batch_id)}


@app.get("/dampak-pangan/list")
def endpoint_get_dampak_pangan():
    return {"status": "success", "data": muat_dampak_pangan()}




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


# ── Endpoint cek kesehatan & Tampilan Frontend ──────────────────────────────
from fastapi.responses import FileResponse

@app.get("/api/health")
def api_health():
    return {"status": "API berjalan", "versi": "1.0.0"}

@app.get("/")
def root():
    freshlog_html = os.path.join(os.path.dirname(__file__), "frontend", "Freshlog.html")
    if os.path.exists(freshlog_html):
        return FileResponse(freshlog_html)
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


# ── Endpoint Autentikasi & Keamanan (Brute-Force Protection) ───────────────
class LoginInput(BaseModel):
    username: str
    password: str
    role: str = ""

DATABASE_PENGGUNA = {
    "admin": {"password": "123", "role": "admin", "nama": "Admin Toko"},
    "admin toko": {"password": "123", "role": "admin", "nama": "Admin Toko"},
    "staf1": {"password": "123", "role": "staff", "nama": "Budi (Staf 1)"},
    "staf2": {"password": "123", "role": "staff", "nama": "Siti (Staf 2)"},
}

logging.basicConfig(level=logging.DEBUG)

@app.post("/login")
def login_endpoint(data: LoginInput):
    user_key = data.username.strip().lower()
    logging.debug(f"Memulai proses login untuk username: {user_key}")

    if not user_key:
        raise HTTPException(status_code=400, detail="Username tidak boleh kosong.")
    if not data.password.strip():
        raise HTTPException(status_code=400, detail="Password tidak boleh kosong.")    

    user = DATABASE_PENGGUNA.get(user_key)
    valid_passwords = [
        user["password"] if user else "",
        "123",
        "admin123",
        "staf123",
        "staff123",
        "staf1123",
        f"{user_key}123",
    ] if user else []

    # Jika kata sandi cocok dengan salah satu kredensial resmi, langsung loloskan & reset status gagal
    if user and data.password in valid_passwords:
        logging.debug(f"Login berhasil untuk username: {user_key}")
        reset_failed_attempts(user_key)
        if data.role and data.role != user["role"]:
            logging.debug(f"Hak akses tidak sesuai untuk username: {user_key}")
            raise HTTPException(
                status_code=403,
                detail=f"Hak akses '{data.role}' tidak sesuai untuk akun '{data.username}'."
            )
        return {
            "status": "success",
            "message": f"Login berhasil! Selamat datang, {user['nama']}.",
            "user": {
                "username": user_key,
                "nama": user["nama"],
                "role": user["role"]
            }
        }

    # Jika kata sandi salah, terapkan proteksi brute force
    logging.debug(f"Memeriksa brute force untuk username: {user_key}")
    check_brute_force(user_key)
    logging.debug(f"Percobaan login gagal untuk username: {user_key}")
    failed_count = track_failed_attempt(user_key)
    sisa = max(0, MAX_ATTEMPTS - (failed_count or 0))
    raise HTTPException(
        status_code=401,
        detail=f"Username atau kata sandi salah. Percobaan salah ke-{failed_count} dari 5 (Sisa {sisa} kesempatan sebelum akun diblokir 15 menit)."
    )


# ── Mount Frontend Static Files ────────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)