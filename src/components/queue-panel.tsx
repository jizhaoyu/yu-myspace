import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Pencil,
  RotateCcw,
  Slash,
  TimerReset,
  Workflow,
} from "lucide-react";

import { Badge, Button, Panel, ProgressBar } from "@/components/ui";
import { type PromptTaskSnapshot, type QueueSnapshot, type TaskProgressEvent } from "@/lib/types";
import {
  clampPercent,
  cn,
  currency,
  engineLabel,
  formatDateTime,
  snippet,
  taskStatusLabel,
} from "@/lib/utils";

type QueuePanelProps = {
  queue: QueueSnapshot;
  activeTaskId: string | null;
  progressByTask: Record<string, TaskProgressEvent>;
  onEditTask: (task: PromptTaskSnapshot) => void;
  onRetryTask: (taskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
  onMoveTask: (taskId: string, direction: "UP" | "DOWN") => void;
  onCancelTask: (taskId: string) => void;
  actionPending: boolean;
};

function statusTone(status: string) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "FAILED":
    case "CANCELED":
      return "danger" as const;
    case "PROCESSING":
      return "info" as const;
    case "PAUSED":
      return "warning" as const;
    default:
      return "accent" as const;
  }
}

function MetaBadge({ children }: { children: React.ReactNode }) {
  return <Badge tone="neutral">{children}</Badge>;
}

export function QueuePanel({
  queue,
  activeTaskId,
  progressByTask,
  onEditTask,
  onRetryTask,
  onDuplicateTask,
  onMoveTask,
  onCancelTask,
  actionPending,
}: QueuePanelProps) {
  const tasks = [...queue.tasks].sort((left, right) => {
    if (left.id === activeTaskId) {
      return -1;
    }
    if (right.id === activeTaskId) {
      return 1;
    }

    return left.queuePosition - right.queuePosition || right.createdAt - left.createdAt;
  });

  const queuedPositions = tasks
    .filter((task) => task.status === "QUEUED")
    .map((task) => task.queuePosition)
    .filter((value) => value > 0);
  const minQueued = queuedPositions.length ? Math.min(...queuedPositions) : 0;
  const maxQueued = queuedPositions.length ? Math.max(...queuedPositions) : 0;

  return (
    <Panel
      title="队列"
      description="管理排队和执行中的任务，并清晰展示操作分组与执行元数据。"
      actions={
        <div className="flex items-center gap-2">
          <Badge tone="accent">排队 {queue.queuedCount}</Badge>
          <Badge tone="info">运行中 {queue.processingCount}</Badge>
        </div>
      }
      className="h-full"
    >
      {tasks.length ? (
        <div className="custom-scrollbar max-h-[760px] space-y-3 overflow-y-auto pr-1">
          {tasks.map((task, index) => {
            const progressEvent = progressByTask[task.id];
            const progressValue = clampPercent(progressEvent?.progress ?? task.progress);
            const isEditable = task.status === "QUEUED";
            const isActive = task.id === activeTaskId;
            const canRetry = task.status === "FAILED" || task.status === "CANCELED";
            const canMoveUp = isEditable && task.queuePosition > minQueued;
            const canMoveDown = isEditable && task.queuePosition < maxQueued;

            return (
              <motion.article
                key={task.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={cn(
                  "rounded-[24px] border p-4 transition-all",
                  isActive
                    ? "border-sky-500/30 bg-sky-500/10 shadow-[0_0_0_1px_rgba(14,165,233,0.08)_inset]"
                    : "border-zinc-800 bg-zinc-950/72",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
                      <MetaBadge>{engineLabel(task.engine)}</MetaBadge>
                      <MetaBadge>P{task.priority}</MetaBadge>
                      {task.insertMode ? <Badge tone="warning">插队</Badge> : null}
                      {task.dualMode ? <Badge tone="info">双监督</Badge> : null}
                      {task.workspacePath ? <MetaBadge>工作区</MetaBadge> : null}
                      {task.contextFiles.length ? (
                        <MetaBadge>文件 {task.contextFiles.length}</MetaBadge>
                      ) : null}
                      {isActive ? <Badge tone="info">当前</Badge> : null}
                    </div>

                    <div>
                      <p className="max-w-4xl text-sm leading-7 text-zinc-50">
                        {snippet(task.prompt, 180)}
                      </p>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
                          <div className="flex items-center gap-2">
                            <Workflow className="size-3.5 text-sky-400" />
                            <span>{progressEvent?.stage ?? task.stage ?? "等待执行"}</span>
                          </div>
                          <span>{progressValue.toFixed(0)}%</span>
                        </div>
                        <ProgressBar
                          className="bg-zinc-800"
                          indicatorClassName="bg-[linear-gradient(90deg,rgba(56,189,248,0.92),rgba(96,165,250,0.92))]"
                          value={progressValue}
                        />
                        {progressEvent?.summary ? (
                          <p className="mt-3 text-xs leading-6 text-zinc-300">
                            {progressEvent.summary}
                          </p>
                        ) : task.errorMessage ? (
                          <p className="mt-3 text-xs leading-6 text-rose-300">
                            {task.errorMessage}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-xs text-zinc-400">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span>创建时间</span>
                            <span className="flex items-center gap-1 text-zinc-300">
                              <TimerReset className="size-3.5" />
                              {formatDateTime(task.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>成本</span>
                            <span className="text-zinc-100">{currency(task.costUsd)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>预估 Token</span>
                            <span className="text-zinc-100">
                              {task.estimatedInputTokens + task.estimatedOutputTokens} tokens
                            </span>
                          </div>
                          {task.queuePosition > 0 ? (
                            <div className="flex items-center justify-between gap-3">
                              <span>位置</span>
                              <span className="text-zinc-100">#{task.queuePosition}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:w-[250px] xl:flex-col">
                    {isEditable ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!canMoveUp || actionPending}
                          onClick={() => onMoveTask(task.id, "UP")}
                        >
                          <ArrowUp className="size-3.5" />
                          上移
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!canMoveDown || actionPending}
                          onClick={() => onMoveTask(task.id, "DOWN")}
                        >
                          <ArrowDown className="size-3.5" />
                          下移
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {isEditable ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionPending}
                          onClick={() => onEditTask(task)}
                        >
                          <Pencil className="size-3.5" />
                          编辑
                        </Button>
                      ) : null}
                      {canRetry ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionPending}
                          onClick={() => onRetryTask(task.id)}
                        >
                          <RotateCcw className="size-3.5" />
                          重试
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actionPending}
                        onClick={() => onDuplicateTask(task.id)}
                      >
                        <Copy className="size-3.5" />
                        复制
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={actionPending}
                        disabled={actionPending}
                        onClick={() => onCancelTask(task.id)}
                      >
                        <Slash className="size-3.5" />
                        取消
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-zinc-800 bg-zinc-950/60 px-5 py-12 text-center text-sm text-zinc-400">
          还没有排队任务。前往“编排”工作区提交一个或多个提示词。
        </div>
      )}
    </Panel>
  );
}
