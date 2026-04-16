import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase';
import { Vehicle } from '../interfaces/vehicle';

/**
 * Gestiona operaciones CRUD de vehículos en Supabase.
 * Separado del servicio de autenticación por SRP.
 */
@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly TABLE = 'vehicles';

  constructor(private supabase: SupabaseService) {}

  /** Obtiene todos los vehículos activos para el catálogo público */
  async getActiveVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) throw error;
    return data as Vehicle[];
  }

  /**
   * Inserta múltiples vehículos en batch.
   * Desactiva los anteriores antes de insertar (estrategia de reemplazo por carga).
   */
  async bulkUpsertVehicles(vehicles: Omit<Vehicle, 'id' | 'created_at'>[]): Promise<void> {
    // Marcar todos como inactivos para mantener historial
    await this.supabase.client
      .from(this.TABLE)
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // update all

    const { error } = await this.supabase.client
      .from(this.TABLE)
      .insert(vehicles);

    if (error) throw error;
  }
}
