import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { BudgetHeader } from "@/components/budget-header";
import { HistorySidebar } from "@/components/history-sidebar";
import { MessageStream } from "@/components/message-stream";
import { PromptComposer } from "@/components/prompt-composer";
import { QueuePanel } from "@/components/queue-panel";
import { SupervisorPanel } from "@/components/supervisor-panel";
import { Button, Panel } from "@/components/ui";
import { desktopApi, desktopEvents } from "@/lib/desktop";
import {
  type AppSettings,
  type PromptTaskSnapshot,
  type QueueSnapshot,
} from "@/lib/types";
import { useAppStore } from "@/store/app-store";

type Notice = {
  tone: "info" | "success" | "danger";
  text: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "桌面桥接返回了未知错误。";
}

export default function App() {
  const queryClient = useQueryClient();
  const [requestedSessionId, setRequestedSessionId] = useState<string>();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const deferredHistoryQuery = useDeferredValue(historyQuery.trim());
  const [notice, setNotice] = useState<Notice | null>(null);
  const latestHistoryQuery = useRef("");

  const sessionId = useAppStore((state) => state.sessionId);
  const queue = useAppStore((state) => state.queue);
  const tasks = useAppStore((state) => state.tasks);
  const messagesBySession = useAppStore((state) => state.messagesBySession);
  const sessions = useAppStore((state) => state.sessions);
  const supervisors = useAppStore((state) => state.supervisors);
  const progressByTask = useAppStore((state) => state.progressByTask);
  const streamingByTask = useAppStore((state) => state.streamingByTask);
  const budget = useAppStore((state) => state.budget);
  const settings = useAppStore((state) => state.settings);
  const engineStatuses = useAppStore((state) => state.engineStatuses);
  const searchResult = useAppStore((state) => state.searchResult);
  const composerDraft = useAppStore((state) => state.composerDraft);
  const composerWorkspacePath = useAppStore((state) => state.composerWorkspacePath);
  const composerContextFiles = useAppStore((state) => state.composerContextFiles);
  const batchMode = useAppStore((state) => state.batchMode);
  const insertMode = useAppStore((state) => state.insertMode);
  const dualMode = useAppStore((state) => state.dualMode);
  const activeTaskId = useAppStore((state) => state.activeTaskId);

  const hydrate = useAppStore((state) => state.hydrate);
  const setSessionId = useAppStore((state) => state.setSessionId);
  const setComposerDraft = useAppStore((state) => state.setComposerDraft);
  const setComposerWorkspacePath = useAppStore((state) => state.setComposerWorkspacePath);
  const setComposerContextFiles = useAppStore((state) => state.setComposerContextFiles);
  const setBatchMode = useAppStore((state) => state.setBatchMode);
  const setInsertMode = useAppStore((state) => state.setInsertMode);
  const setDualMode = useAppStore((state) => state.setDualMode);
  const applyQueueSnapshot = useAppStore((state) => state.applyQueueSnapshot);
  const applyTaskProgress = useAppStore((state) => state.applyTaskProgress);
  const applyTaskChunk = useAppStore((state) => state.applyTaskChunk);
  const applySupervisor = useAppStore((state) => state.applySupervisor);
  const applyBudget = useAppStore((state) => state.applyBudget);
  const applySettings = useAppStore((state) => state.applySettings);
  const setEngineStatuses = useAppStore((state) => state.setEngineStatuses);
  const applyHistoryMessage = useAppStore((state) => state.applyHistoryMessage);
  const setSearchResult = useAppStore((state) => state.setSearchResult);

  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap", requestedSessionId ?? "active"],
    queryFn: () => desktopApi.bootstrapState(requestedSessionId),
  });

  const engineStatusQuery = useQuery({
    queryKey: ["engine-statuses"],
    queryFn: () => desktopApi.engineStatuses(),
  });

  useEffect(() => {
    if (!bootstrapQuery.data) {
      return;
    }

    startTransition(() => {
      hydrate(bootstrapQuery.data);
    });
  }, [bootstrapQuery.data, hydrate]);

  useEffect(() => {
    if (engineStatusQuery.data) {
      setEngineStatuses(engineStatusQuery.data);
    }
  }, [engineStatusQuery.data, setEngineStatuses]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const preferredTheme = settings.theme === "light" || settings.theme === "dark"
        ? settings.theme
        : mediaQuery.matches
          ? "dark"
          : "light";

      root.dataset.theme = preferredTheme;
      root.style.colorScheme = preferredTheme;
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [settings.theme]);

  useEffect(() => {
    const unsubscribers = [
      desktopEvents.onQueueSnapshot((payload) => applyQueueSnapshot(payload)),
      desktopEvents.onTaskProgress((payload) => applyTaskProgress(payload)),
      desktopEvents.onTaskChunk((payload) => applyTaskChunk(payload)),
      desktopEvents.onTaskSupervision((payload) => applySupervisor(payload)),
      desktopEvents.onBudgetUpdated((payload) => applyBudget(payload)),
      desktopEvents.onSettingsUpdated((payload) => applySettings(payload)),
      desktopEvents.onHistoryUpdated((payload) => applyHistoryMessage(payload)),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    applyBudget,
    applyHistoryMessage,
    applyQueueSnapshot,
    applySettings,
    applySupervisor,
    applyTaskChunk,
    applyTaskProgress,
  ]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const { mutate: runHistorySearch, isPending: historySearchPending } = useMutation({
    mutationFn: (query: string) => desktopApi.searchHistory(query, 18),
    onSuccess: (payload, query) => {
      if (payload.query === latestHistoryQuery.current && query === latestHistoryQuery.current) {
        setSearchResult(payload);
      }
    },
    onError: (_error, query) => {
      if (query === latestHistoryQuery.current) {
        setSearchResult(null);
      }
    },
  });

  useEffect(() => {
    if (deferredHistoryQuery.length < 2) {
      latestHistoryQuery.current = "";
      setSearchResult(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      latestHistoryQuery.current = deferredHistoryQuery;
      runHistorySearch(deferredHistoryQuery);
    }, 240);

    return () => window.clearTimeout(timeout);
  }, [deferredHistoryQuery, runHistorySearch, setSearchResult]);

  async function refreshQueueSnapshot() {
    const snapshot = await desktopApi.queueSnapshot();
    applyQueueSnapshot(snapshot);
    return snapshot;
  }

  const { mutate: submitPrompt, isPending: submitPromptPending } = useMutation({
    mutationFn: desktopApi.submitPrompt,
    onSuccess: async (task) => {
      setRequestedSessionId(task.sessionId);
      setSessionId(task.sessionId);
      setComposerDraft("");
      setComposerWorkspacePath(null);
      setComposerContextFiles([]);
      setEditingTaskId(null);
      await refreshQueueSnapshot();
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      setNotice({ tone: "success", text: "任务已进入队列，等待桌面事件继续回推状态。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: submitBatch, isPending: submitBatchPending } = useMutation({
    mutationFn: desktopApi.submitBatchPrompts,
    onSuccess: async (result, variables) => {
      applyQueueSnapshot(result.queue);
      setComposerDraft("");
      setComposerWorkspacePath(null);
      setComposerContextFiles([]);
      setRequestedSessionId(result.sessionId);
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      setNotice({
        tone: "success",
        text: `已批量提交 ${variables.prompts.length} 条任务。`,
      });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: editQueuedTask, isPending: editPending } = useMutation({
    mutationFn: desktopApi.editQueuedTask,
    onSuccess: async (task) => {
      resetComposerEditingState();
      setRequestedSessionId(task.sessionId);
      setSessionId(task.sessionId);
      await refreshQueueSnapshot();
      setNotice({ tone: "success", text: "排队任务已更新。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutateAsync: chooseWorkspaceDirectory, isPending: chooseWorkspacePending } = useMutation({
    mutationFn: desktopApi.chooseWorkspaceDirectory,
    onSuccess: (workspacePath) => {
      if (workspacePath) {
        setComposerWorkspacePath(workspacePath);
        setNotice({ tone: "info", text: `已绑定项目目录：${workspacePath}` });
      }
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutateAsync: chooseContextFiles, isPending: chooseContextFilesPending } = useMutation({
    mutationFn: desktopApi.chooseContextFiles,
    onSuccess: (contextFiles) => {
      if (contextFiles.length) {
        setComposerContextFiles(contextFiles);
        setNotice({ tone: "info", text: `已附加 ${contextFiles.length} 个上下文文件。` });
      }
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: cancelTask, isPending: cancelPending } = useMutation({
    mutationFn: desktopApi.cancelTask,
    onSuccess: async (task) => {
      if (editingTaskId === task.id) {
        resetComposerEditingState();
      }
      await refreshQueueSnapshot();
      setNotice({ tone: "success", text: `任务 ${task.id.slice(0, 8)} 已取消。` });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: retryTask, isPending: retryPending } = useMutation({
    mutationFn: desktopApi.retryTask,
    onSuccess: async (task) => {
      setRequestedSessionId(task.sessionId);
      setSessionId(task.sessionId);
      await refreshQueueSnapshot();
      setNotice({ tone: "success", text: `已重试任务 ${task.id.slice(0, 8)}。` });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: duplicateTask, isPending: duplicatePending } = useMutation({
    mutationFn: desktopApi.duplicateTask,
    onSuccess: async (task) => {
      setRequestedSessionId(task.sessionId);
      setSessionId(task.sessionId);
      await refreshQueueSnapshot();
      setNotice({ tone: "success", text: `已复制任务 ${task.id.slice(0, 8)}。` });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: moveQueuedTask, isPending: movePending } = useMutation({
    mutationFn: desktopApi.moveQueuedTask,
    onSuccess: (snapshot) => {
      applyQueueSnapshot(snapshot);
      setNotice({ tone: "info", text: "排队顺序已更新。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: toggleQueue, isPending: queuePending } = useMutation({
    mutationFn: () => (queue.paused ? desktopApi.resumeQueue() : desktopApi.pauseQueue()),
    onSuccess: (snapshot) => {
      applyQueueSnapshot(snapshot);
      setNotice({
        tone: "info",
        text: snapshot.paused ? "队列已暂停。" : "队列已恢复调度。",
      });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: saveSettings, isPending: settingsPending } = useMutation({
    mutationFn: (payload: AppSettings) => desktopApi.updateSettings(payload),
    onSuccess: (nextSettings) => {
      applySettings(nextSettings);
      void queryClient.invalidateQueries({ queryKey: ["engine-statuses"] });
      setNotice({ tone: "success", text: "全局设置已同步到桌面端。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: exportSession, isPending: exportPending } = useMutation({
    mutationFn: (currentSessionId: string) => desktopApi.exportSession(currentSessionId),
    onSuccess: (outputPath) => {
      setNotice({ tone: "success", text: `会话已导出到 ${outputPath}` });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const currentMessages = messagesBySession[sessionId] ?? [];
  const editingTask = editingTaskId ? tasks[editingTaskId] ?? null : null;
  const supervisorList = Object.values(supervisors).filter((item) => tasks[item.taskId]);

  function handleSessionSelect(nextSessionId: string) {
    setRequestedSessionId(nextSessionId);
    setSessionId(nextSessionId);
  }

  function resetComposerEditingState() {
    setEditingTaskId(null);
    setComposerDraft("");
    setComposerWorkspacePath(null);
    setComposerContextFiles([]);
    setBatchMode(false);
    setInsertMode(false);
    setDualMode(false);
  }

  function handleSessionRefresh(currentSessionId: string) {
    setRequestedSessionId(currentSessionId);
    setSessionId(currentSessionId);
    bootstrapQuery.refetch().catch((error: unknown) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    });
  }

  function handleQueueSnapshotRefresh(snapshot?: QueueSnapshot) {
    if (snapshot) {
      applyQueueSnapshot(snapshot);
      return;
    }

    refreshQueueSnapshot().catch((error: unknown) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    });
  }

  function handleEditTask(task: PromptTaskSnapshot) {
    setEditingTaskId(task.id);
    setComposerDraft(task.prompt);
    setComposerWorkspacePath(task.workspacePath);
    setComposerContextFiles(task.contextFiles);
    setBatchMode(false);
    setInsertMode(task.insertMode);
    setDualMode(task.dualMode);
  }

  if (bootstrapQuery.isError && !bootstrapQuery.data) {
    return (
      <div className="app-shell">
        <div className="mx-auto flex max-w-3xl items-center justify-center">
          <Panel className="w-full max-w-2xl" title="桌面状态初始化失败">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                <AlertTriangle className="size-5 shrink-0" />
                <span>{getErrorMessage(bootstrapQuery.error)}</span>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => bootstrapQuery.refetch()} variant="primary">
                  <RefreshCcw className="size-4" />
                  重新加载
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto flex max-w-[1580px] flex-col gap-4"
      >
        <BudgetHeader
          sessionId={sessionId}
          budget={budget}
          queue={queue}
          settings={settings}
          engineStatuses={engineStatuses}
          bootstrapPending={bootstrapQuery.isPending}
          queuePending={queuePending}
          exportPending={exportPending}
          settingsPending={settingsPending}
          engineStatusPending={engineStatusQuery.isPending || engineStatusQuery.isFetching}
          notice={notice}
          onToggleQueue={() => toggleQueue()}
          onExportSession={() => {
            if (sessionId) {
              exportSession(sessionId);
            }
          }}
          onSaveSettings={(payload) => saveSettings(payload)}
          onRefreshEngineStatuses={() => {
            void engineStatusQuery.refetch();
          }}
        />

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
          <HistorySidebar
            sessionId={sessionId}
            sessions={sessions}
            messages={currentMessages}
            searchQuery={historyQuery}
            searchPending={historySearchPending}
            searchResult={searchResult}
            onSearchQueryChange={setHistoryQuery}
            onSelectSession={handleSessionSelect}
            onRefreshSession={handleSessionRefresh}
          />

          <div className="grid gap-4 xl:grid-rows-[minmax(0,1fr)_minmax(0,0.88fr)]">
            <MessageStream
              sessionId={sessionId}
              messages={currentMessages}
              tasks={tasks}
              streamingByTask={streamingByTask}
            />
            <QueuePanel
              queue={queue}
              activeTaskId={activeTaskId}
              progressByTask={progressByTask}
              onEditTask={handleEditTask}
              onRetryTask={retryTask}
              onDuplicateTask={duplicateTask}
              onMoveTask={(taskId, direction) => moveQueuedTask({ taskId, direction })}
              onCancelTask={cancelTask}
              actionPending={cancelPending || retryPending || duplicatePending || movePending}
            />
          </div>

          <div className="grid gap-4 xl:grid-rows-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <PromptComposer
              sessionId={sessionId}
              settings={settings}
              draft={composerDraft}
              workspacePath={composerWorkspacePath}
              contextFiles={composerContextFiles}
              batchMode={batchMode}
              insertMode={insertMode}
              dualMode={dualMode}
              editingTask={editingTask}
              submitPending={
                submitPromptPending || submitBatchPending || editPending
              }
              onDraftChange={setComposerDraft}
              onBatchModeChange={setBatchMode}
              onWorkspacePathChange={setComposerWorkspacePath}
              onContextFilesChange={setComposerContextFiles}
              onInsertModeChange={setInsertMode}
              onDualModeChange={setDualMode}
              onChooseWorkspace={() => chooseWorkspaceDirectory()}
              onChooseContextFiles={() => chooseContextFiles()}
              chooseWorkspacePending={chooseWorkspacePending}
              chooseContextFilesPending={chooseContextFilesPending}
              onSubmitPrompt={submitPrompt}
              onSubmitBatch={submitBatch}
              onEditQueuedTask={editQueuedTask}
              onCancelEdit={resetComposerEditingState}
            />
            <SupervisorPanel
              supervisors={supervisorList}
              tasks={tasks}
              progressByTask={progressByTask}
              activeTaskId={activeTaskId}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => handleQueueSnapshotRefresh()}
            disabled={queuePending || bootstrapQuery.isPending}
          >
            <RefreshCcw className="size-4" />
            手动同步队列
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
