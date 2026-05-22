import assert from "node:assert/strict";
import test from "node:test";
import { entryList } from "../mock/entries";
import { partyList } from "../mock/parties";
import { userList } from "../mock/users";
import { calculateEstimatedPerPerson, formatCurrencyYuan } from "../utils/format";
import { buildPartyRecruitmentText } from "../utils/party-text";
import { validatePartyForm } from "../utils/validators";
import { buildActivityTimeText } from "../utils/date";

test("金额格式化输出人民币文案", () => {
  assert.equal(formatCurrencyYuan(16800), "¥168");
});

test("满员人均向上取整到分", () => {
  assert.equal(calculateEstimatedPerPerson(24000, 7), 3429);
});

test("表单校验拦截非法人数", () => {
  const result = validatePartyForm({
    maxCapacity: 1,
    roomFee: 10000,
    title: "测试局"
  });
  assert.equal(result.valid, false);
});

test("表单校验拦截必填项缺失", () => {
  const result = validatePartyForm({});
  const fields = result.errors.map((item) => item.field);

  assert.equal(result.valid, false);
  assert.deepEqual(fields, ["title", "venueId", "startDate", "startTime", "durationMin", "roomFee", "maxCapacity"]);
});

test("表单校验要求已选择 KTV 场所位置", () => {
  const result = validatePartyForm({
    title: "测试局",
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
  assert.equal(result.errors[0].message, "请选择KTV场所位置");
});

test("表单校验缺少场所 ID 时提示选择 KTV 场所", () => {
  const result = validatePartyForm({
    title: "测试局",
    venueSummary: "MUSE KTV · 南山海岸城店",
    startDate: "2026-05-23",
    startTime: "19:30",
    durationMin: 180,
    roomFee: 240000,
    maxCapacity: 8
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors[0].field, "venueId");
  assert.equal(result.errors[0].message, "请选择KTV场所");
});

test("表单校验允许选填项为空", () => {
  const result = validatePartyForm({
    title: "测试局",
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
    title: "测试局",
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

test("接龙文案包含局信息与报名位", () => {
  const text = buildPartyRecruitmentText(
    partyList[0],
    entryList.filter((item) => item.partyId === "party-001"),
    userList[0]
  );
  assert.match(text, /K歌局招募/);
  assert.match(text, /1\. 羊羊（发起人）/);
});
