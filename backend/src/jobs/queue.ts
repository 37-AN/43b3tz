import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

redisConnection.on('error', (err) => {
  logger.error('Redis connection error in queue:', err);
});

export const ScraperQueue = new Queue('ScraperQueue', {
  connection: redisConnection as any,
});

export const PredictionQueue = new Queue('PredictionQueue', {
  connection: redisConnection as any,
});

export async function setupSchedules() {
  // Scrape Matches every 6 hours
  await ScraperQueue.add('scrape_matches', {}, { 
    repeat: { pattern: '0 */6 * * *' } // Cron format
  });
  
  // Scrape Odds every 2 hours
  await ScraperQueue.add('scrape_odds', {}, { 
    repeat: { pattern: '0 */2 * * *' } 
  });
  
  // Generate Predictions every 6 hours
  await PredictionQueue.add('generate_predictions', {}, { 
    repeat: { pattern: '0 */6 * * *' } 
  });
  
  // Recalculate stats daily at midnight
  await PredictionQueue.add('recalculate_stats', {}, { 
    repeat: { pattern: '0 0 * * *' } 
  });

  logger.info('Scheduled repeatable jobs successfully');
}
