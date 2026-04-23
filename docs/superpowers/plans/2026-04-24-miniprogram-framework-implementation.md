# K 局小程序框架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建一个基于原生微信小程序和 TypeScript 的可演示 MVP 框架，覆盖 `v1 P0` 页面流程，并为 `v1 P1` 留出稳定扩展位。

**Architecture:** 项目采用 `miniprogram + cloudfunctions + mock + types` 的四层结构。前端通过共享类型、mock 数据和统一服务层驱动页面，接龙文案、时间金额格式化等规则以纯函数实现并优先通过测试锁定行为。

**Tech Stack:** 微信小程序原生框架、TypeScript、Node.js、微信开发者工具项目结构、轻量 Node 测试脚本

---

## 文件结构

### 新建文件

- `project.config.json`：微信开发者工具项目配置
- `project.private.config.json`：本地开发私有配置
- `tsconfig.json`：TypeScript 编译配置
- `package.json`：本地脚本与开发依赖
- `package-lock.json`：依赖锁文件
- `.gitignore`：忽略 `node_modules`、构建缓存和本地配置
- `miniprogram/app.ts`：应用入口
- `miniprogram/app.json`：页面注册、分包和 `tabBar`
- `miniprogram/app.wxss`：全局样式入口
- `miniprogram/sitemap.json`：小程序索引配置
- `miniprogram/envList.js`：云环境列表示例
- `miniprogram/styles/variables.wxss`：全局设计变量
- `miniprogram/constants/routes.ts`：路由常量
- `miniprogram/constants/options.ts`：区域、标签、时长等选项常量
- `miniprogram/types/*.ts`：前端类型定义
- `miniprogram/mock/*.ts`：mock 数据
- `miniprogram/services/config.ts`：数据源配置
- `miniprogram/services/api/*.ts`：统一服务接口
- `miniprogram/utils/*.ts`：格式化、校验、接龙文案生成
- `miniprogram/tests/*.test.js`：关键纯函数测试
- `miniprogram/components/party-card/*`：局卡片组件
- `miniprogram/components/empty-state/*`：空态组件
- `miniprogram/pages/home/*`：首页
- `miniprogram/pages/my-parties/*`：我的局
- `miniprogram/pages/profile/*`：我的
- `miniprogram/pages/launch/*`：发起入口
- `miniprogram/pages/party-detail/*`：局详情
- `miniprogram/pages/common/webview/*`：通用占位页
- `miniprogram/packageCreate/pages/venue-picker/*`：选 KTV 页面
- `miniprogram/packageCreate/pages/party-form/*`：填写局信息页面
- `miniprogram/packageCreate/pages/party-preview/*`：接龙预览页面
- `miniprogram/packageManage/pages/party-members/*`：成员管理占位页
- `miniprogram/packageManage/pages/settlement/*`：结算占位页
- `miniprogram/packageManage/pages/notifications/*`：通知设置占位页
- `cloudfunctions/*/index.js`：云函数骨架
- `cloudfunctions/*/package.json`：云函数包配置

### 修改文件

- `PRD.MD`：不修改
- `docs/superpowers/specs/2026-04-24-miniprogram-framework-design.md`：不修改

## Task 1: 初始化工程与小程序配置

**Files:**
- Create: `E:\PRO\ktv\.gitignore`
- Create: `E:\PRO\ktv\package.json`
- Create: `E:\PRO\ktv\tsconfig.json`
- Create: `E:\PRO\ktv\project.config.json`
- Create: `E:\PRO\ktv\project.private.config.json`
- Create: `E:\PRO\ktv\miniprogram\app.ts`
- Create: `E:\PRO\ktv\miniprogram\app.json`
- Create: `E:\PRO\ktv\miniprogram\app.wxss`
- Create: `E:\PRO\ktv\miniprogram\sitemap.json`
- Create: `E:\PRO\ktv\miniprogram\envList.js`
- Create: `E:\PRO\ktv\miniprogram\styles\variables.wxss`

- [ ] **Step 1: 写工程配置存在性测试**

```js
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');

test('核心工程配置文件存在', () => {
  const requiredFiles = [
    '.gitignore',
    'package.json',
    'tsconfig.json',
    'project.config.json',
    'miniprogram/app.json',
    'miniprogram/app.ts',
    'miniprogram/app.wxss'
  ];

  requiredFiles.forEach((filePath) => {
    assert.equal(fs.existsSync(path.join(root, filePath)), true, filePath);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniprogram/tests/project-structure.test.js`
Expected: FAIL with missing file assertions because the project scaffold does not exist yet.

- [ ] **Step 3: 写最小工程配置实现**

```json
{
  "name": "ktv",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "node --test miniprogram/tests/*.test.js"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["miniprogram/*"]
    }
  },
  "include": ["miniprogram/**/*.ts"]
}
```

```ts
App<IAppOption>({
  globalData: {
    currentUserId: 'user-host',
    useMock: true
  },
  onLaunch() {
    console.log('K 局小程序启动');
  }
});
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniprogram/tests/project-structure.test.js`
Expected: PASS with `1 test passed`.

- [ ] **Step 5: 提交**

```bash
git add .gitignore package.json tsconfig.json project.config.json project.private.config.json miniprogram/app.ts miniprogram/app.json miniprogram/app.wxss miniprogram/sitemap.json miniprogram/envList.js miniprogram/styles/variables.wxss miniprogram/tests/project-structure.test.js
git commit -m "初始化小程序工程配置"
```

## Task 2: 建立共享类型、常量、Mock 数据与服务层

**Files:**
- Create: `E:\PRO\ktv\miniprogram\types\common.ts`
- Create: `E:\PRO\ktv\miniprogram\types\user.ts`
- Create: `E:\PRO\ktv\miniprogram\types\venue.ts`
- Create: `E:\PRO\ktv\miniprogram\types\party.ts`
- Create: `E:\PRO\ktv\miniprogram\types\entry.ts`
- Create: `E:\PRO\ktv\miniprogram\types\notification.ts`
- Create: `E:\PRO\ktv\miniprogram\types\settlement.ts`
- Create: `E:\PRO\ktv\miniprogram\constants\routes.ts`
- Create: `E:\PRO\ktv\miniprogram\constants\options.ts`
- Create: `E:\PRO\ktv\miniprogram\mock\users.ts`
- Create: `E:\PRO\ktv\miniprogram\mock\venues.ts`
- Create: `E:\PRO\ktv\miniprogram\mock\parties.ts`
- Create: `E:\PRO\ktv\miniprogram\mock\entries.ts`
- Create: `E:\PRO\ktv\miniprogram\services\config.ts`
- Create: `E:\PRO\ktv\miniprogram\services\api\party.ts`
- Create: `E:\PRO\ktv\miniprogram\services\api\venue.ts`
- Create: `E:\PRO\ktv\miniprogram\services\api\user.ts`
- Test: `E:\PRO\ktv\miniprogram\tests\services.test.js`

- [ ] **Step 1: 写服务层测试**

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getPartyList,
  getPartyDetail,
  getMyPartyTabs
} = require('../dist/services-test-bundle.cjs');

test('首页列表返回可展示的局数据', async () => {
  const parties = await getPartyList();
  assert.equal(Array.isArray(parties), true);
  assert.equal(parties.length > 0, true);
  assert.equal(typeof parties[0].estimatedPerPerson, 'number');
});

test('我的局聚合视图包含四个分组', async () => {
  const tabs = await getMyPartyTabs('user-host');
  assert.deepEqual(Object.keys(tabs), ['hosting', 'joined', 'waitlist', 'history']);
});

test('局详情能返回报名与候补人数', async () => {
  const detail = await getPartyDetail('party-001');
  assert.equal(detail.party.partyId, 'party-001');
  assert.equal(detail.confirmedEntries.length > 0, true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniprogram/tests/services.test.js`
Expected: FAIL because service modules and mock data do not exist yet.

- [ ] **Step 3: 写最小共享数据层实现**

```ts
/**
 * 通用状态与响应类型。
 */
export interface ApiResult<T> {
  data: T;
  message: string;
}

/**
 * 局状态枚举。
 */
export type PartyStatus = 'draft' | 'recruiting' | 'full' | 'closed' | 'cancelled' | 'finished';
```

```ts
/**
 * 读取局列表。
 */
export async function getPartyList() {
  return partyList;
}

/**
 * 读取局详情。
 */
export async function getPartyDetail(partyId: string) {
  const party = partyList.find((item) => item.partyId === partyId);
  if (!party) {
    throw new Error('局不存在');
  }

  return {
    party,
    confirmedEntries: entryList.filter((item) => item.partyId === partyId && item.entryType === 'confirmed'),
    waitlistEntries: entryList.filter((item) => item.partyId === partyId && item.entryType === 'waitlist')
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniprogram/tests/services.test.js`
Expected: PASS with `3 tests passed`.

- [ ] **Step 5: 提交**

```bash
git add miniprogram/types miniprogram/constants miniprogram/mock miniprogram/services miniprogram/tests/services.test.js
git commit -m "添加共享类型与模拟数据服务层"
```

## Task 3: 完成关键纯函数与测试

**Files:**
- Create: `E:\PRO\ktv\miniprogram\utils\format.ts`
- Create: `E:\PRO\ktv\miniprogram\utils\validators.ts`
- Create: `E:\PRO\ktv\miniprogram\utils\party-text.ts`
- Test: `E:\PRO\ktv\miniprogram\tests\utils.test.js`

- [ ] **Step 1: 写纯函数测试**

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatCurrencyYuan,
  calculateEstimatedPerPerson,
  validatePartyForm,
  buildPartyRecruitmentText
} = require('../dist/utils-test-bundle.cjs');

test('金额格式化输出人民币文案', () => {
  assert.equal(formatCurrencyYuan(16800), '¥168');
});

test('满员人均向上取整到分', () => {
  assert.equal(calculateEstimatedPerPerson(24000, 7), 3429);
});

test('表单校验拦截非法人数', () => {
  const result = validatePartyForm({ maxCapacity: 1, roomFee: 10000, title: '测试局' });
  assert.equal(result.valid, false);
});

test('接龙文案包含局信息与报名位', () => {
  const text = buildPartyRecruitmentText(sampleParty, sampleEntries, sampleHost);
  assert.match(text, /K歌局招募/);
  assert.match(text, /1\\. 羊羊 ✅/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniprogram/tests/utils.test.js`
Expected: FAIL because utility modules do not exist yet.

- [ ] **Step 3: 写最小纯函数实现**

```ts
/**
 * 计算预计人均费用。
 */
export function calculateEstimatedPerPerson(roomFee: number, maxCapacity: number): number {
  return Math.ceil(roomFee / maxCapacity);
}

/**
 * 构建接龙文案。
 */
export function buildPartyRecruitmentText(party: Party, entries: Entry[], host: User): string {
  const lines = [
    '🎤 K歌局招募！',
    `📍 ${party.venueSummary}`,
    `💰 人均约 ${formatCurrencyYuan(party.estimatedPerPerson)}`,
    '报名接龙 👇',
    `1. ${host.nickname} ✅`
  ];

  entries
    .filter((item) => item.entryType === 'confirmed' && item.seqNo && item.seqNo > 1)
    .forEach((item) => {
      lines.push(`${item.seqNo}. ${item.userNickname} ✅`);
    });

  return lines.join('\\n');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniprogram/tests/utils.test.js`
Expected: PASS with `4 tests passed`.

- [ ] **Step 5: 提交**

```bash
git add miniprogram/utils miniprogram/tests/utils.test.js
git commit -m "添加文案生成与表单校验工具"
```

## Task 4: 搭建主包页面与通用组件

**Files:**
- Create: `E:\PRO\ktv\miniprogram\components\party-card\index.json`
- Create: `E:\PRO\ktv\miniprogram\components\party-card\index.ts`
- Create: `E:\PRO\ktv\miniprogram\components\party-card\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\components\party-card\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\components\empty-state\index.json`
- Create: `E:\PRO\ktv\miniprogram\components\empty-state\index.ts`
- Create: `E:\PRO\ktv\miniprogram\components\empty-state\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\components\empty-state\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\pages\home\index.ts`
- Create: `E:\PRO\ktv\miniprogram\pages\home\index.json`
- Create: `E:\PRO\ktv\miniprogram\pages\home\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\pages\home\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\pages\my-parties\index.ts`
- Create: `E:\PRO\ktv\miniprogram\pages\my-parties\index.json`
- Create: `E:\PRO\ktv\miniprogram\pages\my-parties\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\pages\my-parties\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\pages\profile\index.ts`
- Create: `E:\PRO\ktv\miniprogram\pages\profile\index.json`
- Create: `E:\PRO\ktv\miniprogram\pages\profile\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\pages\profile\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\pages\launch\index.ts`
- Create: `E:\PRO\ktv\miniprogram\pages\launch\index.json`
- Create: `E:\PRO\ktv\miniprogram\pages\launch\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\pages\launch\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\pages\common\webview\index.ts`
- Create: `E:\PRO\ktv\miniprogram\pages\common\webview\index.json`
- Create: `E:\PRO\ktv\miniprogram\pages\common\webview\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\pages\common\webview\index.wxss`

- [ ] **Step 1: 写页面注册测试**

```js
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const appConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'app.json'), 'utf8')
);

test('主包页面已注册', () => {
  assert.deepEqual(appConfig.pages, [
    'pages/home/index',
    'pages/my-parties/index',
    'pages/launch/index',
    'pages/profile/index',
    'pages/party-detail/index',
    'pages/common/webview/index'
  ]);
});

test('底部导航包含四个入口', () => {
  assert.equal(appConfig.tabBar.list.length, 4);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniprogram/tests/app-config.test.js`
Expected: FAIL because app page registration and pages are incomplete.

- [ ] **Step 3: 写最小页面骨架实现**

```ts
/**
 * 首页页面逻辑。
 */
Page({
  data: {
    partyList: [],
    loading: true
  },

  async onShow() {
    const partyList = await getPartyList();
    this.setData({
      partyList,
      loading: false
    });
  }
});
```

```xml
<view class="page">
  <view class="hero">
    <text class="hero__title">周末想唱就组一个 K 局</text>
    <text class="hero__desc">快速发起、自动接龙、报名候补一页看清。</text>
  </view>
  <party-card wx:for="{{partyList}}" wx:key="partyId" party="{{item}}" />
</view>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniprogram/tests/app-config.test.js`
Expected: PASS with `2 tests passed`.

- [ ] **Step 5: 提交**

```bash
git add miniprogram/components miniprogram/pages/home miniprogram/pages/my-parties miniprogram/pages/profile miniprogram/pages/launch miniprogram/pages/common miniprogram/tests/app-config.test.js miniprogram/app.json
git commit -m "搭建主包页面与通用组件骨架"
```

## Task 5: 搭建发起流程、局详情和管理占位

**Files:**
- Create: `E:\PRO\ktv\miniprogram\pages\party-detail\index.ts`
- Create: `E:\PRO\ktv\miniprogram\pages\party-detail\index.json`
- Create: `E:\PRO\ktv\miniprogram\pages\party-detail\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\pages\party-detail\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\venue-picker\index.ts`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\venue-picker\index.json`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\venue-picker\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\venue-picker\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-form\index.ts`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-form\index.json`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-form\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-form\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-preview\index.ts`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-preview\index.json`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-preview\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\packageCreate\pages\party-preview\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\party-members\index.ts`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\party-members\index.json`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\party-members\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\party-members\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\settlement\index.ts`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\settlement\index.json`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\settlement\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\settlement\index.wxss`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\notifications\index.ts`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\notifications\index.json`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\notifications\index.wxml`
- Create: `E:\PRO\ktv\miniprogram\packageManage\pages\notifications\index.wxss`

- [ ] **Step 1: 写发起与详情流程测试**

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPartyDraft,
  publishParty,
  joinParty,
  joinWaitlist
} = require('../dist/flow-test-bundle.cjs');

test('发起流程可以创建并发布草稿', async () => {
  const draft = await createPartyDraft({ title: '羊羊周六 K 局' });
  const published = await publishParty(draft.partyId);
  assert.equal(published.status, 'recruiting');
});

test('报名满员后进入候补', async () => {
  const joined = await joinParty('party-002', 'user-guest-1');
  assert.equal(joined.entryType, 'confirmed');
  const waitlist = await joinWaitlist('party-003', 'user-guest-2');
  assert.equal(waitlist.entryType, 'waitlist');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniprogram/tests/flow.test.js`
Expected: FAIL because create/join flow methods and pages are not complete.

- [ ] **Step 3: 写最小发起与详情实现**

```ts
/**
 * 创建局草稿。
 */
export async function createPartyDraft(input: Partial<Party>) {
  const draft = {
    ...defaultDraft,
    ...input,
    partyId: 'party-draft-001',
    status: 'draft'
  };

  return draft;
}

/**
 * 发布局草稿。
 */
export async function publishParty(partyId: string) {
  return {
    ...draftMap[partyId],
    status: 'recruiting'
  };
}
```

```ts
/**
 * 局详情页面逻辑。
 */
Page({
  data: {
    detail: null
  },

  async onLoad(options) {
    const detail = await getPartyDetail(options.partyId);
    this.setData({ detail });
  }
});
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test miniprogram/tests/flow.test.js`
Expected: PASS with `2 tests passed`.

- [ ] **Step 5: 提交**

```bash
git add miniprogram/pages/party-detail miniprogram/packageCreate miniprogram/packageManage miniprogram/tests/flow.test.js miniprogram/services/api/party.ts
git commit -m "完成发起流程与详情管理页面骨架"
```

## Task 6: 补齐云函数骨架与最终联调

**Files:**
- Create: `E:\PRO\ktv\cloudfunctions\auth\index.js`
- Create: `E:\PRO\ktv\cloudfunctions\auth\package.json`
- Create: `E:\PRO\ktv\cloudfunctions\venue\index.js`
- Create: `E:\PRO\ktv\cloudfunctions\venue\package.json`
- Create: `E:\PRO\ktv\cloudfunctions\party\index.js`
- Create: `E:\PRO\ktv\cloudfunctions\party\package.json`
- Create: `E:\PRO\ktv\cloudfunctions\entry\index.js`
- Create: `E:\PRO\ktv\cloudfunctions\entry\package.json`
- Create: `E:\PRO\ktv\cloudfunctions\notify\index.js`
- Create: `E:\PRO\ktv\cloudfunctions\notify\package.json`
- Modify: `E:\PRO\ktv\miniprogram\app.json`
- Modify: `E:\PRO\ktv\package.json`

- [ ] **Step 1: 写云函数目录测试**

```js
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');

test('云函数目录完整', () => {
  ['auth', 'venue', 'party', 'entry', 'notify'].forEach((name) => {
    assert.equal(fs.existsSync(path.join(root, 'cloudfunctions', name, 'index.js')), true, name);
    assert.equal(fs.existsSync(path.join(root, 'cloudfunctions', name, 'package.json')), true, `${name}-package`);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test miniprogram/tests/cloudfunctions.test.js`
Expected: FAIL because cloudfunction scaffolds do not exist yet.

- [ ] **Step 3: 写最小云函数骨架实现**

```js
/**
 * 云函数入口。
 * @param {Record<string, unknown>} event 云函数入参
 * @returns {{ ok: boolean, module: string, event: Record<string, unknown> }}
 */
exports.main = async (event) => {
  return {
    ok: true,
    module: 'party',
    event
  };
};
```

```json
{
  "name": "party",
  "version": "0.1.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 4: 运行全量验证**

Run: `npm test`
Expected: PASS with all `miniprogram/tests/*.test.js` passing.

Run: `git status -sb`
Expected: Only intended scaffold files are modified.

- [ ] **Step 5: 提交**

```bash
git add cloudfunctions package.json miniprogram/tests/cloudfunctions.test.js
git commit -m "补齐云函数骨架并完成框架联调"
```

## 自检

- 设计文档中的顶层目录、页面结构、分包方案在 Task 1、Task 4、Task 5 中都有对应实现
- 共享类型、mock 数据、服务层与纯函数工具在 Task 2、Task 3 中覆盖
- `v1 P1` 的成员管理和通知设置以占位页形式在 Task 5 中覆盖
- 云函数骨架与未来切换路径在 Task 6 中覆盖
- 文档中未使用 `TODO`、`TBD`、`稍后实现` 等占位描述
- 任务内引用的函数名 `getPartyList`、`publishParty`、`buildPartyRecruitmentText` 前后保持一致
