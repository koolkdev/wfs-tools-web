// AsyncQueue class to manage async operations to the wfslib module
class WfsAsyncQueue {
  private queue: (() => Promise<any>)[] = [];
  private isProcessing = false;

  // Add a new task to the queue
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

      // Update queue status indicator if available
      this.updateQueueStatus();
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

  // Update the queue status indicator in the UI
  private updateQueueStatus(): void {
    const statusElement = document.getElementById('queueStatus');
    if (!statusElement) return;

    if (this.isProcessing && this.queueLength > 0) {
      statusElement.textContent = `${this.queueLength} operation(s) queued`;
      statusElement.style.display = 'block';
    } else {
      statusElement.style.display = 'none';
    }
  }
}

// Create a global instance
export const wfsQueue = new WfsAsyncQueue();

// Add a status indicator to the DOM
function addQueueStatusIndicator(): void {
  if (!document.getElementById('queueStatus')) {
    const statusElement = document.createElement('div');
    statusElement.id = 'queueStatus';
    statusElement.className = 'queue-status';
    statusElement.style.display = 'none';
    statusElement.style.position = 'fixed';
    statusElement.style.bottom = '10px';
    statusElement.style.right = '10px';
    statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    statusElement.style.color = 'white';
    statusElement.style.padding = '5px 10px';
    statusElement.style.borderRadius = '4px';
    statusElement.style.fontSize = '14px';
    statusElement.style.zIndex = '1000';
    document.body.appendChild(statusElement);
  }
}

// Call this during initialization
document.addEventListener('DOMContentLoaded', addQueueStatusIndicator);
