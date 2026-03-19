import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { exec } from 'child_process';
import { logger } from '../utils/logger';
import path from 'path';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Helper to run python script
function runPythonScript(scriptPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Assuming backend is one level deeper than root, and ai-engine-python is at root
    const fullPath = path.join(__dirname, '../../..', scriptPath);
    exec(`python3 ${fullPath}`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Python Script execution error: ${stderr || error.message}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

// Scraper Worker
export const scraperWorker = new Worker('ScraperQueue', async (job: Job) => {
  logger.info(`Processing job ${job.name} (ID: ${job.id})`);
  
  try {
    if (job.name === 'scrape_matches') {
      const output = await runPythonScript('ai-engine-python/pipeline/ingest_matches.py');
      logger.info(`Scrape Matches output: ${output}`);
    } else if (job.name === 'scrape_odds') {
      const output = await runPythonScript('ai-engine-python/pipeline/ingest_odds.py');
      logger.info(`Scrape Odds output: ${output}`);
    }
  } catch (error) {
    logger.error(`Error in scraper worker for job ${job.name}:`, error);
    throw error;
  }
}, { connection: redisConnection as any });

// Prediction Worker
export const predictionWorker = new Worker('PredictionQueue', async (job: Job) => {
  logger.info(`Processing Prediction Job ${job.name}`);
  
  try {
    if (job.name === 'generate_predictions') {
      const output = await runPythonScript('ai-engine-python/pipeline/predict.py');
      logger.info(`Generate Predictions output: ${output}`);
    } else if(job.name === 'recalculate_stats') {
      // Logic for recalculating stats goes here, or calls python target
      logger.info(`Recalculate stats logic executed`);
    }
  } catch (error) {
    logger.error(`Error in prediction worker for job ${job.name}:`, error);
    throw error;
  }
}, { connection: redisConnection as any });

scraperWorker.on('completed', (job) => logger.info(`${job.id} has completed!`));
scraperWorker.on('failed', (job, err) => logger.error(`${job?.id} has failed with ${err.message}`));
predictionWorker.on('completed', (job) => logger.info(`${job.id} has completed!`));
predictionWorker.on('failed', (job, err) => logger.error(`${job?.id} has failed with ${err.message}`));
