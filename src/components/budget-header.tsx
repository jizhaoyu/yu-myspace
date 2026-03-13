import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Download,
  FolderOpen,
  KeyRound,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Settings2,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

import { Badge, Button, FieldLabel, Input, Panel, ProgressBar, Select, Toggle } from "@/components/ui";
import {
  type AppSettings,
  type BudgetSnapshot,
  type EngineStatusSnapshot,
  type QueueSnapshot,
} from "@/lib/types";
import { clampPercent, cn, currency, engineLabel } from "@/lib/utils";

const ENGINE_OPTIONS = ["OPENCODE"] as const;
const THEME_OPTIONS = [
  { value: "system", label: "跟随系统" },
  { value: "dark", label: "深色" },
  { value: "light", label: "浅色" },
] as const;

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
      return "danger" as const;
    case "YELLOW":
      return "warning" as const;
    default:
      return "success" as const;
  }
}

function statusTone(status: EngineStatusSnapshot) {
  if (status.available) {
    return "success" as const;
  }
  if (!status.enabled) {
    return "neutral" as const;
  }
  return "warning" as const;
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "info" | "success";
}) {
  const glowClass =
    tone === "success"
      ? "from-emerald-500/12"
      : tone === "info"
        ? "from-sky-500/12"
        : "from-zinc-500/10";

  return (
    <div className={cn("rounded-2xl border border-[color:var(--border)] bg-gradient-to-b to-transparent p-4", glowClass)}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</div>
      <div className="mt-3 flex items-end justify-between">
        <div className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">{value}</div>
        <div className="size-2 rounded-full bg-[color:var(--accent-strong)] shadow-[0_0_20px_rgba(56,189,248,0.22)]" />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  limit,
  percent,
  badgeTone,
  icon,
  progressToneClass,
}: {
  title: string;
  value: string;
  limit: string;
  percent: string;
  badgeTone: "success" | "warning" | "danger";
  icon: React.ReactNode;
  progressToneClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
            {icon}
            {title}
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">{value}</div>
          <div className="mt-1 text-xs text-zinc-400">上限 {limit}</div>
        </div>
        <Badge tone={badgeTone}>{percent}</Badge>
      </div>
      <ProgressBar
        className="mt-4 h-2.5"
        indicatorClassName={progressToneClass}
        value={Number(percent.replace("%", ""))}
      />
    </div>
  );
}

function TrendBars({ sessionUsage, weeklyUsage }: { sessionUsage: number; weeklyUsage: number }) {
  const bars = useMemo(
    () => [
      18,
      26,
      24,
      32,
      28,
      Math.max(14, Math.round(sessionUsage * 0.4)),
      30,
      44,
      Math.max(12, Math.round(weeklyUsage * 0.6)),
      38,
      46,
      36,
    ],
    [sessionUsage, weeklyUsage],
  );

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-100">消耗趋势</div>
          <div className="text-xs text-zinc-400">后续可替换为真实成本折线图</div>
        </div>
        <Activity className="size-4 text-[color:var(--muted)]" />
      </div>
      <div className="flex h-24 items-end gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--background-elevated)]/70 px-3 py-3">
        {bars.map((height, index) => (
          <div
            key={`${height}-${index}`}
            className="flex-1 rounded-full bg-gradient-to-t from-sky-500/70 to-cyan-300/80"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
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

  return (
    <Panel
      className="rounded-[30px] p-6"
      title="Fangyu Code"
      description="桌面 AI 编码工作台，提供队列编排、预算监控和运行时控制。"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge tone={queue.paused ? "warning" : "neutral"}>
            {queue.paused ? "队列已暂停" : "队列运行中"}
          </Badge>
          <Badge tone={levelTone(budget.level)}>预算 {budget.level}</Badge>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_1.1fr]">
        <div className="space-y-4">
          <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[color:var(--foreground)]">
                  <Bot className="size-4 text-sky-400" />
                  <span className="text-sm font-medium">当前引擎 {engineLabel(settings.defaultEngine)}</span>
                </div>
                <div className="text-xs text-zinc-400">会话 {sessionId || "当前无活跃会话"}</div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant={queue.paused ? "primary" : "secondary"} loading={queuePending} onClick={onToggleQueue}>
                  {queue.paused ? (
                    <>
                      <Play className="size-4" />
                      恢复
                    </>
                  ) : (
                    <>
                      <Pause className="size-4" />
                      暂停
                    </>
                  )}
                </Button>
                <Button variant="secondary" loading={exportPending} onClick={onExportSession} disabled={!sessionId}>
                  <Download className="size-4" />
                  导出
                </Button>
                <Button variant="ghost" loading={openLogsPending} onClick={onOpenLogsDirectory}>
                  <FolderOpen className="size-4" />
                  日志
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="待执行" value={queue.queuedCount} tone="info" />
              <StatCard label="执行中" value={queue.processingCount} tone="neutral" />
              <StatCard label="已完成" value={queue.completedCount} tone="success" />
            </div>

            <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background-elevated)]/72 px-4 py-3 text-sm text-[color:var(--muted-strong)]">
              {notice ? (
                <span
                  className={cn(
                    notice.tone === "danger" && "text-rose-300",
                    notice.tone === "success" && "text-emerald-300",
                    notice.tone === "info" && "text-sky-300",
                  )}
                >
                  {notice.text}
                </span>
              ) : bootstrapPending ? (
                "正在同步桌面状态..."
              ) : (
                "可使用上方操作管理队列状态、会话导出和运行时可见性。"
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
                  <Wallet className="size-4 text-emerald-400" />
                  预算监控
                </div>
                <div className="mt-1 text-xs text-zinc-400">更紧凑的预算追踪与更清晰的进度反馈</div>
              </div>
              <Badge tone={levelTone(budget.level)}>{budget.level}</Badge>
            </div>

            <div className="grid gap-3">
              <MetricCard
                title="会话预算"
                value={currency(budget.currentSessionUsd)}
                limit={currency(budget.sessionBudgetUsd)}
                percent={`${sessionUsage.toFixed(0)}%`}
                badgeTone={levelTone(budget.level)}
                icon={<Wallet className="size-4 text-emerald-400" />}
                progressToneClass="bg-[linear-gradient(90deg,rgba(16,185,129,0.95),rgba(110,231,183,0.95))]"
              />
              <MetricCard
                title="周预算"
                value={currency(budget.weeklyUsd)}
                limit={currency(budget.weeklyBudgetUsd)}
                percent={`${weeklyUsage.toFixed(0)}%`}
                badgeTone={levelTone(budget.level)}
                icon={<Zap className="size-4 text-sky-400" />}
                progressToneClass="bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(103,232,249,0.95))]"
              />
              <TrendBars sessionUsage={sessionUsage} weeklyUsage={weeklyUsage} />
            </div>
          </section>
        </div>

        <section className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--card)] p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
            <Settings2 className="size-4 text-[color:var(--muted)]" />
            全局设置
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>默认引擎</FieldLabel>
              <Select
                value={draft.defaultEngine}
                onChange={(event) => setDraft((current) => ({ ...current, defaultEngine: event.target.value }))}
              >
                {ENGINE_OPTIONS.map((engine) => (
                  <option key={engine} value={engine}>
                    {engineLabel(engine)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <FieldLabel>主题</FieldLabel>
              <Select
                value={draft.theme}
                onChange={(event) => setDraft((current) => ({ ...current, theme: event.target.value }))}
              >
                {THEME_OPTIONS.map((theme) => (
                  <option key={theme.value} value={theme.value}>
                    {theme.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <FieldLabel>会话预算 USD</FieldLabel>
              <Input
                inputMode="decimal"
                value={draft.sessionBudgetUsd}
                onChange={(event) => setDraft((current) => ({ ...current, sessionBudgetUsd: event.target.value }))}
              />
            </div>

            <div>
              <FieldLabel>周预算 USD</FieldLabel>
              <Input
                inputMode="decimal"
                value={draft.weeklyBudgetUsd}
                onChange={(event) => setDraft((current) => ({ ...current, weeklyBudgetUsd: event.target.value }))}
              />
            </div>

            <div>
              <FieldLabel>Codex 接口地址</FieldLabel>
              <Input
                value={draft.codexEndpoint}
                onChange={(event) => setDraft((current) => ({ ...current, codexEndpoint: event.target.value }))}
                placeholder="https://api.openai.com/v1/responses"
              />
            </div>

            <div>
              <FieldLabel>Codex 模型</FieldLabel>
              <Input
                value={draft.codexModel}
                onChange={(event) => setDraft((current) => ({ ...current, codexModel: event.target.value }))}
                placeholder="gpt-5-codex"
              />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Codex API Key</FieldLabel>
              <Input
                type="password"
                value={draft.codexApiKey}
                onChange={(event) => setDraft((current) => ({ ...current, codexApiKey: event.target.value }))}
                placeholder="sk-..."
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-zinc-100">引擎健康检查</div>
                <div className="mt-1 text-xs text-zinc-400">
                  在不挤占布局的前提下，检查接口地址、模型和 API Key 是否可用
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" loading={engineStatusPending} onClick={onRefreshEngineStatuses}>
                <RefreshCcw className="size-3.5" />
                刷新
              </Button>
            </div>

            <div className="grid gap-3">
              {engineStatuses.map((status) => (
                <div key={status.engine} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <KeyRound className="size-4 text-amber-400" />
                        {engineLabel(status.engine)}
                      </div>
                      <div className="mt-2 max-w-xl text-xs leading-5 text-zinc-400">{status.detail}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={statusTone(status)}>{status.available ? "就绪" : "需关注"}</Badge>
                      <Badge tone={status.configured ? "info" : "warning"}>
                        {status.configured ? "已配置" : "未完成"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                <Sparkles className="size-4 text-sky-400" />
                开机启动
              </div>
              <div className="mt-1 text-xs text-zinc-400">让 Fangyu Code 在系统启动后随时可用</div>
            </div>
            <Toggle
              checked={draft.autostartEnabled}
              onPressedChange={(next) => setDraft((current) => ({ ...current, autostartEnabled: next }))}
              label={draft.autostartEnabled ? "已启用" : "已关闭"}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              variant="secondary"
              className="border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white"
              loading={settingsPending}
              onClick={() => {
                const sessionBudget = Number(draft.sessionBudgetUsd);
                const weeklyBudget = Number(draft.weeklyBudgetUsd);

                onSaveSettings({
                  theme: draft.theme,
                  defaultEngine: draft.defaultEngine,
                  autostartEnabled: draft.autostartEnabled,
                  sessionBudgetUsd: Number.isFinite(sessionBudget) ? sessionBudget : settings.sessionBudgetUsd,
                  weeklyBudgetUsd: Number.isFinite(weeklyBudget) ? weeklyBudget : settings.weeklyBudgetUsd,
                  codexEndpoint: draft.codexEndpoint,
                  codexModel: draft.codexModel,
                  codexApiKey: draft.codexApiKey,
                  skillsEnabled: settings.skillsEnabled,
                  disabledSkillIds: settings.disabledSkillIds,
                  manualSkillIds: settings.manualSkillIds,
                });
              }}
            >
              <Save className="size-4" />
              保存设置
            </Button>
          </div>
        </section>
      </div>
    </Panel>
  );
}
