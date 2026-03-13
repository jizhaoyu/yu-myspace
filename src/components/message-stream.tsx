import { motion } from "framer-motion";
import { Copy, MessageSquareText, RadioTower } from "lucide-react";

import { Badge, Button, Panel } from "@/components/ui";
import { type PromptMessageView, type PromptTaskSnapshot } from "@/lib/types";
import { currency, formatDateTime, snippet } from "@/lib/utils";

type MessageStreamProps = {
  sessionId: string;
  messages: PromptMessageView[];
  tasks: Record<string, PromptTaskSnapshot>;
  streamingByTask: Record<string, string>;
  onCopyMessage: (content: string) => void;
};

export function MessageStream({
  sessionId,
  messages,
  tasks,
  streamingByTask,
  onCopyMessage,
}: MessageStreamProps) {
  const liveEntries = Object.entries(streamingByTask)
    .map(([taskId, chunk]) => ({
      taskId,
      chunk,
      task: tasks[taskId],
    }))
    .filter((item) => item.task?.sessionId === sessionId && item.chunk.trim().length > 0)
    .sort((left, right) => (left.task?.createdAt ?? 0) - (right.task?.createdAt ?? 0));

  return (
    <Panel
      title="会话内容"
      description="查看当前会话的持久化对话，以及实时流式输出。"
      actions={
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{messages.length} 条消息</Badge>
          {liveEntries.length ? <Badge tone="info">{liveEntries.length} 路实时输出</Badge> : null}
        </div>
      }
      className="h-full"
    >
      <div className="custom-scrollbar max-h-[760px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <motion.article
            key={message.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`rounded-[24px] border p-4 ${
              message.role === "assistant"
                ? "border-sky-500/20 bg-sky-500/10"
                : "border-zinc-800 bg-zinc-950/72"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone={message.role === "assistant" ? "info" : "accent"}>
                  {message.role}
                </Badge>
                {message.taskId ? <Badge tone="neutral">{snippet(message.taskId, 14)}</Badge> : null}
              </div>
              <div className="text-xs text-zinc-500">{formatDateTime(message.createdAt)}</div>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-50">
              {message.content}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                <span>输入 {message.inputTokens}</span>
                <span>输出 {message.outputTokens}</span>
                <span>成本 {currency(message.costUsd)}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onCopyMessage(message.content)}
              >
                <Copy className="size-3.5" />
                复制
              </Button>
            </div>
          </motion.article>
        ))}

        {liveEntries.map((entry) => (
          <article
            key={`live:${entry.taskId}`}
            className="rounded-[24px] border border-dashed border-sky-500/24 bg-sky-500/8 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RadioTower className="size-4 text-sky-400" />
                <span className="text-sm font-medium text-zinc-50">助手实时输出</span>
              </div>
              <Badge tone="accent">{entry.task ? entry.task.engine : "未知"}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-50">{entry.chunk}</p>
          </article>
        ))}

        {!messages.length && !liveEntries.length ? (
          <div className="rounded-[24px] border border-dashed border-zinc-800 bg-zinc-950/60 px-5 py-12 text-center text-sm text-zinc-400">
            <MessageSquareText className="mx-auto mb-3 size-5 text-zinc-500" />
            当前会话还没有消息。前往“编排”提交提示词后即可开始。
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
