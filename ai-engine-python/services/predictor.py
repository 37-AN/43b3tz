import random

# Replace this with actual MiroFish model call
def predict(features):
    # Placeholder logic (replace with MiroFish model)
    home = random.uniform(0.4, 0.6)
    draw = random.uniform(0.2, 0.3)
    away = 1 - home - draw

    # normalize
    total = home + draw + away
    home /= total
    draw /= total
    away /= total

    confidence = max(home, draw, away)

    return {
        "home_win": home,
        "draw": draw,
        "away_win": away,
        "confidence": confidence,
        "model": "mirofish_v1"
    }
