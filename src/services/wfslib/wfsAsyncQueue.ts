export class WfsAsyncQueue {
  private queue: (() => Promise<any>)[] = [];
  private isProcessing = false;

  public async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Wrap the task to capture its result
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      // Start processing the queue if not already
      void this.processQueue();
    });
  }

  // Process tasks in the queue one at a time
  private async processQueue(): Promise<void> {
    // If already processing, do nothing
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Process all tasks in the queue
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          await task();
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Get current queue length
  public get queueLength(): number {
    return this.queue.length;
  }

  // Check if the queue is currently processing
  public get isRunning(): boolean {
    return this.isProcessing;
  }
}
