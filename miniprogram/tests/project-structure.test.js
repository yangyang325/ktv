const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..", "..");

/**
 * 读取指定 WXSS 类名对应的样式声明块。
 *
 * @param {string} source WXSS 源码内容
 * @param {string} className CSS 类名，需包含点号
 * @returns {string} 类名内的样式声明
 */
function readClassBlock(source, className) {
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedClassName}\\s*\\{([^}]*)\\}`));

  assert.notEqual(match, null, `${className} style block should exist`);
  return match[1];
}

test("核心工程配置文件存在", () => {
  const requiredFiles = [
    ".gitignore",
    "package.json",
    "tsconfig.json",
    "project.config.json",
    "miniprogram/app.json",
    "miniprogram/app.ts",
    "miniprogram/app.wxss"
  ];

  requiredFiles.forEach((filePath) => {
    assert.equal(fs.existsSync(path.join(root, filePath)), true, filePath);
  });
});

test("微信开发者工具启用 TypeScript 编译插件", () => {
  const projectConfig = JSON.parse(
    fs.readFileSync(path.join(root, "project.config.json"), "utf8")
  );

  assert.deepEqual(projectConfig.setting.useCompilerPlugins, ["typescript"]);
});

test("tab栏首页发现消息使用微信开发工具支持的 PNG 图标", () => {
  const tabIconNames = ["tab-home", "tab-discover", "tab-messages"];
  const appConfig = fs.readFileSync(path.join(root, "miniprogram", "app.json"), "utf8");
  const customTabBar = fs.readFileSync(
    path.join(root, "miniprogram", "custom-tab-bar", "index.ts"),
    "utf8"
  );
  const favoritesLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "favorites", "index.ts"),
    "utf8"
  );
  const myPartiesLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "my-parties", "index.ts"),
    "utf8"
  );
  const checkedSources = [appConfig, customTabBar, favoritesLogic, myPartiesLogic].join("\n");

  tabIconNames.forEach((iconName) => {
    const iconFileName = `${iconName}.png`;
    const activeIconFileName = `${iconName}-active.png`;
    const appIconPath = `assets/images/ktv/${iconFileName}`;
    const appActiveIconPath = `assets/images/ktv/${activeIconFileName}`;
    const absoluteIconPath = `/assets/images/ktv/${iconFileName}`;
    const absoluteActiveIconPath = `/assets/images/ktv/${activeIconFileName}`;

    assert.equal(
      fs.existsSync(path.join(root, "miniprogram", "assets", "images", "ktv", iconFileName)),
      true,
      iconFileName
    );
    assert.equal(
      fs.existsSync(path.join(root, "miniprogram", "assets", "images", "ktv", activeIconFileName)),
      true,
      activeIconFileName
    );
    assert.equal(
      fs.existsSync(path.join(root, "miniprogram", "assets", "images", "ktv", `${iconName}.svg`)),
      false,
      iconName
    );
    assert.equal(appConfig.includes(appIconPath), true, appIconPath);
    assert.equal(appConfig.includes(appActiveIconPath), true, appActiveIconPath);
    assert.equal(customTabBar.includes(absoluteIconPath), true, absoluteIconPath);
    assert.equal(customTabBar.includes(absoluteActiveIconPath), true, absoluteActiveIconPath);
    assert.equal(favoritesLogic.includes(absoluteIconPath), true, absoluteIconPath);
    assert.equal(favoritesLogic.includes(absoluteActiveIconPath), true, absoluteActiveIconPath);
    assert.equal(myPartiesLogic.includes(absoluteIconPath), true, absoluteIconPath);
    assert.equal(myPartiesLogic.includes(absoluteActiveIconPath), true, absoluteActiveIconPath);
    assert.equal(checkedSources.includes(`${iconName}.svg`), false, iconName);
  });
});

test("发起组局页面提供封面上传入口", () => {
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );

  assert.equal(formPage.includes('bindtap="handleCoverTap"'), true);
  assert.equal(formPage.includes("coverImage"), true);
  assert.equal(formLogic.includes("wx.chooseMedia"), true);
  assert.equal(formLogic.includes("uploadPartyCover"), true);
});

test("首页发起组局入口页提供封面上传入口", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );

  assert.equal(launchPage.includes('bindtap="handleCoverTap"'), true);
  assert.equal(launchPage.includes("coverImage"), true);
  assert.equal(launchLogic.includes("wx.chooseMedia"), true);
  assert.equal(launchLogic.includes("uploadPartyCover"), true);
});

test("首页快捷入口和默认局封面使用线上图片", () => {
  const homeLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.ts"),
    "utf8"
  );
  const myPartiesPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "my-parties", "index.wxml"),
    "utf8"
  );
  const myPartiesLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "my-parties", "index.ts"),
    "utf8"
  );
  const appAssets = fs.readFileSync(
    path.join(root, "miniprogram", "constants", "assets.ts"),
    "utf8"
  );
  const mockParties = fs.readFileSync(
    path.join(root, "miniprogram", "mock", "parties.ts"),
    "utf8"
  );
  const partyService = fs.readFileSync(
    path.join(root, "miniprogram", "services", "api", "party.ts"),
    "utf8"
  );
  const previewLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-preview", "index.ts"),
    "utf8"
  );
  const cloudSeed = fs.readFileSync(
    path.join(root, "cloudfunctions", "shared", "seed.js"),
    "utf8"
  );
  const cloudAssets = fs.readFileSync(path.join(root, "cloudfunctions", "shared", "assets.js"), "utf8");
  const cloudParty = fs.readFileSync(path.join(root, "cloudfunctions", "party", "index.js"), "utf8");
  const runtimeSources = [homeLogic, myPartiesPage, myPartiesLogic, appAssets, mockParties, partyService, previewLogic, cloudSeed, cloudAssets, cloudParty].join("\n");
  const requiredUrls = [
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/yqgl5umpgadjkt.jpg",
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/l2qwjsmpgadjl5.jpg",
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/9xc9otmpgllwor.png",
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/r9yyqgmpgadjl8.jpg",
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/5pqxjempgllwoa.png",
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/qsb4dpmpgllwou.png",
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/34wk31mpglly6e.png",
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/f7fi3fmpgllwp1.png"
  ];
  const oldFileNames = [
    "ktv-room-01.jpg",
    "ktv-room-02.jpg",
    "ktv-room-03.jpg",
    "quick-favorites.png",
    "quick-discover-party.png",
    "quick-my-parties.png",
    "quick-create-party.png",
    "my-parties-summary-bg.png"
  ];

  requiredUrls.forEach((url) => {
    assert.equal(runtimeSources.includes(url), true, url);
  });
  oldFileNames.forEach((fileName) => {
    assert.equal(runtimeSources.includes(fileName), false, fileName);
  });
  assert.equal(appAssets.includes('room03:\n    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/r9yyqgmpgadjl8.jpg"'), true);
  assert.equal(appAssets.includes('favorites:\n    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/9xc9otmpgllwor.png"'), true);
  assert.equal(cloudAssets.includes('room03:\n    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/r9yyqgmpgadjl8.jpg"'), true);
});

test("发起组局 KTV 场所必须通过位置选择", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );

  assert.equal(launchPage.includes('bindtap="handleVenueLocationTap"'), true);
  assert.equal(launchPage.includes("form.venueId ? '' : 'form-row__value--placeholder'"), true);
  assert.equal(launchLogic.includes('venueId: ""'), true);
  assert.equal(launchLogic.includes("wx.chooseLocation"), true);
  assert.equal(launchLogic.includes("formatChosenVenueSummary"), true);
  assert.equal(launchLogic.includes('"form.venueId": "custom-location"'), true);
  assert.equal(formPage.includes('bindtap="handleVenueLocationTap"'), true);
  assert.equal(formPage.includes("venueId ? '' : 'form-row__input--placeholder'"), true);
  assert.equal(formLogic.includes("wx.chooseLocation"), true);
  assert.equal(formLogic.includes("formatChosenVenueSummary"), true);
  assert.equal(formLogic.includes('venueId: "custom-location"'), true);
});

test("发布活动地点长文本不挤压左侧标签", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxss"),
    "utf8"
  );
  const formStyle = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxss"),
    "utf8"
  );
  const launchLabelStyle = readClassBlock(launchStyle, ".form-row__label");
  const launchValueStyle = readClassBlock(launchStyle, ".form-row__value");
  const launchValueTextStyle = readClassBlock(launchStyle, ".form-row__value-text");
  const formLabelStyle = readClassBlock(formStyle, ".form-row__label");
  const formInputStyle = readClassBlock(formStyle, ".form-row__input");

  assert.equal(launchPage.includes('class="form-row__value-text"'), true);
  assert.equal(launchLabelStyle.includes("flex: 0 0 180rpx"), true);
  assert.equal(launchValueStyle.includes("min-width: 0"), true);
  assert.equal(launchValueStyle.includes("flex: 1"), true);
  assert.equal(launchValueStyle.includes("justify-content: flex-end"), true);
  ["overflow: hidden", "text-overflow: ellipsis", "white-space: nowrap"].forEach((declaration) => {
    assert.equal(launchValueTextStyle.includes(declaration), true, declaration);
  });
  assert.equal(formLabelStyle.includes("flex: 0 0 180rpx"), true);
  assert.equal(formInputStyle.includes("min-width: 0"), true);
  assert.equal(formInputStyle.includes("flex: 1"), true);
  assert.equal(formInputStyle.includes("text-overflow: ellipsis"), true);
});

test("发布活动页支持手动填写包厢费用参考", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );
  const launchStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxss"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );
  const formStyle = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxss"),
    "utf8"
  );
  const checkedSource = [launchPage, formPage].join("\n");
  const launchLabelStyle = readClassBlock(launchStyle, ".form-row__label");
  const launchRoomSegmentStyle = readClassBlock(launchStyle, ".room-segment");
  const feeRowStyle = readClassBlock(launchStyle, ".form-row--fee");
  const feeLabelStyle = readClassBlock(launchStyle, ".form-row--fee .form-row__label");
  const feeFieldStyle = readClassBlock(launchStyle, ".fee-field");
  const feeInputStyle = readClassBlock(launchStyle, ".fee-field__input");
  const feeHintStyle = readClassBlock(launchStyle, ".fee-field__hint");
  const formRoomTypeStyle = readClassBlock(formStyle, ".room-type");
  const formFeeRowStyle = readClassBlock(formStyle, ".form-row--fee");
  const formFeeLabelStyle = readClassBlock(formStyle, ".form-row--fee .form-row__label");

  assert.equal(launchPage.includes("包厢费用参考"), true);
  assert.equal(launchPage.includes('type="digit"'), true);
  assert.equal(launchPage.includes('data-field="roomFee"'), true);
  assert.equal(launchPage.includes('value="{{form.roomFee}}"'), true);
  assert.equal(launchPage.includes("仅作线下AA参考，小程序不收款"), true);
  assert.equal(launchLogic.includes('roomFee: ""'), true);
  assert.equal(launchLogic.includes('roomFee: "2400"'), false);
  assert.equal(formLogic.includes('roomFee: ""'), true);
  assert.equal(formLogic.includes('roomFee: "2400"'), false);
  assert.equal(launchLogic.includes("Number(this.data.form.roomFee) * 100"), true);
  assert.equal(formPage.includes("包厢费用参考"), true);
  assert.equal(formPage.includes("包厢费用</text>"), false);
  assert.equal(formPage.includes('class="form-row form-row--fee"'), true);
  ["报名费", "应付金额", "付款金额", "立即支付", "下单", "订单", "定金"].forEach((text) => {
    assert.equal(checkedSource.includes(text), false, text);
  });
  assert.equal(launchLabelStyle.includes("white-space: nowrap"), true);
  assert.equal(launchRoomSegmentStyle.includes("flex: 1"), true);
  assert.equal(launchRoomSegmentStyle.includes("justify-content: flex-end"), true);
  assert.equal(formRoomTypeStyle.includes("flex: 1"), true);
  assert.equal(formRoomTypeStyle.includes("justify-content: flex-end"), true);
  assert.equal(feeRowStyle.includes("min-height: 126rpx"), true);
  assert.equal(feeLabelStyle.includes("flex: 0 0 220rpx"), true);
  assert.equal(formFeeRowStyle.includes("min-height: 104rpx"), true);
  assert.equal(formFeeLabelStyle.includes("flex: 0 0 220rpx"), true);
  assert.equal(feeFieldStyle.includes("align-items: flex-end"), true);
  assert.equal(feeInputStyle.includes("text-align: right"), true);
  assert.equal(feeHintStyle.includes("仅作线下AA参考"), false);
});

test("发布活动按钮 loading 时保持白色文字", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxss"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formStyle = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxss"),
    "utf8"
  );
  const launchDisabledStyle = readClassBlock(launchStyle, ".launch-submit__button[disabled]");
  const formDisabledStyle = readClassBlock(formStyle, ".submit-button[disabled]");

  assert.equal(launchPage.includes('loading="{{publishing}}"'), true);
  assert.equal(launchPage.includes('disabled="{{publishing}}"'), true);
  assert.equal(formPage.includes('loading="{{publishing}}"'), true);
  assert.equal(formPage.includes('disabled="{{publishing}}"'), true);
  [launchDisabledStyle, formDisabledStyle].forEach((styleBlock) => {
    assert.equal(styleBlock.includes("color: #ffffff"), true);
    assert.equal(styleBlock.includes("background: linear-gradient"), true);
    assert.equal(styleBlock.includes("opacity: 1"), true);
  });
});

test("活动状态和内容标签颜色在列表与详情页统一", () => {
  const partyStatusUtil = fs.readFileSync(
    path.join(root, "miniprogram", "utils", "party-status.ts"),
    "utf8"
  );
  const homeCardPage = fs.readFileSync(
    path.join(root, "miniprogram", "components", "party-card", "index.wxml"),
    "utf8"
  );
  const homeCardLogic = fs.readFileSync(
    path.join(root, "miniprogram", "components", "party-card", "index.ts"),
    "utf8"
  );
  const homeCardStyle = fs.readFileSync(
    path.join(root, "miniprogram", "components", "party-card", "index.wxss"),
    "utf8"
  );
  const discoverLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.ts"),
    "utf8"
  );
  const discoverStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.wxss"),
    "utf8"
  );
  const detailPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxml"),
    "utf8"
  );
  const detailLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.ts"),
    "utf8"
  );
  const detailStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxss"),
    "utf8"
  );
  const myPartiesLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "my-parties", "index.ts"),
    "utf8"
  );
  const myPartiesStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "my-parties", "index.wxss"),
    "utf8"
  );
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    "utf8"
  );
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );
  const confirmStyle = fs.readFileSync(
    path.join(root, "miniprogram", "packageManage", "pages", "entry-confirm", "index.wxss"),
    "utf8"
  );
  const statusExpectations = [
    [homeCardStyle, ".party-card__status--signup", "background: #16c878"],
    [homeCardStyle, ".party-card__status--active", "background: #2497ff"],
    [homeCardStyle, ".party-card__status--full", "background: #ff982b"],
    [homeCardStyle, ".party-card__status--finished", "background: rgba(25, 27, 42, 0.72)"],
    [discoverStyle, ".party-card__status--signup", "background: #16c878"],
    [discoverStyle, ".party-card__status--active", "background: #2497ff"],
    [discoverStyle, ".party-card__status--full", "background: #ff982b"],
    [discoverStyle, ".party-card__status--finished", "background: rgba(25, 27, 42, 0.72)"],
    [detailStyle, ".detail-hero__status--signup", "background: #16c878"],
    [detailStyle, ".detail-hero__status--active", "background: #2497ff"],
    [detailStyle, ".detail-hero__status--full", "background: #ff982b"],
    [detailStyle, ".detail-hero__status--finished", "background: rgba(25, 27, 42, 0.72)"],
    [myPartiesStyle, ".my-party-card__status--signup", "background: #16c878"],
    [myPartiesStyle, ".my-party-card__status--active", "background: #2497ff"],
    [myPartiesStyle, ".my-party-card__status--full", "background: #ff982b"],
    [myPartiesStyle, ".my-party-card__status--finished", "background: rgba(25, 27, 42, 0.72)"],
    [profileStyle, ".profile-party-card__status--signup", "background: #16c878"],
    [profileStyle, ".profile-party-card__status--active", "background: #2497ff"],
    [profileStyle, ".profile-party-card__status--full", "background: #ff982b"],
    [profileStyle, ".profile-party-card__status--finished", "background: rgba(25, 27, 42, 0.72)"]
  ];
  const tagStyleBlocks = [
    readClassBlock(homeCardStyle, ".party-card__tag"),
    readClassBlock(discoverStyle, ".party-card__tag"),
    readClassBlock(detailStyle, ".detail-card__tag"),
    readClassBlock(myPartiesStyle, ".my-party-card__tag"),
    readClassBlock(profileStyle, ".profile-party-card__tags text"),
    readClassBlock(confirmStyle, ".confirm-party-card__tag")
  ];

  assert.equal(partyStatusUtil.includes("resolvePartyStatusTone"), true);
  assert.equal(homeCardPage.includes("party-card__status--{{statusTone}}"), true);
  assert.equal(homeCardLogic.includes("resolvePartyStatusTone"), true);
  assert.equal(discoverLogic.includes("resolvePartyStatusTone"), true);
  assert.equal(discoverLogic.includes("index === 0"), false);
  assert.equal(discoverLogic.includes("index === 2"), false);
  assert.equal(discoverLogic.includes('return "hot"'), false);
  assert.equal(detailPage.includes("detail-hero__status--{{statusTone}}"), true);
  assert.equal(detailLogic.includes("resolvePartyStatusTone(detail.party.status"), true);
  assert.equal(myPartiesLogic.includes("resolvePartyStatusTone"), true);
  assert.equal(profilePage.includes("profile-party-card__status--{{item.statusTone}}"), true);
  assert.equal(profileLogic.includes("resolvePartyStatusTone"), true);
  assert.equal(detailPage.includes("detail-card__tag--{{item.tone}}"), false);
  assert.equal(detailStyle.includes("detail-card__tag--blue"), false);
  assert.equal(detailStyle.includes("detail-card__tag--red"), false);

  statusExpectations.forEach(([source, className, declaration]) => {
    assert.equal(readClassBlock(source, className).includes(declaration), true, `${className} ${declaration}`);
  });
  tagStyleBlocks.forEach((styleBlock) => {
    assert.equal(styleBlock.includes("background: #f1efff"), true);
    assert.equal(styleBlock.includes("color: #6048ff"), true);
  });
});

test("首页左上角城市通过位置选择更新当前市", () => {
  const homePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.wxml"),
    "utf8"
  );
  const homeLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.ts"),
    "utf8"
  );
  const homeStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.wxss"),
    "utf8"
  );
  const cityArrowStyle = readClassBlock(homeStyle, ".hero__city-arrow");

  assert.equal(homePage.includes("cityPicking ? '选择中' : cityName"), true);
  assert.equal(
    homePage.includes('class="hero__city-icon" src="/assets/images/ktv/location.svg"'),
    true
  );
  assert.equal(
    homePage.includes('class="hero__city-icon" src="/assets/images/ktv/location_selected.svg"'),
    false
  );
  assert.equal(homePage.includes('<text class="hero__city-arrow"></text>'), true);
  assert.equal(homePage.includes('bindtap="handleCityTap"'), true);
  assert.equal(homeLogic.includes("resolveChosenCityName"), true);
  assert.equal(homeLogic.includes("wx.chooseLocation"), true);
  assert.equal(homeLogic.includes("wx.getLocation"), false);
  assert.equal(homeLogic.includes("reverseGeocodeCity"), false);
  assert.equal(homeLogic.includes("refreshCurrentCity"), false);
  assert.equal(homeLogic.includes("cityOptions"), false);
  assert.equal(homeLogic.includes("showActionSheet"), false);
  assert.equal(cityArrowStyle.includes("border-right"), true);
  assert.equal(cityArrowStyle.includes("border-bottom"), true);
  assert.equal(cityArrowStyle.includes("rotate(45deg)"), true);
});

test("项目默认定位城市为深圳市", () => {
  const locationConstant = fs.readFileSync(
    path.join(root, "miniprogram", "constants", "location.ts"),
    "utf8"
  );
  const appLogic = fs.readFileSync(path.join(root, "miniprogram", "app.ts"), "utf8");
  const homeLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.ts"),
    "utf8"
  );
  const discoverLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.ts"),
    "utf8"
  );
  const profileEditLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile-edit", "index.ts"),
    "utf8"
  );

  assert.equal(locationConstant.includes('DEFAULT_CITY_NAME = "深圳市"'), true);
  assert.equal(appLogic.includes("DEFAULT_CITY_NAME"), true);
  assert.equal(appLogic.includes('wx.setStorageSync("selectedCityName", DEFAULT_CITY_NAME)'), true);
  assert.equal(homeLogic.includes("cityName: DEFAULT_CITY_NAME"), true);
  assert.equal(discoverLogic.includes("cityName: DEFAULT_CITY_NAME"), true);
  assert.equal(discoverLogic.includes('cityOptions: ["深圳市"]'), true);
  assert.equal(profileEditLogic.includes("city: DEFAULT_CITY_NAME"), true);
  assert.equal(homeLogic.includes('cityName: "成都市"'), false);
  assert.equal(discoverLogic.includes('cityName: "成都市"'), false);
  assert.equal(profileEditLogic.includes('city: "成都市"'), false);
});

test("发现页移除筛选条和视图切换，仅保留城市箭头", () => {
  const discoverPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.wxml"),
    "utf8"
  );
  const discoverLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.ts"),
    "utf8"
  );
  const discoverStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.wxss"),
    "utf8"
  );
  const cityArrowStyle = readClassBlock(discoverStyle, ".city-row__arrow");

  assert.equal(discoverPage.includes("⌄"), false);
  assert.equal(discoverPage.includes("▽"), false);
  assert.equal(discoverLogic.includes("⌄"), false);
  assert.equal(discoverLogic.includes("▽"), false);
  assert.equal(discoverPage.includes('<text class="city-row__arrow"></text>'), true);
  assert.equal(discoverPage.includes("quick-filters"), false);
  assert.equal(discoverPage.includes("view-switch"), false);
  assert.equal(discoverLogic.includes("filters:"), false);
  assert.equal(discoverLogic.includes("viewModes"), false);
  assert.equal(discoverLogic.includes("activeViewMode"), false);
  assert.equal(discoverLogic.includes("handleFilterTap"), false);
  assert.equal(discoverLogic.includes("handleViewModeTap"), false);
  assert.equal(discoverStyle.includes("quick-filters"), false);
  assert.equal(discoverStyle.includes("view-switch"), false);
  assert.equal(cityArrowStyle.includes("border-right"), true);
  assert.equal(cityArrowStyle.includes("border-bottom"), true);
  assert.equal(cityArrowStyle.includes("rotate(45deg)"), true);
});

test("我的页面菜单卡片内容暂时隐藏", () => {
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    "utf8"
  );

  assert.equal(profilePage.includes('class="menu-card"'), true);
  assert.equal(profilePage.includes('wx:for="{{menu}}"'), true);
  assert.equal(profileLogic.includes("menu: []"), true);
  ["隐私设置", "帮助与反馈", "联系客服", "关于我们"].forEach((label) => {
    assert.equal(profileLogic.includes(label), false);
  });
});

test("我的页面不渲染顶部导航栏", () => {
  const profileConfig = JSON.parse(
    fs.readFileSync(path.join(root, "miniprogram", "pages", "profile", "index.json"), "utf8")
  );
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    "utf8"
  );

  assert.equal(profileConfig.navigationStyle, "custom");
  assert.equal(Object.hasOwn(profileConfig, "navigationBarTitleText"), false);
  assert.equal(profilePage.includes("profile-nav"), false);
  assert.equal(profilePage.includes("navigationMetrics"), false);
  assert.equal(profileLogic.includes("NavigationMetrics"), false);
  assert.equal(profileLogic.includes("createNavigationMetrics"), false);
  assert.equal(profileLogic.includes("getMenuButtonBoundingClientRect"), false);
});

test("我的页面名片顶部留白至少包含原导航高度", () => {
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );
  const profileBannerStyle = readClassBlock(profileStyle, ".profile-banner");

  assert.equal(profileBannerStyle.includes("min-height: 556rpx"), true);
  assert.equal(profileBannerStyle.includes("padding: 204rpx 30rpx 104rpx"), true);
});

test("我的页面隐藏快捷入口并展示组局标签列表", () => {
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    "utf8"
  );
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );

  assert.equal(profilePage.includes("shortcut-card"), false);
  assert.equal(profileLogic.includes("shortcuts:"), false);
  assert.equal(profileLogic.includes("handleShortcutTap"), false);
  assert.equal(profilePage.includes("profile-tabs"), true);
  assert.equal(profilePage.includes('wx:for="{{profileTabs}}"'), true);
  assert.equal(profilePage.includes('bindtap="handleProfileTabTap"'), true);
  assert.equal(profilePage.includes("profile-party-list"), true);
  assert.equal(profilePage.includes('wx:for="{{profilePartyList}}"'), true);
  assert.equal(profilePage.includes("profile-empty"), true);
  ["我发起的", "我加入的", "我收藏的"].forEach((label) => {
    assert.equal(profileLogic.includes(label), true);
  });
  assert.equal(profileLogic.includes("getMyPartyTabs"), true);
  assert.equal(profileLogic.includes("getFavoriteParties"), true);
  assert.equal(profileLogic.includes("favorites: createProfilePartyCards(favoriteParties)"), true);
  assert.equal(profileLogic.includes("profileFavorites"), true);
  assert.equal(profileStyle.includes(".profile-tabs__item--active"), true);
  assert.equal(profileStyle.includes(".profile-party-card"), true);
  assert.equal(profileStyle.includes(".profile-empty"), true);
});

test("我的页面名片使用当前用户资料和真实活动统计", () => {
  const profileLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    "utf8"
  );

  assert.equal(profileLogic.includes("getCurrentUser"), true);
  assert.equal(profileLogic.includes("refreshProfileData"), true);
  assert.equal(profileLogic.includes("createProfileView"), true);
  assert.equal(profileLogic.includes("createProfileStats"), true);
  assert.equal(profileLogic.includes("currentUser.nickname"), true);
  assert.equal(profileLogic.includes("currentUser.avatarUrl"), true);
  assert.equal(profileLogic.includes('nickname: "小麦麦"'), false);
  assert.equal(profileLogic.includes('value: "12"'), false);
  assert.equal(profileLogic.includes('value: "28"'), false);
  assert.equal(profileLogic.includes('value: "36"'), false);
});

test("编辑资料保存后返回我的页并刷新资料", () => {
  const profileLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    "utf8"
  );
  const profileEditLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile-edit", "index.ts"),
    "utf8"
  );
  const userService = fs.readFileSync(
    path.join(root, "miniprogram", "services", "api", "user.ts"),
    "utf8"
  );

  assert.equal(profileEditLogic.includes("updateCurrentUser"), true);
  assert.equal(profileEditLogic.includes("await updateCurrentUser"), true);
  assert.equal(profileEditLogic.includes("wx.navigateBack"), true);
  assert.equal(profileEditLogic.includes("delta: 1"), true);
  assert.equal(profileLogic.includes("refreshProfileData"), true);
  assert.equal(profileLogic.includes("getCurrentUser"), true);
  assert.equal(userService.includes("export async function updateCurrentUser"), true);
});

test("我的页面名片使用指定背景图", () => {
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );
  const bannerBgUrl = "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/vvsru3mpgkr09p.png";

  assert.equal(profilePage.includes(`class="profile-banner__bg" src="${bannerBgUrl}"`), true);
  assert.equal(profilePage.includes('mode="aspectFill"'), true);
  assert.equal(profileStyle.includes(".profile-banner__bg"), true);
  assert.equal(profileStyle.includes(".profile-banner::after"), true);
});

test("我的收藏页面按设计图展示空状态并从首页进入", () => {
  const appConfig = JSON.parse(
    fs.readFileSync(path.join(root, "miniprogram", "app.json"), "utf8")
  );
  const homeLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.ts"),
    "utf8"
  );
  const favoritesPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "favorites", "index.wxml"),
    "utf8"
  );
  const favoritesLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "favorites", "index.ts"),
    "utf8"
  );
  const favoritesStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "favorites", "index.wxss"),
    "utf8"
  );
  const favoritesConfig = JSON.parse(
    fs.readFileSync(path.join(root, "miniprogram", "pages", "favorites", "index.json"), "utf8")
  );
  const favoritesSource = [favoritesPage, favoritesLogic].join("\n");

  assert.equal(appConfig.pages.includes("pages/favorites/index"), true);
  assert.equal(homeLogic.includes('favorites: "/pages/favorites/index"'), true);
  assert.equal(favoritesConfig.navigationStyle, "default");
  assert.equal(favoritesConfig.navigationBarTitleText, "我的收藏");
  assert.equal(favoritesPage.includes("favorites-nav"), false);
  assert.equal(favoritesLogic.includes("statusBarHeight"), false);
  assert.equal(favoritesLogic.includes("handleBackTap"), false);
  assert.equal(
    favoritesPage.includes("https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/5ufdjbmpkznptd.png"),
    true
  );
  assert.equal(favoritesPage.includes('class="favorites-empty__image"'), true);
  assert.equal(favoritesPage.includes("https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/"), true);
  ["收藏活动", "收藏歌单", "收藏用户", "全部", "活动", "歌单", "用户"].forEach((text) => {
    assert.equal(favoritesSource.includes(text), true, text);
  });
  assert.equal(favoritesPage.includes("这里还没有收藏记录"), true);
  assert.equal(favoritesPage.includes("去发现页逛逛，收藏你感兴趣的活动、歌单或用户。"), true);
  assert.equal(favoritesPage.includes("去发现"), true);
  assert.equal(favoritesLogic.includes("handleDiscoverTap"), true);
  assert.equal(favoritesLogic.includes('wx.switchTab({ url: "/pages/discover/index" })'), true);
  assert.equal(favoritesLogic.includes("createBottomNav"), true);
  assert.equal(favoritesStyle.includes(".favorites-hero"), true);
  assert.equal(favoritesStyle.includes(".favorites-nav"), false);
  assert.equal(favoritesStyle.includes(".favorites-empty__image"), true);
  assert.equal(favoritesStyle.includes(".favorites-fab"), true);
});

test("活动详情收藏按钮写入收藏并在我的收藏页展示", () => {
  const detailPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxml"),
    "utf8"
  );
  const detailLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.ts"),
    "utf8"
  );
  const detailStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxss"),
    "utf8"
  );
  const favoriteService = fs.readFileSync(
    path.join(root, "miniprogram", "services", "api", "favorite.ts"),
    "utf8"
  );
  const favoritesConfig = JSON.parse(
    fs.readFileSync(path.join(root, "miniprogram", "pages", "favorites", "index.json"), "utf8")
  );
  const favoritesPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "favorites", "index.wxml"),
    "utf8"
  );
  const favoritesLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "favorites", "index.ts"),
    "utf8"
  );
  const favoritesStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "favorites", "index.wxss"),
    "utf8"
  );

  assert.equal(detailPage.includes('bindtap="handleFavoriteTap"'), true);
  assert.equal(detailPage.includes("actions__favorite--active"), true);
  assert.equal(detailPage.includes("{{isFavorited ? '已收藏' : '收藏'}}"), true);
  assert.equal(detailLogic.includes("isPartyFavorited"), true);
  assert.equal(detailLogic.includes("togglePartyFavorite"), true);
  assert.equal(detailLogic.includes("isFavorited:"), true);
  assert.equal(detailLogic.includes("handleFavoriteTap"), true);
  assert.equal(detailStyle.includes(".actions__favorite--active"), true);
  assert.equal(favoriteService.includes("FAVORITE_PARTY_STORAGE_KEY"), true);
  assert.equal(favoriteService.includes("getFavoritePartyIds"), true);
  assert.equal(favoriteService.includes("togglePartyFavorite"), true);
  assert.equal(favoriteService.includes("getFavoriteParties"), true);
  assert.equal(favoriteService.includes("getStorageSync"), true);
  assert.equal(favoritesConfig.usingComponents["party-card"], "/components/party-card/index");
  assert.equal(favoritesPage.includes('wx:if="{{showFavoriteParties}}"'), true);
  assert.equal(favoritesPage.includes('wx:for="{{favoriteParties}}"'), true);
  assert.equal(favoritesPage.includes('<party-card'), true);
  assert.equal(favoritesPage.includes('wx:else class="favorites-empty"'), true);
  assert.equal(favoritesLogic.includes("getFavoriteParties"), true);
  assert.equal(favoritesLogic.includes("refreshFavorites"), true);
  assert.equal(favoritesLogic.includes("showFavoriteParties"), true);
  assert.equal(favoritesLogic.includes("createStats(favoriteParties.length)"), true);
  assert.equal(favoritesStyle.includes(".favorites-list"), true);
});

test("K歌活动参与须知页面使用微信原生顶部标题", () => {
  const webviewConfig = JSON.parse(
    fs.readFileSync(path.join(root, "miniprogram", "pages", "common", "webview", "index.json"), "utf8")
  );
  const webviewPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "common", "webview", "index.wxml"),
    "utf8"
  );
  const webviewLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "common", "webview", "index.ts"),
    "utf8"
  );
  const entryConfirmLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageManage", "pages", "entry-confirm", "index.ts"),
    "utf8"
  );

  assert.equal(webviewConfig.navigationStyle, "default");
  assert.equal(webviewConfig.navigationBarTitleText, "说明");
  assert.equal(webviewLogic.includes("wx.setNavigationBarTitle"), true);
  assert.equal(webviewPage.includes("webview-nav"), false);
  assert.equal(entryConfirmLogic.includes("K歌活动参与须知"), true);
});

test("我的页面名片标签单行横向展示", () => {
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );
  const tagsStyle = readClassBlock(profileStyle, ".profile-banner__tags");
  const tagItemStyle = readClassBlock(profileStyle, ".profile-banner__tags text");
  const tagsIndex = profilePage.indexOf('<view class="profile-banner__tags">');
  const editButtonIndex = profilePage.indexOf('<button class="profile-banner__edit"');

  assert.equal(profilePage.includes('<scroll-view class="profile-banner__tags"'), false);
  assert.equal(profilePage.includes("scroll-x"), false);
  assert.equal(tagsIndex > editButtonIndex, true);
  assert.equal(tagsStyle.includes("flex-wrap: nowrap"), true);
  assert.equal(tagsStyle.includes("overflow: visible"), true);
  assert.equal(tagsStyle.includes("white-space: nowrap"), true);
  assert.equal(tagsStyle.includes("gap: 12rpx"), true);
  assert.equal(tagsStyle.includes("margin: 22rpx 0 0 154rpx"), true);
  assert.equal(tagItemStyle.includes("display: inline-flex"), true);
  assert.equal(tagItemStyle.includes("min-width: 76rpx"), true);
  assert.equal(tagItemStyle.includes("margin-right"), false);
  assert.equal(tagItemStyle.includes("padding: 8rpx 14rpx"), true);
  assert.equal(tagItemStyle.includes("font-size: 24rpx"), true);
  assert.equal(tagItemStyle.includes("white-space: nowrap"), true);
});

test("我的页面编辑资料按钮展示编辑图标", () => {
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );
  const editButtonStyle = readClassBlock(profileStyle, ".profile-banner__edit");
  const editIconStyle = readClassBlock(profileStyle, ".profile-banner__edit-icon");

  assert.equal(
    fs.existsSync(path.join(root, "miniprogram", "assets", "images", "ktv", "edit.svg")),
    true
  );
  assert.equal(
    profilePage.includes('class="profile-banner__edit-icon" src="/assets/images/ktv/edit.svg"'),
    true
  );
  assert.equal(profilePage.includes("<text>编辑资料</text>"), true);
  assert.equal(editButtonStyle.includes("display: inline-flex"), true);
  assert.equal(editButtonStyle.includes("align-items: center"), true);
  assert.equal(editIconStyle.includes("width: 24rpx"), true);
  assert.equal(editIconStyle.includes("height: 24rpx"), true);
  assert.equal(profileStyle.includes(".profile-banner__edit::after"), false);
});

test("我的页面内容层顶部圆弧和首页一致", () => {
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );
  const profileContentStyle = readClassBlock(profileStyle, ".profile-content");
  const statsCardStyle = readClassBlock(profileStyle, ".stats-card");

  assert.equal(profilePage.includes('<view class="profile-content">'), true);
  assert.equal(profileContentStyle.includes("margin-top: -74rpx"), true);
  assert.equal(profileContentStyle.includes("border-radius: 36rpx 36rpx 0 0"), true);
  assert.equal(profileContentStyle.includes("background: #f6f8ff"), true);
  assert.equal(statsCardStyle.includes("transform: translateY(-52rpx)"), true);
  assert.equal(statsCardStyle.includes("margin: -76rpx"), false);
});

test("消息页暂时屏蔽聊天功能，仅保留通知", () => {
  const messagesPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "messages", "index.wxml"),
    "utf8"
  );
  const messagesLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "messages", "index.ts"),
    "utf8"
  );

  assert.equal(messagesLogic.includes('label: "通知"'), true);
  assert.equal(messagesPage.includes("聊天"), false);
  assert.equal(messagesPage.includes("message-search"), false);
  assert.equal(messagesPage.includes("notice-card"), false);
  assert.equal(messagesLogic.includes('activeTab: "notice"'), true);
  assert.equal(messagesLogic.includes('{ key: "chat"'), false);
  assert.equal(messagesLogic.includes("chatConversations"), false);
  assert.equal(messagesLogic.includes("showNoticeCard"), false);
  assert.equal(messagesLogic.includes("handleCloseNoticeCard"), false);
});

test("核心页面采用活动信息工具口径并避开交易交友暗示", () => {
  const checkedFiles = [
    path.join(root, "miniprogram", "pages", "home", "index.wxml"),
    path.join(root, "miniprogram", "pages", "home", "index.ts"),
    path.join(root, "miniprogram", "pages", "discover", "index.wxml"),
    path.join(root, "miniprogram", "pages", "discover", "index.ts"),
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxml"),
    path.join(root, "miniprogram", "pages", "party-detail", "index.ts"),
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    path.join(root, "miniprogram", "packageManage", "pages", "entry-confirm", "index.wxml"),
    path.join(root, "miniprogram", "packageManage", "pages", "settlement", "index.ts")
  ];
  const source = checkedFiles.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");

  [
    "认识新朋友",
    "找到同频朋友",
    "找同伴",
    "联系发起人",
    "应付金额",
    "付款状态",
    "催款通知",
    "酒水小吃",
    "可适当放鸽",
    "附近"
  ].forEach((text) => {
    assert.equal(source.includes(text), false, text);
  });
  assert.equal(source.includes("深圳K歌兴趣活动"), true);
  assert.equal(source.includes("仅作线下AA参考"), true);
  assert.equal(source.includes("小程序不收款"), true);
});

test("首页热门推荐 AA 参考颜色与发现页一致", () => {
  const homeCardStyle = fs.readFileSync(
    path.join(root, "miniprogram", "components", "party-card", "index.wxss"),
    "utf8"
  );
  const discoverStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.wxss"),
    "utf8"
  );
  const homePriceStyle = readClassBlock(homeCardStyle, ".party-card__price");
  const discoverPriceStyle = readClassBlock(discoverStyle, ".party-card__price");

  assert.equal(homePriceStyle.includes("color: #ff443f"), true);
  assert.equal(discoverPriceStyle.includes("color: #ff443f"), true);
});

test("首页热门推荐查看更多使用 CSS 箭头并跳转发现页", () => {
  const homePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.wxml"),
    "utf8"
  );
  const homeLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.ts"),
    "utf8"
  );
  const homeStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "home", "index.wxss"),
    "utf8"
  );
  const moreArrowStyle = readClassBlock(homeStyle, ".section__more-arrow");

  assert.equal(homePage.includes("查看更多 ›"), false);
  assert.equal(homePage.includes("section__more-arrow"), true);
  assert.equal(homePage.includes('bindtap="handleMoreTap"'), true);
  assert.equal(homeLogic.includes("handleMoreTap"), true);
  assert.equal(homeLogic.includes('wx.switchTab({ url: "/pages/discover/index" })'), true);
  assert.equal(moreArrowStyle.includes("border-right"), true);
  assert.equal(moreArrowStyle.includes("border-bottom"), true);
  assert.equal(moreArrowStyle.includes("rotate(-45deg)"), true);
});

test("局卡片头像使用真实报名人头像数据", () => {
  const partyCardPage = fs.readFileSync(
    path.join(root, "miniprogram", "components", "party-card", "index.wxml"),
    "utf8"
  );
  const discoverPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.wxml"),
    "utf8"
  );
  const discoverLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.ts"),
    "utf8"
  );
  const partyType = fs.readFileSync(path.join(root, "miniprogram", "types", "party.ts"), "utf8");
  const partyService = fs.readFileSync(
    path.join(root, "miniprogram", "services", "api", "party.ts"),
    "utf8"
  );
  const cloudParty = fs.readFileSync(path.join(root, "cloudfunctions", "party", "index.js"), "utf8");

  assert.equal(partyCardPage.includes('wx:for="{{party.participantAvatars}}"'), true);
  assert.equal(partyCardPage.includes('src="{{item.avatarUrl}}"'), true);
  assert.equal(partyCardPage.includes('<text class="party-card__avatar">小</text>'), false);
  assert.equal(partyCardPage.includes('party-card__avatar--blue'), false);
  assert.equal(partyCardPage.includes('party-card__avatar--pink'), false);
  assert.equal(discoverPage.includes('wx:for="{{item.participantAvatars}}"'), true);
  assert.equal(discoverPage.includes('src="{{item.avatarUrl}}"'), true);
  assert.equal(discoverLogic.includes("avatarPool"), false);
  assert.equal(partyType.includes("participantAvatars: PartyParticipantAvatar[]"), true);
  assert.equal(partyService.includes("buildParticipantAvatars"), true);
  assert.equal(cloudParty.includes("attachParticipantAvatars"), true);
});

test("活动列表地址最多展示两行并超出隐藏", () => {
  const partyCardPage = fs.readFileSync(
    path.join(root, "miniprogram", "components", "party-card", "index.wxml"),
    "utf8"
  );
  const partyCardStyle = fs.readFileSync(
    path.join(root, "miniprogram", "components", "party-card", "index.wxss"),
    "utf8"
  );
  const discoverPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.wxml"),
    "utf8"
  );
  const discoverStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "discover", "index.wxss"),
    "utf8"
  );
  const myPartiesPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "my-parties", "index.wxml"),
    "utf8"
  );
  const myPartiesStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "my-parties", "index.wxss"),
    "utf8"
  );
  const profilePage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxml"),
    "utf8"
  );
  const profileStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.wxss"),
    "utf8"
  );
  const venueStyleBlocks = [
    readClassBlock(partyCardStyle, ".party-card__venue"),
    readClassBlock(discoverStyle, ".party-card__venue"),
    readClassBlock(myPartiesStyle, ".my-party-card__venue"),
    readClassBlock(profileStyle, ".profile-party-card__venue")
  ];

  assert.equal(partyCardPage.includes('class="party-card__venue"'), true);
  assert.equal(discoverPage.includes('class="party-card__venue"'), true);
  assert.equal(myPartiesPage.includes('class="my-party-card__venue"'), true);
  assert.equal(profilePage.includes('class="profile-party-card__venue"'), true);

  venueStyleBlocks.forEach((styleBlock) => {
    [
      "display: -webkit-box",
      "-webkit-box-orient: vertical",
      "-webkit-line-clamp: 2",
      "overflow: hidden",
      "text-overflow: ellipsis",
      "white-space: normal"
    ].forEach((declaration) => {
      assert.equal(styleBlock.includes(declaration), true, declaration);
    });
  });
});

test("报名确认使用单次入群联系信息并仅给发起人展示", () => {
  const confirmPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageManage", "pages", "entry-confirm", "index.wxml"),
    "utf8"
  );
  const confirmLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageManage", "pages", "entry-confirm", "index.ts"),
    "utf8"
  );
  const detailPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxml"),
    "utf8"
  );
  const detailLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.ts"),
    "utf8"
  );
  const entryType = fs.readFileSync(path.join(root, "miniprogram", "types", "entry.ts"), "utf8");
  const partyService = fs.readFileSync(
    path.join(root, "miniprogram", "services", "api", "party.ts"),
    "utf8"
  );

  assert.equal(confirmPage.includes("入群联系信息"), true);
  assert.equal(confirmPage.includes("只有发起人可见"), true);
  assert.equal(confirmPage.includes("仅用于本次K歌活动建群、集合和包厢通知"), true);
  assert.equal(confirmPage.includes('bindinput="handleContactValueInput"'), true);
  assert.equal(confirmPage.includes('bindchange="handleArrivalTimeChange"'), true);
  assert.equal(confirmPage.includes('bindinput="handleContactNoteInput"'), true);
  assert.equal(confirmLogic.includes("buildContactInfo"), true);
  assert.equal(confirmLogic.includes('title: "请填写入群联系信息"'), true);
  assert.equal(confirmLogic.includes('joinParty(this.data.partyId, "user-guest-3", contactInfo)'), true);
  assert.equal(detailPage.includes("报名联系信息"), true);
  assert.equal(detailPage.includes("contactEntries"), true);
  assert.equal(detailLogic.includes("canViewContacts"), true);
  assert.equal(detailLogic.includes("buildContactEntries"), true);
  assert.equal(entryType.includes("EntryContactInfo"), true);
  assert.equal(entryType.includes("contactInfo?: EntryContactInfo | null"), true);
  assert.equal(partyService.includes("contactInfo?: EntryContactInfo"), true);
});

test("发起人查看活动详情底部进入报名详情", () => {
  const detailPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxml"),
    "utf8"
  );
  const detailLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.ts"),
    "utf8"
  );
  const membersPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageManage", "pages", "party-members", "index.wxml"),
    "utf8"
  );
  const membersLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageManage", "pages", "party-members", "index.ts"),
    "utf8"
  );
  const membersConfig = JSON.parse(
    fs.readFileSync(path.join(root, "miniprogram", "packageManage", "pages", "party-members", "index.json"), "utf8")
  );

  assert.equal(detailPage.includes('wx:if="{{canViewContacts}}"'), true);
  assert.equal(detailPage.includes('bindtap="handleOpenEntryDetails"'), true);
  assert.equal(detailPage.includes(">报名详情</button>"), true);
  assert.equal(detailPage.includes('wx:else class="actions__primary"'), true);
  assert.equal(detailPage.includes('bindtap="handleJoin"'), true);
  assert.equal(detailLogic.includes("handleOpenEntryDetails"), true);
  assert.equal(detailLogic.includes("ROUTES.partyMembers"), true);
  assert.equal(detailLogic.includes("?partyId=${this.data.partyId}"), true);
  assert.equal(membersConfig.navigationBarTitleText, "报名详情");
  assert.equal(membersPage.includes("报名详情"), true);
  assert.equal(membersPage.includes("contactValue"), true);
  assert.equal(membersPage.includes("候补"), true);
  assert.equal(membersLogic.includes("getPartyDetail"), true);
  assert.equal(membersLogic.includes("confirmedEntries"), true);
  assert.equal(membersLogic.includes("waitlistEntries"), true);
  assert.equal(membersLogic.includes("canViewContacts"), true);
});

test("活动详情地点操作复制地点信息", () => {
  const detailPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.wxml"),
    "utf8"
  );
  const detailLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "party-detail", "index.ts"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );
  const partyType = fs.readFileSync(path.join(root, "miniprogram", "types", "party.ts"), "utf8");
  const partyService = fs.readFileSync(
    path.join(root, "miniprogram", "services", "api", "party.ts"),
    "utf8"
  );
  const cloudPartyView = fs.readFileSync(path.join(root, "cloudfunctions", "shared", "party-view.js"), "utf8");

  assert.equal(detailPage.includes("深圳市南山区海岸城东座3楼"), false);
  assert.equal(detailPage.includes("{{detail.party.venueAddress}}"), true);
  assert.equal(detailPage.includes("复制地点"), true);
  assert.equal(detailPage.includes('bindtap="handleCopyVenueLocation"'), true);
  assert.equal(detailPage.includes("导航"), false);
  assert.equal(detailLogic.includes("wx.setClipboardData"), true);
  assert.equal(detailLogic.includes("buildCopyVenueText"), true);
  assert.equal(detailLogic.includes("wx.openLocation"), false);
  assert.equal(detailLogic.includes("createNavigationLocation"), false);
  assert.equal(detailLogic.includes("venueLatitude"), false);
  assert.equal(detailLogic.includes("venueLongitude"), false);
  assert.equal(detailLogic.includes('title: "地点已复制"'), true);
  assert.equal(detailLogic.includes('title: "暂无地点信息"'), true);
  assert.equal(launchLogic.includes('"form.venueLatitude"'), true);
  assert.equal(launchLogic.includes('"form.venueLongitude"'), true);
  assert.equal(launchLogic.includes('"form.venueAddress"'), true);
  assert.equal(formLogic.includes("venueLatitude"), true);
  assert.equal(formLogic.includes("venueLongitude"), true);
  assert.equal(formLogic.includes("venueAddress"), true);
  assert.equal(partyType.includes("venueLatitude?: number"), true);
  assert.equal(partyType.includes("venueLongitude?: number"), true);
  assert.equal(partyType.includes("venueAddress?: string"), true);
  assert.equal(partyService.includes("attachVenueLocation"), true);
  assert.equal(cloudPartyView.includes("venueLatitude"), true);
});

test("发起组局属性标签支持选中状态", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxss"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );
  const formStyle = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxss"),
    "utf8"
  );

  assert.equal(launchPage.includes("tag-cloud__item--active"), true);
  assert.equal(launchPage.includes("item.selected"), true);
  assert.equal(launchPage.includes("selectedTags.indexOf(item)"), false);
  assert.equal(launchStyle.includes(".tag-cloud__item--active"), true);
  assert.equal(launchStyle.includes("box-shadow"), true);
  assert.equal(formPage.includes('bindtap="handleTagTap"'), true);
  assert.equal(formPage.includes("item.selected"), true);
  assert.equal(formPage.includes("selectedTags.indexOf(item)"), false);
  assert.equal(formLogic.includes("selectedTags"), true);
  assert.equal(formStyle.includes(".tag-cloud__item--active"), true);
});

test("房间类型选中态和组局属性选中态使用一致配色", () => {
  const launchStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxss"),
    "utf8"
  );
  const formStyle = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxss"),
    "utf8"
  );

  const launchRoomActive = readClassBlock(launchStyle, ".room-segment__item--active");
  const formRoomActive = readClassBlock(formStyle, ".room-type__item--active");
  const requiredActiveDeclarations = [
    "border-color: #6242ff",
    "background: #6242ff",
    "color: #ffffff",
    "box-shadow: 0 10rpx 20rpx rgba(98, 66, 255, 0.22)"
  ];

  requiredActiveDeclarations.forEach((declaration) => {
    assert.equal(launchRoomActive.includes(declaration), true, declaration);
    assert.equal(formRoomActive.includes(declaration), true, declaration);
  });
});

test("发起组局活动时间支持日期和时间选择", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );

  assert.equal(launchPage.includes('mode="date"'), true);
  assert.equal(launchPage.includes('mode="time"'), true);
  assert.equal(launchPage.includes('bindchange="handleDateChange"'), true);
  assert.equal(launchPage.includes('bindchange="handleStartTimeChange"'), true);
  assert.equal(launchLogic.includes("handleDateChange"), true);
  assert.equal(launchLogic.includes("handleStartTimeChange"), true);
  assert.equal(formPage.includes('mode="date"'), true);
  assert.equal(formPage.includes('mode="time"'), true);
  assert.equal(formPage.includes('bindchange="handleDateChange"'), true);
  assert.equal(formPage.includes('bindchange="handleStartTimeChange"'), true);
  assert.equal(formLogic.includes("handleDateChange"), true);
  assert.equal(formLogic.includes("handleStartTimeChange"), true);
});

test("发布活动页要求填写欢唱小时数", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );
  const launchStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxss"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );
  const formStyle = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxss"),
    "utf8"
  );
  const launchDurationFieldStyle = readClassBlock(launchStyle, ".duration-field");
  const launchDurationInputStyle = readClassBlock(launchStyle, ".duration-field__input");
  const formDurationRowStyle = readClassBlock(formStyle, ".form-row--duration");

  [launchPage, formPage].forEach((source) => {
    assert.equal(source.includes("欢唱时长"), true);
    assert.equal(source.includes('data-field="durationHour"'), true);
    assert.equal(source.includes('placeholder="填写小时数"'), true);
    assert.equal(source.includes("小时"), true);
    assert.equal(source.includes('data-field="duration"'), false);
    assert.equal(source.includes("分钟</text>"), false);
  });
  [launchLogic, formLogic].forEach((source) => {
    assert.equal(source.includes("parseDurationHourToMinutes"), true);
    assert.equal(source.includes('durationHour: ""'), true);
    assert.equal(source.includes('duration: "180"'), false);
    assert.equal(source.includes("durationMin: parseDurationHourToMinutes"), true);
    assert.equal(source.includes("Number(this.data.form.duration)"), false);
  });
  assert.equal(launchDurationFieldStyle.includes("align-items: center"), true);
  assert.equal(launchDurationFieldStyle.includes("justify-content: flex-end"), true);
  assert.equal(launchDurationInputStyle.includes("text-align: right"), true);
  assert.equal(formDurationRowStyle.includes("min-height: 104rpx"), true);
});

test("发起组局预计人数支持步进交互", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );

  assert.equal(launchPage.includes('bindtap="handlePeopleStep"'), true);
  assert.equal(launchPage.includes('data-step="{{-1}}"'), true);
  assert.equal(launchPage.includes('data-step="{{1}}"'), true);
  assert.equal(launchLogic.includes("Number(step)"), true);
  assert.equal(formPage.includes("capacity-stepper"), true);
  assert.equal(formPage.includes('bindtap="handleCapacityStep"'), true);
  assert.equal(formPage.includes('data-step="{{-1}}"'), true);
  assert.equal(formPage.includes('data-step="{{1}}"'), true);
  assert.equal(formLogic.includes("handleCapacityStep"), true);
});

test("发起组局曲风偏好支持选择器交互并避开性别年龄筛选", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );

  assert.equal(launchPage.includes('mode="selector"'), true);
  assert.equal(launchPage.includes("preferenceOptions"), true);
  assert.equal(launchPage.includes('bindchange="handlePreferenceChange"'), true);
  assert.equal(launchLogic.includes("handlePreferenceChange"), true);
  assert.equal(launchLogic.includes('"form.preference"'), true);
  assert.equal(launchPage.includes("曲风偏好"), true);
  assert.equal(formPage.includes("曲风偏好"), true);
  assert.equal(formPage.includes("preferenceOptions"), true);
  assert.equal(formPage.includes('bindchange="handlePreferenceChange"'), true);
  assert.equal(formLogic.includes("handlePreferenceChange"), true);
  ["性别/年龄偏好", "女生优先", "男生优先", "18-25岁", "26-35岁", "35岁以上"].forEach((text) => {
    assert.equal(launchPage.includes(text), false, text);
    assert.equal(launchLogic.includes(text), false, text);
    assert.equal(formPage.includes(text), false, text);
    assert.equal(formLogic.includes(text), false, text);
  });
});

test("首页发起组局入口发布按钮直接发布组局", () => {
  const launchPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.wxml"),
    "utf8"
  );
  const launchLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "launch", "index.ts"),
    "utf8"
  );

  assert.equal(launchPage.includes('bindtap="handleSubmit"'), true);
  assert.equal(launchLogic.includes("handleSubmit"), true);
  assert.equal(launchLogic.includes("validatePartyForm"), true);
  assert.equal(launchLogic.includes("validation.message"), true);
  assert.equal(launchLogic.includes("createPartyDraft"), true);
  assert.equal(launchLogic.includes("publishParty"), true);
  assert.equal(launchLogic.includes("wx.redirectTo"), true);
  assert.equal(launchLogic.includes("/pages/party-detail/index"), true);
  assert.equal(launchLogic.includes('wx.setStorageSync("partyDraftForm"'), false);
  assert.equal(launchLogic.includes("/packageCreate/pages/party-preview/index"), false);
});

test("编辑资料页面按资料项注册并从我的页进入", () => {
  const profileLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile", "index.ts"),
    "utf8"
  );
  const editPage = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile-edit", "index.wxml"),
    "utf8"
  );
  const editConfig = JSON.parse(
    fs.readFileSync(path.join(root, "miniprogram", "pages", "profile-edit", "index.json"), "utf8")
  );
  const editStyle = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile-edit", "index.wxss"),
    "utf8"
  );
  const editLogic = fs.readFileSync(
    path.join(root, "miniprogram", "pages", "profile-edit", "index.ts"),
    "utf8"
  );

  assert.equal(profileLogic.includes("/pages/profile-edit/index"), true);
  assert.equal(editConfig.navigationBarTitleText, "编辑资料");
  assert.equal(editConfig.navigationStyle, "default");
  assert.equal(editPage.includes("edit-nav"), false);
  assert.equal(editLogic.includes("NavigationMetrics"), false);
  assert.equal(editLogic.includes("getMenuButtonBoundingClientRect"), false);
  assert.equal(editPage.includes("头像"), true);
  assert.equal(editPage.includes("昵称"), true);
  assert.equal(editPage.includes("性别"), true);
  assert.equal(editPage.includes("K歌号"), true);
  assert.equal(editPage.includes("个人简介"), true);
  assert.equal(editPage.includes("所在城市"), true);
  assert.equal(editPage.includes("生日"), true);
  assert.equal(editPage.includes("微信号"), false);
  assert.equal(editPage.includes("手机号"), false);
  assert.equal(editPage.includes("修改密码"), false);
  assert.equal(editPage.includes("隐私设置"), false);
  const avatarRow = editPage.match(
    /<view class="edit-row edit-row--avatar" bindtap="handleChooseAvatar">[\s\S]*?<\/view>\s*<\/view>/
  );
  assert.notEqual(avatarRow, null);
  assert.equal(avatarRow[0].includes("edit-row__arrow"), false);
  const nicknameRow = editPage.match(
    /<text class="edit-row__label">昵称<\/text>[\s\S]*?<\/view>\s*<\/view>/
  );
  assert.notEqual(nicknameRow, null);
  assert.equal(nicknameRow[0].includes("edit-row__arrow"), false);
  const introRow = editPage.match(
    /<text class="edit-row__label">个人简介<\/text>[\s\S]*?<\/view>\s*<\/view>/
  );
  assert.notEqual(introRow, null);
  assert.equal(introRow[0].includes("edit-row__arrow"), false);
  const cityRow = editPage.match(/<text class="edit-row__label">所在城市<\/text>[\s\S]*?<\/view>\s*<\/view>/);
  assert.notEqual(cityRow, null);
  assert.equal(cityRow[0].includes("edit-row__arrow"), false);
  assert.equal(cityRow[0].includes('data-field="city"'), true);
  assert.equal(cityRow[0].includes('bindinput="handleFieldInput"'), true);
  assert.equal(cityRow[0].includes('bindtap="handleLocateCity"'), false);
  assert.equal(editPage.includes('bindtap="handleSave"'), true);
  assert.equal(editPage.includes("完成修改"), true);
  assert.equal(editPage.includes('bindtap="handleCancel"'), false);
  assert.equal(editPage.includes("cancel-button"), false);
  const saveButtonStyle = readClassBlock(editStyle, ".save-button");
  assert.equal(saveButtonStyle.includes("width: 100%"), true);
  assert.equal(saveButtonStyle.includes("border-radius: 999rpx"), true);
  assert.equal(editPage.includes('bindtap="handleLocateCity"'), false);
  assert.equal(editPage.includes('data-field="wechatId"'), false);
  assert.equal(editPage.includes('bindtap="handleWechatIdTap"'), false);
  assert.equal(editPage.includes('data-field="phone"'), false);
  assert.equal(editPage.includes('placeholder="仅用于活动联系，不会公开展示"'), false);
  assert.equal(editPage.split("edit-row__input--contact").length - 1, 0);
  assert.equal(editStyle.includes(".edit-row__input--contact"), false);
  assert.equal(editPage.includes("仅用于活动联系，不会公开展示"), false);
  assert.equal(editPage.includes("contact-note"), false);
  assert.equal(editPage.includes('open-type="getPhoneNumber"'), false);
  assert.equal(editPage.includes('bindgetphonenumber="handleGetPhoneNumber"'), false);
  assert.equal(editLogic.includes("handleSave"), true);
  assert.equal(editLogic.includes("handleChooseAvatar"), true);
  assert.equal(editLogic.includes("handleLocateCity"), false);
  assert.equal(editLogic.includes("wx.getLocation"), false);
  assert.equal(editLogic.includes("wx.chooseLocation"), false);
  assert.equal(editLogic.includes("reverseGeocodeCity"), false);
  assert.equal(editLogic.includes("handleWechatIdTap"), false);
  assert.equal(editLogic.includes("handleGetPhoneNumber"), false);
  assert.equal(editLogic.includes("getPhoneNumber"), false);
  assert.equal(editLogic.includes("handleAccountPending"), false);
  assert.equal(editLogic.includes("handleCancel"), false);
});

test("发起组局填写页发布按钮直接发布组局", () => {
  const formPage = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.wxml"),
    "utf8"
  );
  const formLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-form", "index.ts"),
    "utf8"
  );

  assert.equal(formPage.includes('bindtap="handlePublish"'), true);
  assert.equal(formLogic.includes("handlePublish"), true);
  assert.equal(formLogic.includes("createPartyDraft"), true);
  assert.equal(formLogic.includes("publishParty"), true);
  assert.equal(formLogic.includes("wx.redirectTo"), true);
  assert.equal(formLogic.includes("/pages/party-detail/index"), true);
  assert.equal(formLogic.includes('wx.setStorageSync("partyDraftForm"'), false);
  assert.equal(formLogic.includes("/packageCreate/pages/party-preview/index"), false);
});

test("接龙预览页发布组局时接入草稿发布服务", () => {
  const previewLogic = fs.readFileSync(
    path.join(root, "miniprogram", "packageCreate", "pages", "party-preview", "index.ts"),
    "utf8"
  );

  assert.equal(previewLogic.includes("createPartyDraft"), true);
  assert.equal(previewLogic.includes("publishParty"), true);
  assert.equal(previewLogic.includes("validatePartyForm"), true);
  assert.equal(previewLogic.includes("validation.message"), true);
  assert.equal(previewLogic.includes("发布流程即将接入"), false);
});
