export interface ProfileAchievementCounts {
  hosting: number;
  joined: number;
  followers: number;
}

export interface ProfileAchievement {
  key: string;
  title: string;
  desc: string;
  badgeText: string;
  iconUrl: string;
  tone: "purple" | "gold" | "blue" | "pink" | "green" | "orange";
  unlocked: boolean;
  progressText: string;
}

interface AchievementRule {
  key: string;
  title: string;
  desc: string;
  badgeText: string;
  iconUrl: string;
  tone: ProfileAchievement["tone"];
  field: keyof ProfileAchievementCounts;
  threshold: number;
}

const ACHIEVEMENT_ICON_BASE =
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6";

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    key: "host-first",
    title: "组局新星",
    desc: "首次发布活动",
    badgeText: "首发",
    iconUrl: `${ACHIEVEMENT_ICON_BASE}/64lxztmpqjhtqe.png`,
    tone: "purple",
    field: "hosting",
    threshold: 1
  },
  {
    key: "popular-hundred",
    title: "人气王",
    desc: "被关注100+",
    badgeText: "100+",
    iconUrl: `${ACHIEVEMENT_ICON_BASE}/8nktgompqjhtpu.png`,
    tone: "gold",
    field: "followers",
    threshold: 100
  },
  {
    key: "join-hundred",
    title: "K歌达人",
    desc: "参加活动100+",
    badgeText: "100+",
    iconUrl: `${ACHIEVEMENT_ICON_BASE}/x12efjmpqjhtpu.png`,
    tone: "blue",
    field: "joined",
    threshold: 100
  },
  {
    key: "host-hundred",
    title: "组局达人",
    desc: "发布活动100+",
    badgeText: "100+",
    iconUrl: `${ACHIEVEMENT_ICON_BASE}/225caimpqjhtpr.png`,
    tone: "pink",
    field: "hosting",
    threshold: 100
  }
];

/**
 * 根据真实活动统计创建成就列表。
 * @param counts 当前用户活动统计
 * @returns 成就展示列表
 */
export function createProfileAchievements(counts: ProfileAchievementCounts): ProfileAchievement[] {
  return ACHIEVEMENT_RULES.map((rule) => {
    const currentValue = Math.max(0, counts[rule.field] || 0);

    return {
      key: rule.key,
      title: rule.title,
      desc: rule.desc,
      badgeText: rule.badgeText,
      iconUrl: rule.iconUrl,
      tone: rule.tone,
      unlocked: currentValue >= rule.threshold,
      progressText: `${Math.min(currentValue, rule.threshold)}/${rule.threshold}`
    };
  });
}
