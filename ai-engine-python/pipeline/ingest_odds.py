import requests
from bs4 import BeautifulSoup
from db import get_conn
from clean import normalize_team

def scrape_odds():
    print("Scraping odds from OddsPortal...")
    url = "https://www.oddsportal.com/soccer/"
    headers = {"User-Agent": "Mozilla/5.0"}

    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, "lxml")

    matches = soup.select(".eventRow")
    data = []

    for m in matches:
        try:
            match_elem = m.select_one(".eventRow__match")
            if not match_elem:
                continue
                
            teams = match_elem.text
            odds = m.select(".oddsCell__odd")
            if len(odds) < 3:
                continue

            home, away = teams.split(" - ")

            data.append({
                "home": normalize_team(home),
                "away": normalize_team(away),
                "home_odds": float(odds[0].text),
                "draw_odds": float(odds[1].text),
                "away_odds": float(odds[2].text),
            })
        except Exception as e:
            continue

    print(f"Scraped {len(data)} odds entries.")
    return data

def save_odds(odds_data):
    if not odds_data:
        print("No odds to save.")
        return

    conn = get_conn()
    cur = conn.cursor()

    saved_count = 0
    for o in odds_data:
        try:
            # Resolve match_id by finding the match with these teams
            cur.execute("""
                SELECT m.id 
                FROM matches m
                JOIN teams th ON m.home_team_id = th.id
                JOIN teams ta ON m.away_team_id = ta.id
                WHERE th.name = %s AND ta.name = %s
                ORDER BY m.match_date DESC LIMIT 1
            """, (o["home"], o["away"]))
            
            row = cur.fetchone()
            if not row:
                print(f"Match not found in DB for odds: {o['home']} vs {o['away']}")
                continue
                
            match_id = row[0]

            # 1. Insert into Odds Table (current snapshot)
            cur.execute("""
                INSERT INTO odds (match_id, bookmaker, home_odds, draw_odds, away_odds)
                VALUES (%s, 'OddsPortal', %s, %s, %s)
            """, (match_id, o["home_odds"], o["draw_odds"], o["away_odds"]))

            # 2. Insert into Odds History Table
            cur.execute("""
                INSERT INTO odds_history (match_id, home_odds, draw_odds, away_odds)
                VALUES (%s, %s, %s, %s)
            """, (match_id, o["home_odds"], o["draw_odds"], o["away_odds"]))

            saved_count += 1
        except Exception as e:
            print(f"Error saving odds {o}: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print(f"Saved {saved_count} odds records to DB.")

if __name__ == "__main__":
    data = scrape_odds()
    save_odds(data)
