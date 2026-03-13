import { beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { McpEditModal } from "./mcp-edit-modal";

import { desktopApi } from "@/lib/desktop";

const toastMock = vi.fn();

vi.mock("@/components/ui", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  Button: (props: any) => <button {...props}>{props.children}</button>,
  Input: (props: any) => <input aria-label={props["aria-label"] ?? props.placeholder ?? ""} {...props} />,
  Textarea: (props: any) => <textarea aria-label={props["aria-label"] ?? props.placeholder ?? ""} {...props} />,
  FieldLabel: ({ children }: any) => <label>{children}</label>,
  Toggle: ({ checked, onPressedChange, label }: any) => (
    <button type="button" aria-pressed={checked} onClick={() => onPressedChange(!checked)}>
      {label}
    </button>
  ),
  toast: toastMock,
}));

vi.mock("@/lib/desktop", () => ({
  desktopApi: {
    upsertMcpServer: vi.fn().mockResolvedValue({}),
  },
}));

describe("McpEditModal", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders add mode with empty fields", () => {
    render(<McpEditModal open={true} onOpenChange={onOpenChange} />);

    expect(screen.getByText("名称")).toBeInTheDocument();
    expect(screen.getByText("传输方式")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增服务" })).toBeInTheDocument();
  });

  test("shows validation error when transport is missing", async () => {
    render(<McpEditModal open={true} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "新增服务" }));

    await waitFor(() => {
      expect(desktopApi.upsertMcpServer).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalled();
    });
  });

  test("submits successfully and closes modal", async () => {
    render(<McpEditModal open={true} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByPlaceholderText("服务显示名称"), { target: { value: "Test Server" } });
    fireEvent.change(screen.getByPlaceholderText("stdio / http / sse"), { target: { value: "stdio" } });
    fireEvent.change(screen.getByPlaceholderText("stdio 模式必填"), { target: { value: "run" } });
    fireEvent.click(screen.getByRole("button", { name: "新增服务" }));

    await waitFor(() => {
      expect(desktopApi.upsertMcpServer).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("edit mode populates fields", () => {
    const initialData = {
      id: "srv1",
      name: "Server One",
      spec: {
        transport: "http",
        command: "",
        args: [],
        url: "http://example.com",
        env: {},
        timeoutMs: null,
      },
      enabled: true,
      targetApps: ["opencode"],
      description: "desc",
      tags: ["tag1"],
    };

    render(<McpEditModal open={true} onOpenChange={onOpenChange} initialData={initialData} />);

    expect(screen.getByDisplayValue("Server One")).toBeInTheDocument();
    expect(screen.getByDisplayValue("http")).toBeInTheDocument();
  });
});
