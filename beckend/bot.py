import os
import requests

# Ambil token dari environment variable atau .env
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

def kirim_pesan_telegram(chat_id: str, pesan: str):
    if not BOT_TOKEN:
        return {"ok": False, "description": "Token bot Telegram belum dikonfigurasi di .env"}
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": pesan,
        "parse_mode": "HTML"
    }
    response = requests.post(url, json=payload)
    return response.json()