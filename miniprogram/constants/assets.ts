/**
 * KTV 包房封面线上图片。
 */
export const KTV_ROOM_COVER_IMAGES = {
  room01:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/yqgl5umpgadjkt.jpg",
  room02:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/l2qwjsmpgadjl5.jpg",
  room03:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/r9yyqgmpgadjl8.jpg"
} as const;

/**
 * 用户未上传封面时可随机使用的默认组局封面。
 */
export const PARTY_DEFAULT_COVER_IMAGES = [
  KTV_ROOM_COVER_IMAGES.room02,
  KTV_ROOM_COVER_IMAGES.room01,
  KTV_ROOM_COVER_IMAGES.room03
] as const;

/**
 * 默认组局封面线上图片。
 */
export const DEFAULT_PARTY_COVER_IMAGE = KTV_ROOM_COVER_IMAGES.room01;

/**
 * 随机选择一张默认组局封面。
 * @returns 默认组局封面地址
 */
export function selectRandomPartyCoverImage() {
  const randomIndex = Math.min(
    Math.floor(Math.random() * PARTY_DEFAULT_COVER_IMAGES.length),
    PARTY_DEFAULT_COVER_IMAGES.length - 1
  );
  return PARTY_DEFAULT_COVER_IMAGES[randomIndex];
}

/**
 * 首页快捷入口线上图片。
 */
export const HOME_QUICK_ACTION_IMAGES = {
  createParty:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/34wk31mpglly6e.png",
  favorites:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/9xc9otmpgllwor.png",
  discoverParty:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/5pqxjempgllwoa.png",
  myParties:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/qsb4dpmpgllwou.png"
} as const;

/**
 * 用户资料默认头像线上图片。
 */
export const DEFAULT_PROFILE_AVATAR_IMAGES = [
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/tkojc1mplzroo1.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/w2bg8wmplzron6.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/sr7ygrmplzrq3i.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/nlp31pmplzrq3o.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/jcftq3mplzropa.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/rlb3kzmplzroob.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/2fn4lrmplzrq45.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/tsrxlzmplzrq3d.png",
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/t0tib0mplzronw.png"
] as const;

/**
 * 随机选择一张用户资料默认头像。
 * @returns 默认头像地址
 */
export function selectRandomProfileAvatarImage() {
  const randomIndex = Math.min(
    Math.floor(Math.random() * DEFAULT_PROFILE_AVATAR_IMAGES.length),
    DEFAULT_PROFILE_AVATAR_IMAGES.length - 1
  );
  return DEFAULT_PROFILE_AVATAR_IMAGES[randomIndex];
}

/**
 * 首页 tab 栏线上图标。
 */
export const HOME_TAB_ICONS = {
  default:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/bxbwsgmplzr3b2.png",
  active:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/ay5l8cmplzr3bp.png"
} as const;

/**
 * 发现 tab 栏线上图标。
 */
export const DISCOVER_TAB_ICONS = {
  default:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/gt92f3mplzr4ba.png",
  active:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/vv292cmplzr3b3.png"
} as const;

/**
 * 个人中心 tab 栏线上图标。
 */
export const PROFILE_TAB_ICONS = {
  default:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/h1jgw5mplzr3br.png",
  active:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/0cub2nmplzr3c5.png"
} as const;

/**
 * 我的活动汇总卡片线上背景图。
 */
export const MY_PARTIES_SUMMARY_BG_IMAGE =
  "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/f7fi3fmpgllwp1.png";
