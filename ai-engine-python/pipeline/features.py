from db.db import get_conn

def get_match_features(match_id):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    SELECT 
        ht.goals_scored, ht.goals_conceded,
        at.goals_scored, at.goals_conceded
    FROM matches m
    JOIN team_stats ht ON m.home_team_id = ht.team_id
    JOIN team_stats at ON m.away_team_id = at.team_id
    WHERE m.id = %s
    """, (match_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return None

    return {
        "home_attack": row[0],
        "home_defense": row[1],
        "away_attack": row[2],
        "away_defense": row[3],
    }
