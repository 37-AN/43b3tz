// 43V3R BET AI - Scraper Service Data Validation
// Validates scraped data before database insertion

// ==================== VALIDATION RESULT TYPES ====================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MatchValidationResult extends ValidationResult {
  data?: {
    homeTeam: string;
    awayTeam: string;
    league: string;
    country: string;
    kickoffTime: Date;
  };
}

export interface OddsValidationResult extends ValidationResult {
  data?: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25?: number;
    under25?: number;
    bttsYes?: number;
    bttsNo?: number;
  };
}

// ==================== VALIDATION HELPERS ====================

function isValidOddsValue(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  if (isNaN(value)) return false;
  if (value < 1.01) return false; // Minimum valid odds
  if (value > 1000) return false; // Maximum reasonable odds
  return true;
}

function isValidTeamName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  if (name.trim().length < 2) return false;
  if (name.trim().length > 100) return false;
  // Check for invalid characters
  if (/[<>{}[\]\\\/]/.test(name)) return false;
  return true;
}

function isValidLeagueName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  if (name.trim().length < 2) return false;
  if (name.trim().length > 100) return false;
  return true;
}

function isValidCountryName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  if (name.trim().length < 2) return false;
  if (name.trim().length > 50) return false;
  return true;
}

function isValidDate(date: unknown): boolean {
  if (date instanceof Date) return !isNaN(date.getTime());
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  if (typeof date === 'number') {
    // Unix timestamp
    return date > 0 && date < 9999999999999; // Reasonable range
  }
  return false;
}

function parseDate(date: unknown): Date | null {
  if (date instanceof Date && !isNaN(date.getTime())) return date;
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (typeof date === 'number') {
    // Could be seconds or milliseconds
    const ms = date > 9999999999 ? date : date * 1000;
    const parsed = new Date(ms);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

// ==================== MATCH VALIDATION ====================

export interface RawMatchData {
  homeTeam?: unknown;
  awayTeam?: unknown;
  league?: unknown;
  country?: unknown;
  kickoffTime?: unknown;
  homeScore?: unknown;
  awayScore?: unknown;
  status?: unknown;
  minute?: unknown;
}

export function validateMatchData(raw: RawMatchData): MatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!raw.homeTeam) {
    errors.push('Missing required field: homeTeam');
  } else if (!isValidTeamName(raw.homeTeam)) {
    errors.push(`Invalid home team name: ${raw.homeTeam}`);
  }

  if (!raw.awayTeam) {
    errors.push('Missing required field: awayTeam');
  } else if (!isValidTeamName(raw.awayTeam)) {
    errors.push(`Invalid away team name: ${raw.awayTeam}`);
  }

  // Check if home and away are the same
  if (
    typeof raw.homeTeam === 'string' &&
    typeof raw.awayTeam === 'string' &&
    raw.homeTeam.toLowerCase() === raw.awayTeam.toLowerCase()
  ) {
    errors.push('Home and away teams cannot be the same');
  }

  if (!raw.league) {
    errors.push('Missing required field: league');
  } else if (!isValidLeagueName(raw.league)) {
    errors.push(`Invalid league name: ${raw.league}`);
  }

  if (!raw.country) {
    warnings.push('Missing optional field: country, defaulting to "Unknown"');
  } else if (!isValidCountryName(raw.country)) {
    warnings.push(`Invalid country name: ${raw.country}, defaulting to "Unknown"`);
  }

  if (!raw.kickoffTime) {
    errors.push('Missing required field: kickoffTime');
  } else if (!isValidDate(raw.kickoffTime)) {
    errors.push(`Invalid kickoff time: ${raw.kickoffTime}`);
  } else {
    const kickoffDate = parseDate(raw.kickoffTime);
    if (kickoffDate) {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const oneYearAhead = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      if (kickoffDate < oneYearAgo) {
        warnings.push('Kickoff time is more than 1 year in the past');
      }
      if (kickoffDate > oneYearAhead) {
        warnings.push('Kickoff time is more than 1 year in the future');
      }
    }
  }

  // Optional score validation
  if (raw.homeScore !== undefined && raw.homeScore !== null) {
    if (typeof raw.homeScore !== 'number' || raw.homeScore < 0 || raw.homeScore > 50) {
      warnings.push(`Invalid home score: ${raw.homeScore}, will be ignored`);
    }
  }

  if (raw.awayScore !== undefined && raw.awayScore !== null) {
    if (typeof raw.awayScore !== 'number' || raw.awayScore < 0 || raw.awayScore > 50) {
      warnings.push(`Invalid away score: ${raw.awayScore}, will be ignored`);
    }
  }

  // Status validation
  if (raw.status !== undefined) {
    const validStatuses = ['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'suspended'];
    if (typeof raw.status !== 'string' || !validStatuses.includes(raw.status.toLowerCase())) {
      warnings.push(`Invalid status: ${raw.status}, will default to 'scheduled'`);
    }
  }

  // Minute validation
  if (raw.minute !== undefined && raw.minute !== null) {
    if (typeof raw.minute !== 'number' || raw.minute < 0 || raw.minute > 150) {
      warnings.push(`Invalid minute: ${raw.minute}, will be ignored`);
    }
  }

  const valid = errors.length === 0;

  if (valid) {
    const kickoffDate = parseDate(raw.kickoffTime!);
    return {
      valid: true,
      errors: [],
      warnings,
      data: {
        homeTeam: String(raw.homeTeam).trim(),
        awayTeam: String(raw.awayTeam).trim(),
        league: String(raw.league).trim(),
        country: raw.country ? String(raw.country).trim() : 'Unknown',
        kickoffTime: kickoffDate!,
      },
    };
  }

  return { valid: false, errors, warnings };
}

// ==================== ODDS VALIDATION ====================

export interface RawOddsData {
  homeWin?: unknown;
  draw?: unknown;
  awayWin?: unknown;
  over25?: unknown;
  under25?: unknown;
  bttsYes?: unknown;
  bttsNo?: unknown;
  bookmaker?: unknown;
}

export function validateOddsData(raw: RawOddsData): OddsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required 1X2 odds
  if (raw.homeWin === undefined || raw.homeWin === null) {
    errors.push('Missing required field: homeWin');
  } else if (!isValidOddsValue(raw.homeWin)) {
    errors.push(`Invalid home win odds: ${raw.homeWin}`);
  }

  if (raw.draw === undefined || raw.draw === null) {
    errors.push('Missing required field: draw');
  } else if (!isValidOddsValue(raw.draw)) {
    errors.push(`Invalid draw odds: ${raw.draw}`);
  }

  if (raw.awayWin === undefined || raw.awayWin === null) {
    errors.push('Missing required field: awayWin');
  } else if (!isValidOddsValue(raw.awayWin)) {
    errors.push(`Invalid away win odds: ${raw.awayWin}`);
  }

  // Validate implied probability (margin check)
  if (
    isValidOddsValue(raw.homeWin) &&
    isValidOddsValue(raw.draw) &&
    isValidOddsValue(raw.awayWin)
  ) {
    const homeProb = 1 / Number(raw.homeWin);
    const drawProb = 1 / Number(raw.draw);
    const awayProb = 1 / Number(raw.awayWin);
    const totalProb = homeProb + drawProb + awayProb;

    // Total probability should be between 1.0 and 1.2 (reasonable bookmaker margin)
    if (totalProb < 1.0) {
      warnings.push(`Unusually low total probability: ${(totalProb * 100).toFixed(1)}%, possible arb opportunity or data error`);
    }
    if (totalProb > 1.2) {
      warnings.push(`High bookmaker margin detected: ${((totalProb - 1) * 100).toFixed(1)}%`);
    }
  }

  // Optional odds validation
  if (raw.over25 !== undefined && raw.over25 !== null) {
    if (!isValidOddsValue(raw.over25)) {
      warnings.push(`Invalid over 2.5 odds: ${raw.over25}, will be ignored`);
    }
  }

  if (raw.under25 !== undefined && raw.under25 !== null) {
    if (!isValidOddsValue(raw.under25)) {
      warnings.push(`Invalid under 2.5 odds: ${raw.under25}, will be ignored`);
    }
  }

  if (raw.bttsYes !== undefined && raw.bttsYes !== null) {
    if (!isValidOddsValue(raw.bttsYes)) {
      warnings.push(`Invalid BTTS Yes odds: ${raw.bttsYes}, will be ignored`);
    }
  }

  if (raw.bttsNo !== undefined && raw.bttsNo !== null) {
    if (!isValidOddsValue(raw.bttsNo)) {
      warnings.push(`Invalid BTTS No odds: ${raw.bttsNo}, will be ignored`);
    }
  }

  // Bookmaker validation
  if (raw.bookmaker !== undefined) {
    if (typeof raw.bookmaker !== 'string' || raw.bookmaker.trim().length === 0) {
      warnings.push('Invalid bookmaker name, defaulting to "aggregate"');
    }
  }

  const valid = errors.length === 0;

  if (valid) {
    return {
      valid: true,
      errors: [],
      warnings,
      data: {
        homeWin: Number(raw.homeWin),
        draw: Number(raw.draw),
        awayWin: Number(raw.awayWin),
        over25: raw.over25 !== undefined ? Number(raw.over25) : undefined,
        under25: raw.under25 !== undefined ? Number(raw.under25) : undefined,
        bttsYes: raw.bttsYes !== undefined ? Number(raw.bttsYes) : undefined,
        bttsNo: raw.bttsNo !== undefined ? Number(raw.bttsNo) : undefined,
      },
    };
  }

  return { valid: false, errors, warnings };
}

// ==================== LOG VALIDATION RESULTS ====================

export function logValidationResult(
  context: string,
  result: ValidationResult
): void {
  if (!result.valid) {
    console.error(`[VALIDATION ERROR] ${context}:`);
    result.errors.forEach(err => console.error(`  ❌ ${err}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn(`[VALIDATION WARNING] ${context}:`);
    result.warnings.forEach(warn => console.warn(`  ⚠️ ${warn}`));
  }

  if (result.valid && result.warnings.length === 0) {
    console.log(`[VALIDATION OK] ${context}`);
  }
}

// ==================== SANITIZATION ====================

export function sanitizeString(value: unknown, maxLength: number = 100): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .substring(0, maxLength)
    .replace(/[<>{}[\]\\\/]/g, '');
}

export function sanitizeNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || isNaN(value)) {
    const parsed = parseFloat(String(value));
    if (isNaN(parsed)) return null;
    value = parsed;
  }
  if (value < min || value > max) return null;
  return Number(value);
}
