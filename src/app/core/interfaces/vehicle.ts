/** Representa un vehículo en el catálogo */
export interface Vehicle {
  id: string;
  category: string;
  name: string;
  image_url: string;
  year: number;
  month: string;            // ej: "February", "March"
  base_price: number;
  employee_discount: number;  // porcentaje (ej: 10 = 10%)
  referral_discount: number;  // porcentaje (ej: 15 = 15%)
  is_active: boolean;
  created_at?: string;
}

/** Tipo de precio que el visitante selecciona */
export type PriceType = 'employee' | 'referral';
