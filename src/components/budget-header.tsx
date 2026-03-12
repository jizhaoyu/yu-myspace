import { useEffect, useState } from "react";
import {
  Bot,
  Download,
  KeyRound,
  Pause,
  Play,
  RefreshCcw,
  Settings2,
  Wallet,
  Zap,
} from "lucide-react";

import { Badge, Button, FieldLabel, Input, Panel, ProgressBar, Toggle } from "@/components/ui";
import { type AppSettings, type BudgetSnapshot, type EngineStatusSnapshot, type QueueSnapshot } from "@/lib/types";
import { clampPercent, currency, engineLabel } from "@/lib/utils";

const ENGINE_OPTIONS = ["OPENCODE"] as const;
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
  engineStatuses: EngineStatusSnapshot[];
  bootstrapPending: boolean;
  queuePending: boolean;
  exportPending: boolean;
  settingsPending: boolean;
  openLogsPending: boolean;
  engineStatusPending: boolean;
  notice: Notice | null;
  onToggleQueue: () => void;
  onExportSession: () => void;
  onSaveSettings: (payload: AppSettings) => void;
  onOpenLogsDirectory: () => void;
  onRefreshEngineStatuses: () => void;
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
  engineStatuses,
  bootstrapPending,
  queuePending,
  exportPending,
  settingsPending,
  openLogsPending,
  engineStatusPending,
  notice,
  onToggleQueue,
  onExportSession,
  onSaveSettings,
  onOpenLogsDirectory,
  onRefreshEngineStatuses,
}: BudgetHeaderProps) {
  const [draft, setDraft] = useState({
    theme: settings.theme,
    defaultEngine: settings.defaultEngine,
    autostartEnabled: settings.autostartEnabled,
    sessionBudgetUsd: String(settings.sessionBudgetUsd),
    weeklyBudgetUsd: String(settings.weeklyBudgetUsd),
    codexEndpoint: settings.codexEndpoint,
    codexModel: settings.codexModel,
    codexApiKey: settings.codexApiKey,
  });

  useEffect(() => {
    setDraft({
      theme: settings.theme,
      defaultEngine: settings.defaultEngine,
      autostartEnabled: settings.autostartEnabled,
      sessionBudgetUsd: String(settings.sessionBudgetUsd),
      weeklyBudgetUsd: String(settings.weeklyBudgetUsd),
      codexEndpoint: settings.codexEndpoint,
      codexModel: settings.codexModel,
      codexApiKey: settings.codexApiKey,
    });
  }, [
    settings.autostartEnabled,
    settings.codexApiKey,
    settings.codexEndpoint,
    settings.codexModel,
    settings.defaultEngine,
    settings.sessionBudgetUsd,
    settings.theme,
    settings.weeklyBudgetUsd,
  ]);

  const sessionUsage = clampPercent(budget.sessionUsageRatio);
  const weeklyUsage = clampPercent(budget.weeklyUsageRatio);

  function statusTone(status: EngineStatusSnapshot) {
    if (status.available) {
      return "success" as const;
    }
    if (!status.enabled) {
      return "neutral" as const;
    }
    return "warning" as const;
  }

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
                <Button
                  variant="ghost"
                  loading={openLogsPending}
                  onClick={onOpenLogsDirectory}
                >
                  打开日志
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
            <div>
              <FieldLabel>Codex Endpoint</FieldLabel>
              <Input
                value={draft.codexEndpoint}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    codexEndpoint: event.target.value,
                  }))
                }
                placeholder="https://api.openai.com/v1/responses"
              />
            </div>
            <div>
              <FieldLabel>Codex Model</FieldLabel>
              <Input
                value={draft.codexModel}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    codexModel: event.target.value,
                  }))
                }
                placeholder="gpt-5-codex"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Codex API Key</FieldLabel>
              <Input
                type="password"
                value={draft.codexApiKey}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    codexApiKey: event.target.value,
                  }))
                }
                placeholder="sk-..."
              />
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/8 bg-slate-950/36 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">引擎健康检查</div>
                <div className="text-xs text-slate-400">检查 OpenCode (Codex API) 是否完成必要配置。</div>
              </div>
              <Button type="button" size="sm" variant="ghost" loading={engineStatusPending} onClick={onRefreshEngineStatuses}>
                <RefreshCcw className="size-3.5" />
                刷新状态
              </Button>
            </div>
            <div className="grid gap-3">
              {engineStatuses.map((status) => (
                <div key={status.engine} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <KeyRound className="size-4 text-amber-300" />
                      {engineLabel(status.engine)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={statusTone(status)}>{status.available ? "Ready" : "Attention"}</Badge>
                      <Badge tone={status.configured ? "info" : "warning"}>{status.configured ? "Configured" : "Incomplete"}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{status.detail}</div>
                </div>
              ))}
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
                  codexEndpoint: draft.codexEndpoint,
                  codexModel: draft.codexModel,
                  codexApiKey: draft.codexApiKey,
                  skillsEnabled: settings.skillsEnabled,
                  disabledSkillIds: settings.disabledSkillIds,
                  manualSkillIds: settings.manualSkillIds,
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
