const PARTY_STATUS_TEXT = {
  draft: "草稿",
  recruiting: "报名中",
  full: "已满员",
  closed: "已截止",
  cancelled: "已取消",
  finished: "已结束"
};

/**
 * 将数字补齐为两位字符。
 * @param {number} value 数字
 * @returns {string} 两位字符
 */
function padNumber(value) {
  return String(value).padStart(2, "0");
}

/**
 * 计算预计人均费用。
 * @param {number} roomFee 包厢费用，单位分
 * @param {number} maxCapacity 人数上限
 * @returns {number} 人均费用，单位分
 */
function calculateEstimatedPerPerson(roomFee, maxCapacity) {
  return maxCapacity > 0 ? Math.ceil(roomFee / maxCapacity) : 0;
}

/**
 * 将分格式化为人民币文案。
 * @param {number} cents 金额，单位分
 * @returns {string} 人民币文案
 */
function formatCurrencyYuan(cents) {
  const yuan = cents / 100;
  return `¥${Number.isInteger(yuan) ? yuan : yuan.toFixed(2)}`;
}

/**
 * 构建时长文案。
 * @param {number} durationMin 时长分钟
 * @returns {string} 时长文案
 */
function formatDurationMin(durationMin) {
  const hour = durationMin / 60;
  return Number.isInteger(hour) ? `${hour} 小时` : `${hour.toFixed(1)} 小时`;
}

/**
 * 构建组局时间摘要。
 * @param {string} startTime 开始时间
 * @param {number} durationMin 时长分钟
 * @returns {string} 时间摘要
 */
function buildTimeSummary(startTime, durationMin) {
  const date = new Date(startTime);
  const endDate = new Date(date.getTime() + durationMin * 60 * 1000);
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const startHours = padNumber(date.getHours());
  const startMinutes = padNumber(date.getMinutes());
  const endHours = padNumber(endDate.getHours());
  const endMinutes = padNumber(endDate.getMinutes());

  return `${month}-${day} ${startHours}:${startMinutes}-${endHours}:${endMinutes}`;
}

/**
 * 构建组局人数进度文案。
 * @param {object} party 组局信息
 * @returns {string} 人数进度文案
 */
function buildPartyProgressText(party) {
  const confirmedCount = party.confirmedCount || 0;
  return `${confirmedCount}/${party.maxCapacity}人`;
}

/**
 * 构建前端展示用组局信息。
 * @param {{ party: object, host?: object, venue?: object }} options 展示构建参数
 * @returns {object} 前端展示用组局信息
 */
function buildPartyView({ party, host, venue }) {
  const estimatedPerPerson = calculateEstimatedPerPerson(party.roomFee || 0, party.maxCapacity || 0);
  const venueName = venue ? venue.name : party.venueCustom || "";
  const venueDistrict = venue && venue.district ? ` · ${venue.district}` : "";

  return {
    ...party,
    estimatedPerPerson,
    hostSummary: host ? host.nickname : "",
    venueSummary: `${venueName}${venueDistrict}`,
    progressText: buildPartyProgressText(party),
    statusText: PARTY_STATUS_TEXT[party.status] || party.status,
    priceText: `${formatCurrencyYuan(estimatedPerPerson)}/人`,
    timeSummary: `${buildTimeSummary(party.startTime, party.durationMin || 0)} · ${formatDurationMin(party.durationMin || 0)}`
  };
}

module.exports = {
  PARTY_STATUS_TEXT,
  padNumber,
  calculateEstimatedPerPerson,
  formatCurrencyYuan,
  formatDurationMin,
  buildTimeSummary,
  buildPartyProgressText,
  buildPartyView
};
