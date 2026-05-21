import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import {
  createPartyDraft,
  getMyPartyTabs,
  getPartyDetail,
  getPartyList,
  joinParty,
  joinWaitlist,
  publishParty
} from "../services/api/party";
import { unwrapCloudResult } from "../services/api/cloud";
import { serviceConfig } from "../services/config";

test("首页列表返回可展示的局数据", async () => {
  const parties = await getPartyList();
  assert.equal(Array.isArray(parties), true);
  assert.equal(parties.length > 0, true);
  assert.equal(typeof parties[0].estimatedPerPerson, "number");
});

test("首页局卡片使用项目内静态封面图", async () => {
  const parties = await getPartyList();
  const coverImage = parties[0].coverImage;
  assert.equal(coverImage.startsWith("/assets/images/ktv/"), true);
  assert.equal(
    fs.existsSync(path.resolve(process.cwd(), "miniprogram", coverImage.slice(1))),
    true
  );
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
