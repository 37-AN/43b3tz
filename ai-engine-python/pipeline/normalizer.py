TEAM_MAPPINGS = {
    "Man United": "Manchester United",
    "Man Utd": "Manchester United",
    "Manchester Utd": "Manchester United",
    "Man City": "Manchester City",
    "Spurs": "Tottenham Hotspur",
    "Tottenham": "Tottenham Hotspur",
    "Nott'm Forest": "Nottingham Forest",
    "Newcastle": "Newcastle United",
    "Newcastle Utd": "Newcastle United",
    "Wolves": "Wolverhampton Wanderers",
    "Wolverhampton": "Wolverhampton Wanderers",
    "Sheff Utd": "Sheffield United",
    "Sheffield Utd": "Sheffield United",
    "Brighton & Hove Albion": "Brighton",
    "West Ham Utd": "West Ham United",
    "West Ham": "West Ham United",
    "Leicester": "Leicester City",
    "Leeds": "Leeds United"
}

def normalize_team_name(team_name: str) -> str:
    """
    Normalize a team name using the TEAM_MAPPINGS dictionary.
    Returns the mapped name if found, otherwise returns the original name stripped.
    """
    if not team_name:
        return ""
    
    clean_name = team_name.strip()
    return TEAM_MAPPINGS.get(clean_name, clean_name)
