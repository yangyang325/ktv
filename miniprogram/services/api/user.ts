import type { User } from "../../types/user";
import { callCloudFunction } from "./cloud";

/**
 * 用户可编辑资料。
 */
export interface UserProfileUpdate {
  avatarUrl?: string;
  gender?: string;
  intro?: string;
  nickname?: string;
}

interface WechatProfileUserInfo {
  avatarUrl?: string;
  nickName?: string;
}

/**
 * 深拷贝纯数据。
 * @param value 原始数据
 * @returns 深拷贝后的数据
 */
export function clonePlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 读取当前微信登录用户。
 * @returns 用户信息
 */
export async function getCurrentUser() {
  const result = await callCloudFunction<{ user: User }>("auth", "login");
  return clonePlainValue(result.user);
}

/**
 * 进入我的页时同步微信头像昵称并完成登录。
 * @returns 当前用户资料
 */
export async function getCurrentUserWithWechatProfile() {
  const existingUser = await getUserById();

  if (existingUser) {
    return clonePlainValue(existingUser);
  }

  const wechatProfile = await requestWechatProfileUpdate();
  if (wechatProfile) {
    return updateCurrentUser(wechatProfile);
  }

  return getCurrentUser();
}

/**
 * 更新当前微信登录用户资料。
 * @param profile 用户编辑资料
 * @returns 更新后的用户资料
 */
export async function updateCurrentUser(profile: UserProfileUpdate) {
  const profileUpdate = normalizeUserProfileUpdate(profile);

  const result = await callCloudFunction<{ user: User }>(
    "auth",
    "login",
    pickCloudProfilePayload(profileUpdate)
  );
  return clonePlainValue(result.user);
}

/**
 * 异步读取当前微信登录用户资料。
 * @returns 用户信息或空值
 */
export async function getUserById() {
  const user = await callCloudFunction<User | null>("auth", "profile", {});
  return user ? clonePlainValue(user) : null;
}

/**
 * 拉取微信头像昵称资料。
 * @returns 可写入云端的用户资料或空值
 */
async function requestWechatProfileUpdate(): Promise<UserProfileUpdate | null> {
  if (typeof wx === "undefined" || typeof wx.getUserProfile !== "function") {
    return null;
  }

  try {
    const result = await wx.getUserProfile({
      desc: "用于完善K歌活动头像和昵称"
    });
    const userInfo = result.userInfo as WechatProfileUserInfo | undefined;
    const profileUpdate: UserProfileUpdate = {};

    if (userInfo?.nickName) {
      profileUpdate.nickname = userInfo.nickName;
    }

    if (userInfo?.avatarUrl) {
      profileUpdate.avatarUrl = userInfo.avatarUrl;
    }

    return Object.keys(profileUpdate).length ? profileUpdate : null;
  } catch {
    return null;
  }
}

/**
 * 规范化用户编辑资料。
 * @param profile 原始编辑资料
 * @returns 可保存的编辑资料
 */
function normalizeUserProfileUpdate(profile: UserProfileUpdate): UserProfileUpdate {
  const profileUpdate: UserProfileUpdate = {};

  if (typeof profile.avatarUrl === "string") {
    profileUpdate.avatarUrl = profile.avatarUrl;
  }

  if (typeof profile.gender === "string") {
    profileUpdate.gender = profile.gender;
  }

  if (typeof profile.intro === "string") {
    profileUpdate.intro = profile.intro;
  }

  if (typeof profile.nickname === "string") {
    profileUpdate.nickname = profile.nickname;
  }

  return profileUpdate;
}

/**
 * 提取云端登录可更新字段。
 * @param profileUpdate 用户编辑资料
 * @returns 云端登录资料
 */
function pickCloudProfilePayload(profileUpdate: UserProfileUpdate): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(profileUpdate, "nickname")) {
    payload.nickname = profileUpdate.nickname;
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdate, "avatarUrl")) {
    payload.avatarUrl = profileUpdate.avatarUrl;
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdate, "gender")) {
    payload.gender = profileUpdate.gender;
  }

  if (Object.prototype.hasOwnProperty.call(profileUpdate, "intro")) {
    payload.intro = profileUpdate.intro;
  }

  return payload;
}
