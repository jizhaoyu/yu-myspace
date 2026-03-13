# Fangyu Code

Fangyu Code 是一个面向开发者的桌面 AI 编码工作台，采用 `Spring Boot 4 + Krema + React + TypeScript + Vite` 组合构建。它将提示词编排、会话历史、任务队列、预算监控、技能注入和 MCP 服务管理整合到一个本地桌面应用中，适合用于日常开发协作和 AI 工作流管理。

## 1. 项目定位

这个软件不是单纯的聊天窗口，而是一个本地运行的 AI 编码控制台，核心目标是把以下能力统一到一处：

- 编写并提交单任务或批量任务提示词
- 管理任务队列、优先级、插队和重试
- 按会话查看历史消息和任务执行结果
- 跟踪单会话与周预算消耗
- 管理本地技能列表和自动技能匹配
- 管理 MCP Server，并与 OpenCode 配置互通
- 作为桌面程序运行，而不是单纯浏览器页面

## 2. 主要功能

- `Overview`：查看预算、队列状态、引擎健康状态和全局设置
- `Sessions`：查看会话列表、搜索历史消息、切换会话
- `Queue`：查看排队中的任务、调整顺序、取消、重试、复制任务
- `Compose`：编写提示词、绑定工作区、附加上下文文件、切换批量/插队/双监督模式
- `Integrations`：管理 MCP Server，执行导入、同步、启停等操作
- 主题切换：支持浅色/深色主题，并可在界面中直接切换

## 3. 技术栈

- 后端：`Java 25`、`Spring Boot 4.0.3`
- 桌面运行时：`Krema 0.3.2`
- 前端：`React 18`、`TypeScript 5`、`Vite 6`
- 样式：`Tailwind CSS 4`
- 数据存储：`SQLite`
- 测试：`Vitest`、`Testing Library`、`Spring Boot Test`

## 4. 环境要求

在本地运行前，请先准备：

- `Node.js 18+`
- `npm 9+`
- `JDK 25`
- `Maven 3.9+`

说明：

- 当前 `pom.xml` 明确使用 `Java 25` 和 `--enable-preview`，不是 JDK 17/21。
- 直接运行 JAR 时必须带上 `--enable-preview` 和 `--enable-native-access=ALL-UNNAMED`。

## 5. 首次安装

在项目根目录执行：

```bash
npm ci
mvn -U -q -DskipTests compile
```

如果你要直接打包完整程序，也可以执行：

```bash
npm run build
mvn -q -DskipTests package
```

## 6. 启动方式

### 6.1 仅启动前端调试界面

适合做纯前端联调或样式开发：

```bash
npm run dev
```

默认地址：

- `http://localhost:5173`

说明：

- 这种方式下如果没有 Krema 桥接，前端会进入浏览器预览模式。
- 适合改 UI，不适合验证桌面原生能力。

### 6.2 启动桌面开发模式

先启动前端开发服务器：

```bash
npm run dev
```

再在另一个终端启动桌面应用：

```bash
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=--enable-preview --enable-native-access=ALL-UNNAMED"
```

说明：

- `krema.toml` 中已配置开发地址为 `http://localhost:5173`
- 启动后会由 Java 后端拉起桌面窗口
- 这是最适合日常开发的运行方式

### 6.3 打包后运行 JAR

先构建前端和后端：

```bash
npm run build
mvn -q -DskipTests package
```

然后运行打包产物：

```bash
java --enable-preview --enable-native-access=ALL-UNNAMED -jar target/fangyu-code-0.1.0-SNAPSHOT.jar
```

这是当前项目 JAR 包的标准运行方式。

如果只想启动后端而不拉起桌面窗口，可以追加参数：

```bash
java --enable-preview --enable-native-access=ALL-UNNAMED -jar target/fangyu-code-0.1.0-SNAPSHOT.jar --fangyu.desktop.enabled=false
```

## 7. 详细使用教程

### 7.1 启动后先做什么

首次进入应用后，建议按这个顺序完成初始化：

1. 打开 `Overview`
2. 检查默认引擎、主题、预算限制是否符合你的使用习惯
3. 填写或确认 `Codex Endpoint`、`Codex Model`、`Codex API Key`
4. 点击引擎健康检查区域的“刷新”，确认当前引擎可用
5. 如需开机启动，可在设置中开启 `Autostart`

### 7.2 Overview 页面怎么用

`Overview` 是总控页，主要用于全局状态管理：

- 顶部状态卡片会显示当前引擎、当前会话、队列运行状态
- `暂停 / 恢复` 按钮用于控制整个任务队列
- `导出` 可导出当前会话内容
- `日志` 会打开日志目录，方便排查问题
- 预算面板会显示：
  - 当前会话预算消耗
  - 本周预算消耗
  - 预算等级状态
- 全局设置面板可修改：
  - 默认引擎
  - 主题
  - 单会话预算
  - 周预算
  - Codex 接口地址
  - Codex 模型
  - Codex API Key

### 7.3 切换主题

当前应用支持浅色与深色主题切换。

使用方式：

- 左侧边栏顶部提供主题切换按钮
- 点击后可在白天/夜晚主题之间切换
- 也可以在 `Overview` 的全局设置中修改 `Theme`

### 7.4 Sessions 页面怎么用

`Sessions` 用于查看历史会话和消息流：

- 左侧为会话列表和历史搜索区域
- 输入关键词后可以搜索历史消息
- 点击任意会话即可切换当前上下文
- 切换后右侧会显示该会话的完整消息流
- 支持复制消息内容到剪贴板

适合场景：

- 回看某次任务的输入输出
- 继续之前的会话上下文
- 从历史结果中检索代码片段或问题结论

### 7.5 Queue 页面怎么用

`Queue` 用于管理任务执行顺序和运行过程：

- 查看当前排队、执行中、已完成任务
- 查看每个任务的队列位置和执行进度
- 对排队任务执行：
  - 编辑
  - 上移 / 下移
  - 取消
  - 复制
  - 重试
- 右侧监督面板会展示任务监督信息与执行态

适合场景：

- 同时提交多个开发任务后统一排队管理
- 优先插入紧急任务
- 跟踪长任务执行状态

### 7.6 Compose 页面怎么用

`Compose` 是最核心的工作区，用于提交新任务。

#### 基础提交流程

1. 在提示词主输入区描述你的任务
2. 选择工作区目录
3. 附加需要参考的文件
4. 设置优先级
5. 根据需要启用：
   - 批量提交
   - 插队模式
   - 双监督模式
6. 点击提交

#### 工作区与上下文文件

- `选择工作区`：绑定当前任务对应的项目目录
- `附加文件`：添加补充上下文，例如：
  - 设计稿
  - 接口文档
  - 配置文件
  - 关键源码文件

这样可以让任务执行更准确，减少模型误判范围。

#### 批量模式

当开启批量模式时：

- 输入框中每一行都会被视为一个独立任务
- 适合做批量重构、批量检查、批量生成任务

#### 插队模式

开启后，任务会获得更高优先级，更快进入执行队列。

适合：

- 修线上问题
- 临时验证关键改动
- 紧急补丁任务

#### 双监督模式

该模式用于更强的任务监督流程，仅在非批量、非编辑场景下可用。

### 7.7 技能系统怎么用

在 `Compose` 页面中，系统会根据提示词自动预览匹配到的技能。

你可以：

- 刷新技能列表
- 开启或关闭技能系统
- 手动叠加某些技能
- 查看自动匹配结果

适合：

- 针对特定任务自动注入仓库内技能说明
- 让 AI 在提交任务前读取项目约束和最佳实践

### 7.8 Integrations / MCP 页面怎么用

`Integrations` 页面用于管理 MCP 服务配置。

你可以执行：

- 查看已注册的 MCP Server
- 新增 / 编辑 MCP Server
- 启用 / 禁用单个 MCP Server
- 将当前 MCP 配置同步到 OpenCode
- 从 OpenCode 导入 MCP 配置

如果你依赖外部工具链、文件系统能力或第三方服务接入，这一页是主要入口。

### 7.9 会话导出

在 `Overview` 页点击“导出”即可导出当前会话。导出内容通常会写入项目根目录下的 `exports/` 或你指定的输出位置。

适合：

- 保留一次完整工作记录
- 发送给团队成员复盘
- 做归档和审计

## 8. 数据与文件位置

### 8.1 SQLite 数据库

默认数据库位置：

```text
${user.home}/.fangyu-code/fangyu-code.db
```

也可以通过环境变量覆盖：

```bash
FANGYU_DB_PATH=/your/path/fangyu-code.db
```

### 8.2 日志目录

默认日志文件：

```text
logs/fangyu-code.log
```

### 8.3 导出目录

默认导出目录：

```text
exports/
```

## 9. 常用命令

```bash
# 安装前端依赖
npm ci

# 启动前端开发服务器
npm run dev

# 前端构建
npm run build

# 前端测试
npm run test

# 代码检查
npm run lint

# Java 编译
mvn -U -q -DskipTests compile

# Java 测试
mvn test

# 打包 JAR
mvn -q -DskipTests package

# 桌面开发启动
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=--enable-preview --enable-native-access=ALL-UNNAMED"

# 运行打包后的 JAR
java --enable-preview --enable-native-access=ALL-UNNAMED -jar target/fangyu-code-0.1.0-SNAPSHOT.jar
```

## 10. 目录结构

```text
src/                  前端 React 应用
src-java/             Java 后端与桌面桥接代码
src-test-java/        额外测试源码目录
src/main/resources/   配置文件与数据库 schema
skills/               项目本地技能
dist/                 前端构建产物
target/               Maven 打包产物
krema.toml            Krema 桌面配置
package.json          前端脚本与依赖
pom.xml               Maven 构建配置
```

## 11. 常见问题

### 11.1 JAR 运行失败

优先检查这几个点：

- 是否使用了 `JDK 25`
- 是否带上了 `--enable-preview`
- 是否带上了 `--enable-native-access=ALL-UNNAMED`
- `target/fangyu-code-0.1.0-SNAPSHOT.jar` 是否已经重新打包生成

### 11.2 前端能打开，但桌面能力不可用

这通常说明你当前运行的是浏览器预览模式，而不是 Krema 桌面运行时。

请改用：

```bash
npm run dev
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=--enable-preview --enable-native-access=ALL-UNNAMED"
```

### 11.3 数据库或日志目录不存在

应用启动时会自动创建以下目录：

- 用户目录下的 `.fangyu-code`
- 项目根目录下的 `logs`
- 项目根目录下的 `exports`

如果目录未生成，优先检查当前用户权限和启动日志。

## 12. 提交约定

每次发布或推送重要改动前，建议至少执行：

```bash
npm run build
mvn -q -DskipTests package
```

并同步更新 `README.md`，保证运行方式和界面功能说明与当前代码一致。
