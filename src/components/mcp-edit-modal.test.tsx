import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { McpEditModal } from "./mcp-edit-modal";
import { desktopApi } from "@/lib/desktop";

// Mock UI components used by McpEditModal
vi.mock("@/components/ui", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  Button: (props: any) => <button {...props}>{props.children}</button>,
  Input: (props: any) => <input {...props} />,
  Switch: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" checked={checked} onChange={e => onCheckedChange(e.target.checked)} />
  ),
  Label: ({ htmlFor, children }: any) => <label htmlFor={htmlFor}>{children}</label>,
  toast: vi.fn(),
}));

// Mock desktopApi methods
vi.mock("@/lib/desktop", () => ({
  desktopApi: {
    upsertMcpServer: vi.fn().mockResolvedValue({}),
    chooseWorkspaceDirectory: vi.fn().mockResolvedValue(null),
    chooseContextFiles: vi.fn().mockResolvedValue([]),
  },
}));

describe("McpEditModal", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders add mode with empty fields", () => {
    render(<McpEditModal open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByLabelText(/名称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Transport/i)).toBeInTheDocument();
  });

  test("shows validation error when required transport missing", async () => {
    render(<McpEditModal open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /新增/i }));
    await waitFor(() => {
      expect(desktopApi.upsertMcpServer).not.toHaveBeenCalled();
    });
  });

  test("submits successfully and closes modal", async () => {
    render(<McpEditModal open={true} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByLabelText(/名称/i), { target: { value: "Test Server" } });
    fireEvent.change(screen.getByLabelText(/Transport/i), { target: { value: "stdio" } });
    fireEvent.change(screen.getByLabelText(/Command/i), { target: { value: "run" } });
    fireEvent.click(screen.getByRole("button", { name: /新增/i }));
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
    expect(screen.getByLabelText(/名称/i)).toHaveValue("Server One");
    expect(screen.getByLabelText(/Transport/i)).toHaveValue("http");
  });
});