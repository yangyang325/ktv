import { entryList } from "../../mock/entries";
import { partyList } from "../../mock/parties";
import { userList } from "../../mock/users";
import type { MyPartyTabs } from "../../types/common";
import type { Entry } from "../../types/entry";
import type { Party, PartyDraftInput } from "../../types/party";
import type { User } from "../../types/user";
import { buildTimeSummary, calculateEstimatedPerPerson, formatCurrencyYuan } from "../../utils/format";
import { serviceConfig } from "../config";
import { callCloudFunction } from "./cloud";

let draftCounter = 1;

const runtimePartyList: Party[] = [...partyList];
const runtimeEntryList: Entry[] = [...entryList];

/**
 * 获取局列表。
 * @returns 局列表
 */
export async function getPartyList() {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<Party[]>("party", "list");
  }

  return runtimePartyList.filter((item) => item.status !== "finished");
}

/**
 * 获取局详情。
 * @param partyId 局 ID
 * @returns 局详情
 */
export async function getPartyDetail(partyId: string) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<{
      party: Party;
      host: User;
      confirmedEntries: Entry[];
      waitlistEntries: Entry[];
      viewerEntry: Entry | null;
    }>("party", "detail", { partyId });
  }

  const party = runtimePartyList.find((item) => item.partyId === partyId);
  if (!party) {
    throw new Error("局不存在");
  }

  const host = getUserOrThrow(party.hostId);

  return {
    party,
    host,
    confirmedEntries: runtimeEntryList.filter((item) => item.partyId === partyId && item.entryType === "confirmed"),
    waitlistEntries: runtimeEntryList.filter((item) => item.partyId === partyId && item.entryType === "waitlist"),
    viewerEntry: runtimeEntryList.find((item) => item.partyId === partyId && item.userId === "user-host") ?? null
  };
}

/**
 * 获取我的局聚合视图。
 * @param userId 用户 ID
 * @returns 分组结果
 */
export async function getMyPartyTabs(userId: string): Promise<MyPartyTabs<Party>> {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<MyPartyTabs<Party>>("party", "myTabs", {});
  }

  return {
    hosting: runtimePartyList.filter((item) => item.hostId === userId && item.status !== "finished"),
    joined: runtimePartyList.filter((item) => item.hostId !== userId && hasUserEntry(item.partyId, userId, "confirmed")),
    waitlist: runtimePartyList.filter((item) => hasUserEntry(item.partyId, userId, "waitlist")),
    history: runtimePartyList.filter((item) => item.status === "finished")
  };
}

/**
 * 创建局草稿。
 * @param input 局表单输入
 * @returns 局草稿
 */
export async function createPartyDraft(input: PartyDraftInput) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<Party>("party", "createDraft", { ...input });
  }

  const partyId = `party-draft-${String(draftCounter).padStart(3, "0")}`;
  draftCounter += 1;

  const draft: Party = {
    partyId,
    title: input.title,
    venueId: input.venueId,
    venueCustom: "",
    hostId: "user-host",
    startTime: `${input.startDate}T${input.startTime}:00+08:00`,
    durationMin: input.durationMin,
    roomFee: input.roomFee,
    maxCapacity: input.maxCapacity,
    status: "draft",
    isPublic: false,
    notes: input.notes,
    tags: input.tags,
    coverImage: "/assets/images/ktv/ktv-room-01.jpg",
    createdAt: new Date().toISOString(),
    confirmedCount: 1,
    waitlistCount: 0,
    estimatedPerPerson: calculateEstimatedPerPerson(input.roomFee, input.maxCapacity),
    hostSummary: "羊羊",
    venueSummary: input.venueSummary,
    progressText: `1 / ${input.maxCapacity}`,
    statusText: "草稿",
    priceText: `人均约 ${formatCurrencyYuan(calculateEstimatedPerPerson(input.roomFee, input.maxCapacity))}`,
    timeSummary: buildTimeSummary(input.startDate, input.startTime, input.durationMin)
  };

  runtimePartyList.push(draft);

  return draft;
}

/**
 * 发布局草稿。
 * @param partyId 局 ID
 * @returns 发布后的局信息
 */
export async function publishParty(partyId: string) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<Party>("party", "publish", { partyId });
  }

  const party = runtimePartyList.find((item) => item.partyId === partyId);
  if (!party) {
    throw new Error("草稿不存在");
  }

  party.status = "recruiting";
  party.statusText = "招募中";
  return party;
}

/**
 * 正式报名。
 * @param partyId 局 ID
 * @param userId 用户 ID
 * @returns 报名记录
 */
export async function joinParty(partyId: string, userId: string) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<Entry>("entry", "join", { partyId });
  }

  const party = getPartyOrThrow(partyId);
  const user = getUserOrThrow(userId);
  const confirmedEntries = runtimeEntryList.filter((item) => item.partyId === partyId && item.entryType === "confirmed");
  if (confirmedEntries.length >= party.maxCapacity) {
    throw new Error("局已满员");
  }

  const nextSeq = confirmedEntries.length + 1;
  const entry: Entry = {
    entryId: `entry-${runtimeEntryList.length + 1}`,
    partyId,
    userId,
    userNickname: user.nickname,
    entryType: "confirmed",
    seqNo: nextSeq,
    waitlistNo: null,
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString()
  };

  runtimeEntryList.push(entry);
  party.confirmedCount = nextSeq;
  party.progressText = `${party.confirmedCount} / ${party.maxCapacity}`;
  if (party.confirmedCount >= party.maxCapacity) {
    party.status = "full";
    party.statusText = "已满员";
  }

  return entry;
}

/**
 * 加入候补。
 * @param partyId 局 ID
 * @param userId 用户 ID
 * @returns 候补记录
 */
export async function joinWaitlist(partyId: string, userId: string) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<Entry>("entry", "waitlist", { partyId });
  }

  const party = getPartyOrThrow(partyId);
  const user = getUserOrThrow(userId);
  const waitlistEntries = runtimeEntryList.filter((item) => item.partyId === partyId && item.entryType === "waitlist");
  const entry: Entry = {
    entryId: `entry-${runtimeEntryList.length + 1}`,
    partyId,
    userId,
    userNickname: user.nickname,
    entryType: "waitlist",
    seqNo: null,
    waitlistNo: waitlistEntries.length + 1,
    createdAt: new Date().toISOString(),
    confirmedAt: null
  };

  runtimeEntryList.push(entry);
  party.waitlistCount = waitlistEntries.length + 1;
  return entry;
}

/**
 * 读取运行时报名数据。
 * @returns 当前报名记录
 */
export function getRuntimeEntries() {
  return runtimeEntryList;
}

/**
 * 判断用户是否在某个分组中有报名记录。
 * @param partyId 局 ID
 * @param userId 用户 ID
 * @param entryType 报名类型
 * @returns 是否存在记录
 */
function hasUserEntry(partyId: string, userId: string, entryType: Entry["entryType"]) {
  return runtimeEntryList.some((item) => item.partyId === partyId && item.userId === userId && item.entryType === entryType);
}

/**
 * 读取局数据，不存在则抛错。
 * @param partyId 局 ID
 * @returns 局信息
 */
function getPartyOrThrow(partyId: string) {
  const party = runtimePartyList.find((item) => item.partyId === partyId);
  if (!party) {
    throw new Error("局不存在");
  }

  return party;
}

/**
 * 读取用户数据，不存在则抛错。
 * @param userId 用户 ID
 * @returns 用户信息
 */
function getUserOrThrow(userId: string) {
  const user = userList.find((item) => item.userId === userId);
  if (!user) {
    throw new Error("用户不存在");
  }

  return user;
}
