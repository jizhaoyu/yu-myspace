import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRelative(epochMillis: number) {
  if (!epochMillis) {
    return "刚刚";
  }

  const delta = Date.now() - epochMillis;
  const minutes = Math.round(delta / 60000);

  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }

  const days = Math.round(hours / 24);
  return `${days} 天前`;
}

export function clampPercent(value: number) {
  const normalized = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, normalized));
}

export function formatDateTime(epochMillis: number) {
  if (!epochMillis) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(epochMillis);
}

export function taskStatusLabel(status: string) {
  switch (status) {
    case "QUEUED":
      return "排队中";
    case "PROCESSING":
      return "执行中";
    case "PAUSED":
      return "已暂停";
    case "COMPLETED":
      return "已完成";
    case "FAILED":
      return "失败";
    case "CANCELED":
      return "已取消";
    default:
      return status;
  }
}

export function engineLabel(engine: string) {
  switch (engine) {
    case "OPENAI_CODEX":
      return "OpenAI Codex";
    case "CLAUDE_CODE":
      return "Claude Code";
    case "GEMINI":
      return "Gemini";
    default:
      return engine;
  }
}

export function snippet(value: string, maxLength = 88) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 3)}...`;
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
