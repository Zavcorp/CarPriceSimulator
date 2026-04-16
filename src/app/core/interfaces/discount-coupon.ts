export interface DiscountCoupon {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  expires_at?: string;
}

/** Resultado de una simulación de precio */
export interface SimulationResult {
  basePrice: number;
  typeDiscount: number;       // descuento por tipo (empleado/referido)
  couponDiscount: number;     // descuento por cupón
  finalPrice: number;
  months: number;
  monthlyPayment: number;
  couponCode: string;
  priceType: string;
  simulationDate: string;
}
