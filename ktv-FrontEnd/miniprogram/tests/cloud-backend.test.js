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

  assert.deepEqual(selectors, [["venues", { isActive: true, district: "南山", priceLevel: 2 }]]);
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
