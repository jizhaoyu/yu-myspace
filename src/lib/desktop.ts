import {
  EMPTY_BOOTSTRAP,
  EMPTY_QUEUE,
  EMPTY_SETTINGS,
  type AppSettings,
  type BatchPromptRequest,
  type BatchSubmitResult,
  type BootstrapSnapshot,
  type BudgetSnapshot,
  type EditQueuedTaskRequest,
  type EngineStatusSnapshot,
  type HistorySearchResult,
  type McpRegistrySnapshot,
  type McpUpsertRequest,
  type MoveQueuedTaskRequest,
  type PromptMessageView,
  type PromptTaskSnapshot,
  type QueueSnapshot,
  type SkillDefinitionView,
  type SkillMatchSnapshot,
  type SkillSettingsUpdateRequest,
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
      request: {
        theme?: string;
        defaultEngine?: string;
        autostartEnabled: boolean;
        sessionBudgetUsd?: number;
        weeklyBudgetUsd?: number;
        codexEndpoint?: string;
        codexModel?: string;
        codexApiKey?: string;
        skillsEnabled?: boolean;
        disabledSkillIds?: string[];
        manualSkillIds?: string[];
      };
    };
    response: AppSettings;
  };
  updateSkillSettings: {
    request: { request: SkillSettingsUpdateRequest };
    response: AppSettings;
  };
  listMcpServers: { request: undefined; response: McpRegistrySnapshot };
  upsertMcpServer: { request: { request: McpUpsertRequest }; response: McpRegistrySnapshot };
  deleteMcpServer: { request: { id: string }; response: McpRegistrySnapshot };
  setMcpServerEnabled: { request: { id: string; enabled: boolean }; response: McpRegistrySnapshot };
  syncMcpToOpenCode: { request: undefined; response: McpRegistrySnapshot };
  importMcpFromOpenCode: { request: undefined; response: McpRegistrySnapshot };
  listSkills: { request: undefined; response: SkillDefinitionView[] };
  refreshSkills: { request: undefined; response: SkillDefinitionView[] };
  previewSkillMatch: { request: { prompt: string }; response: SkillMatchSnapshot };
  engineStatuses: { request: undefined; response: EngineStatusSnapshot[] };
  chooseWorkspaceDirectory: { request: undefined; response: string | null };
  chooseContextFiles: { request: undefined; response: string[] };
  copyToClipboard: { request: { text: string }; response: string };
  readClipboardText: { request: undefined; response: string };
  openPath: { request: { path: string }; response: string };
  openLogsDirectory: { request: undefined; response: string };
  notifyUser: { request: { title: string; body: string }; response: string };
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

type Unsubscribe = () => void;

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
    if (command === "listSkills" || command === "refreshSkills") {
      return [] as DesktopCommandMap[K]["response"];
    }
    if (command === "copyToClipboard" || command === "notifyUser") {
      return "ok" as DesktopCommandMap[K]["response"];
    }
    if (command === "readClipboardText") {
      return "" as DesktopCommandMap[K]["response"];
    }
    if (command === "openPath" || command === "openLogsDirectory") {
      return "" as DesktopCommandMap[K]["response"];
    }
    if (command === "previewSkillMatch") {
      return {
        autoMatchedSkillIds: [],
        manualSkillIds: [],
        appliedSkillIds: [],
        injected: false,
      } as DesktopCommandMap[K]["response"];
    }
    if (command === "updateSkillSettings") {
      return EMPTY_SETTINGS as DesktopCommandMap[K]["response"];
    }
    if (command === "listMcpServers"
      || command === "upsertMcpServer"
      || command === "deleteMcpServer"
      || command === "setMcpServerEnabled"
      || command === "syncMcpToOpenCode"
      || command === "importMcpFromOpenCode") {
      return {
        servers: [],
        updatedAt: 0,
        registryPath: "",
        opencodeConfigPath: "",
      } as DesktopCommandMap[K]["response"];
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
): Unsubscribe {
  if (!hasDesktopBridge()) {
    return () => undefined;
  }

  const dispose = window.krema!.on<DesktopEventMap[K]>(event, handler);
  return typeof dispose === "function" ? dispose : () => undefined;
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
  updateSettings: (payload: DesktopCommandMap["updateSettings"]["request"]["request"]) =>
    invoke("updateSettings", { request: payload }),
  updateSkillSettings: (request: SkillSettingsUpdateRequest) =>
    invoke("updateSkillSettings", { request }),
  listMcpServers: () => invoke("listMcpServers"),
  upsertMcpServer: (request: McpUpsertRequest) => invoke("upsertMcpServer", { request }),
  deleteMcpServer: (id: string) => invoke("deleteMcpServer", { id }),
  setMcpServerEnabled: (id: string, enabled: boolean) => invoke("setMcpServerEnabled", { id, enabled }),
  syncMcpToOpenCode: () => invoke("syncMcpToOpenCode"),
  importMcpFromOpenCode: () => invoke("importMcpFromOpenCode"),
  listSkills: () => invoke("listSkills"),
  refreshSkills: () => invoke("refreshSkills"),
  previewSkillMatch: (prompt: string) => invoke("previewSkillMatch", { prompt }),
  engineStatuses: () => invoke("engineStatuses"),
  chooseWorkspaceDirectory: () => invoke("chooseWorkspaceDirectory"),
  chooseContextFiles: () => invoke("chooseContextFiles"),
  copyToClipboard: (text: string) => invoke("copyToClipboard", { text }),
  readClipboardText: () => invoke("readClipboardText"),
  openPath: (path: string) => invoke("openPath", { path }),
  openLogsDirectory: () => invoke("openLogsDirectory"),
  notifyUser: (title: string, body: string) => invoke("notifyUser", { title, body }),
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
