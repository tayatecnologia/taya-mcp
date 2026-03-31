export type ProposalProduct = 'FGTS' | 'CREDIT_CARD' | 'CAR_EQUITY' | 'CREDIT_CLT';

export interface ProposalSummary {
  code: number;
  proposalId: string;
  cpf: string;
  customerName: string;
  createdAt: string;
  tableName: string;
  status: string;
  userCreatorId: string;
  organizationId: string;
  groupId: string;
  userCreatorName: string;
  groupName: string;
  organizationName: string;
  product: ProposalProduct;
  totalTransfer: number;
  subtotalTransfer: number;
}

export interface ProposalMetrics {
  all: { count: number; paidAmount: number };
  fgts: { count: number; paidAmount: number };
  creditCard: { count: number; paidAmount: number };
  carEquity: { count: number; paidAmount: number };
  creditClt: { count: number; paidAmount: number };
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
}

export interface SearchProposalsResponse {
  data: ProposalSummary[];
  metrics: ProposalMetrics;
  pagination: PaginationMeta;
}

export interface ProposalFilters {
  query?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ApiError {
  error: string;
}
