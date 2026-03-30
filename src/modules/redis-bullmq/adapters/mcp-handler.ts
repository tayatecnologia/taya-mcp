import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BullMQService } from '../core/bullmq-service.js';

// --- Response helpers ---

function toText(data: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function toError(err: unknown): { isError: true; content: [{ type: 'text'; text: string }] } {
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: 'text', text: message }] };
}

// --- Tool registrations ---

function registerGetQueuesMetrics(server: McpServer, service: BullMQService): void {
  server.registerTool(
    'get_queues_metrics',
    { description: 'Returns waiting, active, failed and delayed job counts for every known queue.' },
    async () => {
      try {
        return toText(await service.getQueuesMetrics());
      } catch (err) {
        return toError(err);
      }
    },
  );
}

function registerFindJobById(server: McpServer, service: BullMQService): void {
  server.registerTool(
    'find_job_by_id',
    {
      description: 'Finds a single job by its ID inside a specific queue and returns its full details.',
      inputSchema: { queueName: z.string(), jobId: z.string() },
    },
    async ({ queueName, jobId }) => {
      try {
        return toText(await service.findJobById(queueName, jobId));
      } catch (err) {
        return toError(err);
      }
    },
  );
}

function registerGetRecentFailedJobs(server: McpServer, service: BullMQService): void {
  server.registerTool(
    'get_recent_failed_jobs',
    {
      description: 'Returns the most recent failed jobs from a specific queue.',
      inputSchema: {
        queueName: z.string(),
        limit: z.number().int().positive().default(10),
      },
    },
    async ({ queueName, limit }) => {
      try {
        return toText(await service.getRecentFailedJobs(queueName, limit));
      } catch (err) {
        return toError(err);
      }
    },
  );
}

// --- Entry point ---

export function registerBullMQTools(server: McpServer, service: BullMQService): void {
  registerGetQueuesMetrics(server, service);
  registerFindJobById(server, service);
  registerGetRecentFailedJobs(server, service);
}
