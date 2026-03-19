import sys
import os
import pytest

# Add pipeline directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../pipeline')))

from scraper_utils import validate_odds, validate_match_data
from normalizer import normalize_team_name

def test_validate_odds():
    assert validate_odds(1.5) == True
    assert validate_odds(-1.0) == False
    assert validate_odds(0) == False
    assert validate_odds(None) == False

def test_validate_match_data():
    assert validate_match_data("Arsenal", "Chelsea") == True
    assert validate_match_data("Arsenal", "Arsenal") == False # Same team rejected

def test_normalize_team_name():
    assert normalize_team_name("Man Utd") == "Manchester United"
    assert normalize_team_name("Man United") == "Manchester United"
    assert normalize_team_name("Spurs") == "Tottenham Hotspur"
    assert normalize_team_name("Unknown Team") == "Unknown Team" # Unmapped returns original
