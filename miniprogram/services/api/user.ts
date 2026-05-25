import { userList } from "../../mock/users";
import type { User } from "../../types/user";
import { serviceConfig } from "../config";
import { callCloudFunction } from "./cloud";

/**
 * 用户可编辑资料。
 */
export interface UserProfileUpdate {
  avatarUrl?: string;
  birthday?: string;
  city?: string;
  gender?: string;
  intro?: string;
  ktvId?: string;
  nickname?: string;
  tags?: string[];
}

const DEFAULT_CURRENT_USER_ID = "user-host";
const PROFILE_EDIT_FORM_STORAGE_KEY = "profileEditForm";
const runtimeUserProfileUpdates: Record<string, UserProfileUpdate> = {};

/**
 * 深拷贝纯数据。
 * @param value 原始数据
 * @returns 深拷贝后的数据
 */
export function clonePlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 按用户编号查找用户。
 * @param userId 用户 ID
 * @returns 用户信息或空值
 */
export function getUserByIdSync(userId: string) {
  for (const user of userList) {
    if (user.userId === userId) {
      return clonePlainValue(user);
    }
  }

  return null;
}

/**
 * 读取当前用户。
 * @param userId 用户 ID
 * @returns 用户信息
 */
export async function getCurrentUser(userId: string = DEFAULT_CURRENT_USER_ID) {
  if (serviceConfig.dataSource === "cloud") {
    const result = await callCloudFunction<{ user: User }>("auth", "login");
    return mergeUserProfile(result.user, readCurrentUserProfileUpdate(userId));
  }

  const user = getUserByIdSync(userId) ?? clonePlainValue(userList[0]);
  return mergeUserProfile(user, readCurrentUserProfileUpdate(userId));
}

/**
 * 更新当前用户资料。
 * @param profile 用户编辑资料
 * @param userId 用户 ID
 * @returns 更新后的用户资料
 */
export async function updateCurrentUser(
  profile: UserProfileUpdate,
  userId: string = DEFAULT_CURRENT_USER_ID
) {
  const profileUpdate = normalizeUserProfileUpdate(profile);
  runtimeUserProfileUpdates[userId] = {
    ...(runtimeUserProfileUpdates[userId] || {}),
    ...profileUpdate
  };

  if (serviceConfig.dataSource === "cloud") {
    const result = await callCloudFunction<{ user: User }>(
      "auth",
      "login",
      pickCloudProfilePayload(profileUpdate)
    );
    return mergeUserProfile(result.user, readCurrentUserProfileUpdate(userId));
  }

  const user = getUserByIdSync(userId) ?? clonePlainValue(userList[0]);
  return mergeUserProfile(user, readCurrentUserProfileUpdate(userId));
}

/**
 * 异步按用户编号读取用户。
 * @param userId 用户 ID
 * @returns 用户信息
 */
export async function getUserById(userId: string) {
  if (serviceConfig.dataSource === "cloud") {
    return callCloudFunction<User | null>("auth", "profile", { userId });
  }

  return getUserByIdSync(userId);
}

/**
 * 获取全部用户。
 * @returns 用户列表
 */
export async function listUsers() {
  return clonePlainValue(userList);
}

/**
 * 合并用户基础资料和编辑资料。
 * @param user 用户基础资料
 * @param profileUpdate 用户编辑资料
 * @returns 合并后的用户资料
 */
function mergeUserProfile(user: User, profileUpdate: UserProfileUpdate): User & UserProfileUpdate {
  const mergedProfile = {
    ...clonePlainValue(user),
    ...profileUpdate
  };

  if (profileUpdate.tags) {
    mergedProfile.tags = [...profileUpdate.tags];
  }

  return mergedProfile;
}

/**
 * 读取当前用户的本地编辑资料。
 * @param userId 用户 ID
 * @returns 用户编辑资料
 */
function readCurrentUserProfileUpdate(userId: string): UserProfileUpdate {
  return {
    ...(userId === DEFAULT_CURRENT_USER_ID ? readStoredProfileEditForm() : {}),
    ...(runtimeUserProfileUpdates[userId] || {})
  };
}

/**
 * 读取本地编辑资料缓存。
 * @returns 本地编辑资料
 */
function readStoredProfileEditForm(): UserProfileUpdate {
  if (typeof wx === "undefined" || !wx.getStorageSync) {
    return {};
  }

  const savedProfile = wx.getStorageSync(PROFILE_EDIT_FORM_STORAGE_KEY) as UserProfileUpdate | undefined;
  if (!savedProfile || typeof savedProfile !== "object") {
    return {};
  }

  return normalizeUserProfileUpdate(savedProfile);
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

  if (typeof profile.birthday === "string") {
    profileUpdate.birthday = profile.birthday;
  }

  if (typeof profile.city === "string") {
    profileUpdate.city = profile.city;
  }

  if (typeof profile.gender === "string") {
    profileUpdate.gender = profile.gender;
  }

  if (typeof profile.intro === "string") {
    profileUpdate.intro = profile.intro;
  }

  if (typeof profile.ktvId === "string") {
    profileUpdate.ktvId = profile.ktvId;
  }

  if (typeof profile.nickname === "string") {
    profileUpdate.nickname = profile.nickname;
  }

  if (Array.isArray(profile.tags)) {
    profileUpdate.tags = profile.tags.filter((tag) => typeof tag === "string");
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

  return payload;
}
