import requests
from bs4 import BeautifulSoup
from db import get_conn
from clean import clean_match

URL = "https://fbref.com/en/matches"

def scrape_matches():
    print("Scraping matches from FBref...")
    res = requests.get(URL)
    soup = BeautifulSoup(res.text, "lxml")

    matches = []
    rows = soup.select("table tbody tr")

    for row in rows:
        try:
            home_elem = row.select_one(".home_team")
            away_elem = row.select_one(".away_team")
            if not home_elem or not away_elem:
                continue
                
            home = home_elem.text.strip()
            away = away_elem.text.strip()

            raw_match = {
                "home": home,
                "away": away
            }
            matches.append(clean_match(raw_match))
        except Exception as e:
            continue

    print(f"Scraped {len(matches)} matches.")
    return matches

def get_or_create_team(cur, team_name):
    cur.execute("SELECT id FROM teams WHERE name = %s", (team_name,))
    row = cur.fetchone()
    if row:
        return row[0]
    
    cur.execute(
        "INSERT INTO teams (name, league, country) VALUES (%s, %s, %s) RETURNING id",
        (team_name, 'Premier League', 'England')
    )
    return cur.fetchone()[0]

def save_matches(matches):
    if not matches:
        print("No matches to save.")
        return

    conn = get_conn()
    cur = conn.cursor()

    saved_count = 0
    for m in matches:
        try:
            home_id = get_or_create_team(cur, m["home"])
            away_id = get_or_create_team(cur, m["away"])

            # Using a simplified insert. In production, we'd check for duplicates (ON CONFLICT).
            cur.execute("""
                INSERT INTO matches (home_team_id, away_team_id, status)
                VALUES (%s, %s, 'scheduled')
                ON CONFLICT (id) DO NOTHING
            """, (home_id, away_id))
            saved_count += 1
        except Exception as e:
            print(f"Error saving match {m}: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print(f"Saved {saved_count} matches to DB.")

if __name__ == "__main__":
    data = scrape_matches()
    save_matches(data)
