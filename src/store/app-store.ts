import { create } from "zustand";

import {
  EMPTY_BUDGET,
  EMPTY_QUEUE,
  EMPTY_SETTINGS,
  type AppSettings,
  type BootstrapSnapshot,
  type BudgetSnapshot,
  type ConversationSessionView,
  type EngineStatusSnapshot,
  type HistorySearchResult,
  type PromptMessageView,
  type PromptTaskSnapshot,
  type QueueSnapshot,
  type SupervisorSnapshot,
  type TaskChunkEvent,
  type TaskProgressEvent,
} from "@/lib/types";

type AppState = {
  sessionId: string;
  queue: QueueSnapshot;
  tasks: Record<string, PromptTaskSnapshot>;
  taskOrder: string[];
  messagesBySession: Record<string, PromptMessageView[]>;
  sessions: ConversationSessionView[];
  supervisors: Record<string, SupervisorSnapshot>;
  progressByTask: Record<string, TaskProgressEvent>;
  streamingByTask: Record<string, string>;
  budget: BudgetSnapshot;
  settings: AppSettings;
  engineStatuses: EngineStatusSnapshot[];
  searchResult: HistorySearchResult | null;
  composerDraft: string;
  composerWorkspacePath: string | null;
  composerContextFiles: string[];
  batchMode: boolean;
  insertMode: boolean;
  dualMode: boolean;
  activeTaskId: string | null;
  hydrate: (payload: BootstrapSnapshot) => void;
  setSessionId: (sessionId: string) => void;
  setComposerDraft: (draft: string) => void;
  setComposerWorkspacePath: (workspacePath: string | null) => void;
  setComposerContextFiles: (contextFiles: string[]) => void;
  setBatchMode: (value: boolean) => void;
  setInsertMode: (value: boolean) => void;
  setDualMode: (value: boolean) => void;
  applyQueueSnapshot: (payload: QueueSnapshot) => void;
  applyTaskProgress: (payload: TaskProgressEvent) => void;
  applyTaskChunk: (payload: TaskChunkEvent) => void;
  applySupervisor: (payload: SupervisorSnapshot) => void;
  applyBudget: (payload: BudgetSnapshot) => void;
  applySettings: (payload: AppSettings) => void;
  setEngineStatuses: (payload: EngineStatusSnapshot[]) => void;
  applyHistoryMessage: (payload: PromptMessageView) => void;
  setSearchResult: (payload: HistorySearchResult | null) => void;
};

const indexTasks = (tasks: PromptTaskSnapshot[]) =>
  tasks.reduce<Record<string, PromptTaskSnapshot>>((accumulator, task) => {
    accumulator[task.id] = task;
    return accumulator;
  }, {});

const sortMessages = (messages: PromptMessageView[]) =>
  [...messages].sort((left, right) => left.createdAt - right.createdAt);

export const useAppStore = create<AppState>((set, get) => ({
  sessionId: "",
  queue: EMPTY_QUEUE,
  tasks: {},
  taskOrder: [],
  messagesBySession: {},
  sessions: [],
  supervisors: {},
  progressByTask: {},
  streamingByTask: {},
  budget: EMPTY_BUDGET,
  settings: EMPTY_SETTINGS,
  engineStatuses: [],
  searchResult: null,
  composerDraft: "",
  composerWorkspacePath: null,
  composerContextFiles: [],
  batchMode: false,
  insertMode: false,
  dualMode: false,
  activeTaskId: null,
  hydrate: (payload) =>
    set({
      sessionId: payload.sessionId,
      queue: payload.queue,
      tasks: indexTasks(payload.queue.tasks.length ? payload.queue.tasks : payload.tasks),
      taskOrder: payload.queue.tasks.map((task) => task.id),
      messagesBySession: {
        ...get().messagesBySession,
        [payload.sessionId]: sortMessages(payload.messages),
      },
      sessions: payload.sessions,
      supervisors: payload.supervisors.reduce<Record<string, SupervisorSnapshot>>(
        (accumulator, item) => {
          accumulator[item.taskId] = item;
          return accumulator;
        },
        {},
      ),
      progressByTask: {},
      budget: payload.budget,
      settings: payload.settings,
      engineStatuses: payload.engineStatuses,
      activeTaskId: payload.queue.activeTaskId,
    }),
  setSessionId: (sessionId) => set({ sessionId }),
  setComposerDraft: (composerDraft) => set({ composerDraft }),
  setComposerWorkspacePath: (composerWorkspacePath) => set({ composerWorkspacePath }),
  setComposerContextFiles: (composerContextFiles) => set({ composerContextFiles }),
  setBatchMode: (batchMode) => set({ batchMode }),
  setInsertMode: (insertMode) => set({ insertMode }),
  setDualMode: (dualMode) => set({ dualMode }),
  applyQueueSnapshot: (payload) =>
    set((state) => ({
      queue: payload,
      tasks: {
        ...state.tasks,
        ...indexTasks(payload.tasks),
      },
      taskOrder: payload.tasks.map((task) => task.id),
      activeTaskId: payload.activeTaskId,
    })),
  applyTaskProgress: (payload) =>
    set((state) => {
      const current = state.tasks[payload.taskId];

      return {
        progressByTask: {
          ...state.progressByTask,
          [payload.taskId]: payload,
        },
        tasks: {
          ...state.tasks,
          ...(current
            ? {
                [payload.taskId]: {
                  ...current,
                  status: payload.status,
                  stage: payload.stage,
                  progress: payload.progress,
                  errorMessage:
                    payload.status === "FAILED"
                      ? payload.summary
                      : current.errorMessage,
                },
              }
            : {}),
        },
      };
    }),
  applyTaskChunk: (payload) =>
    set((state) => ({
      streamingByTask: payload.terminal
        ? Object.fromEntries(
            Object.entries(state.streamingByTask).filter(
              ([taskId]) => taskId !== payload.taskId,
            ),
          )
        : {
            ...state.streamingByTask,
            [payload.taskId]:
              (state.streamingByTask[payload.taskId] ?? "") + payload.chunk,
          },
    })),
  applySupervisor: (payload) =>
    set((state) => ({
      supervisors: {
        ...state.supervisors,
        [payload.taskId]: payload,
      },
    })),
  applyBudget: (payload) => set({ budget: payload }),
  applySettings: (payload) => set({ settings: payload }),
  setEngineStatuses: (engineStatuses) => set({ engineStatuses }),
  applyHistoryMessage: (payload) =>
    set((state) => {
      const current = state.messagesBySession[payload.sessionId] ?? [];
      const nextMessages = current.some((message) => message.id === payload.id)
        ? current
        : sortMessages([...current, payload]);

      const nextStreaming = { ...state.streamingByTask };
      if (payload.taskId) {
        delete nextStreaming[payload.taskId];
      }

      return {
        messagesBySession: {
          ...state.messagesBySession,
          [payload.sessionId]: nextMessages,
        },
        streamingByTask: nextStreaming,
      };
    }),
  setSearchResult: (searchResult) => set({ searchResult }),
}));
