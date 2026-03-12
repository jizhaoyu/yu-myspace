import { PlugZap, RefreshCcw, Plus } from "lucide-react";
import { useState } from "react";
import { McpEditModal } from "./mcp-edit-modal";

import { Badge, Button, Panel } from "@/components/ui";
import { type McpRegistrySnapshot } from "@/lib/types";
import { formatRelative, snippet } from "@/lib/utils";

type McpPanelProps = {
  snapshot: McpRegistrySnapshot | null;
  pending: boolean;
  syncing: boolean;
  importing: boolean;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onSync: () => void;
  onImport: () => void;
  onRefresh: () => void;
};

export function McpPanel({
  snapshot,
  pending,
  syncing,
  importing,
  onToggleEnabled,
  onSync,
  onImport,
  onRefresh,
}: McpPanelProps) {
  const servers = snapshot?.servers ?? [];
  const [showEdit, setShowEdit] = useState(false);

  return (
    <Panel
      title="MCP 管理"
      description="最小配置面板：查看服务、启停切换、同步到 OpenCode。"
      actions={<Badge tone="info">{servers.length} Servers</Badge>}
      className="h-full"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onRefresh} loading={pending}>
            <RefreshCcw className="size-3.5" />
            刷新
          </Button>
          <Button type="button" size="sm" variant="primary" onClick={onSync} loading={syncing}>
            <PlugZap className="size-3.5" />
            同步到 OpenCode
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowEdit(true)} loading={pending}>
            新增服务器
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onImport} loading={importing}>
            从 OpenCode 导入
          </Button>
        </div>

        {snapshot ? (
          <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-slate-400">
            <div>Registry: {snippet(snapshot.registryPath, 64)}</div>
            <div>OpenCode: {snippet(snapshot.opencodeConfigPath, 64)}</div>
          </div>
        ) : null}

        {servers.length ? (
          <div className="custom-scrollbar max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {servers.map((server) => (
              <article key={server.id} className="rounded-2xl border border-white/8 bg-slate-950/34 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{server.name}</div>
                    <div className="text-xs text-slate-400">{server.id}</div>
                  </div>
                  <Badge tone={server.enabled ? "success" : "warning"}>
                    {server.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  transport {server.spec.transport} · apps {(server.targetApps ?? []).join(", ") || "-"}
                </div>
                <div className="mt-1 text-xs text-slate-500">更新于 {formatRelative(server.updatedAt)}</div>

                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    loading={pending}
                    onClick={() => onToggleEnabled(server.id, !server.enabled)}
                  >
                    {server.enabled ? "禁用" : "启用"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
            还没有 MCP 服务。先通过命令或后续管理页新增，再在此启停与同步。
          </div>
        )}
      </div>
    </Panel>
    {showEdit && <McpEditModal open={showEdit} onOpenChange={setShowEdit} />}
  );
}
