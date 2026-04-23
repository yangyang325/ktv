Component({
  properties: {
    party: {
      type: Object,
      value: null
    }
  },

  methods: {
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
