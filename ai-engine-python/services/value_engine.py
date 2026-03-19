def implied_prob(odds):
    return 1 / odds if odds > 0 else 0


def calculate_edge(ai_prob, odds):
    return ai_prob - implied_prob(odds)


def evaluate_market(ai_probs, odds):
    return {
        "home_edge": calculate_edge(ai_probs["home_win"], odds["home"]),
        "draw_edge": calculate_edge(ai_probs["draw"], odds["draw"]),
        "away_edge": calculate_edge(ai_probs["away_win"], odds["away"]),
    }
