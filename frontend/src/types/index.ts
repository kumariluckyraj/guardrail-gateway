export interface User {
  id: string;
  org_id: string;
  company_name: string;
  email: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  key_prefix: string;
  status: "active" | "revoked";
  created_at: string;
  last_used_at: string | null;
}

export interface AgentWithKey extends Agent {
  api_key: string;
}

export interface AuditItem {
  id: string;
  agent_name: string;
  tool_name: string;
  decision: string;
  reason: string;
  latency_ms?: number;
  created_at: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  upstream_url: string;
  http_method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  risk_level: "low" | "medium" | "high";
  timeout_seconds: number;
  created_at: string;
}

export interface ApprovalRule {
  mode: "never" | "always" | "conditional";
  field: string | null;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | null;
  value: number | string | null;
}

export interface Policy {
  id: string;
  agent_id: string;
  tool_id: string;
  tool_name: string;
  allowed: boolean;
  rate_limit: { max_calls: number; window_seconds: number };
  approval: ApprovalRule;
}

export interface Approval {
  id: string;
  agent_id: string;
  agent_name: string;
  tool_name: string;
  risk_level: string;
  arguments: Record<string, unknown>;
  reason: string;
  status: string;
  created_at: string;
  expires_at: string;
  decided_by: string | null;
  rejection_reason: string | null;
  result: unknown;
}

export interface AuditFull extends AuditItem {
  agent_id: string;
  deny_cause?: string;
  approval_id?: string;
  decided_by?: string;
  arguments?: Record<string, unknown>;
}

export interface RunStep {
  t: string;
  type: "thought" | "tool_request" | "tool_result" | "waiting_approval" | "final" | "error";
  tool?: string;
  arguments?: Record<string, unknown>;
  decision?: string;
  http_status?: number;
  detail?: string;
  approval_id?: string;
  text?: string;
}

export interface Run {
  id: string;
  task: string;
  status: "queued" | "running" | "completed" | "failed";
  steps: RunStep[];
  tool_calls: number;
  final_answer: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface RunSummary {
  id: string;
  task: string;
  status: string;
  created_at: string;
  finished_at: string | null;
}

export interface Suggestion {
  id: string;
  agent_name: string;
  tool_name: string;
  action: "relax" | "tighten";
  reason: string;
  current_approval: ApprovalRule;
  proposed_approval: ApprovalRule;
  evidence: { approved: number; rejected: number; expired: number; avg_seconds_to_decide: number | null };
  status: string;
  created_at: string;
}