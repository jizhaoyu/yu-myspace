import { motion } from "framer-motion";
import { Clock3, History, Search, Sparkles } from "lucide-react";

import { Badge, Button, Input, Panel } from "@/components/ui";
import {
  type ConversationSessionView,
  type HistorySearchResult,
  type PromptMessageView,
} from "@/lib/types";
import { cn, formatRelative, snippet } from "@/lib/utils";

type HistorySidebarProps = {
  sessionId: string;
  sessions: ConversationSessionView[];
  messages: PromptMessageView[];
  sessionPending: boolean;
  sessionError: string | null;
  searchQuery: string;
  searchPending: boolean;
  searchResult: HistorySearchResult | null;
  onSearchQueryChange: (value: string) => void;
  onSelectSession: (sessionId: string) => void;
  onRefreshSession: (sessionId: string) => void;
  refreshPending: boolean;
};

export function HistorySidebar({
  sessionId,
  sessions,
  messages,
  sessionPending,
  sessionError,
  searchQuery,
  searchPending,
  searchResult,
  onSearchQueryChange,
  onSelectSession,
  onRefreshSession,
  refreshPending,
}: HistorySidebarProps) {
  const recentMessages = [...messages].slice(-5).reverse();

  return (
    <Panel
      title="会话"
      description="搜索历史记录，并在持久化会话上下文之间切换。"
      className="h-full"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="搜索提示词、片段或输出内容..."
            className="pl-11"
          />
        </div>

        {searchQuery.trim().length >= 2 ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/72 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                <Sparkles className="size-4 text-sky-400" />
                搜索结果
              </div>
              <Badge tone="info">
                {searchPending ? "搜索中" : `${searchResult?.hits.length ?? 0} 条`}
              </Badge>
            </div>

            <div className="custom-scrollbar max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {searchResult?.hits.length ? (
                searchResult.hits.map((hit, index) => (
                  <motion.button
                    key={`${hit.sessionId}:${hit.messageId}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    type="button"
                    onClick={() => onSelectSession(hit.sessionId)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                        {hit.role}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {formatRelative(hit.createdAt)}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-100">{hit.snippet}</p>
                  </motion.button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-400">
                  {searchPending ? "正在搜索历史记录..." : "未找到匹配内容。"}
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/72 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <History className="size-4 text-amber-400" />
              会话列表
            </div>
            <Badge tone="neutral">{sessions.length}</Badge>
          </div>

          <div className="custom-scrollbar max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {sessionError ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-200">
                {sessionError}
              </div>
            ) : sessionPending && !sessions.length ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-6 text-center text-sm text-zinc-400">
                正在加载会话...
              </div>
            ) : sessions.length ? (
              sessions.map((item) => {
                const active = item.id === sessionId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSession(item.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-all",
                      active
                        ? "border-sky-500/30 bg-sky-500/10 shadow-[0_0_0_1px_rgba(14,165,233,0.08)_inset]"
                        : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-100">
                          {snippet(item.title || "未命名会话", 40)}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                          <span>{item.activeEngine}</span>
                          <span className="size-1 rounded-full bg-zinc-700" />
                          <span>{formatRelative(item.updatedAt)}</span>
                        </div>
                      </div>
                      {active ? <Badge tone="info">当前</Badge> : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-400">
                暂无会话。
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/72 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Clock3 className="size-4 text-zinc-400" />
              最近消息
            </div>
            {sessionId ? (
              <Button
                size="sm"
                variant="ghost"
                loading={refreshPending}
                onClick={() => onRefreshSession(sessionId)}
              >
                刷新
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            {recentMessages.length ? (
              recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
                >
                  <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    {message.role}
                  </div>
                  <p className="text-sm leading-6 text-zinc-100">
                    {snippet(message.content, 132)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-400">
                这个会话还没有持久化消息。
              </div>
            )}
          </div>
        </section>
      </div>
    </Panel>
  );
}
