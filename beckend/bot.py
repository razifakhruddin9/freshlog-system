import os
import requests

# Pastikan token utuh tanpa ada karakter/spasi yang tertinggal
BOT_TOKEN = "9141282545:AAHALhC4prYNk3HxdFslp5BUz3KHGxBfrLY"

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