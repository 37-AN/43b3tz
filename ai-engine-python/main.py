import sys
import os
# Add app root to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline.runner import run_all_matches
from db.db import get_conn

def get_top_bets():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    SELECT *
    FROM predictions
    WHERE edge_home > 0.05
       OR edge_draw > 0.05
       OR edge_away > 0.05
    ORDER BY confidence DESC
    LIMIT 10
    """)

    data = cur.fetchall()
    cur.close()
    conn.close()

    return data

if __name__ == "__main__":
    print("Starting AI Engine batch processing...")
    run_all_matches()
    print("AI Engine processing complete.")
    
    top_bets = get_top_bets()
    print(f"Top 10 Value Bets identified: {len(top_bets)}")
