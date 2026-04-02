import type { ApiError, ProposalFilters, SearchProposalsResponse } from './types.js';

export class LotusApiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options?.headers,
      },
    });

    if (response.status === 404) {
      throw new Error(`Not found (404): ${endpoint}`);
    }

    if (!response.ok) {
      throw new Error(`Lotus API returned ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async searchProposals(
    filters: ProposalFilters,
  ): Promise<SearchProposalsResponse | ApiError> {
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }

      return await this.request<SearchProposalsResponse>(
        `/v1/mcp/proposals?${params.toString()}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  }

  async getProposalDetails(id: string): Promise<unknown | ApiError> {
    try {
      return await this.request<unknown>(`/v1/mcp/proposals/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  }
}
