import { pool } from "../db";

export async function getTopBets(limit = 10) {
  const res = await pool.query(`
    SELECT m.id as match_id, th.name as home_team, ta.name as away_team,
           p.home_prob, p.draw_prob, p.away_prob,
           p.edge_home, p.edge_draw, p.edge_away,
           p.confidence
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    JOIN teams th ON m.home_team_id = th.id
    JOIN teams ta ON m.away_team_id = ta.id
    WHERE p.edge_home > 0.05
       OR p.edge_draw > 0.05
       OR p.edge_away > 0.05
    ORDER BY p.confidence DESC
    LIMIT $1
  `, [limit]);

  return res.rows;
}
