import {
  EMPTY_BOOTSTRAP,
  EMPTY_QUEUE,
  type AppSettings,
  type BatchPromptRequest,
  type BatchSubmitResult,
  type BootstrapSnapshot,
  type BudgetSnapshot,
  type EditQueuedTaskRequest,
  type EngineStatusSnapshot,
  type HistorySearchResult,
  type MoveQueuedTaskRequest,
  type PromptMessageView,
  type PromptTaskSnapshot,
  type QueueSnapshot,
  type SubmitPromptRequest,
  type SupervisorSnapshot,
  type TaskChunkEvent,
  type TaskProgressEvent,
} from "@/lib/types";

type DesktopCommandMap = {
  bootstrapState: { request: { sessionId?: string } | undefined; response: BootstrapSnapshot };
  submitPrompt: { request: { request: SubmitPromptRequest }; response: PromptTaskSnapshot };
  submitBatchPrompts: { request: { request: BatchPromptRequest }; response: BatchSubmitResult };
  editQueuedTask: { request: { request: EditQueuedTaskRequest }; response: PromptTaskSnapshot };
  retryTask: { request: { taskId: string }; response: PromptTaskSnapshot };
  duplicateTask: { request: { taskId: string }; response: PromptTaskSnapshot };
  moveQueuedTask: { request: { request: MoveQueuedTaskRequest }; response: QueueSnapshot };
  cancelTask: { request: { taskId: string }; response: PromptTaskSnapshot };
  pauseQueue: { request: undefined; response: QueueSnapshot };
  resumeQueue: { request: undefined; response: QueueSnapshot };
  queueSnapshot: { request: undefined; response: QueueSnapshot };
  searchHistory: {
    request: { query: string; limit?: number };
    response: HistorySearchResult;
  };
  exportSession: {
    request: { sessionId: string; outputPath?: string };
    response: string;
  };
  updateSettings: {
    request: {
      theme?: string;
      defaultEngine?: string;
      autostartEnabled: boolean;
      sessionBudgetUsd?: number;
      weeklyBudgetUsd?: number;
      claudeExecutable?: string;
      geminiExecutable?: string;
      codexEndpoint?: string;
      codexModel?: string;
      codexApiKey?: string;
    };
    response: AppSettings;
  };
  engineStatuses: { request: undefined; response: EngineStatusSnapshot[] };
  chooseWorkspaceDirectory: { request: undefined; response: string | null };
  chooseContextFiles: { request: undefined; response: string[] };
};

type DesktopEventMap = {
  "queue:snapshot": QueueSnapshot;
  "task:progress": TaskProgressEvent;
  "task:chunk": TaskChunkEvent;
  "task:supervision": SupervisorSnapshot;
  "budget:updated": BudgetSnapshot;
  "settings:updated": AppSettings;
  "history:updated": PromptMessageView;
};

const hasDesktopBridge = () =>
  typeof window !== "undefined" && typeof window.krema?.invoke === "function";

function mockBootstrap(sessionId?: string): BootstrapSnapshot {
  return {
    ...EMPTY_BOOTSTRAP,
    sessionId: sessionId ?? "browser-preview",
    engineStatuses: [],
    queue: {
      ...EMPTY_QUEUE,
      tasks: [],
    },
  };
}

async function invoke<K extends keyof DesktopCommandMap>(
  command: K,
  args?: DesktopCommandMap[K]["request"],
): Promise<DesktopCommandMap[K]["response"]> {
  if (!hasDesktopBridge()) {
    if (command === "bootstrapState") {
      return mockBootstrap(args && "sessionId" in args ? args.sessionId : undefined) as DesktopCommandMap[K]["response"];
    }
    if (command === "engineStatuses") {
      return [] as DesktopCommandMap[K]["response"];
    }

    throw new Error(`Krema bridge unavailable for command: ${String(command)}`);
  }

  return window.krema!.invoke<DesktopCommandMap[K]["response"]>(
    String(command),
    args as Record<string, unknown> | undefined,
  );
}

function on<K extends keyof DesktopEventMap>(
  event: K,
  handler: (payload: DesktopEventMap[K]) => void,
) {
  if (!hasDesktopBridge()) {
    return () => undefined;
  }

  return window.krema!.on<DesktopEventMap[K]>(event, handler);
}

export const desktopApi = {
  bootstrapState: (sessionId?: string) =>
    invoke("bootstrapState", sessionId ? { sessionId } : undefined),
  submitPrompt: (request: SubmitPromptRequest) =>
    invoke("submitPrompt", { request }),
  submitBatchPrompts: (request: BatchPromptRequest) =>
    invoke("submitBatchPrompts", { request }),
  editQueuedTask: (request: EditQueuedTaskRequest) =>
    invoke("editQueuedTask", { request }),
  retryTask: (taskId: string) => invoke("retryTask", { taskId }),
  duplicateTask: (taskId: string) => invoke("duplicateTask", { taskId }),
  moveQueuedTask: (request: MoveQueuedTaskRequest) =>
    invoke("moveQueuedTask", { request }),
  cancelTask: (taskId: string) => invoke("cancelTask", { taskId }),
  pauseQueue: () => invoke("pauseQueue"),
  resumeQueue: () => invoke("resumeQueue"),
  queueSnapshot: () => invoke("queueSnapshot"),
  searchHistory: (query: string, limit = 20) =>
    invoke("searchHistory", { query, limit }),
  exportSession: (sessionId: string, outputPath?: string) =>
    invoke("exportSession", { sessionId, outputPath }),
  updateSettings: (payload: DesktopCommandMap["updateSettings"]["request"]) =>
    invoke("updateSettings", payload),
  engineStatuses: () => invoke("engineStatuses"),
  chooseWorkspaceDirectory: () => invoke("chooseWorkspaceDirectory"),
  chooseContextFiles: () => invoke("chooseContextFiles"),
  hasBridge: () => hasDesktopBridge(),
};

export const desktopEvents = {
  onQueueSnapshot: (handler: (payload: QueueSnapshot) => void) =>
    on("queue:snapshot", handler),
  onTaskProgress: (handler: (payload: TaskProgressEvent) => void) =>
    on("task:progress", handler),
  onTaskChunk: (handler: (payload: TaskChunkEvent) => void) =>
    on("task:chunk", handler),
  onTaskSupervision: (handler: (payload: SupervisorSnapshot) => void) =>
    on("task:supervision", handler),
  onBudgetUpdated: (handler: (payload: BudgetSnapshot) => void) =>
    on("budget:updated", handler),
  onSettingsUpdated: (handler: (payload: AppSettings) => void) =>
    on("settings:updated", handler),
  onHistoryUpdated: (handler: (payload: PromptMessageView) => void) =>
    on("history:updated", handler),
};
