import assert from "node:assert/strict";
import test from "node:test";
import { entryList } from "../mock/entries";
import { partyList } from "../mock/parties";
import { userList } from "../mock/users";
import { calculateEstimatedPerPerson, formatCurrencyYuan } from "../utils/format";
import { buildPartyRecruitmentText } from "../utils/party-text";
import { validatePartyForm } from "../utils/validators";

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

test("接龙文案包含局信息与报名位", () => {
  const text = buildPartyRecruitmentText(
    partyList[0],
    entryList.filter((item) => item.partyId === "party-001"),
    userList[0]
  );
  assert.match(text, /K歌局招募/);
  assert.match(text, /1\. 羊羊（发起人）/);
});
