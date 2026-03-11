import { useEffect, useState } from "react";
import {
  Bot,
  Download,
  Pause,
  Play,
  Settings2,
  Wallet,
  Zap,
} from "lucide-react";

import { Badge, Button, FieldLabel, Input, Panel, ProgressBar, Toggle } from "@/components/ui";
import { type AppSettings, type BudgetSnapshot, type QueueSnapshot } from "@/lib/types";
import { clampPercent, currency, engineLabel } from "@/lib/utils";

const ENGINE_OPTIONS = ["OPENAI_CODEX", "CLAUDE_CODE", "GEMINI"] as const;
const THEME_OPTIONS = ["system", "dark", "light"] as const;

type Notice = {
  tone: "info" | "success" | "danger";
  text: string;
};

type BudgetHeaderProps = {
  sessionId: string;
  budget: BudgetSnapshot;
  queue: QueueSnapshot;
  settings: AppSettings;
  bootstrapPending: boolean;
  queuePending: boolean;
  exportPending: boolean;
  settingsPending: boolean;
  notice: Notice | null;
  onToggleQueue: () => void;
  onExportSession: () => void;
  onSaveSettings: (payload: AppSettings) => void;
};

function levelTone(level: string) {
  switch (level) {
    case "RED":
      return "danger";
    case "YELLOW":
      return "warning";
    default:
      return "success";
  }
}

export function BudgetHeader({
  sessionId,
  budget,
  queue,
  settings,
  bootstrapPending,
  queuePending,
  exportPending,
  settingsPending,
  notice,
  onToggleQueue,
  onExportSession,
  onSaveSettings,
}: BudgetHeaderProps) {
  const [draft, setDraft] = useState({
    theme: settings.theme,
    defaultEngine: settings.defaultEngine,
    autostartEnabled: settings.autostartEnabled,
    sessionBudgetUsd: String(settings.sessionBudgetUsd),
    weeklyBudgetUsd: String(settings.weeklyBudgetUsd),
  });

  useEffect(() => {
    setDraft({
      theme: settings.theme,
      defaultEngine: settings.defaultEngine,
      autostartEnabled: settings.autostartEnabled,
      sessionBudgetUsd: String(settings.sessionBudgetUsd),
      weeklyBudgetUsd: String(settings.weeklyBudgetUsd),
    });
  }, [
    settings.autostartEnabled,
    settings.defaultEngine,
    settings.sessionBudgetUsd,
    settings.theme,
    settings.weeklyBudgetUsd,
  ]);

  const sessionUsage = clampPercent(budget.sessionUsageRatio);
  const weeklyUsage = clampPercent(budget.weeklyUsageRatio);

  return (
    <Panel
      className="rounded-[34px] p-6"
      title="Fangyu Code"
      description="围绕队列调度、双路监督和成本控制的桌面 AI 编码工作台。"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge tone={queue.paused ? "warning" : "info"}>
            {queue.paused ? "Queue Paused" : "Queue Live"}
          </Badge>
          <Badge tone={levelTone(budget.level)}>
            Budget {budget.level}
          </Badge>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1.1fr]">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="rounded-[24px] border border-white/8 bg-slate-950/38 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-200">
                  <Bot className="size-4 text-sky-300" />
                  <span className="text-sm font-medium">
                    当前引擎 {engineLabel(settings.defaultEngine)}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Session {sessionId || "未绑定"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={queue.paused ? "primary" : "secondary"}
                  loading={queuePending}
                  onClick={onToggleQueue}
                >
                  {queue.paused ? (
                    <>
                      <Play className="size-4" />
                      恢复队列
                    </>
                  ) : (
                    <>
                      <Pause className="size-4" />
                      暂停队列
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  loading={exportPending}
                  onClick={onExportSession}
                  disabled={!sessionId}
                >
                  <Download className="size-4" />
                  导出会话
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Pending
                </div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {queue.queuedCount}
                </div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Processing
                </div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {queue.processingCount}
                </div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Completed
                </div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {queue.completedCount}
                </div>
              </div>
            </div>
            {notice ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  notice.tone === "danger"
                    ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                    : notice.tone === "success"
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                      : "border-sky-400/25 bg-sky-500/10 text-sky-100"
                }`}
              >
                {notice.text}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/6 bg-white/4 px-4 py-3 text-sm text-slate-400">
                {bootstrapPending
                  ? "正在同步桌面状态..."
                  : "通过顶部设置统一控制默认模型、主题与预算阈值。"}
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/38 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Wallet className="size-4 text-amber-300" />
                会话预算
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-2xl font-semibold text-white">
                    {currency(budget.currentSessionUsd)}
                  </div>
                  <div className="text-xs text-slate-400">
                    限额 {currency(budget.sessionBudgetUsd)}
                  </div>
                </div>
                <Badge tone={levelTone(budget.level)}>{sessionUsage.toFixed(0)}%</Badge>
              </div>
              <ProgressBar className="mt-3" value={sessionUsage} />
            </div>
            <div className="rounded-[24px] border border-white/8 bg-slate-950/38 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Zap className="size-4 text-sky-300" />
                周预算
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-2xl font-semibold text-white">
                    {currency(budget.weeklyUsd)}
                  </div>
                  <div className="text-xs text-slate-400">
                    限额 {currency(budget.weeklyBudgetUsd)}
                  </div>
                </div>
                <Badge tone={levelTone(budget.level)}>{weeklyUsage.toFixed(0)}%</Badge>
              </div>
              <ProgressBar className="mt-3" value={weeklyUsage} />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-slate-950/38 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
            <Settings2 className="size-4 text-slate-300" />
            全局设置
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>默认引擎</FieldLabel>
              <select
                value={draft.defaultEngine}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    defaultEngine: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/20"
              >
                {ENGINE_OPTIONS.map((engine) => (
                  <option key={engine} value={engine}>
                    {engineLabel(engine)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>主题</FieldLabel>
              <select
                value={draft.theme}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    theme: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-300/45 focus:ring-2 focus:ring-sky-300/20"
              >
                {THEME_OPTIONS.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>会话预算 USD</FieldLabel>
              <Input
                inputMode="decimal"
                value={draft.sessionBudgetUsd}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sessionBudgetUsd: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>周预算 USD</FieldLabel>
              <Input
                inputMode="decimal"
                value={draft.weeklyBudgetUsd}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    weeklyBudgetUsd: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-3">
            <Toggle
              checked={draft.autostartEnabled}
              onPressedChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  autostartEnabled: next,
                }))
              }
              label="开机自启"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              loading={settingsPending}
              onClick={() => {
                const sessionBudget = Number(draft.sessionBudgetUsd);
                const weeklyBudget = Number(draft.weeklyBudgetUsd);

                onSaveSettings({
                  theme: draft.theme,
                  defaultEngine: draft.defaultEngine,
                  autostartEnabled: draft.autostartEnabled,
                  sessionBudgetUsd: Number.isFinite(sessionBudget)
                    ? sessionBudget
                    : settings.sessionBudgetUsd,
                  weeklyBudgetUsd: Number.isFinite(weeklyBudget)
                    ? weeklyBudget
                    : settings.weeklyBudgetUsd,
                });
              }}
            >
              保存设置
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
