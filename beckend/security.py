import time
from fastapi import HTTPException, status

# Dictionary untuk menyimpan data percobaan login
# Format: {"username_atau_ip": {"failed_attempts": int, "lockout_until": float}}
login_tracker = {}

# Konfigurasi Keamanan
MAX_ATTEMPTS = 5          # Batas maksimal salah password
LOCKOUT_DURATION = 900    # Durasi blokir dalam detik (900 detik = 15 menit)

def check_brute_force(key: str):
    """
    Memeriksa apakah username atau IP sedang dalam masa blokir (lockout).
    """
    current_time = time.time()
    
    if key in login_tracker:
        user_data = login_tracker[key]
        
        # Cek apakah sedang dalam masa blokir
        if user_data["lockout_until"] > current_time:
            time_left = int(user_data["lockout_until"] - current_time)
            minutes = time_left // 60
            seconds = time_left % 60
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Terlalu banyak percobaan login. Akses diblokir sementara selama {minutes} menit {seconds} detik."
            )
        
        # Jika waktu blokir sudah lewat, reset tracker
        elif user_data["lockout_until"] > 0 and current_time >= user_data["lockout_until"]:
            login_tracker[key] = {"failed_attempts": 0, "lockout_until": 0.0}

def track_failed_attempt(key: str):
    """
    Mencatat setiap kali pengguna gagal memasukkan password dengan benar.
    """
    current_time = time.time()
    
    if key not in login_tracker:
        login_tracker[key] = {"failed_attempts": 1, "lockout_until": 0.0}
    else:
        login_tracker[key]["failed_attempts"] += 1
        
    # Jika percobaan gagal mencapai batas maksimal, aktifkan blokir
    if login_tracker[key]["failed_attempts"] >= MAX_ATTEMPTS:
        login_tracker[key]["lockout_until"] = current_time + LOCKOUT_DURATION
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Akses diblokir! Anda salah memasukkan password sebanyak 5 kali. Silakan coba lagi dalam 15 menit."
        )

def reset_failed_attempts(key: str):
    """
    Menghapus catatan kegagalan jika pengguna berhasil login dengan benar.
    """
    if key in login_tracker:
        login_tracker[key] = {"failed_attempts": 0, "lockout_until": 0.0}