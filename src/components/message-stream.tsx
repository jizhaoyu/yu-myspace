import { motion } from "framer-motion";
import { MessageSquareText, RadioTower } from "lucide-react";

import { Badge, Panel } from "@/components/ui";
import { type PromptMessageView, type PromptTaskSnapshot } from "@/lib/types";
import { currency, formatDateTime, snippet } from "@/lib/utils";

type MessageStreamProps = {
  sessionId: string;
  messages: PromptMessageView[];
  tasks: Record<string, PromptTaskSnapshot>;
  streamingByTask: Record<string, string>;
};

export function MessageStream({
  sessionId,
  messages,
  tasks,
  streamingByTask,
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
      title="会话流"
      description="展示当前会话已落库消息，以及正在流式输出的 assistant chunk。"
      actions={
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{messages.length} Messages</Badge>
          {liveEntries.length ? <Badge tone="info">{liveEntries.length} Live</Badge> : null}
        </div>
      }
      className="h-full"
    >
      <div className="custom-scrollbar max-h-[640px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <motion.article
            key={message.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`rounded-[24px] border p-4 ${
              message.role === "assistant"
                ? "border-sky-400/18 bg-sky-400/8"
                : "border-white/8 bg-slate-950/36"
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone={message.role === "assistant" ? "info" : "accent"}>
                  {message.role}
                </Badge>
                {message.taskId ? (
                  <Badge tone="neutral">{snippet(message.taskId, 14)}</Badge>
                ) : null}
              </div>
              <div className="text-xs text-slate-500">
                {formatDateTime(message.createdAt)}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">
              {message.content}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Input {message.inputTokens}</span>
              <span>Output {message.outputTokens}</span>
              <span>Cost {currency(message.costUsd)}</span>
            </div>
          </motion.article>
        ))}

        {liveEntries.map((entry) => (
          <article
            key={`live:${entry.taskId}`}
            className="rounded-[24px] border border-dashed border-amber-300/25 bg-amber-400/8 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RadioTower className="size-4 text-amber-300" />
                <span className="text-sm font-medium text-amber-100">
                  Live assistant output
                </span>
              </div>
              <Badge tone="accent">{entry.task ? entry.task.engine : "Unknown"}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">
              {entry.chunk}
            </p>
          </article>
        ))}

        {!messages.length && !liveEntries.length ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 px-5 py-12 text-center text-sm text-slate-400">
            <MessageSquareText className="mx-auto mb-3 size-5 text-slate-500" />
            当前会话还没有消息。提交 Prompt 后，历史消息和流式输出会出现在这里。
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
