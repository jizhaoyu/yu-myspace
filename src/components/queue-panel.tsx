import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Copy, Pencil, RotateCcw, Slash, TimerReset } from "lucide-react";

import { Badge, Button, Panel, ProgressBar } from "@/components/ui";
import { type PromptTaskSnapshot, type QueueSnapshot, type TaskProgressEvent } from "@/lib/types";
import {
  clampPercent,
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
      return "success";
    case "FAILED":
    case "CANCELED":
      return "danger";
    case "PROCESSING":
      return "info";
    case "PAUSED":
      return "warning";
    default:
      return "accent";
  }
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
      title="任务队列"
      description="对排队和执行中的任务做插队、取消和重写控制。"
      actions={
        <div className="flex items-center gap-2">
          <Badge tone="accent">Queued {queue.queuedCount}</Badge>
          <Badge tone="info">Running {queue.processingCount}</Badge>
        </div>
      }
      className="h-full"
    >
      {tasks.length ? (
        <div className="custom-scrollbar max-h-[540px] space-y-3 overflow-y-auto pr-1">
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
                className={`rounded-[24px] border p-4 ${
                  isActive
                    ? "border-sky-300/30 bg-sky-400/8"
                    : "border-white/8 bg-slate-950/36"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(task.status)}>
                        {taskStatusLabel(task.status)}
                      </Badge>
                      <Badge tone="neutral">{engineLabel(task.engine)}</Badge>
                      <Badge tone="neutral">P{task.priority}</Badge>
                      {task.insertMode ? <Badge tone="warning">插队</Badge> : null}
                      {task.dualMode ? <Badge tone="info">双路</Badge> : null}
                      {task.workspacePath ? <Badge tone="neutral">Workspace</Badge> : null}
                      {task.contextFiles.length ? <Badge tone="neutral">Files {task.contextFiles.length}</Badge> : null}
                      {isActive ? <Badge tone="info">Active</Badge> : null}
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-slate-100">
                      {snippet(task.prompt, 132)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isEditable ? (
                      <>
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
                      </>
                    ) : null}
                    {isEditable ? (
                      <Button size="sm" variant="ghost" disabled={actionPending} onClick={() => onEditTask(task)}>
                        <Pencil className="size-3.5" />
                        编辑
                      </Button>
                    ) : null}
                    {canRetry ? (
                      <Button size="sm" variant="ghost" disabled={actionPending} onClick={() => onRetryTask(task.id)}>
                        <RotateCcw className="size-3.5" />
                        重试
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" disabled={actionPending} onClick={() => onDuplicateTask(task.id)}>
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

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                      <span>{progressEvent?.stage ?? task.stage ?? "等待调度"}</span>
                      <span>{progressValue.toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={progressValue} />
                    {progressEvent?.summary ? (
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {progressEvent.summary}
                      </p>
                    ) : task.errorMessage ? (
                      <p className="mt-2 text-xs leading-5 text-rose-200">
                        {task.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 text-right text-xs text-slate-400">
                    <div className="flex items-center justify-end gap-1">
                      <TimerReset className="size-3.5" />
                      {formatDateTime(task.createdAt)}
                    </div>
                    <div>成本 {currency(task.costUsd)}</div>
                    <div>
                      估算 {task.estimatedInputTokens + task.estimatedOutputTokens} tokens
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 px-5 py-12 text-center text-sm text-slate-400">
          目前没有排队任务。可以直接在右侧提交单条或批量 Prompt。
        </div>
      )}
    </Panel>
  );
}
