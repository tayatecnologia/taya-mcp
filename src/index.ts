import "./preload.js";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BullMQService } from './modules/redis-bullmq/core/bullmq-service.js';
import { registerBullMQTools } from './modules/redis-bullmq/adapters/mcp-handler.js';
import { LotusApiService } from './modules/lotus-api/core/lotus-api-service.js';
import { registerLotusApiTools } from './modules/lotus-api/adapters/mcp-handler.js';

// --- Config ---

const config = {
  redisUrl: process.env['REDIS_URL'],
  knownQueues: (process.env['KNOWN_QUEUES'] ?? '')
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean),
  lotusApiBaseUrl: process.env['LOTUS_API_BASE_URL'] ?? '',
  lotusApiKey: process.env['LOTUS_API_KEY'] ?? '',
};

// --- Bootstrap ---

const server = new McpServer({ name: 'taya-mcp-server', version: '1.0.0' });

let bullmqService: BullMQService | undefined;
if (config.redisUrl && config.knownQueues.length > 0) {
  bullmqService = new BullMQService(config.redisUrl, config.knownQueues);
  registerBullMQTools(server, bullmqService);
}

let lotusApiService: LotusApiService | undefined;
if (config.lotusApiBaseUrl && config.lotusApiKey) {
  lotusApiService = new LotusApiService(config.lotusApiBaseUrl, config.lotusApiKey);
  registerLotusApiTools(server, lotusApiService);
}

// --- Lifecycle ---

async function shutdown() {
  await bullmqService?.disconnect();
  await server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);
