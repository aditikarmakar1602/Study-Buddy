import { createClient } from 'redis';

let isRedisConnected = false;
let redisClient: any = null;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.warn('[DEBUG Backend] Redis server not running. Caching is DISABLED but the app will continue to work normally.');
          return new Error('Redis connection max retries exceeded');
        }
        return Math.min(retries * 500, 2000);
      }
    }
  });

  redisClient.on('error', (err: any) => {
    // Suppress the spammy ECONNREFUSED logs while retrying
    if (err?.code !== 'ECONNREFUSED') {
      console.error('[DEBUG Backend] Redis Client Error:', err);
    }
    isRedisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('[DEBUG Backend] Redis connected successfully. Caching is ENABLED.');
    isRedisConnected = true;
  });

  // Initialize connection
  redisClient.connect().catch(() => {
    // Silent catch here because the reconnectStrategy handles the final warning
    isRedisConnected = false;
  });
} else {
  console.log('[DEBUG Backend] No REDIS_URL provided. Caching is currently DISABLED.');
}

export const getCachedData = async (key: string) => {
  if (!isRedisConnected || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[DEBUG Backend] Redis Get Error for key ${key}:`, err);
    return null;
  }
};

export const setCachedData = async (key: string, value: any, ttlInSeconds: number = 3600) => {
  if (!isRedisConnected || !redisClient) return;
  try {
    await redisClient.setEx(key, ttlInSeconds, JSON.stringify(value));
  } catch (err) {
    console.error(`[DEBUG Backend] Redis Set Error for key ${key}:`, err);
  }
};