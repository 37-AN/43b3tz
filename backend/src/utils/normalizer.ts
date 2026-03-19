export const TEAM_MAPPING: Record<string, string> = {
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
};

/**
 * Normalizes a team name to ensure consistency across the database.
 * @param teamName The raw team name
 * @returns The normalized team name
 */
export function normalizeTeamName(teamName: string): string {
  if (!teamName) return "";
  const cleanName = teamName.trim();
  return TEAM_MAPPING[cleanName] || cleanName;
}
