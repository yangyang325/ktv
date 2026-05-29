import { getFollowStats } from "../../services/api/follow";
import { getMyPartyTabs } from "../../services/api/party";
import {
  createProfileAchievements,
  type ProfileAchievement,
  type ProfileAchievementCounts
} from "../../utils/profile-achievements";

Page({
  data: {
    achievements: [] as ProfileAchievement[]
  },

  /**
   * 页面加载时读取真实活动统计。
   */
  async onLoad() {
    await this.loadAchievements();
  },

  /**
   * 读取云端统计并生成成就列表。
   */
  async loadAchievements() {
    try {
      const [groupedParties, followStats] = await Promise.all([
        getMyPartyTabs(),
        getFollowStats()
      ]);
      const counts: ProfileAchievementCounts = {
        hosting: groupedParties.hosting.length,
        joined: groupedParties.joined.length + groupedParties.waitlist.length,
        followers: followStats.followerCount
      };

      this.setData({
        achievements: createProfileAchievements(counts)
      });
    } catch {
      wx.showToast({
        title: "成就加载失败",
        icon: "none"
      });
    }
  }
});
