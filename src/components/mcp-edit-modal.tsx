import { useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldLabel,
  Input,
  Textarea,
  Toggle,
  toast,
} from "@/components/ui";
import { desktopApi } from "@/lib/desktop";
import { type McpUpsertRequest } from "@/lib/types";

type McpEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: McpUpsertRequest;
};

function createDefaultForm(): McpUpsertRequest {
  return {
    name: "",
    spec: {
      transport: "",
      command: "",
      args: [],
      url: "",
      env: {},
      timeoutMs: null,
    },
    enabled: true,
    targetApps: [],
    description: "",
    tags: [],
  };
}

export function McpEditModal({ open, onOpenChange, initialData }: McpEditModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<McpUpsertRequest>(createDefaultForm);

  useEffect(() => {
    setForm(initialData ?? createDefaultForm());
  }, [initialData, open]);

  function handleChange(field: keyof McpUpsertRequest, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSpecChange(field: keyof McpUpsertRequest["spec"], value: unknown) {
    setForm((prev) => ({
      ...prev,
      spec: { ...prev.spec, [field]: value },
    }));
  }

  function parseCommaSeparated(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseEnv(value: string) {
    const entries = value.split("\n");
    const env: Record<string, string> = {};

    for (const line of entries) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) {
        env[key.trim()] = rest.join("=").trim();
      }
    }

    return env;
  }

  async function submit() {
    if (!form.spec.transport) {
      toast({ title: "请选择传输方式", variant: "destructive" });
      return;
    }
    if (form.spec.transport === "stdio" && !form.spec.command) {
      toast({ title: "stdio 模式必须填写命令", variant: "destructive" });
      return;
    }
    if ((form.spec.transport === "http" || form.spec.transport === "sse") && !form.spec.url) {
      toast({ title: "http / sse 模式必须填写 URL", variant: "destructive" });
      return;
    }

    try {
      await desktopApi.upsertMcpServer(form);
      toast({ title: isEdit ? "MCP 服务已更新" : "MCP 服务已新增" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "保存 MCP 服务失败",
        description: String(error),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="panel-surface border-zinc-800 bg-zinc-900/95 sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">{isEdit ? "编辑 MCP 服务" : "新增 MCP 服务"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>ID</FieldLabel>
              <Input
                value={form.id ?? ""}
                onChange={(event) => handleChange("id", event.target.value || undefined)}
                placeholder="可选，不填则根据名称自动生成"
                disabled={isEdit}
              />
            </div>

            <div>
              <FieldLabel>名称</FieldLabel>
              <Input
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="服务显示名称"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>传输方式</FieldLabel>
              <Input
                value={form.spec.transport}
                onChange={(event) => handleSpecChange("transport", event.target.value)}
                placeholder="stdio / http / sse"
              />
            </div>

            <div>
              <FieldLabel>命令</FieldLabel>
              <Input
                value={form.spec.command ?? ""}
                onChange={(event) => handleSpecChange("command", event.target.value || undefined)}
                placeholder="stdio 模式必填"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>参数</FieldLabel>
              <Input
                value={form.spec.args?.join(", ") ?? ""}
                onChange={(event) => handleSpecChange("args", parseCommaSeparated(event.target.value))}
                placeholder="逗号分隔"
              />
            </div>

            <div>
              <FieldLabel>URL</FieldLabel>
              <Input
                value={form.spec.url ?? ""}
                onChange={(event) => handleSpecChange("url", event.target.value || undefined)}
                placeholder="http / sse 模式必填"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>超时（毫秒）</FieldLabel>
              <Input
                type="number"
                value={form.spec.timeoutMs ?? ""}
                onChange={(event) =>
                  handleSpecChange("timeoutMs", event.target.value ? Number(event.target.value) : null)
                }
                placeholder="可选"
              />
            </div>

            <div>
              <FieldLabel>目标应用</FieldLabel>
              <Input
                value={form.targetApps?.join(", ") ?? ""}
                onChange={(event) => handleChange("targetApps", parseCommaSeparated(event.target.value))}
                placeholder="逗号分隔，例如 opencode"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-zinc-100">启用状态</div>
                <div className="mt-1 text-xs text-zinc-400">关闭后该 MCP 服务不会参与桌面端集成。</div>
              </div>
              <Toggle
                checked={form.enabled ?? true}
                onPressedChange={(checked) => handleChange("enabled", checked)}
                label={form.enabled ? "已启用" : "已禁用"}
              />
            </div>
          </div>

          <div>
            <FieldLabel>环境变量</FieldLabel>
            <Textarea
              value={Object.entries(form.spec.env ?? {})
                .map(([key, value]) => `${key}=${value}`)
                .join("\n")}
              onChange={(event) => handleSpecChange("env", parseEnv(event.target.value))}
              placeholder={"每行一个变量\n例如：API_KEY=xxx"}
              className="min-h-[120px] rounded-2xl"
            />
          </div>

          <div>
            <FieldLabel>描述</FieldLabel>
            <Textarea
              value={form.description ?? ""}
              onChange={(event) => handleChange("description", event.target.value)}
              placeholder="说明这个服务的用途、连接方式或适用场景"
              className="min-h-[110px] rounded-2xl"
            />
          </div>

          <div>
            <FieldLabel>标签</FieldLabel>
            <Input
              value={form.tags?.join(", ") ?? ""}
              onChange={(event) => handleChange("tags", parseCommaSeparated(event.target.value))}
              placeholder="逗号分隔"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void submit()}>{isEdit ? "保存修改" : "新增服务"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
