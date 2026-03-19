import os
import sys
# Add app root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.features import get_match_features
from services.predictor import predict
from services.value_engine import evaluate_market
from services.kelly import kelly
from db.db import get_conn

def get_match_odds(match_id):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    SELECT home_odds, draw_odds, away_odds
    FROM odds
    WHERE match_id = %s
    ORDER BY created_at DESC
    LIMIT 1
    """, (match_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return None

    return {
        "home": row[0],
        "draw": row[1],
        "away": row[2],
    }

def save_prediction(match_id, ai, edges, kh, kd, ka):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO predictions (
        match_id,
        home_prob, draw_prob, away_prob,
        confidence,
        edge_home, edge_draw, edge_away,
        created_at
    )
    VALUES (
        %s,
        %s, %s, %s,
        %s,
        %s, %s, %s,
        NOW()
    )
    """, (
        match_id,
        ai["home_win"], ai["draw"], ai["away_win"],
        ai["confidence"],
        edges["home_edge"], edges["draw_edge"], edges["away_edge"]
    ))

    conn.commit()
    cur.close()
    conn.close()

def process_match(match_id):
    features = get_match_features(match_id)
    if not features:
        return

    ai = predict(features)

    odds = get_match_odds(match_id)
    if not odds:
        return

    edges = evaluate_market(ai, odds)

    # Kelly stakes
    kelly_home = kelly(odds["home"], ai["home_win"])
    kelly_draw = kelly(odds["draw"], ai["draw"])
    kelly_away = kelly(odds["away"], ai["away_win"])

    save_prediction(match_id, ai, edges, kelly_home, kelly_draw, kelly_away)

def run_all_matches():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    SELECT id FROM matches
    WHERE match_date > NOW() OR match_date IS NULL
    """)

    matches = cur.fetchall()

    for m in matches:
        print(f"Processing Match: {m[0]}")
        process_match(m[0])

    cur.close()
    conn.close()

if __name__ == "__main__":
    run_all_matches()
