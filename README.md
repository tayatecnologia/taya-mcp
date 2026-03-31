# taya-mcp

## Visão Geral

Servidor [Model Context Protocol (MCP)](https://modelcontextprotocol.io) construído em Node.js/TypeScript que expõe um conjunto de ferramentas para agentes de IA.

O objetivo é permitir que agentes como o **Claude Code** ou o **Sub-Agente Investigador da Taya** consigam inspecionar sistemas internos e diagnosticar problemas em propostas diretamente durante uma conversa, sem precisar de acesso manual às ferramentas.

### Arquitetura

O projeto segue **Clean Architecture**. Cada integração vive no seu próprio módulo dentro de `src/modules/`, com separação clara entre duas camadas:

| Camada | Localização | Responsabilidade |
|---|---|---|
| **Core** | `src/modules/<modulo>/core/` | Regra de negócio: conexão, consulta e mapeamento de dados |
| **Adapter** | `src/modules/<modulo>/adapters/` | Transporte MCP: traduz as chamadas do protocolo para o Core e formata as respostas |

Dessa forma, a lógica de negócio não conhece o MCP, e o adapter não conhece a fonte de dados — cada camada tem uma única responsabilidade.

---

## Pré-requisitos

- **Node.js** `>= 18` (com suporte a top-level `await` e ES Modules)
- **Redis** rodando e acessível (local ou remoto) — necessário para as ferramentas BullMQ
- **Lotus API** acessível — necessário para as ferramentas de propostas
- **Claude Code** instalado (`npm install -g @anthropic-ai/claude-code`)

---

## Setup Local

```bash
# Instalar dependências
npm install

# Compilar o TypeScript
npm run build
```

O artefato compilado estará em `dist/index.js`.

---

## Como conectar ao Claude Code

> **Importante:** não edite arquivos de configuração JSON manualmente (como `claude_desktop_config.json`). A edição manual é propensa a erros de sintaxe e de variáveis de ambiente que podem impedir o servidor de iniciar. Use sempre a CLI nativa do Claude Code.

### Variáveis de ambiente

| Variável | Módulo | Obrigatório | Descrição |
|---|---|---|---|
| `REDIS_URL` | BullMQ | Sim (se usar BullMQ) | URL de conexão com o Redis |
| `KNOWN_QUEUES` | BullMQ | Sim (se usar BullMQ) | Filas monitoradas, separadas por vírgula |
| `LOTUS_API_BASE_URL` | Lotus API | Sim (se usar Lotus API) | URL base da Lotus API |
| `LOTUS_API_KEY` | Lotus API | Sim (se usar Lotus API) | Chave de autenticação da Lotus API |

> Cada módulo é habilitado automaticamente quando suas variáveis de ambiente estão presentes. É possível usar apenas o BullMQ, apenas a Lotus API, ou ambos simultaneamente.

### Adicionar o servidor

```bash
claude mcp add taya-mcp \
  -e "REDIS_URL=sua_url_redis_aqui" \
  -e "KNOWN_QUEUES=fila1,fila2" \
  -e "LOTUS_API_BASE_URL=https://api.lotus.example.com" \
  -e "LOTUS_API_KEY=sua_chave_aqui" \
  -- node /caminho/absoluto/para/taya-mcp/dist/index.js
```

**Exemplo prático** — monitorando a fila de cancelamento de FGTS e com acesso à Lotus API:

```bash
claude mcp add taya-mcp \
  -e "REDIS_URL=redis://localhost:6379" \
  -e "KNOWN_QUEUES=fgts_bmp_cancellation" \
  -e "LOTUS_API_BASE_URL=https://api.lotus.example.com" \
  -e "LOTUS_API_KEY=sua_chave_aqui" \
  -- node /home/carlos/projects/taya-mcp/dist/index.js
```

Para monitorar múltiplas filas, separe os nomes por vírgula:

```bash
  -e "KNOWN_QUEUES=fgts_bmp_cancellation,outra_fila,mais_uma_fila"
```

### Atualizar variáveis de ambiente

O Claude Code não permite editar um servidor MCP já registrado. Para atualizar, remova e adicione novamente:

```bash
claude mcp remove taya-mcp

claude mcp add taya-mcp \
  -e "REDIS_URL=nova_url_aqui" \
  -e "KNOWN_QUEUES=fila_atualizada" \
  -- node /caminho/absoluto/para/taya-mcp/dist/index.js
```

### Verificar se está ativo

```bash
claude mcp list
```

---

## Ferramentas Disponíveis (Tools)

### Lotus API

Ferramentas para consulta de propostas via Lotus API. Ativadas quando `LOTUS_API_BASE_URL` e `LOTUS_API_KEY` estão definidos.

#### `search_proposals`

Busca propostas de todos os produtos (FGTS, CREDIT_CLT, CREDIT_CARD, CAR_EQUITY). Retorna lista paginada com métricas agregadas.

**Parâmetros:**

| Nome | Tipo | Padrão | Descrição |
|---|---|---|---|
| `query` | `string` | — | Filtro por CPF, nome do cliente ou código da proposta |
| `status` | `string` | — | Filtro por status da proposta |
| `startDate` | `string` | — | Data de início do intervalo (ISO 8601) |
| `endDate` | `string` | — | Data de fim do intervalo (ISO 8601) |
| `page` | `number` | `1` | Página da listagem |
| `limit` | `number` | `15` | Quantidade máxima de resultados (máx. 100) |

**Exemplo de retorno:**
```json
{
  "data": [
    {
      "code": 1001,
      "proposalId": "abc-123",
      "cpf": "123.456.789-00",
      "customerName": "João Silva",
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

Retorna todos os detalhes de uma proposta específica.

**Parâmetros:**

| Nome | Tipo | Descrição |
|---|---|---|
| `proposalId` | `string` | ID da proposta (obtido via `search_proposals`) |

**Exemplo de retorno:**
```json
{
  "proposalId": "abc-123",
  "cpf": "123.456.789-00",
  "customerName": "João Silva",
  "status": "APPROVED",
  "product": "FGTS",
  "totalTransfer": 5000.00
}
```

---

### BullMQ / Redis

Ferramentas de leitura (read-only) para inspeção de filas BullMQ.

#### `get_queues_metrics`

Retorna um resumo de contagem de jobs para todas as filas registradas em `KNOWN_QUEUES`.

**Parâmetros:** nenhum

**Exemplo de retorno:**
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

Busca um job específico pelo seu ID dentro de uma fila e retorna todos os seus detalhes.

**Parâmetros:**

| Nome | Tipo | Descrição |
|---|---|---|
| `queueName` | `string` | Nome da fila onde o job está |
| `jobId` | `string` | ID do job a ser buscado |

**Exemplo de retorno:**
```json
{
  "id": "1234",
  "queueName": "fgts_bmp_cancellation",
  "status": "failed",
  "payload": { "proposalId": "abc-789" },
  "failedReason": "Timeout ao conectar com BMP",
  "attemptsMade": 3,
  "createdAt": "2026-03-30T10:00:00.000Z",
  "finishedAt": "2026-03-30T10:00:05.000Z"
}
```

#### `get_recent_failed_jobs`

Retorna os jobs que falharam mais recentemente em uma fila específica.

**Parâmetros:**

| Nome | Tipo | Padrão | Descrição |
|---|---|---|---|
| `queueName` | `string` | — | Nome da fila |
| `limit` | `number` | `10` | Quantidade máxima de jobs a retornar |

**Exemplo de retorno:**
```json
[
  {
    "id": "1234",
    "queueName": "fgts_bmp_cancellation",
    "status": "failed",
    "failedReason": "Timeout ao conectar com BMP",
    "attemptsMade": 3,
    "createdAt": "2026-03-30T10:00:00.000Z"
  }
]
```
