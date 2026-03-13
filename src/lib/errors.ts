const KNOWN_ERRORS: Array<{ match: RegExp; message: string }> = [
  { match: /queue is full/i, message: "队列已满，请稍后再试。" },
  { match: /only queued tasks can be edited/i, message: "只有排队中的任务可以编辑。" },
  { match: /task is not in the queue/i, message: "任务已不在队列中。" },
  { match: /unknown task/i, message: "任务不存在或已被清理。" },
  { match: /batch prompts must not be empty/i, message: "批量提示词不能为空。" },
  {
    match: /missing endpoint, model, or api key/i,
    message: "请先完成引擎配置（Endpoint、Model、API Key）。",
  },
  { match: /mcp server id is required/i, message: "MCP 服务 ID 不能为空。" },
  { match: /failed to open path/i, message: "无法打开该路径，请检查权限或路径是否有效。" },
  { match: /failed to open logs directory/i, message: "无法打开日志目录，请检查权限。" },
];

export function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message || "";
    const hit = KNOWN_ERRORS.find((item) => item.match.test(message));
    return hit ? hit.message : message;
  }

  return "桌面桥接返回了未知错误。";
}
