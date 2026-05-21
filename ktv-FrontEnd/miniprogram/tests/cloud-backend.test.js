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
