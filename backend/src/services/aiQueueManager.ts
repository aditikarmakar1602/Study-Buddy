export class AIQueueManager {
  private activeCount = 0;
  private maxConcurrent = 2; // Strict concurrency to prevent bursts
  private queue: (() => void)[] = [];

  public async acquire(): Promise<() => void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return this.release.bind(this);
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.activeCount++;
        resolve(this.release.bind(this));
      });
    });
  }

  private release() {
    this.activeCount--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  public async executeWithRetry<T>(task: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    const delays = [5000, 10000, 20000];
    let attempt = 0;

    while (true) {
      const release = await this.acquire();
      try {
        return await task();
      } catch (error: any) {
        const isRateLimit = error.status === 429 || error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('quota') || error.message?.includes('429');
        if (isRateLimit && attempt < maxRetries) {
          const delay = delays[attempt];
          console.warn(`[DEBUG Backend] Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          attempt++;
        } else {
          throw error;
        }
      } finally {
        release();
      }
    }
  }

  public async *streamWithRetry<T>(task: () => Promise<AsyncIterable<T>>): AsyncIterable<T> {
    const maxRetries = 3;
    const delays = [5000, 10000, 20000];
    let attempt = 0;

    while (true) {
      const release = await this.acquire();
      let chunksYielded = 0;
      try {
        const stream = await task();
        for await (const chunk of stream) {
          chunksYielded++;
          yield chunk;
        }
        release();
        return;
      } catch (error: any) {
        release();
        const isRateLimit = error.status === 429 || error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('quota') || error.message?.includes('429');
        
        if (isRateLimit && attempt < maxRetries && chunksYielded === 0) {
          const delay = delays[attempt];
          console.warn(`[DEBUG Backend] Rate limit hit for stream. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          attempt++;
        } else {
          throw error;
        }
      }
    }
  }
}

export const aiQueueManager = new AIQueueManager();