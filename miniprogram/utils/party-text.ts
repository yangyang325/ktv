import type { Entry } from "../types/entry";
import type { Party } from "../types/party";
import type { User } from "../types/user";
import { PARTY_STATUS_TEXT } from "../constants/options";
import { calculateEstimatedPerPerson, formatCurrencyYuan, formatPartyDateTime } from "./format";

/**
 * 构建报名进度文案。
 * @param confirmedCount 正式报名人数
 * @param maxCapacity 人数上限
 * @param waitlistCount 候补人数
 * @returns 进度文案
 */
export function buildPartyProgressText(
  confirmedCount: number,
  maxCapacity: number,
  waitlistCount: number
): string {
  const baseText = `${confirmedCount} / ${maxCapacity}`;

  if (waitlistCount > 0) {
    return `${baseText}，候补 ${waitlistCount}`;
  }

  return baseText;
}

/**
 * 读取局状态文案。
 * @param status 局状态
 * @returns 状态文案
 */
export function resolvePartyStatusText(status: keyof typeof PARTY_STATUS_TEXT): string {
  return PARTY_STATUS_TEXT[status] ?? "待确认";
}

/**
 * 按报名位次比较记录。
 * @param left 左侧记录
 * @param right 右侧记录
 * @returns 比较结果
 */
export function compareEntrySeq(left: Entry, right: Entry): number {
  return (left.seqNo ?? 0) - (right.seqNo ?? 0);
}

/**
 * 构建单条接龙文本。
 * @param entry 报名记录
 * @param host 发起人信息
 * @returns 单条接龙文本
 */
export function buildEntryText(entry: Entry, host: User): string {
  const suffix = entry.userId === host.userId ? "（发起人）" : "";
  return `${entry.seqNo}. ${entry.userNickname}${suffix}`;
}

/**
 * 生成活动信息分享文案。
 * @param party 局信息
 * @param entries 报名记录
 * @param host 发起人信息
 * @returns 接龙文案
 */
export function buildPartyRecruitmentText(party: Party, entries: Entry[], host: User): string {
  const lines = [
    "🎤 K歌活动信息",
    `📍 ${party.venueSummary}`,
    `🗓 ${formatPartyDateTime(party.startTime, party.durationMin)}`,
    `💰 AA参考 ${formatCurrencyYuan(
      party.estimatedPerPerson || calculateEstimatedPerPerson(party.roomFee, party.maxCapacity)
    )}（满 ${party.maxCapacity} 人，仅作线下AA参考）`,
    `👥 活动名额 ${party.maxCapacity} 人`
  ];

  if (party.notes) {
    lines.push(`📝 ${party.notes}`);
  }

  lines.push("参与名单：");

  const confirmedEntries: Entry[] = [];

  for (const entry of entries) {
    if (entry.entryType === "confirmed" && entry.seqNo !== null) {
      confirmedEntries.push(entry);
    }
  }

  confirmedEntries.sort(compareEntrySeq);

  for (const entry of confirmedEntries) {
    lines.push(buildEntryText(entry, host));
  }

  return lines.join("\n");
}

export { calculateEstimatedPerPerson };
