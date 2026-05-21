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
