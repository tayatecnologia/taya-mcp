import { Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import type { JobDetails, JobStatus, QueueMetrics } from './types.js';

export class BullMQService {
  private readonly redis: InstanceType<typeof Redis>;
  private readonly queues: Map<string, Queue>;

  constructor(redisUrl: string, queueNames: string[]) {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

    this.queues = new Map(
      queueNames.map((name) => [
        name,
        new Queue(name, { connection: this.redis }),
      ]),
    );
  }

  async getQueuesMetrics(): Promise<QueueMetrics[]> {
    const results: QueueMetrics[] = [];

    for (const [name, queue] of this.queues) {
      try {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'failed',
          'delayed',
        );
        results.push({
          name,
          waiting: counts['waiting'] ?? 0,
          active: counts['active'] ?? 0,
          failed: counts['failed'] ?? 0,
          delayed: counts['delayed'] ?? 0,
        });
      } catch {
        results.push({ name, waiting: 0, active: 0, failed: 0, delayed: 0 });
      }
    }

    return results;
  }

  async findJobById(
    queueName: string,
    jobId: string,
  ): Promise<JobDetails | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    try {
      const job = await Job.fromId(queue, jobId);
      if (!job) return null;

      const status = await job.getState();
      return this.mapJobToDetails(job, queueName, status);
    } catch {
      return null;
    }
  }

  async getRecentFailedJobs(
    queueName: string,
    limit: number = 10,
  ): Promise<JobDetails[]> {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    try {
      const jobs = await queue.getFailed(0, limit - 1);
      return jobs.map((job) =>
        this.mapJobToDetails(job as Job, queueName, 'failed'),
      );
    } catch {
      return [];
    }
  }

  async disconnect(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    this.redis.disconnect();
  }

  private mapJobToDetails(
    job: Job,
    queueName: string,
    status: JobStatus | string,
  ): JobDetails {
    const validStatuses = new Set<JobStatus>([
      'completed',
      'failed',
      'active',
      'delayed',
      'prioritized',
      'waiting',
      'waiting-children',
      'unknown',
    ]);

    const resolvedStatus: JobStatus = validStatuses.has(status as JobStatus)
      ? (status as JobStatus)
      : 'unknown';

    return {
      id: job.id ?? '',
      queueName,
      status: resolvedStatus,
      payload: job.data,
      failedReason: job.failedReason || undefined,
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }
}
