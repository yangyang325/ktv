const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { AppError, assertRequired } = require("../../cloudfunctions/shared/errors");
const { createMemoryStore } = require("../../cloudfunctions/shared/memory-store");
const { runAction } = require("../../cloudfunctions/shared/response");
const { createSeedData } = require("../../cloudfunctions/shared/seed");
const { buildPartyView } = require("../../cloudfunctions/shared/party-view");
const authFunction = require("../../cloudfunctions/auth/index");
const venueFunction = require("../../cloudfunctions/venue/index");
const partyFunction = require("../../cloudfunctions/party/index");

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

test("memory store supports exact object selectors", async () => {
  const store = createMemoryStore(createSeedData());

  const venues = await store.list("venues", { district: "南山", isActive: true });
  const user = await store.findOne("users", { openid: "openid-host" });
  const updatedUser = await store.updateOne("users", { openid: "openid-host" }, () => ({ nickname: "新昵称" }));

  assert.equal(venues.length, 1);
  assert.equal(venues[0].venueId, "venue-001");
  assert.equal(user.userId, "user-host");
  assert.equal(updatedUser.nickname, "新昵称");
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

test("party time summary uses Asia/Shanghai display time", () => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const { buildTimeSummary } = require('./cloudfunctions/shared/party-view'); console.log(buildTimeSummary('2026-04-25T19:30:00+08:00', 180));"
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, TZ: "UTC" },
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout.includes("19:30"), true);
});

test("runAction masks unexpected error messages", async () => {
  const response = await runAction(
    {
      explode() {
        throw new Error("database password leaked");
      }
    },
    { action: "explode" }
  );

  assert.deepEqual(response, {
    ok: false,
    code: "INTERNAL_ERROR",
    message: "服务异常"
  });
});

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

test("auth.login creates hashed user ids for colliding suffix openids", async () => {
  const store = createMemoryStore(createSeedData());
  const first = await authFunction.main({ action: "login", payload: {} }, { store, openid: "wx-a-abcdefghijkl" });
  const second = await authFunction.main({ action: "login", payload: {} }, { store, openid: "wx-b-abcdefghijkl" });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.data.user.userId, "user-abcdefghijkl");
  assert.notEqual(second.data.user.userId, "user-abcdefghijkl");
  assert.notEqual(first.data.user.userId, second.data.user.userId);
});

test("auth.profile returns current user and null for unknown openid", async () => {
  const store = createMemoryStore(createSeedData());
  const existing = await authFunction.main({ action: "profile", payload: {} }, { store, openid: "openid-host" });
  const missing = await authFunction.main({ action: "profile", payload: {} }, { store, openid: "openid-missing" });

  assert.equal(existing.ok, true);
  assert.equal(existing.data.userId, "user-host");
  assert.equal(missing.ok, true);
  assert.equal(missing.data, null);
});

test("auth.login preserves profile fields when payload omits them", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await authFunction.main(
    { action: "login", payload: {} },
    { store, openid: "openid-host", now: () => "2026-05-21T08:00:00.000Z" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.user.nickname, "羊羊");
  assert.equal(result.data.user.avatarUrl, "https://example.com/avatar-host.png");
  assert.equal(result.data.user.updatedAt, "2026-05-21T08:00:00.000Z");
});

test("auth uses object selectors for current user lookups", async () => {
  const base = createMemoryStore(createSeedData());
  const selectors = [];
  const store = {
    ...base,
    findOne(collection, selector) {
      selectors.push(["findOne", collection, selector]);
      return base.findOne(collection, selector);
    },
    updateOne(collection, selector, updater) {
      selectors.push(["updateOne", collection, selector]);
      return base.updateOne(collection, selector, updater);
    }
  };

  await authFunction.main({ action: "login", payload: {} }, { store, openid: "openid-host" });

  assert.deepEqual(selectors.map(([method, collection, selector]) => [method, collection, selector]), [
    ["findOne", "users", { openid: "openid-host" }],
    ["updateOne", "users", { openid: "openid-host" }]
  ]);
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

test("venue.list filters priceLevel with string equality", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await venueFunction.main({ action: "list", payload: { priceLevel: "3" } }, { store });

  assert.equal(result.ok, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].venueId, "venue-002");
});

test("venue.list matches string stored priceLevel by string equality", async () => {
  const seed = createSeedData();
  seed.venues.push({
    venueId: "venue-string-price",
    name: "字符串价格门店",
    district: "南山",
    address: "深圳市南山区",
    priceLevel: "2",
    isActive: true
  });
  const store = createMemoryStore(seed);
  const result = await venueFunction.main(
    { action: "list", payload: { district: "南山", priceLevel: "2" } },
    { store }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.some((venue) => venue.venueId === "venue-string-price"), true);
});

test("venue.list pushes exact filters into object selector", async () => {
  const base = createMemoryStore(createSeedData());
  const selectors = [];
  const store = {
    ...base,
    list(collection, selector) {
      selectors.push([collection, selector]);
      return base.list(collection, selector);
    }
  };

  await venueFunction.main(
    { action: "list", payload: { district: "南山", priceLevel: "2", keyword: "MUSE" } },
    { store }
  );

  assert.deepEqual(selectors, [["venues", { isActive: true, district: "南山" }]]);
});

test("venue.detail returns not found for unknown venue", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await venueFunction.main({ action: "detail", payload: { venueId: "missing" } }, { store });

  assert.equal(result.ok, false);
  assert.equal(result.code, "NOT_FOUND");
});

test("venue.detail rejects inactive venues", async () => {
  const seed = createSeedData();
  seed.venues.push({
    venueId: "venue-inactive",
    name: "停用门店",
    district: "南山",
    address: "深圳市南山区",
    priceLevel: 1,
    isActive: false
  });
  const store = createMemoryStore(seed);
  const result = await venueFunction.main({ action: "detail", payload: { venueId: "venue-inactive" } }, { store });

  assert.equal(result.ok, false);
  assert.equal(result.code, "NOT_FOUND");
});

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
    { store, openid: "openid-host" }
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

test("party.createDraft rejects spoofed payload userId", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "冒名创建 K 局",
        venueId: "venue-001",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12
      }
    },
    { store, openid: "openid-guest-1" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHORIZED");
});

test("party.publish rejects non-host user", async () => {
  const store = createMemoryStore(createSeedData());
  const draft = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "羊羊待发布 K 局",
        venueId: "venue-001",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12
      }
    },
    { store, openid: "openid-host" }
  );
  const result = await partyFunction.main(
    { action: "publish", payload: { partyId: draft.data.partyId } },
    { store, openid: "openid-guest-1" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHORIZED");
});

test("party.publish rejects non-draft party", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main(
    { action: "publish", payload: { partyId: "party-001" } },
    { store, openid: "openid-host" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "VALIDATION_ERROR");
});

test("party.list excludes draft parties", async () => {
  const store = createMemoryStore(createSeedData());
  const draft = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "列表不可见草稿",
        venueId: "venue-001",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12
      }
    },
    { store, openid: "openid-host" }
  );
  const result = await partyFunction.main({ action: "list", payload: {} }, { store });

  assert.equal(result.ok, true);
  assert.equal(result.data.some((party) => party.partyId === draft.data.partyId), false);
});

test("party.detail viewerEntry uses authenticated user instead of payload userId", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main(
    { action: "detail", payload: { partyId: "party-001", userId: "user-host" } },
    { store, openid: "openid-guest-1" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.viewerEntry.userId, "user-guest-1");
});

test("party.createDraft rejects missing explicit openid", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "未登录创建 K 局",
        venueId: "venue-001",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12
      }
    },
    { store }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHORIZED");
});

test("party.myTabs rejects missing explicit openid", async () => {
  const store = createMemoryStore(createSeedData());
  const result = await partyFunction.main({ action: "myTabs", payload: {} }, { store });

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHORIZED");
});

test("party.publish rejects missing explicit openid", async () => {
  const store = createMemoryStore(createSeedData());
  const draft = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "羊羊待发布草稿",
        venueId: "venue-001",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12
      }
    },
    { store, openid: "openid-host" }
  );
  const result = await partyFunction.main(
    { action: "publish", payload: { partyId: draft.data.partyId } },
    { store }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHORIZED");
});

test("party.detail rejects draft for non-owner", async () => {
  const store = createMemoryStore(createSeedData());
  const draft = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "仅局主可见草稿",
        venueId: "venue-001",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12
      }
    },
    { store, openid: "openid-host" }
  );
  const result = await partyFunction.main(
    { action: "detail", payload: { partyId: draft.data.partyId } },
    { store, openid: "openid-guest-1" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHORIZED");
});

test("party.detail allows draft for owner", async () => {
  const store = createMemoryStore(createSeedData());
  const draft = await partyFunction.main(
    {
      action: "createDraft",
      payload: {
        userId: "user-host",
        title: "局主可见草稿",
        venueId: "venue-001",
        startDate: "2026-05-23",
        startTime: "19:30",
        durationMin: 180,
        roomFee: 240000,
        maxCapacity: 12
      }
    },
    { store, openid: "openid-host" }
  );
  const result = await partyFunction.main(
    { action: "detail", payload: { partyId: draft.data.partyId } },
    { store, openid: "openid-host" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.party.partyId, draft.data.partyId);
});

test("party.createDraft rejects missing start date or time without inserting data", async () => {
  const store = createMemoryStore(createSeedData());
  const beforeParties = await store.list("parties");
  const beforeEntries = await store.list("entries");
  const basePayload = {
    userId: "user-host",
    title: "缺少时间的 K 局",
    venueId: "venue-001",
    startDate: "2026-05-23",
    startTime: "19:30",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 12
  };

  const missingDate = await partyFunction.main(
    { action: "createDraft", payload: { ...basePayload, startDate: "" } },
    { store, openid: "openid-host" }
  );
  const missingTime = await partyFunction.main(
    { action: "createDraft", payload: { ...basePayload, startTime: "" } },
    { store, openid: "openid-host" }
  );
  const afterParties = await store.list("parties");
  const afterEntries = await store.list("entries");

  assert.equal(missingDate.ok, false);
  assert.equal(missingDate.code, "VALIDATION_ERROR");
  assert.equal(missingTime.ok, false);
  assert.equal(missingTime.code, "VALIDATION_ERROR");
  assert.equal(afterParties.length, beforeParties.length);
  assert.equal(afterEntries.length, beforeEntries.length);
});
