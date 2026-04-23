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
 * 校验局表单的关键字段。
 * @param input 局表单输入
 * @returns 校验结果
 */
export function validatePartyForm(input: Partial<PartyDraftInput>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.title?.trim()) {
    errors.push({ field: "title", message: "请填写局标题" });
  }

  if (!input.roomFee || input.roomFee < 100) {
    errors.push({ field: "roomFee", message: "包厢费用至少为 1 元" });
  }

  if (!input.maxCapacity || input.maxCapacity < 2 || input.maxCapacity > 50) {
    errors.push({ field: "maxCapacity", message: "人数上限需在 2 到 50 之间" });
  }

  return buildValidationResult(errors);
}
