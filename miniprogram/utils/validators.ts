import type { PartyDraftInput } from "../types/party";

/**
 * 字段校验错误。
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 表单校验结果。
 */
export interface ValidationResult {
  valid: boolean;
  message: string;
  errors: ValidationError[];
}

/**
 * 构建统一校验结果。
 * @param errors 校验错误集合
 * @returns 校验结果
 */
export function buildValidationResult(errors: ValidationError[]): ValidationResult {
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? "ok" : errors[0].message,
    errors
  };
}

/**
 * 将表单值转换为可校验数字。
 * @param value 待转换的表单值
 * @returns 转换后的数字
 */
function toFormNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

/**
 * 判断文本字段是否为空。
 * @param value 待校验的文本值
 * @returns 是否为空
 */
function isBlankText(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

/**
 * 校验组局日期格式和真实日期。
 * @param value 日期文本
 * @returns 日期是否有效
 */
function isValidPartyDate(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * 校验组局开始时间格式。
 * @param value 时间文本
 * @returns 时间是否有效
 */
function isValidPartyTime(value: unknown): boolean {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * 校验正数表单字段。
 * @param value 待校验的表单值
 * @returns 是否为正数
 */
function isPositiveNumber(value: unknown): boolean {
  const numberValue = toFormNumber(value);
  return Number.isFinite(numberValue) && numberValue > 0;
}

/**
 * 校验局表单的关键字段。
 * @param input 局表单输入
 * @returns 校验结果
 */
export function validatePartyForm(input: Partial<PartyDraftInput>): ValidationResult {
  const errors: ValidationError[] = [];

  if (isBlankText(input.title)) {
    errors.push({ field: "title", message: "请填写局标题" });
  }

  if (isBlankText(input.venueId)) {
    errors.push({ field: "venueId", message: "请选择KTV场所" });
  } else if (isBlankText(input.venueSummary)) {
    errors.push({ field: "venueSummary", message: "请选择KTV场所位置" });
  }

  if (isBlankText(input.startDate)) {
    errors.push({ field: "startDate", message: "请选择开始日期" });
  } else if (!isValidPartyDate(input.startDate)) {
    errors.push({ field: "startDate", message: "请选择有效开始日期" });
  }

  if (isBlankText(input.startTime)) {
    errors.push({ field: "startTime", message: "请选择开始时间" });
  } else if (!isValidPartyTime(input.startTime)) {
    errors.push({ field: "startTime", message: "请选择有效开始时间" });
  }

  if (input.durationMin === undefined || input.durationMin === null) {
    errors.push({ field: "durationMin", message: "请填写欢唱时长" });
  } else if (!isPositiveNumber(input.durationMin)) {
    errors.push({ field: "durationMin", message: "欢唱时长需大于 0 分钟" });
  }

  const roomFee = toFormNumber(input.roomFee);
  if (!Number.isFinite(roomFee) || roomFee < 100) {
    errors.push({ field: "roomFee", message: "包厢费用至少为 1 元" });
  }

  const maxCapacity = toFormNumber(input.maxCapacity);
  if (!Number.isInteger(maxCapacity) || maxCapacity < 2 || maxCapacity > 50) {
    errors.push({ field: "maxCapacity", message: "人数上限需在 2 到 50 之间" });
  }

  return buildValidationResult(errors);
}
