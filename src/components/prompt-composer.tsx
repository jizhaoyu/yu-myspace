import { useEffect, useState } from "react";
import {
  FileStack,
  FolderSearch,
  Layers3,
  PencilLine,
  Send,
  Split,
  Wand2,
  X,
} from "lucide-react";

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

function ContextShell({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/72 p-4">
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        {caption ? <div className="mt-1 text-xs text-zinc-400">{caption}</div> : null}
      </div>
      {children}
    </section>
  );
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
      title={editingTask ? "编辑排队任务" : "编排"}
      description="在当前工作区内编写提示词、附加项目上下文，并控制执行模式。"
      actions={
        <div className="flex items-center gap-2">
          {editingTask ? <Badge tone="warning">编辑中</Badge> : null}
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="space-y-4">
            <ContextShell
              title="提示词主体"
              caption={
                batchMode
                  ? "批量模式下，每一行都会作为一个独立任务提交。"
                  : "描述编码任务、约束条件、验收标准和预期输出。"
              }
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Wand2 className="size-3.5 text-amber-400" />
                  {editingTask
                    ? "正在编辑已排队任务"
                    : batchMode
                      ? "已启用批量模式"
                      : "当前为单任务模式"}
                </div>
                <div className="flex items-center gap-3">
                  <span>{promptCount} 个任务</span>
                  <span>{draft.trim().length} 字符</span>
                  <span>{contextFiles.length} 个文件</span>
                </div>
              </div>

              <Textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={
                  batchMode
                    ? "每行一个提示词，适合批量重构、检查或生成任务。"
                    : "说明你希望编码代理完成什么，包括文件范围、约束条件和完成标准。"
                }
                className="min-h-[320px]"
              />
            </ContextShell>

            <ContextShell
              title="项目上下文"
              caption="绑定工作区并附加参考文件，提升执行质量。"
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={chooseWorkspacePending}
                  onClick={onChooseWorkspace}
                >
                  <FolderSearch className="size-3.5" />
                  选择工作区
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={chooseContextFilesPending}
                  onClick={onChooseContextFiles}
                >
                  <FileStack className="size-3.5" />
                  附加文件
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    工作区
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-all text-sm leading-6 text-zinc-100">
                      {workspacePath || "尚未选择工作区"}
                    </p>
                    {workspacePath ? (
                      <button
                        type="button"
                        className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100"
                        onClick={() => onWorkspacePathChange(null)}
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    已附加文件
                  </div>
                  {contextFiles.length ? (
                    <div className="space-y-2">
                      {contextFiles.map((filePath) => (
                        <div
                          key={filePath}
                          className="flex items-start justify-between gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
                        >
                          <span className="break-all">{filePath}</span>
                          <button
                            type="button"
                            className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100"
                            onClick={() =>
                              onContextFilesChange(contextFiles.filter((item) => item !== filePath))
                            }
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400">尚未附加上下文文件</div>
                  )}
                </div>
              </div>
            </ContextShell>
          </div>

          <div className="space-y-4">
            <ContextShell title="执行设置" caption="控制引擎、优先级和分发方式。">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <FieldLabel>目标引擎</FieldLabel>
                  <select
                    value={engine}
                    disabled={!!editingTask}
                    onChange={(event) => setEngine(event.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950/90 px-4 text-sm text-zinc-50 outline-none transition-all hover:border-zinc-600 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600/40 disabled:cursor-not-allowed disabled:opacity-55"
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
                    placeholder="默认 50"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-2">
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
                  label="插入队列"
                />
                <Toggle
                  checked={dualMode}
                  onPressedChange={onDualModeChange}
                  disabled={batchMode || !!editingTask}
                  label="双监督"
                />
              </div>
            </ContextShell>

            <ContextShell title="执行摘要" caption="提交前快速确认本次任务配置。">
              <div className="grid gap-2 text-xs leading-6 text-zinc-300">
                <div className="flex items-center justify-between gap-3">
                  <span>会话</span>
                  <span>{sessionId || "新会话"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>引擎</span>
                  <span>{engineLabel(engine)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>优先级</span>
                  <span>{priority || "null"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>插队模式</span>
                  <span>{insertMode ? "开启" : "关闭"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>双监督</span>
                  <span>{dualMode && !batchMode && !editingTask ? "开启" : "关闭"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>工作区</span>
                  <span>{workspacePath ? "已绑定" : "无"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>文件</span>
                  <span>{contextFiles.length}</span>
                </div>
              </div>
            </ContextShell>

            <ContextShell
              title="技能"
              caption="自动匹配和手动叠加到当前草稿的技能。"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  loading={skillSettingsPending}
                  onClick={onRefreshSkills}
                >
                  刷新技能
                </Button>
                <Badge tone="neutral">{skills.length} 个可用</Badge>
              </div>

              <div className="mb-3">
                <Toggle
                  checked={settings.skillsEnabled}
                  onPressedChange={(next) => onUpdateSkillSettings({ skillsEnabled: next })}
                  label="启用技能"
                />
              </div>

              {settings.skillsEnabled ? (
                <>
                  <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-300">
                    <div>自动匹配：{skillMatchPreview?.autoMatchedSkillIds.join(", ") || "无"}</div>
                    <div>手动指定：{settings.manualSkillIds.join(", ") || "无"}</div>
                    <div>最终应用：{skillMatchPreview?.appliedSkillIds.join(", ") || "无"}</div>
                  </div>

                  <SkillList
                    skills={skills}
                    settings={settings}
                    match={skillMatchPreview}
                    pending={skillSettingsPending}
                    onUpdate={onUpdateSkillSettings}
                  />
                </>
              ) : null}
            </ContextShell>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {editingTask ? (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              取消编辑
            </Button>
          ) : (
            <div className="text-xs text-zinc-400">
              {batchMode
                ? "每一行都会作为独立任务提交到队列。"
                : "单任务模式会通过桌面事件实时回传执行进度。"}
            </div>
          )}
          <Button type="submit" variant="primary" loading={submitPending}>
            <Send className="size-4" />
            {editingTask ? "保存任务" : batchMode ? "批量提交" : "发送提示词"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
