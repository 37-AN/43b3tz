def normalize_team(name):
    if not name:
        return name
    mapping = {
        "Man Utd": "Manchester United",
        "Man City": "Manchester City",
        "Spurs": "Tottenham Hotspur",
        "Nott'm Forest": "Nottingham Forest",
        "Newcastle Utd": "Newcastle United",
        "Sheff Utd": "Sheffield United",
        "West Ham Utd": "West Ham United",
        "Brighton & Hove Albion": "Brighton"
    }
    return mapping.get(name.strip(), name.strip())

def clean_match(match):
    return {
        "home": normalize_team(match.get("home", "")),
        "away": normalize_team(match.get("away", ""))
    }
