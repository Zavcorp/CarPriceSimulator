import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Vehicle, PriceType } from '../../../core/interfaces/vehicle';
import { VehicleService } from '../../../core/services/vehicle';
import { SimulatorModal } from '../simulator-modal/simulator-modal';

@Component({
  selector: 'app-vehicle-catalog',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, SkeletonModule, SimulatorModal],
  templateUrl: './vehicle-catalog.html',
})
export class VehicleCatalog implements OnInit {
  private vehicleService = inject(VehicleService);

  vehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  // Estado del simulador
  showSimulator = signal(false);
  selectedVehicle = signal<Vehicle | null>(null);
  selectedPriceType = signal<PriceType>('employee');

  async ngOnInit(): Promise<void> {
    await this.loadVehicles();
  }

  private async loadVehicles(): Promise<void> {
    try {
      const data = await this.vehicleService.getActiveVehicles();
      this.vehicles.set(data);
    } catch {
      this.errorMessage.set('No se pudo cargar el catálogo. Intenta más tarde.');
    } finally {
      this.loading.set(false);
    }
  }

  openSimulator(vehicle: Vehicle, priceType: PriceType): void {
    this.selectedVehicle.set(vehicle);
    this.selectedPriceType.set(priceType);
    this.showSimulator.set(true);
  }

  /** Descuento aplicado según tipo de precio */
  getDiscountForType(vehicle: Vehicle, type: PriceType): number {
    return type === 'employee' ? vehicle.employee_discount : vehicle.referral_discount;
  }

  getPriceForType(vehicle: Vehicle, type: PriceType): number {
    const discount = this.getDiscountForType(vehicle, type);
    return vehicle.base_price * (1 - discount / 100);
  }
}
