import requests
import os
import json
import time

# Use environment variables
API_URL = os.getenv("API_URL", "http://backend:3000")

def fetch_bets(premium=False):
    endpoint = f"{API_URL}/ai/premium-bets" if premium else f"{API_URL}/ai/top-bets"
    headers = {}
    if premium:
        # In a real scenario, the bot would have a service token
        token = os.getenv("BOT_API_TOKEN")
        headers["Authorization"] = f"Bearer {token}"
        
    try:
        res = requests.get(endpoint, headers=headers)
        res.raise_for_status()
        return res.json()
    except Exception as e:
        print(f"Error fetching bets: {e}")
        return []

def format_prediction_msg(bet):
    msg = f"🔥 AI VALUE BET\n\n"
    msg += f"⚽ {bet['home_team']} vs {bet['away_team']}\n"
    msg += "📊 Prediction: "
    
    # Determine the pick based on edge
    best_edge = max(bet['edge_home'], bet['edge_draw'], bet['edge_away'])
    if best_edge == bet['edge_home']:
        msg += f"{bet['home_team']} WIN"
    elif best_edge == bet['edge_draw']:
        msg += "DRAW"
    else:
        msg += f"{bet['away_team']} WIN"
        
    msg += f"\n📈 Edge: +{round(best_edge * 100)}%\n"
    msg += f"🧠 Confidence: {round(bet['confidence'] * 100)}%\n"
    msg += "\n━━━━━━━━━━━━━━━\n"
    return msg
