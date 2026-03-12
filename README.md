# yu-myspace

`yu-myspace` 是一个面向桌面场景的 AI 工作台项目，采用 **Java（桌面/领域服务） + React（前端 UI）** 的组合，提供任务编排、消息流展示与本地运行能力。

项目目标：把多模型/多任务协作能力收敛到统一的桌面应用中，方便日常开发与提示词工作流管理。

## 项目简介

- 以桌面应用为载体，支持本地运行与服务编排。
- 前端负责交互界面与状态管理，后端负责任务调度与领域服务。
- 适合用于构建 AI 对话、任务队列与执行监督等工作流场景。

## 主要功能

- 提示词任务提交与队列管理。
- 消息流式展示与任务进度反馈。
- 监督与调度能力（任务分发、执行状态追踪、历史记录支持）。
- 多 AI 引擎接入能力（通过后端引擎层统一封装）。
- MCP 服务器管理（UI 侧进行配置/编辑，便于接入外部工具能力）。

## 技术栈

- Java（桌面运行时与领域服务）
- React + TypeScript + Vite
- Tailwind CSS
- 测试：Vitest + Testing Library

## 目录结构

- `src/`：前端应用代码（页面、组件、状态管理与类型定义）。
- `src-java/`：Java 业务代码（引擎、服务、模型与桌面命令）。
- `src/main/resources/`：后端资源文件（如配置与数据库初始化脚本）。
- `skills/`：项目本地技能文档与辅助脚本。
- `krema.toml`：桌面应用相关配置。
- `pom.xml`：Java 侧构建配置。
- `package.json`：前端依赖与脚本配置。

## 环境要求

- Node.js 18 及以上（建议使用 LTS）
- npm 9 及以上
- JDK 17 及以上（用于 Java 后端构建/运行）

## 本地开发

```bash
npm ci
npm run dev
```

## 测试

```bash
npm run test
```

## 构建

```bash
npm run build
```

## 常用命令

```bash
# 前端开发
npm run dev

# 测试
npm run test

# 前端构建
npm run build

# 前端预览
npm run preview

# 代码检查
npm run lint
```

## 开发建议

- 首次拉取后先执行 `npm ci`，保证依赖与锁文件一致。
- 如需清理构建产物，可删除 `dist/`、`target/` 与 `*.tsbuildinfo` 后重新构建。
- 提交前建议至少执行一次 `npm run lint` 与 `npm run build`。

## 约定

每次发布到 GitHub 时，同步更新本 `README.md` 并与代码一同提交。
