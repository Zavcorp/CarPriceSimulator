import { Component, Input, Output, EventEmitter, inject, signal, computed, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SupabaseService } from '../../../core/services/supabase';
import { ExcelService } from '../../../core/services/excel';
import { Vehicle, PriceType } from '../../../core/interfaces/vehicle';
import { SimulationResult } from '../../../core/interfaces/discount-coupon';

interface MonthlyRow {
  month: number;
  payment: number;
  remaining: number;
}

@Component({
  selector: 'app-simulator-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, InputTextModule,
            SelectModule, ButtonModule, TableModule, ToastModule],
  providers: [MessageService],
  templateUrl: './simulator-modal.html',
})
export class SimulatorModal implements OnChanges {
  @Input() visible = false;
  @Input() vehicle: Vehicle | null = null;
  @Input() priceType: PriceType = 'employee';
  @Output() visibleChange = new EventEmitter<boolean>();

  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private excelService = inject(ExcelService);
  private messageService = inject(MessageService);

  loading = signal(false);
  validatingCoupon = signal(false);
  couponApplied = signal(false);
  couponDiscount = signal(0);
  couponCode = signal('');
  couponError = signal('');

  simulationResult = signal<SimulationResult | null>(null);
  monthlyRows = signal<MonthlyRow[]>([]);

  monthOptions = [
    { label: '12 meses', value: 12 },
    { label: '18 meses', value: 18 },
    { label: '24 meses', value: 24 },
    { label: '48 meses', value: 48 }
  ];

  form: FormGroup = this.fb.group({
    couponCode: ['', [Validators.pattern(/^[A-Z0-9]{4,12}$/)]],
    months: [12, Validators.required],
  });

  /** Precio base ajustado según tipo de usuario */
  get typeDiscountedPrice(): number {
    if (!this.vehicle) return 0;
    const disc = this.priceType === 'employee'
      ? this.vehicle.employee_discount
      : this.vehicle.referral_discount;
    return this.vehicle.base_price * (1 - disc / 100);
  }

  get typeDiscountPct(): number {
    if (!this.vehicle) return 0;
    return this.priceType === 'employee'
      ? this.vehicle.employee_discount
      : this.vehicle.referral_discount;
  }

  get priceTypeLabel(): string {
    return this.priceType === 'employee' ? 'Empleado' : 'Referido';
  }

  ngOnChanges(): void {
    // Resetear estado al abrir con un nuevo vehículo
    if (this.visible) {
      this.resetSimulator();
    }
  }

  private resetSimulator(): void {
    this.couponApplied.set(false);
    this.couponDiscount.set(0);
    this.couponCode.set('');
    this.couponError.set('');
    this.simulationResult.set(null);
    this.monthlyRows.set([]);
    this.form.reset({ couponCode: '', months: 12 });
  }

  /** Valida el cupón contra Supabase */
  async validateCoupon(): Promise<void> {
    const code = this.form.value.couponCode?.toUpperCase().trim();
    if (!code) return;

    this.validatingCoupon.set(true);
    this.couponError.set('');

    try {
      const { data, error } = await this.supabase.client
        .from('discount_coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        this.couponError.set('Cupón inválido o expirado.');
        this.couponApplied.set(false);
        return;
      }

      // Verificar expiración si aplica
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        this.couponError.set('Este cupón ha expirado.');
        return;
      }

      this.couponDiscount.set(data.discount_percentage);
      this.couponCode.set(code);
      this.couponApplied.set(true);
    } catch {
      this.couponError.set('Error al validar el cupón. Intenta más tarde.');
    } finally {
      this.validatingCoupon.set(false);
    }
  }

  removeCoupon(): void {
    this.couponApplied.set(false);
    this.couponDiscount.set(0);
    this.couponCode.set('');
    this.form.patchValue({ couponCode: '' });
  }

  /** Calcula la simulación y genera el desglose mensual */
  simulate(): void {
    if (!this.vehicle) return;

    const months = this.form.value.months;
    const basePrice = this.vehicle.base_price;

    // Aplicar descuento de tipo + cupón acumulativamente
    const afterTypeDiscount = this.typeDiscountedPrice;
    const couponAmt = this.couponApplied()
      ? afterTypeDiscount * (this.couponDiscount() / 100)
      : 0;
    const finalPrice = afterTypeDiscount - couponAmt;
    const monthlyPayment = finalPrice / months;

    // Construir desglose
    const rows: MonthlyRow[] = [];
    let remaining = finalPrice;
    for (let i = 1; i <= months; i++) {
      remaining -= monthlyPayment;
      rows.push({
        month: i,
        payment: monthlyPayment,
        remaining: Math.max(0, remaining),
      });
    }

    const result: SimulationResult = {
      basePrice,
      typeDiscount: this.typeDiscountPct,
      couponDiscount: this.couponDiscount(),
      finalPrice,
      months,
      monthlyPayment,
      couponCode: this.couponCode(),
      priceType: this.priceTypeLabel,
      simulationDate: new Date().toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    };

    this.simulationResult.set(result);
    this.monthlyRows.set(rows);
  }

  async downloadExcel(): Promise<void> {
    const result = this.simulationResult();
    if (!result || !this.vehicle) return;

    this.loading.set(true);
    try {
      await this.excelService.downloadSimulation(result, this.vehicle.name);
      this.messageService.add({
        severity: 'success',
        summary: 'Descargado',
        detail: 'El desglose de mensualidades se descargó correctamente.',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el Excel.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.visibleChange.emit(false);
  }
}
