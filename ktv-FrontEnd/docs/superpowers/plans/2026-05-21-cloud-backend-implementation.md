# Cloud Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the WeChat Cloud Development backend for the KTV group singing mini program while preserving the current mock-mode frontend behavior.

**Architecture:** Keep the five existing cloud functions (`auth`, `venue`, `party`, `entry`, `notify`) and add a small shared backend layer under `cloudfunctions/shared`. Cloud functions accept `{ action, payload }`, return `{ ok, data, message }` or `{ ok, code, message }`, and can run against either WeChat cloud database or an injected in-memory store for local tests.

**Tech Stack:** WeChat Mini Program cloud functions, Node.js CommonJS, Node built-in test runner through `tsx --test`, TypeScript frontend service adapters.

---

## File Structure

- Create: `ktv-FrontEnd/cloudfunctions/shared/errors.js`  
  Defines `AppError`, error codes, and validation helpers.

- Create: `ktv-FrontEnd/cloudfunctions/shared/response.js`  
  Wraps action handlers and normalizes success/error responses.

- Create: `ktv-FrontEnd/cloudfunctions/shared/memory-store.js`  
  Provides an injected in-memory database for deterministic cloud-function tests.

- Create: `ktv-FrontEnd/cloudfunctions/shared/cloud-store.js`  
  Provides a lightweight adapter over WeChat cloud database collections.

- Create: `ktv-FrontEnd/cloudfunctions/shared/runtime.js`  
  Creates the runtime object from cloud context or test context.

- Create: `ktv-FrontEnd/cloudfunctions/shared/seed.js`  
  Holds seed data mirroring the current frontend mock data.

- Create: `ktv-FrontEnd/cloudfunctions/shared/party-view.js`  
  Builds frontend-friendly party fields: `estimatedPerPerson`, `progressText`, `priceText`, `timeSummary`, `statusText`, `hostSummary`, `venueSummary`.

- Modify: `ktv-FrontEnd/cloudfunctions/auth/index.js`  
  Implements `auth.login` and `auth.profile`.

- Modify: `ktv-FrontEnd/cloudfunctions/venue/index.js`  
  Implements `venue.list` and `venue.detail`.

- Modify: `ktv-FrontEnd/cloudfunctions/party/index.js`  
  Implements `party.list`, `party.detail`, `party.myTabs`, `party.createDraft`, and `party.publish`.

- Modify: `ktv-FrontEnd/cloudfunctions/entry/index.js`  
  Implements `entry.join`, `entry.waitlist`, and `entry.quit`.

- Modify: `ktv-FrontEnd/cloudfunctions/notify/index.js`  
  Implements `notify.list`, `notify.markRead`, and internal notification creation.

- Modify: `ktv-FrontEnd/cloudfunctions/*/package.json`  
  Adds `wx-server-sdk` dependency for deployable functions.

- Create: `ktv-FrontEnd/miniprogram/services/api/cloud.ts`  
  Centralizes `wx.cloud.callFunction` invocation and response unwrapping.

- Modify: `ktv-FrontEnd/miniprogram/services/config.ts`  
  Adds cloud environment configuration while keeping `mock` as the default.

- Modify: `ktv-FrontEnd/miniprogram/services/api/party.ts`  
  Switches to cloud calls when `serviceConfig.dataSource === "cloud"`.

- Modify: `ktv-FrontEnd/miniprogram/services/api/venue.ts`  
  Switches to cloud calls when `serviceConfig.dataSource === "cloud"`.

- Modify: `ktv-FrontEnd/miniprogram/services/api/user.ts`  
  Switches to cloud calls when `serviceConfig.dataSource === "cloud"`.

- Modify: `ktv-FrontEnd/miniprogram/app.ts`  
  Initializes `wx.cloud` only when cloud mode is enabled.

- Modify: `ktv-FrontEnd/project.config.json`  
  Adds `cloudfunctionRoot` so WeChat DevTools recognizes the existing cloud function directory.

- Create: `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`  
  Tests backend actions through the exported cloud function `main` methods with an injected memory store.

- Modify: `ktv-FrontEnd/miniprogram/tests/cloudfunctions.test.js`  
  Verifies shared backend files and `cloudfunctionRoot` exist.

## Task Overview

1. Shared runtime, responses, errors, seed data, and party display helpers.
2. Auth and venue cloud functions.
3. Party cloud functions.
4. Entry and notification cloud functions.
5. Frontend cloud-mode service adapter.
6. Project configuration and final verification.

### Task 1: Shared Cloud Runtime And Helpers

**Files:**
- Create: `ktv-FrontEnd/cloudfunctions/shared/errors.js`
- Create: `ktv-FrontEnd/cloudfunctions/shared/response.js`
- Create: `ktv-FrontEnd/cloudfunctions/shared/memory-store.js`
- Create: `ktv-FrontEnd/cloudfunctions/shared/cloud-store.js`
- Create: `ktv-FrontEnd/cloudfunctions/shared/runtime.js`
- Create: `ktv-FrontEnd/cloudfunctions/shared/seed.js`
- Create: `ktv-FrontEnd/cloudfunctions/shared/party-view.js`
- Test: `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`

- [ ] **Step 1: Write the failing shared-helper tests**

Add this first section to `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const { AppError, assertRequired } = require("../../cloudfunctions/shared/errors");
const { createMemoryStore } = require("../../cloudfunctions/shared/memory-store");
const { createSeedData } = require("../../cloudfunctions/shared/seed");
const { buildPartyView } = require("../../cloudfunctions/shared/party-view");

test("shared errors expose stable validation failures", () => {
  assert.throws(
    () => assertRequired("", "title", "请填写局标题"),
    (error) => error instanceof AppError && error.code === "VALIDATION_ERROR"
  );
});

test("memory store clones seed data and isolates writes", async () => {
  const seed = createSeedData();
  const store = createMemoryStore(seed);
  await store.insert("venues", { venueId: "venue-new", name: "新门店" });

  const seededVenue = seed.venues.find((item) => item.venueId === "venue-new");
  const storedVenue = await store.findOne("venues", (item) => item.venueId === "venue-new");

  assert.equal(seededVenue, undefined);
  assert.equal(storedVenue.name, "新门店");
});

test("party view builds frontend display fields", () => {
  const seed = createSeedData();
  const party = buildPartyView({
    party: seed.parties[0],
    host: seed.users[0],
    venue: seed.venues[0]
  });

  assert.equal(typeof party.estimatedPerPerson, "number");
  assert.equal(party.hostSummary, seed.users[0].nickname);
  assert.equal(party.venueSummary.includes(seed.venues[0].name), true);
  assert.equal(party.progressText.includes("/"), true);
  assert.equal(party.priceText.startsWith("¥"), true);
});
```

- [ ] **Step 2: Run the shared-helper tests and verify they fail**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: FAIL with `Cannot find module '../../cloudfunctions/shared/errors'`.

- [ ] **Step 3: Implement shared errors**

Create `ktv-FrontEnd/cloudfunctions/shared/errors.js`:

```js
const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PARTY_FULL: "PARTY_FULL",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  PARTY_NOT_RECRUITING: "PARTY_NOT_RECRUITING",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};

class AppError extends Error {
  /**
   * 创建业务错误。
   * @param {string} code 错误码
   * @param {string} message 错误信息
   */
  constructor(code, message) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

/**
 * 校验必填字段。
 * @param {unknown} value 字段值
 * @param {string} field 字段名
 * @param {string} message 错误信息
 */
function assertRequired(value, field, message) {
  if (value === undefined || value === null || value === "") {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, message || `${field}不能为空`);
  }
}

/**
 * 校验条件是否成立。
 * @param {boolean} condition 条件
 * @param {string} code 错误码
 * @param {string} message 错误信息
 */
function assertCondition(condition, code, message) {
  if (!condition) {
    throw new AppError(code, message);
  }
}

module.exports = {
  AppError,
  ERROR_CODES,
  assertRequired,
  assertCondition
};
```

- [ ] **Step 4: Implement shared response wrapper**

Create `ktv-FrontEnd/cloudfunctions/shared/response.js`:

```js
const { AppError, ERROR_CODES } = require("./errors");

/**
 * 构建成功响应。
 * @param {unknown} data 响应数据
 * @param {string} message 响应消息
 * @returns {{ ok: true, data: unknown, message: string }}
 */
function success(data, message = "success") {
  return { ok: true, data, message };
}

/**
 * 构建失败响应。
 * @param {string} code 错误码
 * @param {string} message 错误消息
 * @returns {{ ok: false, code: string, message: string }}
 */
function failure(code, message) {
  return { ok: false, code, message };
}

/**
 * 执行动作并统一响应结构。
 * @param {Record<string, Function>} handlers 动作处理器
 * @param {{ action?: string, payload?: Record<string, unknown> }} event 云函数入参
 * @param {object} runtime 运行时上下文
 * @returns {Promise<object>} 统一响应
 */
async function runAction(handlers, event = {}, runtime = {}) {
  try {
    const action = event.action;
    const handler = handlers[action];

    if (!handler) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "未知操作");
    }

    const data = await handler(event.payload || {}, runtime);
    return success(data);
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error.code, error.message);
    }

    return failure(ERROR_CODES.INTERNAL_ERROR, error.message || "服务异常");
  }
}

module.exports = {
  success,
  failure,
  runAction
};
```

- [ ] **Step 5: Implement memory store**

Create `ktv-FrontEnd/cloudfunctions/shared/memory-store.js`:

```js
/**
 * 深拷贝纯数据。
 * @param {unknown} value 原始数据
 * @returns {unknown} 克隆数据
 */
function clonePlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 创建内存数据存储。
 * @param {Record<string, unknown[]>} seed 初始数据
 * @returns {object} 数据存储
 */
function createMemoryStore(seed = {}) {
  const state = clonePlainValue(seed);

  return {
    /**
     * 列出集合数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @returns {Promise<object[]>} 数据列表
     */
    async list(collection, predicate = () => true) {
      return (state[collection] || []).filter(predicate).map(clonePlainValue);
    },

    /**
     * 查找单条数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @returns {Promise<object | null>} 单条数据
     */
    async findOne(collection, predicate) {
      const item = (state[collection] || []).find(predicate);
      return item ? clonePlainValue(item) : null;
    },

    /**
     * 插入数据。
     * @param {string} collection 集合名
     * @param {object} document 文档
     * @returns {Promise<object>} 插入后的文档
     */
    async insert(collection, document) {
      state[collection] = state[collection] || [];
      const nextDocument = clonePlainValue(document);
      state[collection].push(nextDocument);
      return clonePlainValue(nextDocument);
    },

    /**
     * 更新第一条匹配数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @param {(item: object) => object} updater 更新函数
     * @returns {Promise<object | null>} 更新后的文档
     */
    async updateOne(collection, predicate, updater) {
      const items = state[collection] || [];
      const index = items.findIndex(predicate);

      if (index < 0) {
        return null;
      }

      items[index] = { ...items[index], ...updater(clonePlainValue(items[index])) };
      return clonePlainValue(items[index]);
    },

    /**
     * 读取内部状态快照。
     * @returns {Record<string, unknown[]>} 状态快照
     */
    snapshot() {
      return clonePlainValue(state);
    }
  };
}

module.exports = {
  clonePlainValue,
  createMemoryStore
};
```

- [ ] **Step 6: Implement seed data**

Create `ktv-FrontEnd/cloudfunctions/shared/seed.js` with JavaScript seed data copied from current frontend mocks:

```js
const { clonePlainValue } = require("./memory-store");

const seedData = {
  users: [
    {
      userId: "user-host",
      openid: "openid-host",
      nickname: "羊羊",
      avatarUrl: "https://example.com/avatar-host.png",
      createdAt: "2026-04-20T12:00:00.000Z",
      updatedAt: "2026-04-20T12:00:00.000Z"
    },
    {
      userId: "user-guest-1",
      openid: "openid-guest-1",
      nickname: "阿明",
      avatarUrl: "https://example.com/avatar-aming.png",
      createdAt: "2026-04-20T12:05:00.000Z",
      updatedAt: "2026-04-20T12:05:00.000Z"
    },
    {
      userId: "user-guest-2",
      openid: "openid-guest-2",
      nickname: "小秋",
      avatarUrl: "https://example.com/avatar-xiaoqiu.png",
      createdAt: "2026-04-20T12:10:00.000Z",
      updatedAt: "2026-04-20T12:10:00.000Z"
    },
    {
      userId: "user-guest-3",
      openid: "openid-guest-3",
      nickname: "阿哲",
      avatarUrl: "https://example.com/avatar-azhe.png",
      createdAt: "2026-04-20T12:15:00.000Z",
      updatedAt: "2026-04-20T12:15:00.000Z"
    },
    {
      userId: "user-wait-1",
      openid: "openid-wait-1",
      nickname: "晓峰",
      avatarUrl: "https://example.com/avatar-xiaofeng.png",
      createdAt: "2026-04-20T12:20:00.000Z",
      updatedAt: "2026-04-20T12:20:00.000Z"
    }
  ],
  venues: [
    {
      venueId: "venue-001",
      name: "MUSE KTV · 南山海岸城店",
      district: "南山",
      address: "深圳市南山区海岸城东座 3 楼",
      lng: 113.934,
      lat: 22.53,
      priceLevel: 2,
      roomTypes: ["中包", "大包"],
      businessHours: "11:00-06:00",
      coverImage: "",
      avgRating: 4.6,
      isActive: true
    },
    {
      venueId: "venue-002",
      name: "纯K · 车公庙店",
      district: "福田",
      address: "深圳市福田区车公庙商圈",
      lng: 114.045,
      lat: 22.536,
      priceLevel: 3,
      roomTypes: ["中包", "豪华包"],
      businessHours: "13:00-04:00",
      coverImage: "",
      avgRating: 4.7,
      isActive: true
    }
  ],
  parties: [
    {
      partyId: "party-001",
      title: "周末嗨唱🎤放松一下",
      venueId: "venue-001",
      venueCustom: "",
      hostId: "user-host",
      startTime: "2026-04-25T19:30:00+08:00",
      durationMin: 180,
      roomFee: 68000,
      maxCapacity: 12,
      status: "recruiting",
      isPublic: false,
      notes: "周末一起放松嗨唱，曲风不限，麦霸和气氛组都欢迎～一起享受音乐的快乐吧！",
      tags: ["流行", "80后-90后", "友好局"],
      coverImage: "/assets/images/ktv/ktv-room-01.jpg",
      createdAt: "2026-04-24T09:00:00.000Z",
      updatedAt: "2026-04-24T09:00:00.000Z",
      publishedAt: "2026-04-24T09:00:00.000Z",
      confirmedCount: 3,
      waitlistCount: 1
    },
    {
      partyId: "party-002",
      title: "周五小聚，快乐K歌",
      venueId: "venue-002",
      venueCustom: "",
      hostId: "user-host",
      startTime: "2026-04-26T20:00:00+08:00",
      durationMin: 120,
      roomFee: 78000,
      maxCapacity: 8,
      status: "recruiting",
      isPublic: true,
      notes: "下班直接集合，适合粤语歌、经典老歌和轻松聊天。",
      tags: ["粤语", "90后", "气氛好"],
      coverImage: "/assets/images/ktv/ktv-room-02.jpg",
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z",
      publishedAt: "2026-04-24T10:00:00.000Z",
      confirmedCount: 1,
      waitlistCount: 0
    },
    {
      partyId: "party-003",
      title: "麦霸来袭，等你来战🔥",
      venueId: "venue-001",
      venueCustom: "",
      hostId: "user-guest-1",
      startTime: "2026-04-25T22:00:00+08:00",
      durationMin: 180,
      roomFee: 88000,
      maxCapacity: 3,
      status: "full",
      isPublic: false,
      notes: "经典老歌专场，欢迎会唱、爱听、会热场的朋友。",
      tags: ["经典老歌", "80后", "麦霸局"],
      coverImage: "/assets/images/ktv/ktv-room-03.jpg",
      createdAt: "2026-04-23T18:30:00.000Z",
      updatedAt: "2026-04-23T18:30:00.000Z",
      publishedAt: "2026-04-23T18:30:00.000Z",
      confirmedCount: 3,
      waitlistCount: 1
    }
  ],
  entries: [
    {
      entryId: "entry-001",
      partyId: "party-001",
      userId: "user-host",
      userNickname: "羊羊",
      entryType: "confirmed",
      seqNo: 1,
      waitlistNo: null,
      createdAt: "2026-04-24T09:00:00.000Z",
      confirmedAt: "2026-04-24T09:00:00.000Z"
    },
    {
      entryId: "entry-002",
      partyId: "party-001",
      userId: "user-guest-1",
      userNickname: "阿明",
      entryType: "confirmed",
      seqNo: 2,
      waitlistNo: null,
      createdAt: "2026-04-24T09:10:00.000Z",
      confirmedAt: "2026-04-24T09:10:00.000Z"
    },
    {
      entryId: "entry-003",
      partyId: "party-001",
      userId: "user-guest-2",
      userNickname: "小秋",
      entryType: "confirmed",
      seqNo: 3,
      waitlistNo: null,
      createdAt: "2026-04-24T09:20:00.000Z",
      confirmedAt: "2026-04-24T09:20:00.000Z"
    },
    {
      entryId: "entry-004",
      partyId: "party-001",
      userId: "user-wait-1",
      userNickname: "晓峰",
      entryType: "waitlist",
      seqNo: null,
      waitlistNo: 1,
      createdAt: "2026-04-24T10:10:00.000Z",
      confirmedAt: null
    },
    {
      entryId: "entry-005",
      partyId: "party-003",
      userId: "user-guest-3",
      userNickname: "阿哲",
      entryType: "waitlist",
      seqNo: null,
      waitlistNo: 1,
      createdAt: "2026-04-24T11:00:00.000Z",
      confirmedAt: null
    }
  ],
  notifications: []
};

/**
 * 创建种子数据。
 * @returns {Record<string, unknown[]>} 种子数据副本
 */
function createSeedData() {
  return clonePlainValue(seedData);
}

module.exports = {
  createSeedData
};
```

- [ ] **Step 7: Implement party display helpers**

Create `ktv-FrontEnd/cloudfunctions/shared/party-view.js`:

```js
const PARTY_STATUS_TEXT = {
  draft: "草稿",
  recruiting: "报名中",
  full: "已满员",
  closed: "已截止",
  cancelled: "已取消",
  finished: "已结束"
};

/**
 * 将数字补齐为两位字符。
 * @param {number} value 数字
 * @returns {string} 两位字符
 */
function padNumber(value) {
  return String(value).padStart(2, "0");
}

/**
 * 计算预计人均费用。
 * @param {number} roomFee 包厢费用，单位分
 * @param {number} maxCapacity 人数上限
 * @returns {number} 人均费用，单位分
 */
function calculateEstimatedPerPerson(roomFee, maxCapacity) {
  return maxCapacity > 0 ? Math.ceil(roomFee / maxCapacity) : 0;
}

/**
 * 将分格式化为人民币文案。
 * @param {number} cents 金额，单位分
 * @returns {string} 人民币文案
 */
function formatCurrencyYuan(cents) {
  const yuan = cents / 100;
  return `¥${Number.isInteger(yuan) ? yuan : yuan.toFixed(2)}`;
}

/**
 * 构建时长文案。
 * @param {number} durationMin 时长分钟
 * @returns {string} 时长文案
 */
function formatDurationMin(durationMin) {
  const hour = durationMin / 60;
  return Number.isInteger(hour) ? `${hour} 小时` : `${hour.toFixed(1)} 小时`;
}

/**
 * 构建组局时间摘要。
 * @param {string} startTime 开始时间
 * @param {number} durationMin 时长分钟
 * @returns {string} 时间摘要
 */
function buildTimeSummary(startTime, durationMin) {
  const date = new Date(startTime);
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hours = padNumber(date.getHours());
  const minutes = padNumber(date.getMinutes());
  return `${month}-${day} ${hours}:${minutes} · ${formatDurationMin(durationMin)}`;
}

/**
 * 构建组局进度文案。
 * @param {number} confirmedCount 已确认人数
 * @param {number} maxCapacity 人数上限
 * @param {number} waitlistCount 候补人数
 * @returns {string} 进度文案
 */
function buildPartyProgressText(confirmedCount, maxCapacity, waitlistCount) {
  const baseText = `${confirmedCount} / ${maxCapacity}`;
  return waitlistCount > 0 ? `${baseText}，候补 ${waitlistCount}` : baseText;
}

/**
 * 构建前端可展示的组局对象。
 * @param {{ party: object, host?: object | null, venue?: object | null }} input 输入数据
 * @returns {object} 展示对象
 */
function buildPartyView(input) {
  const party = input.party;
  const host = input.host || {};
  const venue = input.venue || {};
  const estimatedPerPerson = calculateEstimatedPerPerson(party.roomFee, party.maxCapacity);

  return {
    ...party,
    estimatedPerPerson,
    hostSummary: host.nickname || "发起人",
    venueSummary: venue.name ? `${venue.name} · ${venue.district}` : party.venueCustom || "自定义门店",
    progressText: buildPartyProgressText(party.confirmedCount || 0, party.maxCapacity, party.waitlistCount || 0),
    statusText: PARTY_STATUS_TEXT[party.status] || "待确认",
    priceText: `${formatCurrencyYuan(estimatedPerPerson)}/人`,
    timeSummary: buildTimeSummary(party.startTime, party.durationMin)
  };
}

module.exports = {
  PARTY_STATUS_TEXT,
  buildPartyView,
  buildPartyProgressText,
  calculateEstimatedPerPerson,
  formatCurrencyYuan,
  buildTimeSummary
};
```

- [ ] **Step 8: Implement cloud store and runtime**

Create `ktv-FrontEnd/cloudfunctions/shared/cloud-store.js`:

```js
const { clonePlainValue } = require("./memory-store");

/**
 * 创建云数据库存储适配器。
 * @param {object} db 云数据库对象
 * @returns {object} 数据存储
 */
function createCloudStore(db) {
  return {
    /**
     * 列出集合数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @returns {Promise<object[]>} 数据列表
     */
    async list(collection, predicate = () => true) {
      const result = await db.collection(collection).get();
      return (result.data || []).filter(predicate).map(clonePlainValue);
    },

    /**
     * 查找单条数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @returns {Promise<object | null>} 单条数据
     */
    async findOne(collection, predicate) {
      const items = await this.list(collection, predicate);
      return items[0] || null;
    },

    /**
     * 插入文档。
     * @param {string} collection 集合名
     * @param {object} document 文档
     * @returns {Promise<object>} 插入后的文档
     */
    async insert(collection, document) {
      await db.collection(collection).add({ data: document });
      return clonePlainValue(document);
    },

    /**
     * 更新第一条匹配数据。
     * @param {string} collection 集合名
     * @param {(item: object) => boolean} predicate 筛选函数
     * @param {(item: object) => object} updater 更新函数
     * @returns {Promise<object | null>} 更新后的文档
     */
    async updateOne(collection, predicate, updater) {
      const item = await this.findOne(collection, predicate);

      if (!item) {
        return null;
      }

      const id = item._id;
      const nextPatch = updater(item);
      await db.collection(collection).doc(id).update({ data: nextPatch });
      return { ...item, ...nextPatch };
    }
  };
}

module.exports = {
  createCloudStore
};
```

Create `ktv-FrontEnd/cloudfunctions/shared/runtime.js`:

```js
const { createCloudStore } = require("./cloud-store");

/**
 * 安全加载微信云 SDK。
 * @returns {object | null} 微信云 SDK
 */
function loadCloudSdk() {
  try {
    return require("wx-server-sdk");
  } catch (error) {
    return null;
  }
}

/**
 * 创建云函数运行时。
 * @param {object} context 云函数上下文或测试上下文
 * @returns {object} 运行时对象
 */
function createRuntime(context = {}) {
  if (context.store) {
    return {
      store: context.store,
      openid: context.openid || context.OPENID || "openid-host",
      now: context.now || (() => new Date().toISOString())
    };
  }

  const cloud = loadCloudSdk();
  if (!cloud) {
    throw new Error("缺少 wx-server-sdk 或测试 store");
  }

  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  const wxContext = cloud.getWXContext();

  return {
    store: createCloudStore(cloud.database()),
    openid: wxContext.OPENID,
    now: () => new Date().toISOString()
  };
}

module.exports = {
  createRuntime
};
```

- [ ] **Step 9: Run shared-helper tests and verify they pass**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: PASS for the three shared-helper tests.

- [ ] **Step 10: Commit Task 1**

```powershell
git add ktv-FrontEnd/cloudfunctions/shared ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js
git commit -m "feat: 增加云函数公共运行时"
```

### Task 2: Auth And Venue Cloud Functions

**Files:**
- Modify: `ktv-FrontEnd/cloudfunctions/auth/index.js`
- Modify: `ktv-FrontEnd/cloudfunctions/venue/index.js`
- Modify: `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`

- [ ] **Step 1: Write failing auth and venue tests**

Append these tests to `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`:

```js
const authFunction = require("../../cloudfunctions/auth/index");
const venueFunction = require("../../cloudfunctions/venue/index");

test("auth.login returns existing user by openid", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await authFunction.main({ action: "login", payload: {} }, { store, openid: "openid-host" });

  assert.equal(result.ok, true);
  assert.equal(result.data.user.userId, "user-host");
  assert.equal(result.data.openid, "openid-host");
});

test("auth.login creates default user for new openid", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await authFunction.main(
    { action: "login", payload: { nickname: "新朋友", avatarUrl: "https://example.com/new.png" } },
    { store, openid: "openid-new" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.user.nickname, "新朋友");
  assert.equal(result.data.user.openid, "openid-new");
});

test("venue.list filters active venues by district and keyword", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await venueFunction.main(
    { action: "list", payload: { district: "南山", keyword: "MUSE" } },
    { store }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].venueId, "venue-001");
});

test("venue.detail returns not found for unknown venue", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await venueFunction.main({ action: "detail", payload: { venueId: "missing" } }, { store });

  assert.equal(result.ok, false);
  assert.equal(result.code, "NOT_FOUND");
});
```

- [ ] **Step 2: Run auth and venue tests and verify they fail**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: FAIL because `auth` and `venue` still return module echo responses without action handlers.

- [ ] **Step 3: Implement auth cloud function**

Replace `ktv-FrontEnd/cloudfunctions/auth/index.js`:

```js
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");

/**
 * 构建用户编号。
 * @param {string} openid 微信 openid
 * @returns {string} 用户编号
 */
function buildUserId(openid) {
  return `user-${openid.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
}

/**
 * 读取当前用户。
 * @param {object} runtime 运行时
 * @returns {Promise<object | null>} 用户信息
 */
async function findCurrentUser(runtime) {
  return runtime.store.findOne("users", (item) => item.openid === runtime.openid);
}

/**
 * 登录并创建或更新用户。
 * @param {object} payload 登录资料
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 登录结果
 */
async function login(payload, runtime) {
  const currentUser = await findCurrentUser(runtime);

  if (currentUser) {
    const patch = {
      nickname: payload.nickname || currentUser.nickname,
      avatarUrl: payload.avatarUrl || currentUser.avatarUrl,
      updatedAt: runtime.now()
    };
    const user = await runtime.store.updateOne("users", (item) => item.userId === currentUser.userId, () => patch);
    return { openid: runtime.openid, user };
  }

  const now = runtime.now();
  const user = await runtime.store.insert("users", {
    userId: buildUserId(runtime.openid),
    openid: runtime.openid,
    nickname: payload.nickname || "微信用户",
    avatarUrl: payload.avatarUrl || "",
    createdAt: now,
    updatedAt: now
  });

  return { openid: runtime.openid, user };
}

/**
 * 读取当前用户资料。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object | null>} 用户资料
 */
async function profile(payload, runtime) {
  return findCurrentUser(runtime);
}

const handlers = {
  login,
  profile
};

/**
 * 登录云函数入口。
 * @param {Record<string, unknown>} event 云函数入参
 * @param {Record<string, unknown>} context 云函数上下文
 * @returns {Promise<object>} 统一响应
 */
exports.main = async (event, context) => {
  return runAction(handlers, event, createRuntime(context));
};
```

- [ ] **Step 4: Implement venue cloud function**

Replace `ktv-FrontEnd/cloudfunctions/venue/index.js`:

```js
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");
const { AppError, ERROR_CODES, assertRequired } = require("../shared/errors");

/**
 * 判断门店是否匹配查询。
 * @param {object} venue 门店
 * @param {object} filters 查询条件
 * @returns {boolean} 是否匹配
 */
function matchesVenue(venue, filters) {
  if (!venue.isActive) {
    return false;
  }

  if (filters.district && venue.district !== filters.district) {
    return false;
  }

  if (filters.priceLevel !== undefined && String(venue.priceLevel) !== String(filters.priceLevel)) {
    return false;
  }

  if (filters.keyword) {
    const keyword = String(filters.keyword).trim().toLowerCase();
    const targetText = `${venue.name} ${venue.district} ${venue.address}`.toLowerCase();
    return targetText.includes(keyword);
  }

  return true;
}

/**
 * 获取门店列表。
 * @param {object} payload 查询条件
 * @param {object} runtime 运行时
 * @returns {Promise<object[]>} 门店列表
 */
async function list(payload, runtime) {
  return runtime.store.list("venues", (venue) => matchesVenue(venue, payload));
}

/**
 * 获取门店详情。
 * @param {object} payload 查询条件
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 门店详情
 */
async function detail(payload, runtime) {
  assertRequired(payload.venueId, "venueId", "缺少门店 ID");
  const venue = await runtime.store.findOne("venues", (item) => item.venueId === payload.venueId && item.isActive);

  if (!venue) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "门店不存在");
  }

  return venue;
}

const handlers = {
  list,
  detail
};

/**
 * 门店云函数入口。
 * @param {Record<string, unknown>} event 云函数入参
 * @param {Record<string, unknown>} context 云函数上下文
 * @returns {Promise<object>} 统一响应
 */
exports.main = async (event, context) => {
  return runAction(handlers, event, createRuntime(context));
};
```

- [ ] **Step 5: Run auth and venue tests and verify they pass**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: PASS for shared-helper, auth, and venue tests.

- [ ] **Step 6: Commit Task 2**

```powershell
git add ktv-FrontEnd/cloudfunctions/auth/index.js ktv-FrontEnd/cloudfunctions/venue/index.js ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js
git commit -m "feat: 实现登录和门店云函数"
```

### Task 3: Party Cloud Function

**Files:**
- Modify: `ktv-FrontEnd/cloudfunctions/party/index.js`
- Modify: `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`

- [ ] **Step 1: Write failing party tests**

Append these tests to `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`:

```js
const partyFunction = require("../../cloudfunctions/party/index");

test("party.list returns visible party cards with display fields", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main({ action: "list", payload: {} }, { store });

  assert.equal(result.ok, true);
  assert.equal(result.data.length > 0, true);
  assert.equal(result.data.every((item) => item.status !== "finished" && item.status !== "cancelled"), true);
  assert.equal(typeof result.data[0].estimatedPerPerson, "number");
  assert.equal(typeof result.data[0].venueSummary, "string");
});

test("party.detail returns host entries and viewer entry", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main(
    { action: "detail", payload: { partyId: "party-001", userId: "user-host" } },
    { store }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.party.partyId, "party-001");
  assert.equal(result.data.host.userId, "user-host");
  assert.equal(result.data.confirmedEntries.length, 3);
  assert.equal(result.data.waitlistEntries.length, 1);
  assert.equal(result.data.viewerEntry.userId, "user-host");
});

test("party.myTabs groups hosting joined waitlist and history", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main(
    { action: "myTabs", payload: { userId: "user-host" } },
    { store, openid: "openid-host" }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.data), ["hosting", "joined", "waitlist", "history"]);
  assert.equal(result.data.hosting.length > 0, true);
});

test("party.createDraft creates draft and host entry", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "羊羊周六 K 局",
        venueId: "venue-001",
        venueSummary: "MUSE KTV · 南山",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12,
        notes: "欢迎新人，不限歌路。",
        tags: ["欢迎新人"]
      }
    },
    { store, openid: "openid-host" }
  );

  const entries = await store.list("entries", (item) => item.partyId === result.data.partyId);
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "draft");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].entryType, "confirmed");
});

test("party.publish changes draft to recruiting", async () => {
  const store = createMemoryStore(createSeedData());
  await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "羊羊周六 K 局",
        venueId: "venue-001",
        venueSummary: "MUSE KTV · 南山",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12,
        notes: "欢迎新人，不限歌路。",
        tags: ["欢迎新人"]
      }
    },
    { store, openid: "openid-host" }
  );

  const drafts = await store.list("parties", (item) => item.title === "羊羊周六 K 局");
  const result = await partyFunction.main(
    { action: "publish", payload: { partyId: drafts[0].partyId } },
    { store, openid: "openid-host" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.status, "recruiting");
});
```

- [ ] **Step 2: Run party tests and verify they fail**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: FAIL because `party` still returns module echo responses.

- [ ] **Step 3: Implement party cloud function**

Replace `ktv-FrontEnd/cloudfunctions/party/index.js`:

```js
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");
const { AppError, ERROR_CODES, assertRequired, assertCondition } = require("../shared/errors");
const { buildPartyView } = require("../shared/party-view");

/**
 * 创建短随机编号。
 * @param {string} prefix 前缀
 * @returns {string} 编号
 */
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * 按用户编号或 openid 读取当前用户。
 * @param {object} runtime 运行时
 * @param {string | undefined} userId 用户编号
 * @returns {Promise<object>} 用户
 */
async function getCurrentUser(runtime, userId) {
  const user = userId
    ? await runtime.store.findOne("users", (item) => item.userId === userId)
    : await runtime.store.findOne("users", (item) => item.openid === runtime.openid);

  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  return user;
}

/**
 * 读取组局并补充关联数据。
 * @param {object} runtime 运行时
 * @param {object} party 组局
 * @returns {Promise<object>} 展示组局
 */
async function attachPartyView(runtime, party) {
  const host = await runtime.store.findOne("users", (item) => item.userId === party.hostId);
  const venue = await runtime.store.findOne("venues", (item) => item.venueId === party.venueId);
  return buildPartyView({ party, host, venue });
}

/**
 * 获取组局列表。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object[]>} 组局列表
 */
async function list(payload, runtime) {
  const parties = await runtime.store.list("parties", (item) => item.status !== "finished" && item.status !== "cancelled");
  const views = [];

  for (const party of parties) {
    views.push(await attachPartyView(runtime, party));
  }

  return views;
}

/**
 * 获取组局详情。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 详情
 */
async function detail(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "缺少组局 ID");
  const party = await runtime.store.findOne("parties", (item) => item.partyId === payload.partyId);

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "局不存在");
  }

  const host = await runtime.store.findOne("users", (item) => item.userId === party.hostId);
  const venue = await runtime.store.findOne("venues", (item) => item.venueId === party.venueId);
  const entries = await runtime.store.list("entries", (item) => item.partyId === payload.partyId);
  const activeEntries = entries.filter((item) => item.entryType === "confirmed" || item.entryType === "waitlist");

  return {
    party: buildPartyView({ party, host, venue }),
    host,
    confirmedEntries: activeEntries.filter((item) => item.entryType === "confirmed").sort((left, right) => left.seqNo - right.seqNo),
    waitlistEntries: activeEntries.filter((item) => item.entryType === "waitlist").sort((left, right) => left.waitlistNo - right.waitlistNo),
    viewerEntry: activeEntries.find((item) => item.userId === payload.userId) || null
  };
}

/**
 * 获取我的组局分组。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 分组数据
 */
async function myTabs(payload, runtime) {
  const user = await getCurrentUser(runtime, payload.userId);
  const parties = await runtime.store.list("parties");
  const entries = await runtime.store.list(
    "entries",
    (item) => item.userId === user.userId && (item.entryType === "confirmed" || item.entryType === "waitlist")
  );
  const views = [];

  for (const party of parties) {
    views.push(await attachPartyView(runtime, party));
  }

  const hasEntry = (partyId, entryType) => entries.some((item) => item.partyId === partyId && item.entryType === entryType);

  return {
    hosting: views.filter((item) => item.hostId === user.userId && item.status !== "finished"),
    joined: views.filter((item) => item.hostId !== user.userId && hasEntry(item.partyId, "confirmed")),
    waitlist: views.filter((item) => hasEntry(item.partyId, "waitlist")),
    history: views.filter((item) => item.status === "finished")
  };
}

/**
 * 创建组局草稿。
 * @param {object} payload 表单输入
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 草稿组局
 */
async function createDraft(payload, runtime) {
  const user = await getCurrentUser(runtime, payload.userId);
  assertRequired(payload.title, "title", "请填写局标题");
  assertRequired(payload.venueId, "venueId", "请选择门店");
  assertCondition(Number(payload.roomFee) >= 100, ERROR_CODES.VALIDATION_ERROR, "包厢费用至少为 1 元");
  assertCondition(Number(payload.maxCapacity) >= 2, ERROR_CODES.VALIDATION_ERROR, "人数上限需至少 2 人");

  const now = runtime.now();
  const partyId = createId("party");
  const party = await runtime.store.insert("parties", {
    partyId,
    title: payload.title,
    venueId: payload.venueId,
    venueCustom: "",
    hostId: user.userId,
    startTime: `${payload.startDate}T${payload.startTime}:00+08:00`,
    durationMin: Number(payload.durationMin),
    roomFee: Number(payload.roomFee),
    maxCapacity: Number(payload.maxCapacity),
    status: "draft",
    isPublic: false,
    notes: payload.notes || "",
    tags: payload.tags || [],
    coverImage: "/assets/images/ktv/ktv-room-01.jpg",
    confirmedCount: 1,
    waitlistCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: null
  });

  await runtime.store.insert("entries", {
    entryId: createId("entry"),
    partyId,
    userId: user.userId,
    userNickname: user.nickname,
    entryType: "confirmed",
    seqNo: 1,
    waitlistNo: null,
    createdAt: now,
    confirmedAt: now
  });

  return attachPartyView(runtime, party);
}

/**
 * 发布组局。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 发布后的组局
 */
async function publish(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "缺少组局 ID");
  const now = runtime.now();
  const party = await runtime.store.updateOne(
    "parties",
    (item) => item.partyId === payload.partyId,
    () => ({ status: "recruiting", updatedAt: now, publishedAt: now })
  );

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "草稿不存在");
  }

  return attachPartyView(runtime, party);
}

const handlers = {
  list,
  detail,
  myTabs,
  createDraft,
  publish
};

/**
 * 组局云函数入口。
 * @param {Record<string, unknown>} event 云函数入参
 * @param {Record<string, unknown>} context 云函数上下文
 * @returns {Promise<object>} 统一响应
 */
exports.main = async (event, context) => {
  return runAction(handlers, event, createRuntime(context));
};
```

- [ ] **Step 4: Run party tests and verify they pass**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: PASS for shared-helper, auth, venue, and party tests.

- [ ] **Step 5: Commit Task 3**

```powershell
git add ktv-FrontEnd/cloudfunctions/party/index.js ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js
git commit -m "feat: 实现组局云函数"
```

### Task 4: Entry And Notification Cloud Functions

**Files:**
- Modify: `ktv-FrontEnd/cloudfunctions/entry/index.js`
- Modify: `ktv-FrontEnd/cloudfunctions/notify/index.js`
- Modify: `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`

- [ ] **Step 1: Write failing entry and notification tests**

Append these tests to `ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js`:

```js
const entryFunction = require("../../cloudfunctions/entry/index");
const notifyFunction = require("../../cloudfunctions/notify/index");

test("entry.join creates confirmed entry and updates party count", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await entryFunction.main(
    { action: "join", payload: { partyId: "party-002", userId: "user-guest-1" } },
    { store, openid: "openid-guest-1" }
  );
  const party = await store.findOne("parties", (item) => item.partyId === "party-002");

  assert.equal(result.ok, true);
  assert.equal(result.data.entryType, "confirmed");
  assert.equal(party.confirmedCount, 2);
});

test("entry.join blocks duplicate active entry", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await entryFunction.main(
    { action: "join", payload: { partyId: "party-001", userId: "user-guest-1" } },
    { store, openid: "openid-guest-1" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "DUPLICATE_ENTRY");
});

test("entry.join blocks full party", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await entryFunction.main(
    { action: "join", payload: { partyId: "party-003", userId: "user-guest-2" } },
    { store, openid: "openid-guest-2" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "PARTY_FULL");
});

test("entry.waitlist creates waitlist entry for full party", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await entryFunction.main(
    { action: "waitlist", payload: { partyId: "party-003", userId: "user-guest-2" } },
    { store, openid: "openid-guest-2" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.entryType, "waitlist");
  assert.equal(result.data.waitlistNo, 2);
});

test("entry.quit promotes first waitlist entry after confirmed user quits", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await entryFunction.main(
    { action: "quit", payload: { partyId: "party-001", userId: "user-guest-1" } },
    { store, openid: "openid-guest-1" }
  );
  const promoted = await store.findOne("entries", (item) => item.userId === "user-wait-1" && item.partyId === "party-001");

  assert.equal(result.ok, true);
  assert.equal(promoted.entryType, "confirmed");
  assert.equal(promoted.waitlistNo, null);
});

test("notify.list and notify.markRead manage current user notifications", async () => {
  const store = createMemoryStore(createSeedData());
  await store.insert("notifications", {
    notificationId: "notification-001",
    userId: "user-host",
    type: "entry_joined",
    title: "有人报名",
    content: "阿明报名了你的组局",
    partyId: "party-001",
    entryId: "entry-002",
    read: false,
    createdAt: "2026-05-21T10:00:00.000Z",
    readAt: null
  });

  const listResult = await notifyFunction.main({ action: "list", payload: { userId: "user-host" } }, { store });
  const readResult = await notifyFunction.main(
    { action: "markRead", payload: { userId: "user-host", notificationId: "notification-001" } },
    { store }
  );

  assert.equal(listResult.ok, true);
  assert.equal(listResult.data.length, 1);
  assert.equal(readResult.ok, true);
  assert.equal(readResult.data.read, true);
});
```

- [ ] **Step 2: Run entry and notification tests and verify they fail**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: FAIL because `entry` and `notify` still return module echo responses.

- [ ] **Step 3: Implement entry cloud function**

Replace `ktv-FrontEnd/cloudfunctions/entry/index.js`:

```js
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");
const { AppError, ERROR_CODES, assertRequired } = require("../shared/errors");

/**
 * 创建短随机编号。
 * @param {string} prefix 前缀
 * @returns {string} 编号
 */
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * 按用户编号或 openid 读取当前用户。
 * @param {object} runtime 运行时
 * @param {string | undefined} userId 用户编号
 * @returns {Promise<object>} 用户
 */
async function getCurrentUser(runtime, userId) {
  const user = userId
    ? await runtime.store.findOne("users", (item) => item.userId === userId)
    : await runtime.store.findOne("users", (item) => item.openid === runtime.openid);

  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  return user;
}

/**
 * 读取组局。
 * @param {object} runtime 运行时
 * @param {string} partyId 组局编号
 * @returns {Promise<object>} 组局
 */
async function getParty(runtime, partyId) {
  const party = await runtime.store.findOne("parties", (item) => item.partyId === partyId);

  if (!party) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "局不存在");
  }

  return party;
}

/**
 * 读取有效报名。
 * @param {object} runtime 运行时
 * @param {string} partyId 组局编号
 * @returns {Promise<object[]>} 有效报名
 */
async function listActiveEntries(runtime, partyId) {
  return runtime.store.list(
    "entries",
    (item) => item.partyId === partyId && (item.entryType === "confirmed" || item.entryType === "waitlist")
  );
}

/**
 * 校验用户未重复报名。
 * @param {object[]} entries 报名记录
 * @param {string} userId 用户编号
 */
function assertNoActiveEntry(entries, userId) {
  if (entries.some((item) => item.userId === userId)) {
    throw new AppError(ERROR_CODES.DUPLICATE_ENTRY, "你已经报名或候补该局");
  }
}

/**
 * 正式报名。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 报名记录
 */
async function join(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "缺少组局 ID");
  const user = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);

  if (party.status !== "recruiting") {
    throw new AppError(ERROR_CODES.PARTY_NOT_RECRUITING, "当前局不可报名");
  }

  const entries = await listActiveEntries(runtime, payload.partyId);
  assertNoActiveEntry(entries, user.userId);

  const confirmedEntries = entries.filter((item) => item.entryType === "confirmed");
  if (confirmedEntries.length >= party.maxCapacity) {
    throw new AppError(ERROR_CODES.PARTY_FULL, "局已满员");
  }

  const now = runtime.now();
  const nextSeqNo = confirmedEntries.length + 1;
  const entry = await runtime.store.insert("entries", {
    entryId: createId("entry"),
    partyId: payload.partyId,
    userId: user.userId,
    userNickname: user.nickname,
    entryType: "confirmed",
    seqNo: nextSeqNo,
    waitlistNo: null,
    createdAt: now,
    confirmedAt: now
  });

  const nextStatus = nextSeqNo >= party.maxCapacity ? "full" : party.status;
  await runtime.store.updateOne(
    "parties",
    (item) => item.partyId === payload.partyId,
    () => ({ confirmedCount: nextSeqNo, status: nextStatus, updatedAt: now })
  );

  return entry;
}

/**
 * 加入候补。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 候补记录
 */
async function waitlist(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "缺少组局 ID");
  const user = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);

  if (party.status !== "recruiting" && party.status !== "full") {
    throw new AppError(ERROR_CODES.PARTY_NOT_RECRUITING, "当前局不可候补");
  }

  const entries = await listActiveEntries(runtime, payload.partyId);
  assertNoActiveEntry(entries, user.userId);

  const waitlistEntries = entries.filter((item) => item.entryType === "waitlist");
  const now = runtime.now();
  const entry = await runtime.store.insert("entries", {
    entryId: createId("entry"),
    partyId: payload.partyId,
    userId: user.userId,
    userNickname: user.nickname,
    entryType: "waitlist",
    seqNo: null,
    waitlistNo: waitlistEntries.length + 1,
    createdAt: now,
    confirmedAt: null
  });

  await runtime.store.updateOne(
    "parties",
    (item) => item.partyId === payload.partyId,
    () => ({ waitlistCount: waitlistEntries.length + 1, updatedAt: now })
  );

  return entry;
}

/**
 * 重排候补序号。
 * @param {object} runtime 运行时
 * @param {string} partyId 组局编号
 */
async function reorderWaitlist(runtime, partyId) {
  const waitlistEntries = await runtime.store.list(
    "entries",
    (item) => item.partyId === partyId && item.entryType === "waitlist"
  );
  waitlistEntries.sort((left, right) => left.waitlistNo - right.waitlistNo);

  for (let index = 0; index < waitlistEntries.length; index += 1) {
    await runtime.store.updateOne(
      "entries",
      (item) => item.entryId === waitlistEntries[index].entryId,
      () => ({ waitlistNo: index + 1 })
    );
  }
}

/**
 * 退出报名并处理候补转正。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 退出结果
 */
async function quit(payload, runtime) {
  assertRequired(payload.partyId, "partyId", "缺少组局 ID");
  const user = await getCurrentUser(runtime, payload.userId);
  const party = await getParty(runtime, payload.partyId);
  const now = runtime.now();
  const currentEntry = await runtime.store.findOne(
    "entries",
    (item) => item.partyId === payload.partyId && item.userId === user.userId && (item.entryType === "confirmed" || item.entryType === "waitlist")
  );

  if (!currentEntry) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "报名记录不存在");
  }

  await runtime.store.updateOne(
    "entries",
    (item) => item.entryId === currentEntry.entryId,
    () => ({ entryType: "quit", quitAt: now })
  );

  let promotedEntry = null;
  if (currentEntry.entryType === "confirmed") {
    const waitlistEntries = await runtime.store.list(
      "entries",
      (item) => item.partyId === payload.partyId && item.entryType === "waitlist"
    );
    waitlistEntries.sort((left, right) => left.waitlistNo - right.waitlistNo);
    promotedEntry = waitlistEntries[0] || null;

    if (promotedEntry) {
      await runtime.store.updateOne(
        "entries",
        (item) => item.entryId === promotedEntry.entryId,
        () => ({ entryType: "confirmed", seqNo: currentEntry.seqNo, waitlistNo: null, confirmedAt: now })
      );
    }
  }

  await reorderWaitlist(runtime, payload.partyId);
  const activeEntries = await listActiveEntries(runtime, payload.partyId);
  const confirmedCount = activeEntries.filter((item) => item.entryType === "confirmed").length;
  const waitlistCount = activeEntries.filter((item) => item.entryType === "waitlist").length;

  await runtime.store.updateOne(
    "parties",
    (item) => item.partyId === payload.partyId,
    () => ({
      confirmedCount,
      waitlistCount,
      status: party.status === "full" && confirmedCount < party.maxCapacity ? "recruiting" : party.status,
      updatedAt: now
    })
  );

  return { quitEntryId: currentEntry.entryId, promotedEntry };
}

const handlers = {
  join,
  waitlist,
  quit
};

/**
 * 报名云函数入口。
 * @param {Record<string, unknown>} event 云函数入参
 * @param {Record<string, unknown>} context 云函数上下文
 * @returns {Promise<object>} 统一响应
 */
exports.main = async (event, context) => {
  return runAction(handlers, event, createRuntime(context));
};
```

- [ ] **Step 4: Implement notification cloud function**

Replace `ktv-FrontEnd/cloudfunctions/notify/index.js`:

```js
const { createRuntime } = require("../shared/runtime");
const { runAction } = require("../shared/response");
const { AppError, ERROR_CODES, assertRequired } = require("../shared/errors");

/**
 * 创建短随机编号。
 * @param {string} prefix 前缀
 * @returns {string} 编号
 */
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * 读取通知所属用户。
 * @param {object} runtime 运行时
 * @param {string | undefined} userId 用户编号
 * @returns {Promise<object>} 用户
 */
async function getUser(runtime, userId) {
  const user = userId
    ? await runtime.store.findOne("users", (item) => item.userId === userId)
    : await runtime.store.findOne("users", (item) => item.openid === runtime.openid);

  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录");
  }

  return user;
}

/**
 * 创建通知记录。
 * @param {object} payload 通知内容
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 通知记录
 */
async function create(payload, runtime) {
  assertRequired(payload.userId, "userId", "缺少用户 ID");
  assertRequired(payload.title, "title", "缺少通知标题");
  const now = runtime.now();
  return runtime.store.insert("notifications", {
    notificationId: createId("notification"),
    userId: payload.userId,
    type: payload.type || "system",
    title: payload.title,
    content: payload.content || "",
    partyId: payload.partyId || "",
    entryId: payload.entryId || "",
    read: false,
    createdAt: now,
    readAt: null
  });
}

/**
 * 获取通知列表。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object[]>} 通知列表
 */
async function list(payload, runtime) {
  const user = await getUser(runtime, payload.userId);
  const notifications = await runtime.store.list("notifications", (item) => item.userId === user.userId);
  return notifications.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

/**
 * 标记通知已读。
 * @param {object} payload 入参
 * @param {object} runtime 运行时
 * @returns {Promise<object>} 已读通知
 */
async function markRead(payload, runtime) {
  const user = await getUser(runtime, payload.userId);
  assertRequired(payload.notificationId, "notificationId", "缺少通知 ID");
  const notification = await runtime.store.updateOne(
    "notifications",
    (item) => item.notificationId === payload.notificationId && item.userId === user.userId,
    () => ({ read: true, readAt: runtime.now() })
  );

  if (!notification) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "通知不存在");
  }

  return notification;
}

const handlers = {
  create,
  list,
  markRead
};

/**
 * 通知云函数入口。
 * @param {Record<string, unknown>} event 云函数入参
 * @param {Record<string, unknown>} context 云函数上下文
 * @returns {Promise<object>} 统一响应
 */
exports.main = async (event, context) => {
  return runAction(handlers, event, createRuntime(context));
};
```

- [ ] **Step 5: Run entry and notification tests and verify they pass**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js
```

Expected: PASS for shared-helper, auth, venue, party, entry, and notification tests.

- [ ] **Step 6: Commit Task 4**

```powershell
git add ktv-FrontEnd/cloudfunctions/entry/index.js ktv-FrontEnd/cloudfunctions/notify/index.js ktv-FrontEnd/miniprogram/tests/cloud-backend.test.js
git commit -m "feat: 实现报名候补和通知云函数"
```

### Task 5: Frontend Cloud-Mode Service Adapter

**Files:**
- Create: `ktv-FrontEnd/miniprogram/services/api/cloud.ts`
- Modify: `ktv-FrontEnd/miniprogram/services/config.ts`
- Modify: `ktv-FrontEnd/miniprogram/services/api/party.ts`
- Modify: `ktv-FrontEnd/miniprogram/services/api/venue.ts`
- Modify: `ktv-FrontEnd/miniprogram/services/api/user.ts`
- Modify: `ktv-FrontEnd/miniprogram/app.ts`
- Modify: `ktv-FrontEnd/miniprogram/tests/services.test.ts`

- [ ] **Step 1: Write failing cloud adapter tests**

Append these tests to `ktv-FrontEnd/miniprogram/tests/services.test.ts`:

```ts
import { unwrapCloudResult } from "../services/api/cloud";
import { serviceConfig } from "../services/config";

test("云端响应解包成功时返回 data", () => {
  const data = unwrapCloudResult<{ value: number }>({
    result: {
      ok: true,
      data: { value: 1 },
      message: "success"
    }
  });

  assert.equal(data.value, 1);
});

test("云端响应失败时抛出带 code 的错误", () => {
  assert.throws(
    () =>
      unwrapCloudResult({
        result: {
          ok: false,
          code: "PARTY_FULL",
          message: "局已满员"
        }
      }),
    (error: unknown) => error instanceof Error && (error as Error & { code?: string }).code === "PARTY_FULL"
  );
});

test("服务配置默认保持 mock 模式", () => {
  assert.equal(serviceConfig.dataSource, "mock");
});
```

- [ ] **Step 2: Run cloud adapter tests and verify they fail**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/services.test.ts
```

Expected: FAIL because `../services/api/cloud` does not exist.

- [ ] **Step 3: Implement service config**

Replace `ktv-FrontEnd/miniprogram/services/config.ts`:

```ts
/**
 * 数据源类型。
 */
export type DataSource = "mock" | "cloud";

/**
 * 数据源配置。
 */
export const serviceConfig = {
  dataSource: "mock" as DataSource,
  cloudEnvId: ""
};
```

- [ ] **Step 4: Implement cloud call adapter**

Create `ktv-FrontEnd/miniprogram/services/api/cloud.ts`:

```ts
/**
 * 云函数成功响应。
 */
interface CloudSuccess<T> {
  ok: true;
  data: T;
  message: string;
}

/**
 * 云函数失败响应。
 */
interface CloudFailure {
  ok: false;
  code: string;
  message: string;
}

/**
 * 云函数调用结果。
 */
interface CloudCallResult<T> {
  result?: CloudSuccess<T> | CloudFailure;
}

/**
 * 带错误码的云端错误。
 */
export interface CloudApiError extends Error {
  code?: string;
}

/**
 * 解包云函数结果。
 * @param response 云函数原始响应
 * @returns 云端 data
 */
export function unwrapCloudResult<T>(response: CloudCallResult<T>): T {
  const result = response.result;

  if (!result) {
    const error = new Error("云函数无响应") as CloudApiError;
    error.code = "INTERNAL_ERROR";
    throw error;
  }

  if (!result.ok) {
    const error = new Error(result.message) as CloudApiError;
    error.code = result.code;
    throw error;
  }

  return result.data;
}

/**
 * 调用云函数。
 * @param name 云函数名
 * @param action 动作名
 * @param payload 入参
 * @returns 云端 data
 */
export async function callCloudFunction<T>(name: string, action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (typeof wx === "undefined" || !wx.cloud) {
    const error = new Error("当前环境不支持云函数") as CloudApiError;
    error.code = "INTERNAL_ERROR";
    throw error;
  }

  const response = await wx.cloud.callFunction({
    name,
    data: {
      action,
      payload
    }
  });

  return unwrapCloudResult<T>(response as CloudCallResult<T>);
}
```

- [ ] **Step 5: Modify party service with cloud branch**

Edit `ktv-FrontEnd/miniprogram/services/api/party.ts`. Keep all current mock logic, add imports at the top:

```ts
import { callCloudFunction } from "./cloud";
import { serviceConfig } from "../config";
```

Then insert these exact branches at the start of the matching exported async functions. The code after each branch is the current local-data code already in the file and must remain unchanged.

```ts
// Insert at the top of getPartyList().
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<Party[]>("party", "list");
}

// Insert at the top of getPartyDetail(partyId).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<{
    party: Party;
    host: (typeof userList)[number];
    confirmedEntries: Entry[];
    waitlistEntries: Entry[];
    viewerEntry: Entry | null;
  }>("party", "detail", { partyId, userId: "user-host" });
}

// Insert at the top of getMyPartyTabs(userId).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<MyPartyTabs<Party>>("party", "myTabs", { userId });
}

// Insert at the top of createPartyDraft(input).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<Party>("party", "createDraft", { ...input, userId: "user-host" });
}

// Insert at the top of publishParty(partyId).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<Party>("party", "publish", { partyId });
}

// Insert at the top of joinParty(partyId, userId).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<Entry>("entry", "join", { partyId, userId });
}

// Insert at the top of joinWaitlist(partyId, userId).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<Entry>("entry", "waitlist", { partyId, userId });
}
```

- [ ] **Step 6: Modify venue service with cloud branch**

Edit `ktv-FrontEnd/miniprogram/services/api/venue.ts`. Add imports:

```ts
import { callCloudFunction } from "./cloud";
import { serviceConfig } from "../config";
import type { Venue } from "../../types/venue";
```

Insert these exact branches at the start of the matching exported async functions. Leave the current local filtering and sync lookup code below the branch.

```ts
// Insert at the top of getVenueList(filters).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<Venue[]>("venue", "list", filters || {});
}

// Insert at the top of getVenueById(venueId).
if (serviceConfig.dataSource === "cloud") {
  return callCloudFunction<Venue>("venue", "detail", { venueId });
}
```

- [ ] **Step 7: Modify user service with cloud branch**

Edit `ktv-FrontEnd/miniprogram/services/api/user.ts`. Add imports:

```ts
import { callCloudFunction } from "./cloud";
import { serviceConfig } from "../config";
import type { User } from "../../types/user";
```

Add cloud branches:

```ts
export async function getCurrentUser(userId: string = "user-host") {
  if (serviceConfig.dataSource === "cloud") {
    const result = await callCloudFunction<{ user: User }>("auth", "login", { userId });
    return result.user;
  }

  return getUserByIdSync(userId) ?? clonePlainValue(userList[0]);
}

export async function getUserById(userId: string) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<User | null>("auth", "profile", { userId });
  }

  return getUserByIdSync(userId);
}

export async function listUsers() {
  return clonePlainValue(userList);
}
```

Keep `listUsers` mock-only because no page currently needs a cloud all-user list.

- [ ] **Step 8: Initialize cloud in app startup**

Edit `ktv-FrontEnd/miniprogram/app.ts`. Add import:

```ts
import { serviceConfig } from "./services/config";
```

Update `onLaunch`:

```ts
/**
 * 小程序启动时初始化全局状态。
 */
onLaunch() {
  if (serviceConfig.dataSource === "cloud" && wx.cloud) {
    wx.cloud.init({
      env: serviceConfig.cloudEnvId || undefined,
      traceUser: true
    });
  }

  console.log("K 局小程序启动");
}
```

- [ ] **Step 9: Run service tests and verify they pass**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/services.test.ts
```

Expected: PASS. Mock-mode tests must still pass because `serviceConfig.dataSource` remains `"mock"`.

- [ ] **Step 10: Commit Task 5**

```powershell
git add ktv-FrontEnd/miniprogram/services ktv-FrontEnd/miniprogram/app.ts ktv-FrontEnd/miniprogram/tests/services.test.ts
git commit -m "feat: 接入前端云函数服务适配"
```

### Task 6: Project Configuration And Final Verification

**Files:**
- Modify: `ktv-FrontEnd/project.config.json`
- Modify: `ktv-FrontEnd/cloudfunctions/auth/package.json`
- Modify: `ktv-FrontEnd/cloudfunctions/venue/package.json`
- Modify: `ktv-FrontEnd/cloudfunctions/party/package.json`
- Modify: `ktv-FrontEnd/cloudfunctions/entry/package.json`
- Modify: `ktv-FrontEnd/cloudfunctions/notify/package.json`
- Modify: `ktv-FrontEnd/miniprogram/tests/cloudfunctions.test.js`

- [ ] **Step 1: Write failing cloud configuration tests**

Replace `ktv-FrontEnd/miniprogram/tests/cloudfunctions.test.js`:

```js
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..", "..");

test("项目配置声明云函数根目录", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "project.config.json"), "utf8"));
  assert.equal(config.cloudfunctionRoot, "cloudfunctions/");
});

test("云函数目录完整", () => {
  ["auth", "venue", "party", "entry", "notify"].forEach((name) => {
    assert.equal(fs.existsSync(path.join(root, "cloudfunctions", name, "index.js")), true, name);
    assert.equal(fs.existsSync(path.join(root, "cloudfunctions", name, "package.json")), true, `${name}-package`);
  });
});

test("云函数声明微信云 SDK 依赖", () => {
  ["auth", "venue", "party", "entry", "notify"].forEach((name) => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, "cloudfunctions", name, "package.json"), "utf8"));
    assert.equal(packageJson.dependencies["wx-server-sdk"], "latest", `${name}-wx-server-sdk`);
  });
});

test("云函数共享后端文件完整", () => {
  ["errors.js", "response.js", "memory-store.js", "cloud-store.js", "runtime.js", "seed.js", "party-view.js"].forEach((fileName) => {
    assert.equal(fs.existsSync(path.join(root, "cloudfunctions", "shared", fileName)), true, fileName);
  });
});
```

- [ ] **Step 2: Run cloud configuration tests and verify they fail**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloudfunctions.test.js
```

Expected: FAIL because `cloudfunctionRoot` and `wx-server-sdk` dependencies are not configured yet.

- [ ] **Step 3: Add cloud function root to project config**

Edit `ktv-FrontEnd/project.config.json` and add this top-level property next to `miniprogramRoot`:

```json
{
  "appid": "wxba0b343df4fbf94d",
  "projectname": "ktv",
  "compileType": "miniprogram",
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "srcMiniprogramRoot": "miniprogram/"
}
```

Keep the rest of the existing JSON settings unchanged.

- [ ] **Step 4: Add wx-server-sdk dependency to each cloud function**

Update each `ktv-FrontEnd/cloudfunctions/{auth,venue,party,entry,notify}/package.json` so dependencies look like this:

```json
{
  "name": "party",
  "version": "0.1.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

Use the existing function name for each file. Do not rename packages.

- [ ] **Step 5: Run cloud backend and configuration tests**

Run:

```powershell
cd ktv-FrontEnd
npx tsx --test miniprogram/tests/cloud-backend.test.js miniprogram/tests/cloudfunctions.test.js
```

Expected: PASS.

- [ ] **Step 6: Run full project test suite**

Run:

```powershell
cd ktv-FrontEnd
npm test
```

Expected: PASS for all tests. If an existing frontend test fails because mock behavior changed, revert the service-layer mock branch and keep the cloud branch isolated.

- [ ] **Step 7: Commit Task 6**

```powershell
git add ktv-FrontEnd/project.config.json ktv-FrontEnd/cloudfunctions/*/package.json ktv-FrontEnd/miniprogram/tests/cloudfunctions.test.js
git commit -m "chore: 配置云函数项目根目录"
```

## Completion Checklist

- [ ] `npm test` passes from `ktv-FrontEnd`.
- [ ] `serviceConfig.dataSource` defaults to `"mock"`.
- [ ] Every new JavaScript or TypeScript function added in implementation has a Chinese JSDoc comment.
- [ ] Cloud functions return `{ ok: true, data, message }` or `{ ok: false, code, message }`.
- [ ] The frontend pages keep using existing service function names.
- [ ] No unrelated dirty worktree changes are reverted or committed.

## Plan Self-Review

- Spec coverage: Task 1 covers shared response, errors, runtime, seed data, and display formatting. Task 2 covers `auth` and `venue`. Task 3 covers `party`. Task 4 covers `entry` and `notify`. Task 5 covers frontend cloud-mode switching. Task 6 covers project configuration and full verification.
- Placeholder scan: no unresolved markers or generic implementation steps remain.
- Type consistency: action names match the design document: `login`, `profile`, `list`, `detail`, `myTabs`, `createDraft`, `publish`, `join`, `waitlist`, `quit`, `markRead`.
