import time
import os
from bot import post_bets

# Default to 6 hours if not specified
SCHEDULE_SECONDS = int(os.getenv("BOT_SCHEDULE_SECONDS", 21600))

if __name__ == "__main__":
    print(f"Telegram Bot scheduler started. Posting every {SCHEDULE_SECONDS/3600} hours.")
    while True:
        try:
            post_bets()
        except Exception as e:
            print(f"Scheduler error: {e}")
            
        print(f"Sleeping for {SCHEDULE_SECONDS} seconds...")
        time.sleep(SCHEDULE_SECONDS)
