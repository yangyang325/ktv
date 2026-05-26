import assert from "node:assert/strict";
import test from "node:test";
import { calculateEstimatedPerPerson, formatCurrencyYuan, parseDurationHourToMinutes } from "../utils/format";
import { buildPartyRecruitmentText } from "../utils/party-text";
import { validatePartyForm } from "../utils/validators";
import { buildActivityTimeText } from "../utils/date";
import type { Entry } from "../types/entry";
import type { Party } from "../types/party";
import type { User } from "../types/user";

test("金额格式化输出人民币文案", () => {
  assert.equal(formatCurrencyYuan(16800), "¥168");
});

test("满员人均向上取整到分", () => {
  assert.equal(calculateEstimatedPerPerson(24000, 7), 3429);
});

test("欢唱小时数转换为分钟提交", () => {
  assert.equal(parseDurationHourToMinutes("3"), 180);
  assert.equal(parseDurationHourToMinutes("2.5"), 150);
  assert.equal(Number.isNaN(parseDurationHourToMinutes("")), true);
});

test("表单校验拦截非法人数", () => {
  const result = validatePartyForm({
    maxCapacity: 1,
    roomFee: 10000,
    title: "测试活动"
  });
  assert.equal(result.valid, false);
});

test("表单校验拦截必填项缺失", () => {
  const result = validatePartyForm({});
  const fields = result.errors.map((item) => item.field);

  assert.equal(result.valid, false);
  assert.deepEqual(fields, ["title", "venueId", "startDate", "startTime", "durationMin", "roomFee", "maxCapacity"]);
});

test("表单校验要求已选择活动地点位置", () => {
  const result = validatePartyForm({
    title: "测试活动",
    venueId: "custom-location",
    venueSummary: "",
    startDate: "2026-05-23",
    startTime: "19:30",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 8
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors[0].field, "venueSummary");
  assert.equal(result.errors[0].message, "请选择K歌活动地点位置");
});

test("表单校验缺少场所 ID 时提示选择活动地点", () => {
  const result = validatePartyForm({
    title: "测试活动",
    venueSummary: "MUSE KTV · 南山海岸城店",
    startDate: "2026-05-23",
    startTime: "19:30",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 8
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors[0].field, "venueId");
  assert.equal(result.errors[0].message, "请选择K歌活动地点");
});

test("表单校验允许选填项为空", () => {
  const result = validatePartyForm({
    title: "测试活动",
    venueId: "venue-001",
    venueSummary: "测试门店",
    startDate: "2026-05-23",
    startTime: "19:30",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 8,
    notes: "",
    tags: []
  });

  assert.equal(result.valid, true);
});

test("表单校验拦截非法日期时间和时长", () => {
  const result = validatePartyForm({
    title: "测试活动",
    venueId: "venue-001",
    venueSummary: "测试门店",
    startDate: "2026-02-30",
    startTime: "24:99",
    durationMin: 0,
    roomFee: 240000,
    maxCapacity: 8,
    notes: "",
    tags: []
  });
  const fields = result.errors.map((item) => item.field);

  assert.equal(result.valid, false);
  assert.deepEqual(fields, ["startDate", "startTime", "durationMin"]);
});

test("活动时间文案按日期和时间组合", () => {
  assert.equal(buildActivityTimeText("", ""), "选择日期与时间");
  assert.equal(buildActivityTimeText("2026-05-23", ""), "2026-05-23 选择时间");
  assert.equal(buildActivityTimeText("", "19:30"), "选择日期 19:30");
  assert.equal(buildActivityTimeText("2026-05-23", "19:30"), "2026-05-23 19:30");
});

test("活动分享文案包含活动信息与报名位", () => {
  const party: Party = {
    partyId: "party-test-001",
    title: "测试活动",
    venueId: "venue-test-001",
    venueCustom: "",
    hostId: "user-test-host",
    startTime: "2026-05-23T19:30:00+08:00",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 8,
    status: "recruiting",
    isPublic: true,
    notes: "",
    tags: ["流行"],
    coverImage: "",
    createdAt: "2026-05-20T10:00:00+08:00",
    confirmedCount: 1,
    waitlistCount: 0,
    estimatedPerPerson: 30000,
    hostSummary: "真实用户",
    venueSummary: "真实KTV",
    progressText: "1 / 8",
    statusText: "报名中",
    priceText: "¥300/人",
    timeSummary: "05-23 周六 19:30 · 3小时",
    participantAvatars: []
  };
  const entries: Entry[] = [
    {
      entryId: "entry-test-001",
      partyId: party.partyId,
      userId: "user-test-host",
      userNickname: "真实用户",
      entryType: "confirmed",
      seqNo: 1,
      waitlistNo: null,
      createdAt: "2026-05-20T10:00:00+08:00",
      confirmedAt: "2026-05-20T10:00:00+08:00"
    }
  ];
  const host: User = {
    userId: "user-test-host",
    nickname: "真实用户",
    avatarUrl: "cloud://avatar",
    createdAt: "2026-05-20T10:00:00+08:00"
  };
  const text = buildPartyRecruitmentText(
    party,
    entries,
    host
  );
  assert.match(text, /K歌活动信息/);
  assert.match(text, /1\. 真实用户（发起人）/);
});
