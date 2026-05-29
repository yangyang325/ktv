import { getCurrentUser, updateCurrentUser } from "../../services/api/user";
import type { User } from "../../types/user";
import { createSubmitGuard } from "../../utils/submit-guard";

interface ProfileTagOption {
  label: string;
  tone: ProfileTagTone;
  selected: boolean;
}

interface ProfileTagGroupView {
  title: string;
  options: ProfileTagOption[];
}

interface ProfileTagGroupConfig {
  title: string;
  labels: string[];
}

interface TagTapEvent extends WechatMiniprogram.BaseEvent {
  currentTarget: WechatMiniprogram.Target & {
    dataset: {
      label?: string;
    };
  };
}

type ProfileTagTone = "purple" | "blue" | "green" | "orange" | "pink";
type ProfileTagsUser = User & {
  tags?: string[];
};

const MAX_PROFILE_TAG_COUNT = 6;
const runTagSave = createSubmitGuard();
const PROFILE_TAG_TONES: ProfileTagTone[] = ["purple", "blue", "green", "orange", "pink"];
const PROFILE_TAG_GROUPS: ProfileTagGroupConfig[] = [
  {
    title: "通用好感标签",
    labels: [
      "I人",
      "E人",
      "气氛组",
      "会接歌",
      "不抢麦",
      "合唱友好",
      "点歌靠谱",
      "酒水随缘",
      "熟了很嗨",
      "不冷场",
      "好相处",
      "会照顾新人"
    ]
  },
  {
    title: "唱歌风格标签",
    labels: [
      "情歌稳定发挥",
      "粤语歌爱好者",
      "老歌DNA动了",
      "流行金曲库",
      "副歌担当",
      "和声选手",
      "破音也自信",
      "周杰伦浓度偏高",
      "emo歌单收藏家",
      "K歌不设限"
    ]
  },
  {
    title: "组局社交标签",
    labels: [
      "局里不尴尬",
      "主打开心",
      "能唱能聊",
      "社交电量充足",
      "轻松不端着",
      "朋友局友好",
      "新人友好型",
      "周末在线",
      "下班后开麦",
      "夜猫场",
      "随时可冲",
      "不劝酒不扫兴",
      "尊重歌单",
      "快乐至上"
    ]
  },
  {
    title: "偏有趣一点的标签",
    labels: [
      "麦克风临时住户",
      "副歌一响自动上线",
      "前奏识曲选手",
      "KTV隐藏NPC",
      "情歌代入过深",
      "唱不了高音但敢冲",
      "开嗓需要两首歌",
      "点歌像开盲盒",
      "掌声型队友",
      "气氛型选手"
    ]
  }
];
const PROFILE_TAG_LABEL_SET = new Set(PROFILE_TAG_GROUPS.flatMap((group) => group.labels));

Page({
  data: {
    maxTagCount: MAX_PROFILE_TAG_COUNT,
    saving: false,
    selectedTags: [] as string[],
    tagGroups: createTagGroups([])
  },

  /**
   * 页面加载时读取云端用户标签。
   */
  async onLoad() {
    try {
      const currentUser = (await getCurrentUser()) as ProfileTagsUser;
      const selectedTags = normalizeSelectedTags(currentUser.tags);

      this.setData({
        selectedTags,
        tagGroups: createTagGroups(selectedTags)
      });
    } catch {
      wx.showToast({
        title: "资料加载失败",
        icon: "none"
      });
    }
  },

  /**
   * 切换标签选择状态。
   * @param event 点击事件
   */
  handleTagToggle(event: TagTapEvent) {
    const label = event.currentTarget.dataset.label;
    if (!label) {
      return;
    }

    const selectedTags = this.data.selectedTags.includes(label)
      ? this.data.selectedTags.filter((tag) => tag !== label)
      : [...this.data.selectedTags, label];

    if (selectedTags.length > MAX_PROFILE_TAG_COUNT) {
      wx.showToast({
        title: `最多选择${MAX_PROFILE_TAG_COUNT}个标签`,
        icon: "none"
      });
      return;
    }

    this.setData({
      selectedTags,
      tagGroups: createTagGroups(selectedTags)
    });
  },

  /**
   * 保存用户标签到云端。
   */
  async handleSave() {
    await runTagSave.run(async () => {
      if (this.data.saving) {
        return;
      }

      this.setData({ saving: true });
      try {
        const selectedTags = normalizeSelectedTags(this.data.selectedTags);
        const updatedUser = await updateCurrentUser({ tags: selectedTags });
        notifyPreviousProfilePage(updatedUser);
        wx.showToast({
          title: "标签已保存",
          icon: "success"
        });
        wx.navigateBack({
          delta: 1
        });
      } catch {
        wx.showToast({
          title: "保存失败，请稍后再试",
          icon: "none"
        });
      } finally {
        this.setData({ saving: false });
      }
    });
  }
});

/**
 * 根据已选标签创建分组标签选项。
 * @param selectedTags 已选标签
 * @returns 分组标签选项列表
 */
function createTagGroups(selectedTags: string[]): ProfileTagGroupView[] {
  let optionIndex = 0;

  return PROFILE_TAG_GROUPS.map((group) => ({
    title: group.title,
    options: group.labels.map((label) => {
      const option = {
        label,
        tone: PROFILE_TAG_TONES[optionIndex % PROFILE_TAG_TONES.length],
        selected: selectedTags.includes(label)
      };

      optionIndex += 1;
      return option;
    })
  }));
}

/**
 * 规范化已选标签。
 * @param tags 原始标签列表
 * @returns 规范化标签列表
 */
function normalizeSelectedTags(tags: string[] | undefined): string[] {
  return Array.from(new Set(tags || []))
    .filter((tag) => Boolean(tag) && PROFILE_TAG_LABEL_SET.has(tag))
    .slice(0, MAX_PROFILE_TAG_COUNT);
}

/**
 * 通知上一页刷新标签展示。
 * @param updatedUser 云端保存后的用户资料
 */
function notifyPreviousProfilePage(updatedUser: User) {
  const pages = getCurrentPages();
  const previousPage = pages[pages.length - 2] as
    | {
        applyUpdatedProfile?: (currentUser: User) => void;
        refreshProfileData?: () => Promise<void>;
      }
    | undefined;

  if (previousPage?.applyUpdatedProfile) {
    previousPage.applyUpdatedProfile(updatedUser);
  }

  if (previousPage?.refreshProfileData) {
    void previousPage.refreshProfileData();
  }
}
