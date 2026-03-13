import { ShieldAlert, ShieldCheck, SplitSquareVertical } from "lucide-react";

import { Badge, Panel, ProgressBar } from "@/components/ui";
import {
  type PromptTaskSnapshot,
  type SupervisorSnapshot,
  type TaskProgressEvent,
} from "@/lib/types";
import { clampPercent, formatRelative, snippet } from "@/lib/utils";

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
      title="监督"
      description="跟踪主执行通道与复核通道，识别降级状态，并查看互相影响。"
      actions={<Badge tone="info">双通道</Badge>}
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
                  degraded ? "border-rose-500/24 bg-rose-500/10" : "border-zinc-800 bg-zinc-950/72"
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
                      <span className="text-sm font-medium text-zinc-50">
                        {task ? snippet(task.prompt, 76) : item.taskId}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={degraded ? "danger" : "success"}>
                        {degraded ? "已降级" : "健康"}
                      </Badge>
                      <Badge tone="neutral">{item.primaryStatus}</Badge>
                      <Badge tone="neutral">{item.reviewerStatus}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">{formatRelative(item.updatedAt)}</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                      <span>主执行</span>
                      <span>{clampPercent(item.primaryProgress).toFixed(0)}%</span>
                    </div>
                    <ProgressBar
                      className="bg-zinc-800"
                      indicatorClassName="bg-[linear-gradient(90deg,rgba(56,189,248,0.92),rgba(96,165,250,0.92))]"
                      value={clampPercent(item.primaryProgress)}
                    />
                    <p className="mt-2 text-xs leading-6 text-zinc-300">
                      {item.primaryRecommendation || "主执行通道当前运行正常。"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                      <span>复核</span>
                      <span>{clampPercent(item.reviewerProgress).toFixed(0)}%</span>
                    </div>
                    <ProgressBar
                      className="bg-zinc-800"
                      value={clampPercent(item.reviewerProgress)}
                      indicatorClassName="bg-[linear-gradient(90deg,rgba(16,185,129,0.92),rgba(56,189,248,0.92))]"
                    />
                    <p className="mt-2 text-xs leading-6 text-zinc-300">
                      {item.reviewerRecommendation || "复核通道暂未产生额外建议。"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-300">
                  <div className="mb-2 flex items-center gap-2 font-medium text-zinc-200">
                    <SplitSquareVertical className="size-3.5 text-sky-400" />
                    相互影响
                  </div>
                  <div>{progressEvent?.peerImpact || item.peerImpact || "当前没有跨任务影响反馈。"}</div>
                  <div className="mt-2 text-zinc-400">
                    建议动作 {progressEvent?.recommendedAction || "继续观察"}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-zinc-800 bg-zinc-950/60 px-5 py-10 text-sm text-zinc-400">
          还没有双监督任务。可在“编排”工作区开启双监督后回到这里查看。
        </div>
      )}
    </Panel>
  );
}
