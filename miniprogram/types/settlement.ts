/**
 * 结算记录占位模型。
 */
export interface SettlementSnapshot {
  settlementId: string;
  partyId: string;
  totalAmount: number;
  actualCount: number;
  perPerson: number;
  createdAt: string;
}
