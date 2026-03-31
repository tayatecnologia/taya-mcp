import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { LotusApiService } from '../core/lotus-api-service.js';

// --- Response helpers ---

function toText(data: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function toError(
  err: unknown,
): { isError: true; content: [{ type: 'text'; text: string }] } {
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: 'text', text: message }] };
}

// --- Tool registrations ---

function registerSearchProposals(
  server: McpServer,
  apiService: LotusApiService,
): void {
  server.registerTool(
    'search_proposals',
    {
      description:
        'Searches proposals across all products (FGTS, CREDIT_CLT, CREDIT_CARD, CAR_EQUITY) ' +
        'via the Lotus API. Returns a paginated list with aggregated metrics. ' +
        'Use "query" to filter by CPF, customer name, or proposal code.',
      inputSchema: {
        query: z.string().optional(),
        status: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(15),
      },
    },
    async (filters) => {
      try {
        return toText(await apiService.searchProposals(filters));
      } catch (err) {
        return toError(err);
      }
    },
  );
}

function registerGetProposalDetails(
  server: McpServer,
  apiService: LotusApiService,
): void {
  server.registerTool(
    'get_proposal_details',
    {
      description:
        'Returns full details of a single proposal. ' +
        'Use the "proposalId" from the search_proposals results.',
      inputSchema: {
        proposalId: z.string(),
      },
    },
    async ({ proposalId }) => {
      try {
        return toText(await apiService.getProposalDetails(proposalId));
      } catch (err) {
        return toError(err);
      }
    },
  );
}

// --- Entry point ---

export function registerLotusApiTools(
  server: McpServer,
  apiService: LotusApiService,
): void {
  registerSearchProposals(server, apiService);
  registerGetProposalDetails(server, apiService);
}
