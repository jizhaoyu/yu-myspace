import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui";
import { Button, Input, Switch, Label, toast } from "@/components/ui";
import { desktopApi } from "@/lib/desktop";
import { type McpUpsertRequest } from "@/lib/types";

/**
 * McpEditModal - a modal dialog for adding or editing an MCP server entry.
 *
 * Props:
 *   open: boolean – whether the modal is visible.
 *   onOpenChange: (open: boolean) => void – callback to control visibility.
 *   initialData?: McpUpsertRequest – optional existing data for edit mode.
 */
export function McpEditModal({
  open,
  onOpenChange,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: McpUpsertRequest;
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<McpUpsertRequest>({
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
  });

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      // reset to defaults when modal opens for creation
      setForm({
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
      });
    }
  }, [initialData, open]);

  const handleChange = (field: keyof McpUpsertRequest, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecChange = (
    field: keyof McpUpsertRequest["spec"],
    value: unknown,
  ) => {
    setForm((prev) => ({
      ...prev,
      spec: { ...prev.spec, [field]: value },
    }));
  };

  const parseCommaSeparated = (value: string) =>
    value.split(",").map((s) => s.trim()).filter(Boolean);

  const parseEnv = (value: string) => {
    const entries = value.split("\n");
    const map: Record<string, string> = {};
    for (const line of entries) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) {
        map[k.trim()] = rest.join("=").trim();
      }
    }
    return map;
  };

  const submit = async () => {
    // simple validation – required fields
    if (!form.spec.transport) {
      toast({ title: "Transport is required", variant: "destructive" });
      return;
    }
    if (form.spec.transport === "stdio" && !form.spec.command) {
      toast({ title: "Command required for stdio transport", variant: "destructive" });
      return;
    }
    if ((form.spec.transport === "http" || form.spec.transport === "sse") && !form.spec.url) {
      toast({ title: "URL required for http/sse transport", variant: "destructive" });
      return;
    }
    try {
      await desktopApi.upsertMcpServer(form);
      toast({ title: isEdit ? "MCP server updated" : "MCP server added" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to upsert MCP server", description: String(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑 MCP 服务器" : "新增 MCP 服务器"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* ID */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="id" className="text-right">ID</Label>
            <Input
              id="id"
              value={form.id ?? ""}
              onChange={(e) => handleChange("id", e.target.value || undefined)}
              placeholder="optional – will be generated from name if empty"
              className="col-span-2"
              disabled={isEdit}
            />
          </div>
          {/* Name */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="name" className="text-right">名称</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="display name"
              className="col-span-2"
            />
          </div>
          {/* Transport */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="transport" className="text-right">Transport</Label>
            <Input
              id="transport"
              value={form.spec.transport}
              onChange={(e) => handleSpecChange("transport", e.target.value)}
              placeholder="stdio / http / sse"
              className="col-span-2"
            />
          </div>
          {/* Command */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="command" className="text-right">Command</Label>
            <Input
              id="command"
              value={form.spec.command ?? ""}
              onChange={(e) => handleSpecChange("command", e.target.value || undefined)}
              placeholder="optional – required for stdio"
              className="col-span-2"
            />
          </div>
          {/* Args */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="args" className="text-right">Args</Label>
            <Input
              id="args"
              value={form.spec.args?.join(", ") ?? ""}
              onChange={(e) => handleSpecChange("args", parseCommaSeparated(e.target.value))}
              placeholder="comma separated"
              className="col-span-2"
            />
          </div>
          {/* URL */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="url" className="text-right">URL</Label>
            <Input
              id="url"
              value={form.spec.url ?? ""}
              onChange={(e) => handleSpecChange("url", e.target.value || undefined)}
              placeholder="required for http/sse"
              className="col-span-2"
            />
          </div>
          {/* Env */}
          <div className="grid grid-cols-3 items-start gap-4">
            <Label htmlFor="env" className="text-right">Env</Label>
            <textarea
              id="env"
              rows={3}
              value={Object.entries(form.spec.env ?? {})
                .map(([k, v]) => `${k}=${v}`)
                .join("\n")}
              onChange={(e) => handleSpecChange("env", parseEnv(e.target.value))}
              placeholder="key=value per line"
              className="col-span-2 w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          {/* Timeout */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="timeout" className="text-right">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={form.spec.timeoutMs ?? ""}
              onChange={(e) =>
                handleSpecChange("timeoutMs", e.target.value ? Number(e.target.value) : null)
              }
              placeholder="optional"
              className="col-span-2"
            />
          </div>
          {/* Enabled */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="enabled" className="text-right">Enabled</Label>
            <Switch
              id="enabled"
              checked={form.enabled ?? true}
              onCheckedChange={(checked: boolean) => handleChange("enabled", checked)}
              className="col-span-2"
            />
          </div>
          {/* Target Apps */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="targetApps" className="text-right">Target Apps</Label>
            <Input
              id="targetApps"
              value={form.targetApps?.join(", ") ?? ""}
              onChange={(e) => handleChange("targetApps", parseCommaSeparated(e.target.value))}
              placeholder="comma separated, e.g. opencode"
              className="col-span-2"
            />
          </div>
          {/* Description */}
          <div className="grid grid-cols-3 items-start gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <textarea
              id="description"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="col-span-2 w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          {/* Tags */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <Input
              id="tags"
              value={form.tags?.join(", ") ?? ""}
              onChange={(e) => handleChange("tags", parseCommaSeparated(e.target.value))}
              placeholder="comma separated"
              className="col-span-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>{isEdit ? "更新" : "新增"}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
