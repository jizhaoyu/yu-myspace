import { useEffect, useState } from "react";
import { Layers3, PencilLine, Send, Split, Wand2 } from "lucide-react";

import { Badge, Button, FieldLabel, Input, Panel, Textarea, Toggle } from "@/components/ui";
import {
  type AppSettings,
  type BatchPromptRequest,
  type EditQueuedTaskRequest,
  type PromptTaskSnapshot,
  type SubmitPromptRequest,
} from "@/lib/types";
import { engineLabel, parseOptionalNumber } from "@/lib/utils";

type PromptComposerProps = {
  sessionId: string;
  settings: AppSettings;
  draft: string;
  batchMode: boolean;
  insertMode: boolean;
  dualMode: boolean;
  editingTask: PromptTaskSnapshot | null;
  submitPending: boolean;
  onDraftChange: (value: string) => void;
  onBatchModeChange: (value: boolean) => void;
  onInsertModeChange: (value: boolean) => void;
  onDualModeChange: (value: boolean) => void;
  onSubmitPrompt: (payload: SubmitPromptRequest) => void;
  onSubmitBatch: (payload: BatchPromptRequest) => void;
  onEditQueuedTask: (payload: EditQueuedTaskRequest) => void;
  onCancelEdit: () => void;
};

const ENGINE_OPTIONS = ["OPENAI_CODEX", "CLAUDE_CODE", "GEMINI"] as const;

function splitBatchPrompts(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function PromptComposer({
  sessionId,
  settings,
  draft,
  batchMode,
  insertMode,
  dualMode,
  editingTask,
  submitPending,
  onDraftChange,
  onBatchModeChange,
  onInsertModeChange,
  onDualModeChange,
  onSubmitPrompt,
  onSubmitBatch,
  onEditQueuedTask,
  onCancelEdit,
}: PromptComposerProps) {
  const [engine, setEngine] = useState(settings.defaultEngine);
  const [priority, setPriority] = useState("50");

  useEffect(() => {
    setEngine(editingTask?.engine ?? settings.defaultEngine);
  }, [editingTask?.engine, settings.defaultEngine]);

  useEffect(() => {
    setPriority(editingTask ? String(editingTask.priority) : "50");
  }, [editingTask]);

  const batchPrompts = splitBatchPrompts(draft);
  const promptCount = batchMode ? batchPrompts.length : draft.trim() ? 1 : 0;

  return (
    <Panel
      title={editingTask ? "编辑待执行任务" : "Prompt Composer"}
      description="支持单条、批量、插队和双路监督。默认模型与预算继承全局设置。"
      actions={
        <div className="flex items-center gap-2">
          {editingTask ? <Badge tone="warning">Editing</Badge> : null}
          <Badge tone="accent">{engineLabel(engine)}</Badge>
        </div>
      }
      className="h-full"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();

          if (!draft.trim()) {
            return;
          }

          if (editingTask) {
            onEditQueuedTask({
              taskId: editingTask.id,
              prompt: draft.trim(),
              priority: parseOptionalNumber(priority),
              insertMode,
            });
            return;
          }

          if (batchMode) {
            if (!batchPrompts.length) {
              return;
            }

            onSubmitBatch({
              sessionId: sessionId || null,
              prompts: batchPrompts,
              engine,
              priority: parseOptionalNumber(priority),
              insertMode,
            });
            return;
          }

          onSubmitPrompt({
            sessionId: sessionId || null,
            prompt: draft.trim(),
            engine,
            priority: parseOptionalNumber(priority),
            insertMode,
            dualMode,
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>目标引擎</FieldLabel>
            <select
              value={engine}
              disabled={!!editingTask}
              onChange={(event) => setEngine(event.target.value)}
              className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/20 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {ENGINE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {engineLabel(option)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>优先级</FieldLabel>
            <Input
              inputMode="numeric"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              placeholder="默认 50，数值越大越靠前"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle
            checked={batchMode}
            onPressedChange={(next) => {
              onBatchModeChange(next);
              if (next) {
                onDualModeChange(false);
              }
            }}
            disabled={!!editingTask}
            label="批量提交"
          />
          <Toggle
            checked={insertMode}
            onPressedChange={onInsertModeChange}
            label="插队模式"
          />
          <Toggle
            checked={dualMode}
            onPressedChange={onDualModeChange}
            disabled={batchMode || !!editingTask}
            label="双路监督"
          />
        </div>

        <div className="rounded-[24px] border border-white/8 bg-slate-950/38 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Wand2 className="size-3.5 text-amber-300" />
              {editingTask
                ? "仅允许修改排队中的 Prompt、优先级和插队状态。"
                : batchMode
                  ? "批量模式按行拆分 Prompt。"
                  : "单条模式支持双路监督和流式跟踪。"}
            </div>
            <div className="flex items-center gap-3">
              <span>{promptCount} 条任务</span>
              <span>{draft.trim().length} chars</span>
            </div>
          </div>
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={
              batchMode
                ? "每行一个 Prompt，适合批量生成、修复或审查请求。"
                : "描述你的编码任务、上下文约束和验收标准。"
            }
          />
        </div>

        <div className="grid gap-3 rounded-[24px] border border-white/8 bg-slate-950/38 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 font-medium text-slate-100">
            {editingTask ? (
              <PencilLine className="size-4 text-amber-300" />
            ) : batchMode ? (
              <Layers3 className="size-4 text-sky-300" />
            ) : (
              <Split className="size-4 text-emerald-300" />
            )}
            执行摘要
          </div>
          <div className="grid gap-2 text-xs leading-6 text-slate-400">
            <div>Session {sessionId || "新建会话"}</div>
            <div>Engine {engineLabel(engine)}</div>
            <div>Priority {priority || "null"}</div>
            <div>Insert {insertMode ? "ON" : "OFF"}</div>
            <div>Dual {dualMode && !batchMode && !editingTask ? "ON" : "OFF"}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {editingTask ? (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              取消编辑
            </Button>
          ) : (
            <div className="text-xs text-slate-500">
              {batchMode
                ? "批量提交会把每一行作为独立任务进入队列。"
                : "单条任务会立即进入调度，并通过事件流回传进度。"}
            </div>
          )}
          <Button type="submit" variant="primary" loading={submitPending}>
            <Send className="size-4" />
            {editingTask ? "保存任务" : batchMode ? "批量提交" : "发送 Prompt"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
