import { useEffect, useState } from "react";
import { FileStack, FolderSearch, Layers3, PencilLine, Send, Split, Wand2, X } from "lucide-react";

import { Badge, Button, FieldLabel, Input, Panel, Textarea, Toggle } from "@/components/ui";
import { SkillList } from "@/components/skill-list";
import {
  type AppSettings,
  type BatchPromptRequest,
  type EditQueuedTaskRequest,
  type PromptTaskSnapshot,
  type SkillDefinitionView,
  type SkillMatchSnapshot,
  type SkillSettingsUpdateRequest,
  type SubmitPromptRequest,
} from "@/lib/types";
import { engineLabel, parseOptionalNumber } from "@/lib/utils";

type PromptComposerProps = {
  sessionId: string;
  settings: AppSettings;
  draft: string;
  workspacePath: string | null;
  contextFiles: string[];
  batchMode: boolean;
  insertMode: boolean;
  dualMode: boolean;
  editingTask: PromptTaskSnapshot | null;
  submitPending: boolean;
  onDraftChange: (value: string) => void;
  onWorkspacePathChange: (value: string | null) => void;
  onContextFilesChange: (value: string[]) => void;
  onBatchModeChange: (value: boolean) => void;
  onInsertModeChange: (value: boolean) => void;
  onDualModeChange: (value: boolean) => void;
  onChooseWorkspace: () => void;
  onChooseContextFiles: () => void;
  chooseWorkspacePending: boolean;
  chooseContextFilesPending: boolean;
  skills: SkillDefinitionView[];
  skillMatchPreview: SkillMatchSnapshot | null;
  skillSettingsPending: boolean;
  onRefreshSkills: () => void;
  onUpdateSkillSettings: (payload: SkillSettingsUpdateRequest) => void;
  onSubmitPrompt: (payload: SubmitPromptRequest) => void;
  onSubmitBatch: (payload: BatchPromptRequest) => void;
  onEditQueuedTask: (payload: EditQueuedTaskRequest) => void;
  onCancelEdit: () => void;
};

const ENGINE_OPTIONS = ["OPENCODE"] as const;

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
  workspacePath,
  contextFiles,
  batchMode,
  insertMode,
  dualMode,
  editingTask,
  submitPending,
  onDraftChange,
  onWorkspacePathChange,
  onContextFilesChange,
  onBatchModeChange,
  onInsertModeChange,
  onDualModeChange,
  onChooseWorkspace,
  onChooseContextFiles,
  chooseWorkspacePending,
  chooseContextFilesPending,
  skills,
  skillMatchPreview,
  skillSettingsPending,
  onRefreshSkills,
  onUpdateSkillSettings,
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
              workspacePath,
              contextFiles,
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
              workspacePath,
              contextFiles,
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
            workspacePath,
            contextFiles,
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

        <div className="grid gap-3 rounded-[24px] border border-white/8 bg-slate-950/38 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-slate-100">项目与文件上下文</div>
              <div className="text-xs text-slate-400">选择工作区目录，并附加本次任务需要参考的文件。</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" loading={chooseWorkspacePending} onClick={onChooseWorkspace}>
                <FolderSearch className="size-3.5" />
                选择项目
              </Button>
              <Button type="button" size="sm" variant="ghost" loading={chooseContextFilesPending} onClick={onChooseContextFiles}>
                <FileStack className="size-3.5" />
                附加文件
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">Workspace</div>
              <div className="flex items-start justify-between gap-2">
                <p className="break-all text-sm leading-6 text-slate-200">{workspacePath || "未选择项目目录"}</p>
                {workspacePath ? (
                  <button
                    type="button"
                    className="rounded-full p-1 text-slate-400 transition hover:bg-white/8 hover:text-slate-100"
                    onClick={() => onWorkspacePathChange(null)}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">Attached Files</div>
              {contextFiles.length ? (
                <div className="space-y-2">
                  {contextFiles.map((filePath) => (
                    <div key={filePath} className="flex items-start justify-between gap-2 rounded-xl bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
                      <span className="break-all">{filePath}</span>
                      <button
                        type="button"
                        className="rounded-full p-1 text-slate-500 transition hover:bg-white/8 hover:text-slate-100"
                        onClick={() => onContextFilesChange(contextFiles.filter((item) => item !== filePath))}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">未附加上下文文件</div>
              )}
            </div>
          </div>
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
              <span>{contextFiles.length} files</span>
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
            <div>Workspace {workspacePath || "none"}</div>
            <div>Files {contextFiles.length}</div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-slate-950/38 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-100">Skills 注入</div>
              <div className="text-xs text-slate-400">自动匹配 + 手动多选叠加（最多 4 个）。</div>
            </div>
            <Button size="sm" variant="ghost" type="button" loading={skillSettingsPending} onClick={onRefreshSkills}>
              刷新技能
            </Button>
          </div>

          <div className="mb-3">
            <Toggle
              checked={settings.skillsEnabled}
              onPressedChange={(next) => onUpdateSkillSettings({ skillsEnabled: next })}
              label="启用 Skills"
            />
          </div>

          {settings.skillsEnabled ? (
            <>
              <div className="mb-3 rounded-2xl border border-white/8 bg-white/4 p-3 text-xs text-slate-300">
                <div>自动命中：{skillMatchPreview?.autoMatchedSkillIds.join(", ") || "无"}</div>
                <div>手动叠加：{settings.manualSkillIds.join(", ") || "无"}</div>
                <div>最终注入：{skillMatchPreview?.appliedSkillIds.join(", ") || "无"}</div>
              </div>

              <div className="mt-2">
                <SkillList
                  skills={skills}
                  settings={settings}
                  match={skillMatchPreview}
                  pending={skillSettingsPending}
                  onUpdate={onUpdateSkillSettings}
                />
              </div>
            </>
          ) : null}
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
