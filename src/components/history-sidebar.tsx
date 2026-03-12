import { motion } from "framer-motion";
import { Clock3, Search, Sparkles } from "lucide-react";

import { Badge, Button, Input, Panel } from "@/components/ui";
import {
  type ConversationSessionView,
  type HistorySearchResult,
  type PromptMessageView,
} from "@/lib/types";
import { formatRelative, snippet } from "@/lib/utils";

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
  const recentMessages = [...messages].slice(-4).reverse();

  return (
    <Panel
      title="历史与会话"
      description="搜索 SQLite 历史记录，并快速切换上下文会话。"
      className="h-full"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="搜索历史片段、任务名或输出..."
            className="pl-11"
          />
        </div>

        {searchQuery.trim().length >= 2 ? (
          <div className="rounded-[24px] border border-white/8 bg-slate-950/34 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <Sparkles className="size-4 text-sky-300" />
                搜索结果
              </div>
              <Badge tone="info">
                {searchPending ? "Searching" : `${searchResult?.hits.length ?? 0} Hits`}
              </Badge>
            </div>
            <div className="custom-scrollbar max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {searchResult?.hits.length ? (
                searchResult.hits.map((hit, index) => (
                  <motion.button
                    key={`${hit.sessionId}:${hit.messageId}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    type="button"
                    onClick={() => onSelectSession(hit.sessionId)}
                    className="w-full rounded-2xl border border-white/8 bg-white/4 p-3 text-left transition hover:bg-white/8"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {hit.role}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatRelative(hit.createdAt)}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-100">
                      {hit.snippet}
                    </p>
                  </motion.button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                  {searchPending ? "正在检索历史..." : "未找到匹配内容。"}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-[24px] border border-white/8 bg-slate-950/34 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
              <Clock3 className="size-4 text-amber-300" />
              会话列表
            </div>
            <Badge tone="neutral">{sessions.length}</Badge>
          </div>
          <div className="custom-scrollbar max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {sessionError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-100">
                {sessionError}
              </div>
            ) : sessionPending && !sessions.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-6 text-center text-sm text-slate-400">
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
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-sky-300/25 bg-sky-400/10"
                        : "border-white/8 bg-white/4 hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-100">
                        {snippet(item.title || "未命名会话", 40)}
                      </div>
                      {active ? <Badge tone="info">Current</Badge> : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{item.activeEngine}</span>
                      <span>{formatRelative(item.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                还没有历史会话。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-slate-950/34 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-slate-100">当前会话最近消息</div>
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
                  className="rounded-2xl border border-white/8 bg-white/4 p-3"
                >
                  <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {message.role}
                  </div>
                  <p className="text-sm leading-6 text-slate-200">
                    {snippet(message.content, 120)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                该会话还没有持久化消息。
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
