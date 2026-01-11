"""
Scheduler for automatic weekly updates of Mercadona product database.
This script runs the scraper and processes the data on a weekly schedule.
"""

import schedule
import time
import logging
import os
import sys
from datetime import datetime
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scheduler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def run_scraper():
    """Execute the Mercadona parallel scraper."""
    try:
        logger.info("Starting Mercadona parallel scraper...")
        from src.scraper_parallel import scrape_mercadona_parallel_csv

        # Run the parallel scraper
        # Parameters: start_page, end_page, num_workers, output_dir
        # Use very few workers in Railway due to memory constraints
        # Railway free tier has limited RAM - 3 workers is safer than 5
        num_workers = int(os.getenv('SCRAPER_WORKERS', '3'))
        logger.info(f"Using {num_workers} parallel workers")

        csv_file, products = scrape_mercadona_parallel_csv(
            start_page=0,
            end_page=1000,
            num_workers=num_workers,
            output_dir="data/processed"
        )

        if csv_file and products:
            logger.info(f"Scraping completed! Collected {len(products)} products.")
            logger.info(f"CSV saved to: {csv_file}")
            return True
        else:
            logger.error("Scraping failed: No products collected")
            return False
    except Exception as e:
        logger.error(f"Error during scraping: {e}", exc_info=True)
        return False


def process_notebooks():
    """
    Verify that the CSV file was created correctly.
    The parallel scraper already generates products_macro.csv directly.
    """
    try:
        csv_path = 'data/processed/products_macro.csv'

        if os.path.exists(csv_path):
            logger.info(f"✅ CSV file verified: {csv_path}")

            # Log some stats
            import pandas as pd
            df = pd.read_csv(csv_path)
            logger.info(f"📊 Total products in CSV: {len(df)}")

            if 'novedad' in df.columns:
                novelties = df['novedad'].sum()
                logger.info(f"🆕 Products marked as novelties: {novelties}")

            return True
        else:
            logger.error(f"CSV file not found: {csv_path}")
            return False

    except Exception as e:
        logger.error(f"Error verifying CSV: {e}", exc_info=True)
        return False


def update_github_pages():
    """Push updated CSV to GitHub to update the web application."""
    try:
        logger.info("Updating GitHub Pages with new data...")

        # Configure git
        subprocess.run(['git', 'config', '--global', 'user.email', 'bot@railway.app'], check=True)
        subprocess.run(['git', 'config', '--global', 'user.name', 'Railway Bot'], check=True)

        # Add the processed CSV file
        subprocess.run(['git', 'add', 'data/processed/products_macro.csv'], check=True)

        # Commit changes
        commit_message = f"chore: Automatic database update - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        subprocess.run(['git', 'commit', '-m', commit_message], check=True)

        # Push to GitHub
        github_token = os.getenv('GITHUB_TOKEN')
        if github_token:
            repo_url = f"https://{github_token}@github.com/computingvictor/Mercadona_Agent.git"
            subprocess.run(['git', 'push', repo_url, 'main'], check=True)
            logger.info("Successfully pushed to GitHub!")
        else:
            logger.warning("GITHUB_TOKEN not found. Skipping GitHub push.")
            return False

        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Git operation failed: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Error updating GitHub: {e}", exc_info=True)
        return False


def weekly_update_job():
    """Main job that runs weekly to update the database."""
    logger.info("=" * 80)
    logger.info("Starting weekly database update job...")
    logger.info("=" * 80)

    start_time = datetime.now()

    # Step 1: Run scraper
    if not run_scraper():
        logger.error("Scraper failed. Aborting update job.")
        return

    # Step 2: Process notebooks
    if not process_notebooks():
        logger.error("Notebook processing failed. Aborting update job.")
        return

    # Step 3: Update GitHub Pages
    if not update_github_pages():
        logger.warning("GitHub update failed, but data is processed locally.")

    end_time = datetime.now()
    duration = end_time - start_time

    logger.info("=" * 80)
    logger.info(f"Weekly update job completed in {duration}")
    logger.info("=" * 80)


def run_immediately_then_schedule():
    """Run the job immediately on startup, then schedule for weekly execution."""
    logger.info("Running initial update on startup...")
    weekly_update_job()

    # Schedule for every Sunday at 2:00 AM
    schedule.every().sunday.at("02:00").do(weekly_update_job)

    logger.info("Scheduler initialized. Next run: Every Sunday at 02:00 AM")
    logger.info("Scheduler is running... Press Ctrl+C to exit")

    # Keep the script running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute


if __name__ == "__main__":
    try:
        # Check if we should run immediately (useful for testing)
        if os.getenv('RUN_IMMEDIATELY', 'false').lower() == 'true':
            run_immediately_then_schedule()
        else:
            # Just schedule without running immediately
            schedule.every().sunday.at("02:00").do(weekly_update_job)
            logger.info("Scheduler initialized. Next run: Every Sunday at 02:00 AM")
            logger.info("Scheduler is running... Press Ctrl+C to exit")

            while True:
                schedule.run_pending()
                time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Scheduler stopped by user.")
    except Exception as e:
        logger.error(f"Fatal error in scheduler: {e}", exc_info=True)
        sys.exit(1)
