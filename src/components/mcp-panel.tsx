import { useState } from "react";
import { CheckCircle2, FileStack, FolderSearch, PlugZap, RefreshCcw } from "lucide-react";

import { McpEditModal } from "./mcp-edit-modal";

import { Badge, Button, Panel } from "@/components/ui";
import { type McpRegistrySnapshot } from "@/lib/types";
import { formatRelative, snippet } from "@/lib/utils";

type McpPanelProps = {
  snapshot: McpRegistrySnapshot | null;
  pending: boolean;
  syncing: boolean;
  importing: boolean;
  pickingWorkspace: boolean;
  pickingFiles: boolean;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onSync: () => void;
  onImport: () => void;
  onRefresh: () => void;
  onPickWorkspace: () => Promise<string | null>;
  onPickFiles: () => Promise<string[]>;
};

export function McpPanel({
  snapshot,
  pending,
  syncing,
  importing,
  pickingWorkspace,
  pickingFiles,
  onToggleEnabled,
  onSync,
  onImport,
  onRefresh,
  onPickWorkspace,
  onPickFiles,
}: McpPanelProps) {
  const servers = snapshot?.servers ?? [];
  const [showEdit, setShowEdit] = useState(false);
  const [selectionNote, setSelectionNote] = useState<{ title: string; details: string } | null>(null);

  async function handlePickWorkspace() {
    try {
      const dir = await onPickWorkspace();
      if (dir) {
        setSelectionNote({ title: "已选择工作区", details: dir });
      }
    } catch {
      // 错误通过调用方的全局通知统一处理。
    }
  }

  async function handlePickFiles() {
    try {
      const files = await onPickFiles();
      if (files.length) {
        setSelectionNote({
          title: `已选择 ${files.length} 个文件`,
          details: files.join(" / "),
        });
      }
    } catch {
      // 错误通过调用方的全局通知统一处理。
    }
  }

  return (
    <>
      <Panel
        title="集成"
        description="查看 MCP 服务、切换可用状态，并同步配置到 OpenCode。"
        actions={<Badge tone="info">{servers.length} 个服务</Badge>}
        className="h-full"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onRefresh} loading={pending}>
              <RefreshCcw className="size-3.5" />
              刷新
            </Button>
            <Button type="button" size="sm" variant="primary" onClick={onSync} loading={syncing}>
              <PlugZap className="size-3.5" />
              同步到 OpenCode
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowEdit(true)}
              loading={pending}
            >
              新增服务
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onImport} loading={importing}>
              从 OpenCode 导入
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void handlePickWorkspace()}
              loading={pickingWorkspace}
            >
              <FolderSearch className="size-3.5" />
              选择工作区
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void handlePickFiles()}
              loading={pickingFiles}
            >
              <FileStack className="size-3.5" />
              选择文件
            </Button>
          </div>

          {selectionNote ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                <div className="min-w-0">
                  <div className="font-medium">{selectionNote.title}</div>
                  <div className="mt-1 break-all text-xs leading-6 text-emerald-200/85">
                    {selectionNote.details}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {snapshot ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/72 px-4 py-3 text-xs text-zinc-400">
              <div>注册表：{snippet(snapshot.registryPath, 72)}</div>
              <div className="mt-1">OpenCode：{snippet(snapshot.opencodeConfigPath, 72)}</div>
            </div>
          ) : null}

          {servers.length ? (
            <div className="custom-scrollbar max-h-[640px] space-y-3 overflow-y-auto pr-1">
              {servers.map((server) => (
                <article
                  key={server.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/72 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/90"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-100">{server.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{server.id}</div>
                    </div>
                    <Badge tone={server.enabled ? "success" : "warning"}>
                      {server.enabled ? "已启用" : "已禁用"}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-zinc-400">
                    <div>传输方式 {server.spec.transport}</div>
                    <div>目标应用 {(server.targetApps ?? []).join(", ") || "-"}</div>
                    <div>更新时间 {formatRelative(server.updatedAt)}</div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant={server.enabled ? "ghost" : "secondary"}
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
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-400">
              还没有 MCP 服务。新增或导入一个服务后，即可把外部工具接入桌面工作台。
            </div>
          )}
        </div>
      </Panel>

      {showEdit ? <McpEditModal open={showEdit} onOpenChange={setShowEdit} /> : null}
    </>
  );
}
