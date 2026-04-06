# taya-mcp

## Overview

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server built with Node.js/TypeScript that exposes a set of tools for AI agents.

The goal is to allow agents such as **Claude Code** or Taya's **Investigator Sub-Agent** to inspect internal systems and diagnose proposal issues directly during a conversation, without requiring manual access to any tooling.

### Architecture

The project follows **Clean Architecture**. Each integration lives in its own module under `src/modules/`, with a clear separation between two layers:

| Layer | Location | Responsibility |
|---|---|---|
| **Core** | `src/modules/<module>/core/` | Business logic: connection, queries, and data mapping |
| **Adapter** | `src/modules/<module>/adapters/` | MCP transport: translates protocol calls to the Core and formats responses |

This way, business logic has no knowledge of MCP, and the adapter has no knowledge of the data source — each layer has a single responsibility.

---

## Prerequisites

- **Node.js** `>= 18` (with top-level `await` and ES Modules support)
- **Redis** running and accessible (local or remote) — required for BullMQ tools
- **Lotus API** accessible — required for proposal tools
- **Claude Code** installed (`npm install -g @anthropic-ai/claude-code`)

---

## Local Setup

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build
```

The compiled artifact will be at `dist/index.js`.

---

## Connecting to Claude Code

> **Important:** do not manually edit JSON config files (such as `claude_desktop_config.json`). Manual editing is error-prone and may prevent the server from starting due to syntax or environment variable issues. Always use the Claude Code native CLI.

### Environment Variables

| Variable | Module | Required | Description |
|---|---|---|---|
| `REDIS_URL` | BullMQ | Yes (if using BullMQ) | Redis connection URL |
| `KNOWN_QUEUES` | BullMQ | Yes (if using BullMQ) | Comma-separated list of monitored queues |
| `LOTUS_API_BASE_URL` | Lotus API | Yes (if using Lotus API) | Lotus API base URL |
| `LOTUS_API_KEY` | Lotus API | Yes (if using Lotus API) | Lotus API authentication key |

> Each module is enabled automatically when its environment variables are present. You can use only BullMQ, only the Lotus API, or both simultaneously.

### Adding the Server

```bash
claude mcp add taya-mcp \
  -e "REDIS_URL=your_redis_url_here" \
  -e "KNOWN_QUEUES=queue1,queue2" \
  -e "LOTUS_API_BASE_URL=https://api.lotus.example.com" \
  -e "LOTUS_API_KEY=your_key_here" \
  -- node /absolute/path/to/taya-mcp/dist/index.js
```

**Practical example** — monitoring the FGTS cancellation queue with Lotus API access:

```bash
claude mcp add taya-mcp \
  -e "REDIS_URL=redis://localhost:6379" \
  -e "KNOWN_QUEUES=fgts_bmp_cancellation" \
  -e "LOTUS_API_BASE_URL=https://api.lotus.example.com" \
  -e "LOTUS_API_KEY=your_key_here" \
  -- node /home/carlos/projects/taya-mcp/dist/index.js
```

To monitor multiple queues, separate names with a comma:

```bash
  -e "KNOWN_QUEUES=fgts_bmp_cancellation,another_queue,one_more_queue"
```

### Updating Environment Variables

Claude Code does not support editing an already-registered MCP server. To update, remove and re-add it:

```bash
claude mcp remove taya-mcp

claude mcp add taya-mcp \
  -e "REDIS_URL=new_url_here" \
  -e "KNOWN_QUEUES=updated_queue" \
  -- node /absolute/path/to/taya-mcp/dist/index.js
```

### Checking if Active

```bash
claude mcp list
```

---

## Available Tools

### Lotus API

Tools for querying proposals via the Lotus API. Enabled when `LOTUS_API_BASE_URL` and `LOTUS_API_KEY` are set.

#### `search_proposals`

Searches proposals across all products (FGTS, CREDIT_CLT, CREDIT_CARD, CAR_EQUITY). Returns a paginated list with aggregated metrics.

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | — | Filter by CPF, customer name, or proposal code |
| `status` | `string` | — | Filter by proposal status |
| `startDate` | `string` | — | Start of date range (ISO 8601) |
| `endDate` | `string` | — | End of date range (ISO 8601) |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `15` | Maximum number of results (max 100) |

**Example response:**
```json
{
  "data": [
    {
      "code": 1001,
      "proposalId": "abc-123",
      "cpf": "123.456.789-00",
      "customerName": "John Doe",
      "createdAt": "2026-03-30T10:00:00.000Z",
      "status": "APPROVED",
      "product": "FGTS",
      "totalTransfer": 5000.00,
      "subtotalTransfer": 4800.00
    }
  ],
  "metrics": {
    "all": { "count": 42, "paidAmount": 210000.00 },
    "fgts": { "count": 30, "paidAmount": 150000.00 },
    "creditCard": { "count": 5, "paidAmount": 25000.00 },
    "carEquity": { "count": 4, "paidAmount": 20000.00 },
    "creditClt": { "count": 3, "paidAmount": 15000.00 }
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 42,
    "hasNext": true,
    "hasPrev": false,
    "limit": 15
  }
}
```

#### `get_proposal_details`

Returns the full details of a single proposal.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `proposalId` | `string` | Proposal ID (obtained from `search_proposals`) |

**Example response:**
```json
{
  "proposalId": "abc-123",
  "cpf": "123.456.789-00",
  "customerName": "John Doe",
  "status": "APPROVED",
  "product": "FGTS",
  "totalTransfer": 5000.00
}
```

#### `get_provider_proposal_details`

Fetches the details of a proposal directly from the provider (e.g. BMP). At least one identifier must be provided: the customer's CPF or the proposal code at the provider. When CPF is provided, returns the most recent proposal linked to it.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `provider` | `'BMP'` | Yes | Provider to query |
| `cpf` | `string` | No* | Customer CPF (digits only) |
| `providerId` | `string` | No* | Proposal code at the provider |

*At least one of `cpf` or `providerId` must be provided.

**Example response:**
```json
{
  "proposalId": "bmp-456",
  "cpf": "12345678900",
  "status": "ACTIVE",
  "product": "FGTS",
  "totalTransfer": 3000.00
}
```

---

### BullMQ / Redis

Read-only tools for inspecting BullMQ queues.

#### `get_queues_metrics`

Returns a job count summary for all queues registered in `KNOWN_QUEUES`.

**Parameters:** none

**Example response:**
```json
[
  {
    "name": "fgts_bmp_cancellation",
    "waiting": 4,
    "active": 1,
    "failed": 12,
    "delayed": 0
  }
]
```

#### `find_job_by_id`

Finds a specific job by its ID within a queue and returns all its details.

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `queueName` | `string` | Name of the queue where the job is |
| `jobId` | `string` | ID of the job to look up |

**Example response:**
```json
{
  "id": "1234",
  "queueName": "fgts_bmp_cancellation",
  "status": "failed",
  "payload": { "proposalId": "abc-789" },
  "failedReason": "Timeout connecting to BMP",
  "attemptsMade": 3,
  "createdAt": "2026-03-30T10:00:00.000Z",
  "finishedAt": "2026-03-30T10:00:05.000Z"
}
```

#### `get_recent_failed_jobs`

Returns the most recently failed jobs in a specific queue.

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `queueName` | `string` | — | Queue name |
| `limit` | `number` | `10` | Maximum number of jobs to return |

**Example response:**
```json
[
  {
    "id": "1234",
    "queueName": "fgts_bmp_cancellation",
    "status": "failed",
    "failedReason": "Timeout connecting to BMP",
    "attemptsMade": 3,
    "createdAt": "2026-03-30T10:00:00.000Z"
  }
]
```
