CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  league TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league TEXT,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  match_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  home_score INT,
  away_score INT
);

CREATE TABLE odds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  bookmaker TEXT,
  home_odds FLOAT,
  draw_odds FLOAT,
  away_odds FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE odds_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  home_odds FLOAT,
  draw_odds FLOAT,
  away_odds FLOAT
);

CREATE TABLE team_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id),
  matches_played INT,
  goals_scored INT,
  goals_conceded INT,
  form_last_5 JSONB,
  xg FLOAT,
  xga FLOAT
);

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  home_prob FLOAT,
  draw_prob FLOAT,
  away_prob FLOAT,
  confidence FLOAT,
  edge_home FLOAT,
  edge_draw FLOAT,
  edge_away FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE fantasy_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  team_id UUID REFERENCES teams(id),
  position TEXT,
  price FLOAT,
  points INT
);

CREATE TABLE fantasy_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES fantasy_players(id),
  goals INT,
  assists INT,
  clean_sheets INT,
  minutes_played INT,
  rating FLOAT
);

CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_matches INT,
  total_predictions INT,
  avg_edge FLOAT
);
