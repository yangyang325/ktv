import { resolvePartyStatusTone } from "../../utils/party-status";

interface PartyCardParty {
  partyId?: string;
  progressText?: string;
  status?: string;
  statusText?: string;
}

Component({
  data: {
    progressCountText: "6",
    progressRestText: "/10人",
    statusTone: "signup"
  },

  properties: {
    party: {
      type: Object,
      value: null,
      /**
       * 局数据变化时刷新人数展示。
       * @param party 局数据
       */
      observer(party: PartyCardParty | null) {
        this.updateProgressText(party);
        this.updateStatusTone(party);
      }
    }
  },

  methods: {
    /**
     * 将人数文案拆成当前人数和容量后缀。
     * @param party 局数据
     */
    updateProgressText(party: PartyCardParty | null) {
      const progressText = party?.progressText || "6/10人";
      const match = progressText.match(/^([^/]+)\s*(\/\s*.+)$/);
      if (!match) {
        this.setData({
          progressCountText: progressText,
          progressRestText: ""
        });
        return;
      }

      this.setData({
        progressCountText: match[1].trim(),
        progressRestText: match[2].replace(/\s+/g, "")
      });
    },

    /**
     * 刷新状态标签色调。
     * @param party 局数据
     */
    updateStatusTone(party: PartyCardParty | null) {
      this.setData({
        statusTone: resolvePartyStatusTone(party?.status, party?.statusText || "")
      });
    },

    /**
     * 打开局详情页。
     */
    handleTap() {
      const party = this.properties.party as { partyId?: string } | null;
      if (!party?.partyId) {
        return;
      }

      wx.navigateTo({
        url: `/pages/party-detail/index?partyId=${party.partyId}`
      });
    }
  }
});
