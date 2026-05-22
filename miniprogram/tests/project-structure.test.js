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
  assert.equal(discoverLogic.includes('cityOptions: ["深圳市"'), true);
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
  assert.equal(profileLogic.includes("profileFavorites"), true);
  assert.equal(profileStyle.includes(".profile-tabs__item--active"), true);
  assert.equal(profileStyle.includes(".profile-party-card"), true);
  assert.equal(profileStyle.includes(".profile-empty"), true);
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

test("发起组局性别年龄偏好支持选择器交互", () => {
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
  assert.equal(formPage.includes("性别/年龄偏好"), true);
  assert.equal(formPage.includes("preferenceOptions"), true);
  assert.equal(formPage.includes('bindchange="handlePreferenceChange"'), true);
  assert.equal(formLogic.includes("handlePreferenceChange"), true);
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
  assert.equal(editPage.includes("微信号"), true);
  assert.equal(editPage.includes("手机号"), true);
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
  assert.equal(editPage.includes('data-field="wechatId"'), true);
  assert.equal(editPage.includes("请输入微信号"), false);
  assert.equal(editPage.includes('bindtap="handleWechatIdTap"'), false);
  assert.equal(editPage.includes('data-field="phone"'), true);
  assert.equal(editPage.includes("请输入手机号"), false);
  assert.equal(
    editPage.split('placeholder="仅用于活动联系，不会公开展示"').length - 1,
    2
  );
  assert.equal(editPage.split("edit-row__input--contact").length - 1, 2);
  const contactInputStyle = readClassBlock(editStyle, ".edit-row__input--contact");
  assert.equal(contactInputStyle.includes("width: 480rpx"), true);
  assert.equal(contactInputStyle.includes("font-size: 25rpx"), true);
  assert.equal(editPage.includes("仅用于活动联系，不会公开展示"), true);
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
