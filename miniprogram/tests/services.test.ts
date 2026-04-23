import assert from "node:assert/strict";
import test from "node:test";
import {
  createPartyDraft,
  getMyPartyTabs,
  getPartyDetail,
  getPartyList,
  joinParty,
  joinWaitlist,
  publishParty
} from "../services/api/party";

test("首页列表返回可展示的局数据", async () => {
  const parties = await getPartyList();
  assert.equal(Array.isArray(parties), true);
  assert.equal(parties.length > 0, true);
  assert.equal(typeof parties[0].estimatedPerPerson, "number");
});

test("我的局聚合视图包含四个分组", async () => {
  const tabs = await getMyPartyTabs("user-host");
  assert.deepEqual(Object.keys(tabs), ["hosting", "joined", "waitlist", "history"]);
});

test("局详情能返回报名与候补人数", async () => {
  const detail = await getPartyDetail("party-001");
  assert.equal(detail.party.partyId, "party-001");
  assert.equal(detail.confirmedEntries.length > 0, true);
});

test("发起流程可以创建并发布草稿", async () => {
  const draft = await createPartyDraft({
    title: "羊羊周六 K 局",
    venueId: "venue-001",
    venueSummary: "MUSE KTV · 南山区",
    startDate: "2026-04-27",
    startTime: "19:30",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 12,
    notes: "欢迎新人，不限歌路。",
    tags: ["欢迎新人"]
  });
  const published = await publishParty(draft.partyId);
  assert.equal(published.status, "recruiting");
});

test("报名满员后进入候补", async () => {
  const joined = await joinParty("party-002", "user-guest-1");
  assert.equal(joined.entryType, "confirmed");
  const waitlist = await joinWaitlist("party-003", "user-guest-2");
  assert.equal(waitlist.entryType, "waitlist");
});
