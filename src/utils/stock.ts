export type StockMovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  product_id: string;
  type: StockMovementType;
  reason: string;
  quantity: number;
  comment?: string;
  created_at: string;
}
