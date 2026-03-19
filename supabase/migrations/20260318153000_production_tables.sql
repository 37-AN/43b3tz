-- Migration: Production Hardening, Subscriptions, Tipsters & odds tracking

-- 1. Alters to Odds History for Sharp Move Detection
ALTER TABLE odds_history 
ADD COLUMN IF NOT EXISTS movement_home FLOAT,
ADD COLUMN IF NOT EXISTS movement_draw FLOAT,
ADD COLUMN IF NOT EXISTS movement_away FLOAT,
ADD COLUMN IF NOT EXISTS is_sharp_move BOOLEAN DEFAULT FALSE;

-- Function to calculate odds movement
CREATE OR REPLACE FUNCTION calculate_odds_movement()
RETURNS TRIGGER AS $$
DECLARE
    opening_home FLOAT;
    opening_draw FLOAT;
    opening_away FLOAT;
BEGIN
    -- Get the earliest odds for this match to act as opening odds
    SELECT home_odds, draw_odds, away_odds 
    INTO opening_home, opening_draw, opening_away
    FROM odds_history
    WHERE match_id = NEW.match_id
    ORDER BY timestamp ASC
    LIMIT 1;

    -- If there's an opening odds record (which is not this exact new record)
    IF opening_home IS NOT NULL AND opening_home > 0 THEN
        NEW.movement_home := (NEW.home_odds - opening_home) / opening_home;
        NEW.movement_draw := (NEW.draw_odds - opening_draw) / opening_draw;
        NEW.movement_away := (NEW.away_odds - opening_away) / opening_away;

        -- Flag sharp move if movement > 10%
        IF ABS(NEW.movement_home) > 0.10 OR ABS(NEW.movement_draw) > 0.10 OR ABS(NEW.movement_away) > 0.10 THEN
            NEW.is_sharp_move := TRUE;
        END IF;
    ELSE
        -- First record is the opening odds, movement is 0
        NEW.movement_home := 0;
        NEW.movement_draw := 0;
        NEW.movement_away := 0;
        NEW.is_sharp_move := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate movement before insert
DROP TRIGGER IF EXISTS trigger_calculate_odds_movement ON odds_history;
CREATE TRIGGER trigger_calculate_odds_movement
BEFORE INSERT ON odds_history
FOR EACH ROW
EXECUTE FUNCTION calculate_odds_movement();

-- 2. Alter Predictions Table
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'mirofish_v1',
ADD COLUMN IF NOT EXISTS risk_level TEXT;

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- normally references auth.users
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 4. Tipsters Table
CREATE TABLE IF NOT EXISTS tipsters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    roi FLOAT DEFAULT 0.0,
    win_rate FLOAT DEFAULT 0.0
);

-- 5. Match Results for ROI / Tracking
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS actual_result TEXT; -- 'HOME', 'DRAW', 'AWAY'

CREATE TABLE IF NOT EXISTS prediction_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES predictions(id),
    match_id UUID REFERENCES matches(id),
    was_correct BOOLEAN,
    profit_loss FLOAT,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Fantasy Engine Upgrades
CREATE TABLE IF NOT EXISTS fantasy_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    week_number INT NOT NULL,
    total_points INT DEFAULT 0,
    rank INT
);

-- Add dynamic pricing column to players
ALTER TABLE fantasy_players
ADD COLUMN IF NOT EXISTS ownership_percent FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS price_change_this_week FLOAT DEFAULT 0.0;
