export type EngineKind = "OPENCODE";
export type TaskStatus =
  | "QUEUED"
  | "PROCESSING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export interface AppSettings {
  theme: "system" | "light" | "dark" | string;
  defaultEngine: EngineKind | string;
  autostartEnabled: boolean;
  sessionBudgetUsd: number;
  weeklyBudgetUsd: number;
  codexEndpoint: string;
  codexModel: string;
  codexApiKey: string;
  skillsEnabled: boolean;
  disabledSkillIds: string[];
  manualSkillIds: string[];
}

export interface SkillDefinitionView {
  id: string;
  name: string;
  description: string;
  path: string;
  enabled: boolean;
}

export interface SkillMatchSnapshot {
  autoMatchedSkillIds: string[];
  manualSkillIds: string[];
  appliedSkillIds: string[];
  injected: boolean;
}

export interface SkillSettingsUpdateRequest {
  skillsEnabled?: boolean;
  disabledSkillIds?: string[];
  manualSkillIds?: string[];
}

export interface McpServerSpec {
  transport: "stdio" | "http" | "sse" | string;
  command?: string;
  args: string[];
  url: string;
  env: Record<string, string>;
  timeoutMs: number | null;
}

export interface McpServerEntry {
  id: string;
  name: string;
  spec: McpServerSpec;
  enabled: boolean;
  targetApps: string[];
  description: string;
  tags: string[];
  updatedAt: number;
}

export interface McpRegistrySnapshot {
  servers: McpServerEntry[];
  updatedAt: number;
  registryPath: string;
  opencodeConfigPath: string;
}

export interface McpUpsertRequest {
  id?: string;
  name: string;
  spec: McpServerSpec;
  enabled?: boolean;
  targetApps?: string[];
  description?: string;
  tags?: string[];
}

export interface EngineStatusSnapshot {
  engine: EngineKind | string;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  detail: string;
}

export interface BatchPromptRequest {
  sessionId: string | null;
  prompts: string[];
  engine: string;
  priority: number | null;
  insertMode: boolean;
  workspacePath: string | null;
  contextFiles: string[];
}

export interface BatchSubmitResult {
  sessionId: string;
  queue: QueueSnapshot;
}

export interface BudgetSnapshot {
  sessionId: string;
  currentSessionUsd: number;
  weeklyUsd: number;
  sessionBudgetUsd: number;
  weeklyBudgetUsd: number;
  sessionUsageRatio: number;
  weeklyUsageRatio: number;
  level: "GREEN" | "YELLOW" | "RED" | string;
}

export interface ConversationSessionView {
  id: string;
  title: string;
  activeEngine: string;
  createdAt: number;
  updatedAt: number;
}

export interface EditQueuedTaskRequest {
  taskId: string;
  prompt: string;
  priority: number | null;
  insertMode: boolean;
  workspacePath: string | null;
  contextFiles: string[];
}

export interface MoveQueuedTaskRequest {
  taskId: string;
  direction: "UP" | "DOWN";
}

export interface HistoryHit {
  sessionId: string;
  messageId: string;
  role: string;
  snippet: string;
  createdAt: number;
}

export interface HistorySearchResult {
  query: string;
  hits: HistoryHit[];
}

export interface PromptMessageView {
  id: string;
  sessionId: string;
  taskId: string | null;
  role: "user" | "assistant" | string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: number;
}

export interface PromptTaskSnapshot {
  id: string;
  sessionId: string;
  prompt: string;
  workspacePath: string | null;
  contextFiles: string[];
  status: TaskStatus | string;
  engine: string;
  priority: number;
  insertMode: boolean;
  dualMode: boolean;
  queuePosition: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  stage: string;
  progress: number;
  errorMessage: string | null;
  skillMatch: SkillMatchSnapshot;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  costUsd: number;
}

export interface QueueSnapshot {
  paused: boolean;
  activeTaskId: string | null;
  queuedCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  tasks: PromptTaskSnapshot[];
}

export interface SubmitPromptRequest {
  sessionId: string | null;
  prompt: string;
  engine: string;
  priority: number | null;
  insertMode: boolean;
  dualMode: boolean;
  workspacePath: string | null;
  contextFiles: string[];
}

export interface SupervisorSnapshot {
  taskId: string;
  primaryStatus: string;
  reviewerStatus: string;
  primaryProgress: number;
  reviewerProgress: number;
  primaryRecommendation: string;
  reviewerRecommendation: string;
  degraded: boolean;
  peerImpact: string;
  updatedAt: number;
}

export interface TaskChunkEvent {
  taskId: string;
  sessionId: string;
  role: string;
  chunk: string;
  terminal: boolean;
  createdAt: number;
}

export interface TaskProgressEvent {
  taskId: string;
  sessionId: string;
  status: string;
  stage: string;
  progress: number;
  summary: string;
  peerImpact: string;
  recommendedAction: string;
  updatedAt: number;
}

export interface BootstrapSnapshot {
  sessionId: string;
  queue: QueueSnapshot;
  tasks: PromptTaskSnapshot[];
  messages: PromptMessageView[];
  sessions: ConversationSessionView[];
  supervisors: SupervisorSnapshot[];
  budget: BudgetSnapshot;
  settings: AppSettings;
  engineStatuses: EngineStatusSnapshot[];
}

export const EMPTY_SETTINGS: AppSettings = {
  theme: "system",
  defaultEngine: "OPENCODE",
  autostartEnabled: false,
  sessionBudgetUsd: 12.5,
  weeklyBudgetUsd: 60,
  codexEndpoint: "https://api.openai.com/v1/responses",
  codexModel: "gpt-5-codex",
  codexApiKey: "",
  skillsEnabled: true,
  disabledSkillIds: [],
  manualSkillIds: [],
};

export const EMPTY_BUDGET: BudgetSnapshot = {
  sessionId: "",
  currentSessionUsd: 0,
  weeklyUsd: 0,
  sessionBudgetUsd: 12.5,
  weeklyBudgetUsd: 60,
  sessionUsageRatio: 0,
  weeklyUsageRatio: 0,
  level: "GREEN",
};

export const EMPTY_QUEUE: QueueSnapshot = {
  paused: false,
  activeTaskId: null,
  queuedCount: 0,
  processingCount: 0,
  completedCount: 0,
  failedCount: 0,
  tasks: [],
};

export const EMPTY_BOOTSTRAP: BootstrapSnapshot = {
  sessionId: "",
  queue: EMPTY_QUEUE,
  tasks: [],
  messages: [],
  sessions: [],
  supervisors: [],
  budget: EMPTY_BUDGET,
  settings: EMPTY_SETTINGS,
  engineStatuses: [],
};
