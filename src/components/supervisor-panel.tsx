import { ShieldAlert, ShieldCheck, SplitSquareVertical } from "lucide-react";

import { Badge, Panel, ProgressBar } from "@/components/ui";
import {
  type PromptTaskSnapshot,
  type SupervisorSnapshot,
  type TaskProgressEvent,
} from "@/lib/types";
import {
  clampPercent,
  formatRelative,
  snippet,
} from "@/lib/utils";

type SupervisorPanelProps = {
  supervisors: SupervisorSnapshot[];
  tasks: Record<string, PromptTaskSnapshot>;
  progressByTask: Record<string, TaskProgressEvent>;
  activeTaskId: string | null;
};

export function SupervisorPanel({
  supervisors,
  tasks,
  progressByTask,
  activeTaskId,
}: SupervisorPanelProps) {
  const ordered = [...supervisors].sort((left, right) => {
    if (left.taskId === activeTaskId) {
      return -1;
    }
    if (right.taskId === activeTaskId) {
      return 1;
    }

    return right.updatedAt - left.updatedAt;
  });

  return (
    <Panel
      title="双路监督"
      description="观察主执行体与审查体的协同状态，及时识别降级和策略偏移。"
      actions={<Badge tone="info">Supervisor</Badge>}
      className="h-full"
    >
      {ordered.length ? (
        <div className="space-y-3">
          {ordered.map((item) => {
            const task = tasks[item.taskId];
            const progressEvent = progressByTask[item.taskId];
            const degraded = item.degraded;

            return (
              <article
                key={item.taskId}
                className={`rounded-[24px] border p-4 ${
                  degraded
                    ? "border-rose-400/22 bg-rose-500/8"
                    : "border-white/8 bg-slate-950/36"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {degraded ? (
                        <ShieldAlert className="size-4 text-rose-300" />
                      ) : (
                        <ShieldCheck className="size-4 text-emerald-300" />
                      )}
                      <span className="text-sm font-medium text-white">
                        {task ? snippet(task.prompt, 72) : item.taskId}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={degraded ? "danger" : "success"}>
                        {degraded ? "Degraded" : "Healthy"}
                      </Badge>
                      <Badge tone="neutral">{item.primaryStatus}</Badge>
                      <Badge tone="neutral">{item.reviewerStatus}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatRelative(item.updatedAt)}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Primary</span>
                      <span>{clampPercent(item.primaryProgress).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={clampPercent(item.primaryProgress)} />
                    <p className="mt-2 text-xs leading-5 text-slate-300">
                      {item.primaryRecommendation || "主执行体正在持续推进。"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Reviewer</span>
                      <span>{clampPercent(item.reviewerProgress).toFixed(0)}%</span>
                    </div>
                    <ProgressBar
                      value={clampPercent(item.reviewerProgress)}
                      indicatorClassName="bg-[linear-gradient(90deg,rgba(52,211,153,0.82),rgba(56,189,248,0.95))]"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-300">
                      {item.reviewerRecommendation || "审查体还未给出额外建议。"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 rounded-2xl border border-white/8 bg-slate-900/45 p-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <SplitSquareVertical className="size-3.5 text-sky-300" />
                    Peer Impact
                  </div>
                  <div>{progressEvent?.peerImpact || item.peerImpact || "暂无跨任务影响。"} </div>
                  <div className="text-slate-400">
                    推荐动作 {progressEvent?.recommendedAction || "继续观察"}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 px-5 py-10 text-sm text-slate-400">
          当前没有双路监督任务。打开 Composer 的“双路监督”开关后，新任务会在这里显示互监状态。
        </div>
      )}
    </Panel>
  );
}
