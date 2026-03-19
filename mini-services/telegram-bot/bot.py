import requests
import os
import time
from telegram import Bot
from formatter import fetch_bets, format_prediction_msg

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "REPLACE_WITH_YOUR_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "@your_channel")

bot = None
if TOKEN != "REPLACE_WITH_YOUR_TOKEN":
    bot = Bot(token=TOKEN)

def post_bets():
    if not bot:
        print("Bot token not configured. Skipping post.")
        return
        
    bets = fetch_bets()
    if not bets:
        print("No bets fetched.")
        return

    # Post top 3 free bets
    for b in bets[:3]:
        msg = format_prediction_msg(b)
        msg += "\n🚀 💎 PREMIUM PICKS AVAILABLE\n👉 Join @Premium_Bet_Bot for full access"
        
        try:
            bot.send_message(chat_id=CHAT_ID, text=msg, parse_mode='HTML')
            time.sleep(2) # Avoid flooding
        except Exception as e:
            print(f"Failed to send message: {e}")

if __name__ == "__main__":
    print("Executing manual post...")
    post_bets()
