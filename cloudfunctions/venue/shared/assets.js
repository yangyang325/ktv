/**
 * KTV 包房封面线上图片。
 */
const KTV_ROOM_COVER_IMAGES = {
  room01:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/yqgl5umpgadjkt.jpg",
  room02:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/l2qwjsmpgadjl5.jpg",
  room03:
    "https://wechatapppro-1252524126.cdn.xiaoeknow.com/appbtajnbm33436/image/b_u_616d1cc7eabb6_eanzXeE6/r9yyqgmpgadjl8.jpg"
};

/**
 * 用户未上传封面时可随机使用的默认组局封面。
 */
const PARTY_DEFAULT_COVER_IMAGES = [
  KTV_ROOM_COVER_IMAGES.room02,
  KTV_ROOM_COVER_IMAGES.room01,
  KTV_ROOM_COVER_IMAGES.room03
];

/**
 * 默认组局封面线上图片。
 */
const DEFAULT_PARTY_COVER_IMAGE = KTV_ROOM_COVER_IMAGES.room01;

/**
 * 随机选择一张默认组局封面。
 * @returns {string} 默认组局封面地址
 */
function selectRandomPartyCoverImage() {
  const randomIndex = Math.min(
    Math.floor(Math.random() * PARTY_DEFAULT_COVER_IMAGES.length),
    PARTY_DEFAULT_COVER_IMAGES.length - 1
  );
  return PARTY_DEFAULT_COVER_IMAGES[randomIndex];
}

module.exports = {
  DEFAULT_PARTY_COVER_IMAGE,
  KTV_ROOM_COVER_IMAGES,
  PARTY_DEFAULT_COVER_IMAGES,
  selectRandomPartyCoverImage
};
