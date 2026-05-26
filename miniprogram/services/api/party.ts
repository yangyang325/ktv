import type { MyPartyTabs } from "../../types/common";
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
 * @returns 候补记录
 */
export async function joinWaitlist(partyId: string) {
  return callCloudFunction<Entry>("entry", "waitlist", { partyId });
}
