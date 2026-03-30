export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
}

export type JobStatus =
  | 'completed'
  | 'failed'
  | 'active'
  | 'delayed'
  | 'prioritized'
  | 'waiting'
  | 'waiting-children'
  | 'unknown';

export interface JobDetails {
  id: string;
  queueName: string;
  status: JobStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  failedReason?: string;
  attemptsMade: number;
  createdAt: Date;
  finishedAt?: Date;
}
