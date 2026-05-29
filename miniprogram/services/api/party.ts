import type { MyPartyTabs, PartyStatus } from "../../types/common";
import type { Entry, EntryContactInfo } from "../../types/entry";
import type { Party, PartyDraftInput } from "../../types/party";
import type { User } from "../../types/user";
import { callCloudFunction } from "./cloud";

/**
 * 获取云端活动列表。
 * @returns 活动列表
 */
export async function getPartyList() {
  return callCloudFunction<Party[]>("party", "list");
}

/**
 * 获取云端活动详情。
 * @param partyId 活动 ID
 * @returns 活动详情
 */
export async function getPartyDetail(partyId: string) {
  return callCloudFunction<{
    party: Party;
    host: User;
    confirmedEntries: Entry[];
    waitlistEntries: Entry[];
    viewerEntry: Entry | null;
    canViewContacts: boolean;
  }>("party", "detail", { partyId });
}

/**
 * 获取当前登录用户的活动聚合视图。
 * @returns 分组结果
 */
export async function getMyPartyTabs(): Promise<MyPartyTabs<Party>> {
  return callCloudFunction<MyPartyTabs<Party>>("party", "myTabs", {});
}

/**
 * 创建云端活动草稿。
 * @param input 活动表单输入
 * @returns 活动草稿
 */
export async function createPartyDraft(input: PartyDraftInput) {
  return callCloudFunction<Party>("party", "createDraft", { ...input });
}

/**
 * 发布云端活动草稿。
 * @param partyId 活动 ID
 * @returns 发布后的活动信息
 */
export async function publishParty(partyId: string) {
  return callCloudFunction<Party>("party", "publish", { partyId });
}

/**
 * 切换发起人维护的活动报名状态。
 * @param partyId 活动 ID
 * @param targetStatus 目标状态
 * @returns 切换后的活动信息
 */
export async function togglePartyStatus(partyId: string, targetStatus: Extract<PartyStatus, "recruiting" | "finished">) {
  return callCloudFunction<Party>("party", "statusSwitch", { partyId, targetStatus });
}

/**
 * 当前登录用户正式报名。
 * @param partyId 活动 ID
 * @param contactInfo 单次报名联系信息
 * @returns 报名记录
 */
export async function joinParty(partyId: string, contactInfo?: EntryContactInfo) {
  return callCloudFunction<Entry>("entry", "join", {
    partyId,
    ...(contactInfo ? { contactInfo } : {})
  });
}

/**
 * 当前登录用户加入候补。
 * @param partyId 活动 ID
 * @param contactInfo 单次报名联系信息
 * @returns 候补记录
 */
export async function joinWaitlist(partyId: string, contactInfo?: EntryContactInfo) {
  return callCloudFunction<Entry>("entry", "waitlist", {
    partyId,
    ...(contactInfo ? { contactInfo } : {})
  });
}

/**
 * 当前登录用户退出活动报名。
 * @param partyId 活动 ID
 * @returns 退出结果
 */
export async function quitParty(partyId: string) {
  return callCloudFunction<{ quitEntryId: string; promotedEntry: Entry | null }>("entry", "quit", { partyId });
}

/**
 * 发起人移除活动报名者。
 * @param partyId 活动 ID
 * @param entryId 报名记录 ID
 * @returns 移除结果
 */
export async function removePartyEntry(partyId: string, entryId: string) {
  return callCloudFunction<{ removedEntryId: string; promotedEntry: Entry | null }>("entry", "remove", {
    partyId,
    entryId
  });
}

/**
 * 发起人将候补报名者调整为正式成员。
 * @param partyId 活动 ID
 * @param entryId 候补报名记录 ID
 * @returns 调整结果
 */
export async function promoteWaitlistEntry(partyId: string, entryId: string) {
  return callCloudFunction<{ promotedEntry: Entry }>("entry", "promoteWaitlist", {
    partyId,
    entryId
  });
}
