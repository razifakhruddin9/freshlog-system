import time
from fastapi import HTTPException, status
import logging
# Dictionary untuk menyimpan data percobaan login
# Format: {"username_atau_ip": {"failed_attempts": int, "lockout_until": float}}
login_tracker = {}

# Konfigurasi Keamanan
MAX_ATTEMPTS = 5          # Batas maksimal salah password
LOCKOUT_DURATION = 900    # Durasi blokir dalam detik (900 detik = 15 menit)

def check_brute_force(key: str):
    if not key:
        raise HTTPException(status_code=400, detail="Key tidak valid.")
    
    current_time = time.time()
    
    # Periksa baik key pengguna spesifik maupun tracker global
    for target_key in [key, "__global__"]:
        if target_key in login_tracker:
            user_data = login_tracker[target_key]
            
            # Cek apakah sedang dalam masa blokir
            if user_data.get("lockout_until", 0.0) > current_time:
                time_left = int(user_data["lockout_until"] - current_time)
                minutes = time_left // 60
                seconds = time_left % 60
                logging.debug(f"{target_key} masih diblokir selama {minutes} menit {seconds} detik")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Terlalu banyak percobaan login. Akses diblokir sementara selama {minutes} menit {seconds} detik."
                )
            
            # Reset jika waktu blokir sudah lewat
            if user_data.get("lockout_until", 0.0) > 0 and current_time >= user_data["lockout_until"]:
                logging.debug(f"Blokir untuk {target_key} telah berakhir")
                login_tracker[target_key] = {"failed_attempts": 0, "lockout_until": 0.0}

def track_failed_attempt(key: str):
    if not key:
        raise HTTPException(status_code=400, detail="Key tidak valid.")
    
    current_time = time.time()
    
    # 1. Catat untuk key spesifik
    if key not in login_tracker:
        login_tracker[key] = {"failed_attempts": 1, "lockout_until": 0.0}
    else:
        login_tracker[key]["failed_attempts"] += 1

    # 2. Catat juga secara global (mencegah penyerang berganti-ganti username)
    if "__global__" not in login_tracker:
        login_tracker["__global__"] = {"failed_attempts": 1, "lockout_until": 0.0}
    else:
        login_tracker["__global__"]["failed_attempts"] += 1
    
    effective_attempts = max(login_tracker[key]["failed_attempts"], login_tracker["__global__"]["failed_attempts"])
    logging.debug(f"Percobaan gagal untuk {key}: {effective_attempts} kali (user: {login_tracker[key]['failed_attempts']}, global: {login_tracker['__global__']['failed_attempts']})")
    
    # Jika percobaan gagal mencapai batas maksimal (5 kali), aktifkan blokir 15 menit
    if effective_attempts >= MAX_ATTEMPTS:
        lock_until = current_time + LOCKOUT_DURATION
        login_tracker[key]["lockout_until"] = lock_until
        login_tracker["__global__"]["lockout_until"] = lock_until
        logging.debug(f"{key} & __global__ diblokir hingga {lock_until}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Akses diblokir! Anda salah memasukkan kata sandi sebanyak 5 kali. Sistem mengunci login selama 15 menit untuk keamanan."
        )
    
    return effective_attempts

def reset_failed_attempts(key: str):
    if not key:
        raise HTTPException(status_code=400, detail="Key tidak valid.")
    """
    Menghapus catatan kegagalan jika pengguna berhasil login dengan benar.
    """
    if key in login_tracker:
        login_tracker[key] = {"failed_attempts": 0, "lockout_until": 0.0}
    if "__global__" in login_tracker:
        login_tracker["__global__"] = {"failed_attempts": 0, "lockout_until": 0.0}

logging.basicConfig(level=logging.DEBUG)

def test_check_brute_force():
    key = "test_user"
    # Reset tracker pengujian terlebih dahulu
    login_tracker.pop(key, None)
    # 4 percobaan gagal pertama tidak memicu exception
    for _ in range(4):
        track_failed_attempt(key)
    # Percobaan ke-5 akan memicu HTTP 429
    try:
        track_failed_attempt(key)
    except HTTPException as e:
        assert e.status_code == 429
    # Verifikasi bahwa check_brute_force juga menolak request saat terkunci
    try:
        check_brute_force(key)
        assert False, "Harusnya melempar HTTPException 429"
    except HTTPException as e:
        assert e.status_code == 429
        assert "Akses diblokir" in e.detail or "Terlalu banyak percobaan" in e.detail