# UI Navigation Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 UI 参考图将小程序导航调整为「首页 / 发现 / 消息 / 我的」，并把主要页面升级为紫蓝霓虹风格。

**Architecture:** 保留现有原生微信小程序 + TypeScript + mock 服务层结构，新增 `discover` 与 `messages` 主包页面，保留 `launch` 与 `my-parties` 作为非 tab 功能页。UI 参考图归档在 `docs/ui-reference/`，页面继续消费现有 `Party` mock 数据和服务方法。

**Tech Stack:** 微信小程序原生 WXML/WXSS、TypeScript、Node.js test runner。

---

## 文件结构

- `docs/ui-reference/`：保存用户提供的两张 UI 参考图。
- `miniprogram/app.json`：注册新主包页面，调整 tabBar 为首页、发现、消息、我的。
- `miniprogram/pages/home/*`：改为 UI 图中的首页仪表盘和热门推荐。
- `miniprogram/pages/discover/*`：新增找局加入列表页。
- `miniprogram/pages/messages/*`：新增消息会话列表页。
- `miniprogram/pages/profile/*`：改为 UI 图中的个人中心。
- `miniprogram/pages/my-parties/*`：保留我的组局列表，作为个人中心入口页。
- `miniprogram/pages/party-detail/*`：改为 UI 图中的组局详情页。
- `miniprogram/packageCreate/pages/party-form/*`：改为 UI 图中的发起组局表单。
- `miniprogram/components/party-card/*`：升级为带视觉封面、标签、人数和价格的组局卡片。
- `miniprogram/tests/app-config.test.js`：锁定新导航。
- `miniprogram/tests/ui-reference.test.js`：锁定 UI 参考图归档。

## Task 1: 导航与参考图测试

- [ ] 更新 `app-config.test.js`，期望主包包含 `home`、`discover`、`messages`、`profile`、`my-parties`、`launch`、`party-detail`、`common/webview`，tabBar 四项为首页、发现、消息、我的。
- [ ] 新增 `ui-reference.test.js`，断言 `docs/ui-reference/ktv-ui-overview.png` 和 `docs/ui-reference/ktv-ui-home-detail.png` 存在。
- [ ] 运行 `npm test`，确认新增期望在当前实现下失败。

## Task 2: 图片归档与页面注册

- [ ] 创建 `docs/ui-reference/` 并复制两张 UI 图。
- [ ] 修改 `miniprogram/app.json` 注册新页面与 tabBar。
- [ ] 新增 `discover`、`messages` 页面 JSON/TS/WXML/WXSS 骨架。
- [ ] 运行 `npm test`，确认配置和图片测试通过。

## Task 3: UI 图视觉升级

- [ ] 调整全局变量为紫蓝主色、浅灰页面底、白色卡片和清晰状态色。
- [ ] 改造 `party-card`，支持封面视觉、状态、标签、时间、地点、头像占位、人数和价格。
- [ ] 改造首页、发现、消息、个人中心、我的组局、局详情、发起表单。
- [ ] 保留现有服务层 API，不引入真实后端依赖。

## Task 4: 验证

- [ ] 运行 `npm test`。
- [ ] 读取 `git diff --stat` 和 `git status --short`，确认只包含本次相关变更。
