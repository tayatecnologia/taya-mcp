import "./preload.js";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BullMQService } from './modules/redis-bullmq/core/bullmq-service.js';
import { registerBullMQTools } from './modules/redis-bullmq/adapters/mcp-handler.js';

// --- Config ---

const config = {
  redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  knownQueues: (process.env['KNOWN_QUEUES'] ?? '')
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean),
};

// --- Bootstrap ---

const server = new McpServer({ name: 'taya-mcp-server', version: '1.0.0' });
const service = new BullMQService(config.redisUrl, config.knownQueues);

registerBullMQTools(server, service);

// --- Lifecycle ---

async function shutdown() {
  await service.disconnect();
  await server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);
