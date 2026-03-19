import time
import logging
from ingest_matches import scrape_matches, save_matches
from ingest_odds import scrape_odds, save_odds

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("scheduler")

def run_pipeline():
    logger.info("--- Starting Pipeline Run ---")
    
    try:
        # 1. Scrape and Save Matches
        matches = scrape_matches()
        save_matches(matches)
        
        # 2. Scrape and Save Odds
        odds = scrape_odds()
        save_odds(odds)
        
        logger.info(f"Pipeline run completed successfully. Fetched {len(odds)} odds.")
    except Exception as e:
        logger.error(f"Pipeline run failed: {e}")

if __name__ == "__main__":
    logger.info("Scheduler started. Running every 2 hours.")
    while True:
        run_pipeline()
        
        # Sleep for 2 hours (7200 seconds)
        logger.info("Sleeping for 2 hours...")
        time.sleep(7200)
