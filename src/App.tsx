import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers3,
  MessagesSquare,
  Moon,
  PlugZap,
  RefreshCcw,
  SendHorizontal,
  SlidersHorizontal,
  Sun,
} from "lucide-react";

import { BudgetHeader } from "@/components/budget-header";
import { HistorySidebar } from "@/components/history-sidebar";
import { MessageStream } from "@/components/message-stream";
import { McpPanel } from "@/components/mcp-panel";
import { PromptComposer } from "@/components/prompt-composer";
import { QueuePanel } from "@/components/queue-panel";
import { SupervisorPanel } from "@/components/supervisor-panel";
import { Button, Panel } from "@/components/ui";
import { desktopApi, desktopEvents } from "@/lib/desktop";
import { getErrorMessage } from "@/lib/errors";
import { type AppSettings, type PromptTaskSnapshot, type QueueSnapshot } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

type Notice = {
  tone: "info" | "success" | "danger";
  text: string;
};

type WorkspaceSection = "overview" | "sessions" | "queue" | "compose" | "integrations";

export default function App() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requestedSessionId, setRequestedSessionId] = useState<string>();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const deferredHistoryQuery = useDeferredValue(historyQuery.trim());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sessionRefreshPending, setSessionRefreshPending] = useState(false);
  const [sessionRefreshError, setSessionRefreshError] = useState<string | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const lastBudgetLevel = useRef<string | null>(null);
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
  const skills = useAppStore((state) => state.skills);
  const skillMatchPreview = useAppStore((state) => state.skillMatchPreview);
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
  const setSkills = useAppStore((state) => state.setSkills);
  const setSkillMatchPreview = useAppStore((state) => state.setSkillMatchPreview);
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

  const skillsQuery = useQuery({
    queryKey: ["skills"],
    queryFn: () => desktopApi.listSkills(),
  });

  const skillMatchQuery = useQuery({
    queryKey: ["skills", "preview", composerDraft],
    queryFn: () => desktopApi.previewSkillMatch(composerDraft),
  });

  const mcpQuery = useQuery({
    queryKey: ["mcp-registry"],
    queryFn: () => desktopApi.listMcpServers(),
  });

  useEffect(() => {
    if (!bootstrapQuery.data) {
      return;
    }

    startTransition(() => {
      hydrate(bootstrapQuery.data);
    });
    setSessionRefreshError(null);
    setSessionRefreshPending(false);
  }, [bootstrapQuery.data, hydrate]);

  useEffect(() => {
    if (engineStatusQuery.data) {
      setEngineStatuses(engineStatusQuery.data);
    }
  }, [engineStatusQuery.data, setEngineStatuses]);

  useEffect(() => {
    if (skillsQuery.data) {
      setSkills(skillsQuery.data);
    }
  }, [skillsQuery.data, setSkills]);

  useEffect(() => {
    if (skillMatchQuery.data) {
      setSkillMatchPreview(skillMatchQuery.data);
    }
  }, [setSkillMatchPreview, skillMatchQuery.data]);

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
      setResolvedTheme(preferredTheme);
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
      desktopEvents.onBudgetUpdated((payload) => {
        applyBudget(payload);
        if (!payload.sessionId) {
          return;
        }
        const nextLevel = payload.level;
        if (lastBudgetLevel.current !== nextLevel) {
          lastBudgetLevel.current = nextLevel;
          if (nextLevel === "YELLOW") {
            setNotice({ tone: "info", text: "预算消耗接近上限。" });
            desktopApi.notifyUser("Fangyu Code", "预算消耗接近上限。").catch(() => null);
          }
          if (nextLevel === "RED") {
            setNotice({ tone: "danger", text: "预算消耗已达到或超过设定上限。" });
            desktopApi.notifyUser("Fangyu Code", "预算消耗已达到或超过设定上限。").catch(() => null);
          }
        }
      }),
      desktopEvents.onSettingsUpdated((payload) => applySettings(payload)),
      desktopEvents.onHistoryUpdated((payload) => applyHistoryMessage(payload)),
      desktopEvents.onMcpUpdated((payload) => {
        queryClient.setQueryData(["mcp-registry"], payload);
      }),
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
    queryClient,
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
      setNotice({ tone: "success", text: "任务已加入队列。" });
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
        text: `已批量提交 ${variables.prompts.length} 个任务。`,
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
        setNotice({ tone: "info", text: `已绑定工作区：${workspacePath}` });
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
      setNotice({ tone: "success", text: `已将 ${task.id.slice(0, 8)} 重新加入队列。` });
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
      setNotice({ tone: "info", text: "队列顺序已更新。" });
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
        text: snapshot.paused ? "队列已暂停。" : "队列已恢复。",
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
      setNotice({ tone: "success", text: "设置已同步到桌面运行时。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  function toggleTheme() {
    saveSettings({
      ...settings,
      theme: resolvedTheme === "dark" ? "light" : "dark",
    });
  }

  const { mutate: updateSkillSettings, isPending: skillSettingsPending } = useMutation({
    mutationFn: desktopApi.updateSkillSettings,
    onSuccess: (nextSettings) => {
      applySettings(nextSettings);
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
      void queryClient.invalidateQueries({ queryKey: ["skills", "preview"] });
      setNotice({ tone: "success", text: "技能设置已更新。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: setMcpServerEnabled, isPending: mcpTogglePending } = useMutation({
    mutationFn: (payload: { id: string; enabled: boolean }) =>
      desktopApi.setMcpServerEnabled(payload.id, payload.enabled),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(["mcp-registry"], snapshot);
      setNotice({ tone: "success", text: "MCP 服务状态已更新。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: syncMcpToOpenCode, isPending: mcpSyncPending } = useMutation({
    mutationFn: desktopApi.syncMcpToOpenCode,
    onSuccess: (snapshot) => {
      queryClient.setQueryData(["mcp-registry"], snapshot);
      setNotice({ tone: "success", text: "MCP 注册表已同步到 OpenCode。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const { mutate: importMcpFromOpenCode, isPending: mcpImportPending } = useMutation({
    mutationFn: desktopApi.importMcpFromOpenCode,
    onSuccess: (snapshot) => {
      queryClient.setQueryData(["mcp-registry"], snapshot);
      setNotice({ tone: "success", text: "已从 OpenCode 导入 MCP 配置。" });
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

  const { mutate: openLogsDirectory, isPending: openLogsPending } = useMutation({
    mutationFn: desktopApi.openLogsDirectory,
    onSuccess: () => {
      setNotice({ tone: "info", text: "已打开日志目录。" });
    },
    onError: (error) => {
      setNotice({ tone: "danger", text: getErrorMessage(error) });
    },
  });

  const currentMessages = messagesBySession[sessionId] ?? [];
  const editingTask = editingTaskId ? tasks[editingTaskId] ?? null : null;
  const supervisorList = Object.values(supervisors).filter((item) => tasks[item.taskId]);

  const sectionItems: Array<{
    id: WorkspaceSection;
    label: string;
    description: string;
    icon: typeof SlidersHorizontal;
  }> = [
    {
      id: "overview",
      label: "Overview",
      description: "预算、状态与设置",
      icon: SlidersHorizontal,
    },
    {
      id: "sessions",
      label: "Sessions",
      description: "历史记录与会话流",
      icon: MessagesSquare,
    },
    {
      id: "queue",
      label: "Queue",
      description: "执行顺序与监督",
      icon: Layers3,
    },
    {
      id: "compose",
      label: "Compose",
      description: "提示词编排与技能",
      icon: SendHorizontal,
    },
    {
      id: "integrations",
      label: "Integrations",
      description: "MCP 与外部桥接",
      icon: PlugZap,
    },
  ];

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
    setSessionRefreshPending(true);
    setSessionRefreshError(null);
    bootstrapQuery
      .refetch()
      .catch((error: unknown) => {
        const message = getErrorMessage(error);
        setNotice({ tone: "danger", text: message });
        setSessionRefreshError(message);
      })
      .finally(() => {
        setSessionRefreshPending(false);
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
    setActiveSection("compose");
  }

  function renderWorkspace() {
    switch (activeSection) {
      case "sessions":
        return (
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <HistorySidebar
              sessionId={sessionId}
              sessions={sessions}
              messages={currentMessages}
              sessionPending={bootstrapQuery.isPending}
              sessionError={sessionRefreshError}
              searchQuery={historyQuery}
              searchPending={historySearchPending}
              searchResult={searchResult}
              onSearchQueryChange={setHistoryQuery}
              onSelectSession={handleSessionSelect}
              onRefreshSession={handleSessionRefresh}
              refreshPending={sessionRefreshPending}
            />
            <MessageStream
              sessionId={sessionId}
              messages={currentMessages}
              tasks={tasks}
              streamingByTask={streamingByTask}
              onCopyMessage={(content) => {
                desktopApi.copyToClipboard(content)
                  .then(() => {
                    setNotice({ tone: "success", text: "消息已复制到剪贴板。" });
                  })
                  .catch((error: unknown) => {
                    setNotice({ tone: "danger", text: getErrorMessage(error) });
                  });
              }}
            />
          </div>
        );
      case "queue":
        return (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.8fr)]">
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
            <SupervisorPanel
              supervisors={supervisorList}
              tasks={tasks}
              progressByTask={progressByTask}
              activeTaskId={activeTaskId}
            />
          </div>
        );
      case "compose":
        return (
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
            submitPending={submitPromptPending || submitBatchPending || editPending}
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
            skills={skills}
            skillMatchPreview={skillMatchPreview}
            skillSettingsPending={skillSettingsPending || skillsQuery.isFetching}
            onRefreshSkills={() => {
              desktopApi.refreshSkills()
                .then((payload) => {
                  setSkills(payload);
                  setNotice({ tone: "info", text: "技能列表已刷新。" });
                })
                .catch((error: unknown) => {
                  setNotice({ tone: "danger", text: getErrorMessage(error) });
                });
            }}
            onUpdateSkillSettings={(payload) => updateSkillSettings(payload)}
            onSubmitPrompt={submitPrompt}
            onSubmitBatch={submitBatch}
            onEditQueuedTask={editQueuedTask}
            onCancelEdit={resetComposerEditingState}
          />
        );
      case "integrations":
        return (
          <McpPanel
            snapshot={mcpQuery.data ?? null}
            pending={mcpQuery.isFetching || mcpTogglePending}
            syncing={mcpSyncPending}
            importing={mcpImportPending}
            pickingWorkspace={chooseWorkspacePending}
            pickingFiles={chooseContextFilesPending}
            onRefresh={() => {
              mcpQuery.refetch().catch((error: unknown) => {
                setNotice({ tone: "danger", text: getErrorMessage(error) });
              });
            }}
            onSync={() => syncMcpToOpenCode()}
            onImport={() => importMcpFromOpenCode()}
            onToggleEnabled={(id, enabled) => setMcpServerEnabled({ id, enabled })}
            onPickWorkspace={() => chooseWorkspaceDirectory()}
            onPickFiles={() => chooseContextFiles()}
          />
        );
      case "overview":
      default:
        return (
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
            openLogsPending={openLogsPending}
            onOpenLogsDirectory={() => openLogsDirectory()}
            onRefreshEngineStatuses={() => {
              void engineStatusQuery.refetch();
            }}
          />
        );
    }
  }

  if (bootstrapQuery.isError && !bootstrapQuery.data) {
    return (
      <div className="app-shell">
        <div className="mx-auto flex max-w-3xl items-center justify-center">
          <Panel className="w-full max-w-2xl" title="桌面端启动失败">
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
        className={`mx-auto grid max-w-[1720px] gap-4 xl:gap-5 ${
          sidebarCollapsed
            ? "xl:grid-cols-[88px_minmax(0,1fr)]"
            : "xl:grid-cols-[268px_minmax(0,1fr)]"
        }`}
      >
        <aside className="panel-surface sticky top-5 flex h-fit flex-col rounded-[30px] p-3 md:p-4">
          <div className="border-b border-[color:var(--border)] pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className={sidebarCollapsed ? "hidden" : "block"}>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">工作台</div>
                <div className="mt-2 text-lg font-semibold text-zinc-50">Fangyu Code</div>
                <div className="mt-1 text-sm text-zinc-400">
                  将功能拆分成独立工作区，而不是全部堆在一个页面里。
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
                className={sidebarCollapsed ? "mx-auto" : "shrink-0"}
                onClick={() => setSidebarCollapsed((current) => !current)}
              >
                {sidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </Button>
            </div>
          </div>

          <nav className="mt-4 space-y-2.5">
            {sectionItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  aria-label={item.label}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`group w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                    active
                      ? "border-[color:var(--accent-strong)]/35 bg-[color:var(--accent-soft)] shadow-[0_0_0_1px_rgba(14,165,233,0.08)_inset]"
                      : "border-[color:var(--border)] bg-[color:var(--card)] hover:-translate-y-0.5 hover:border-[color:var(--accent-strong)]/20 hover:bg-[color:var(--card-strong)]"
                  }`}
                >
                  <div className={`flex gap-3 ${sidebarCollapsed ? "items-center justify-center" : "items-start"}`}>
                    <div
                      className={`mt-0.5 rounded-xl p-2 transition-all ${
                        active
                          ? "bg-sky-500/14 text-sky-300 ring-1 ring-sky-500/20"
                          : "bg-[color:var(--background-elevated)] text-[color:var(--muted)] group-hover:bg-[color:var(--accent-soft)] group-hover:text-[color:var(--foreground)]"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    {sidebarCollapsed ? null : (
                      <div>
                        <div className="text-sm font-medium text-[color:var(--foreground)]">{item.label}</div>
                        <div className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{item.description}</div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={sidebarCollapsed ? "w-full px-0" : ""}
              aria-label={resolvedTheme === "dark" ? "切换到白天主题" : "切换到夜晚主题"}
              title={resolvedTheme === "dark" ? "切换到白天主题" : "切换到夜晚主题"}
              loading={settingsPending}
              onClick={toggleTheme}
            >
              {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {sidebarCollapsed ? null : <span>{resolvedTheme === "dark" ? "白天" : "夜晚"}</span>}
            </Button>
          </div>

          <div
            className={`mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background-elevated)]/72 px-4 py-3 text-xs text-[color:var(--muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${
              sidebarCollapsed ? "text-center" : ""
            }`}
            title={sidebarCollapsed ? sessionId || "未选择" : undefined}
          >
            {sidebarCollapsed ? (
              <span className="text-[color:var(--foreground)]">{sessionId ? sessionId.slice(0, 4) : "--"}</span>
            ) : (
              <>
                当前会话：<span className="text-zinc-200">{sessionId || "未选择"}</span>
              </>
            )}
          </div>

          <div
            className={`mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background-elevated)]/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${
              sidebarCollapsed ? "space-y-2 text-center" : "space-y-3"
            }`}
          >
            {sidebarCollapsed ? (
              <>
                <div
                  className={`mx-auto size-2 rounded-full ${
                    queue.paused ? "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.55)]" : "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.55)]"
                  }`}
                  title={queue.paused ? "Queue paused" : "Queue live"}
                />
                <div className="text-[11px] font-medium text-[color:var(--foreground)]">{queue.queuedCount}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">{budget.level}</div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">队列</span>
                  <span className={queue.paused ? "text-amber-300" : "text-emerald-300"}>
                    {queue.paused ? "已暂停" : "运行中"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">排队中</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-100">{queue.queuedCount}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">预算级别</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-100">{budget.level}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        <div className="flex flex-col gap-4">
          {renderWorkspace()}

          <div className="flex justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQueueSnapshotRefresh()}
              disabled={queuePending || bootstrapQuery.isPending}
            >
              <RefreshCcw className="size-4" />
              手动同步队列
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
