import { userList } from "../../mock/users";

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
export async function getCurrentUser(userId: string = "user-host") {
  return getUserByIdSync(userId) ?? clonePlainValue(userList[0]);
}

/**
 * 异步按用户编号读取用户。
 * @param userId 用户 ID
 * @returns 用户信息
 */
export async function getUserById(userId: string) {
  return getUserByIdSync(userId);
}

/**
 * 获取全部用户。
 * @returns 用户列表
 */
export async function listUsers() {
  return clonePlainValue(userList);
}
