"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCachedData = exports.getCachedData = void 0;
const redis_1 = require("redis");
let isRedisConnected = false;
let redisClient = null;
if (process.env.REDIS_URL) {
    redisClient = (0, redis_1.createClient)({
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
    redisClient.on('error', (err) => {
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
}
else {
    console.log('[DEBUG Backend] No REDIS_URL provided. Caching is currently DISABLED.');
}
const getCachedData = async (key) => {
    if (!isRedisConnected || !redisClient)
        return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (err) {
        console.error(`[DEBUG Backend] Redis Get Error for key ${key}:`, err);
        return null;
    }
};
exports.getCachedData = getCachedData;
const setCachedData = async (key, value, ttlInSeconds = 3600) => {
    if (!isRedisConnected || !redisClient)
        return;
    try {
        await redisClient.setEx(key, ttlInSeconds, JSON.stringify(value));
    }
    catch (err) {
        console.error(`[DEBUG Backend] Redis Set Error for key ${key}:`, err);
    }
};
exports.setCachedData = setCachedData;
