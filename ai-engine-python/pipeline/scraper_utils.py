import time
import requests
from functools import wraps
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def retry_request(max_retries=3, retry_delay=5):
    """Decorator to retry a function (like a request) with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    retries += 1
                    wait_time = retry_delay * (2 ** (retries - 1))
                    logger.warning(f"Error in {func.__name__}: {str(e)}. Retrying {retries}/{max_retries} in {wait_time}s...")
                    if retries == max_retries:
                        logger.error(f"Max retries reached for {func.__name__}. Failing.")
                        raise e
                    time.sleep(wait_time)
        return wrapper
    return decorator

def fetch_with_fallback(primary_url, fallback_url, timeout=10):
    """Fetch data from a primary source, and switch to a fallback source on failure."""
    try:
        response = requests.get(primary_url, timeout=timeout)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        logger.warning(f"Primary source {primary_url} failed: {e}. Switching to fallback {fallback_url}")
        try:
            response = requests.get(fallback_url, timeout=timeout)
            response.raise_for_status()
            return response.text
        except requests.RequestException as fallback_error:
            logger.error(f"Fallback source {fallback_url} also failed: {fallback_error}")
            raise

def validate_odds(odds_value):
    """Ensure odds are valid. Reject if odds <= 0 or null."""
    if odds_value is None:
        return False
    try:
        if float(odds_value) <= 0:
            return False
        return True
    except ValueError:
        return False

def validate_match_data(home_team, away_team, home_odds=None, draw_odds=None, away_odds=None):
    """Validate match data. Reject if teams mismatch or odds are invalid."""
    if not home_team or not away_team:
        return False
        
    if home_team.strip() == away_team.strip():
        logger.warning(f"Validation failed: Home team and away team are the same ({home_team})")
        return False
        
    if home_odds is not None and not validate_odds(home_odds):
        return False
    if draw_odds is not None and not validate_odds(draw_odds):
        return False
    if away_odds is not None and not validate_odds(away_odds):
        return False
        
    return True
