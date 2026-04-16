import { Injectable } from '@angular/core';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { SimulationResult } from '../interfaces/discount-coupon';
import { Vehicle } from '../interfaces/vehicle';

/**
 * Servicio responsable exclusivamente de operaciones Excel.
 * Maneja tanto la lectura (carga admin) como la escritura (descarga simulación).
 */
@Injectable({ providedIn: 'root' })
export class ExcelService {

  /**
   * Genera y descarga el desglose de mensualidades de una simulación.
   */
  async downloadSimulation(simulation: SimulationResult, vehicleName: string): Promise<void> {
    const wb = new Workbook();
    wb.creator = 'Car Price Simulator';
    wb.created = new Date();

    const ws = wb.addWorksheet('Simulación');

    // Estilo de encabezado
    ws.columns = [
      { header: 'Mes', key: 'mes', width: 10 },
      { header: 'Cuota Mensual', key: 'cuota', width: 20 },
      { header: 'Capital Restante', key: 'restante', width: 22 },
    ];

    // Fila de resumen
    ws.insertRow(1, []);
    ws.insertRow(1, ['SIMULADOR DE PRECIOS — ' + vehicleName.toUpperCase()]);
    ws.insertRow(2, [`Fecha de simulación: ${simulation.simulationDate}`]);
    ws.insertRow(3, [`Tipo de precio: ${simulation.priceType}`]);
    ws.insertRow(4, [`Precio base: $${simulation.basePrice.toLocaleString('es-MX')}`]);
    ws.insertRow(5, [`Descuento tipo (${simulation.typeDiscount}%): -$${(simulation.basePrice * simulation.typeDiscount / 100).toLocaleString('es-MX')}`]);
    if (simulation.couponCode) {
      ws.insertRow(6, [`Cupón (${simulation.couponCode} - ${simulation.couponDiscount}%): -$${(simulation.basePrice * simulation.couponDiscount / 100).toLocaleString('es-MX')}`]);
    }
    ws.insertRow(7, [`Precio final: $${simulation.finalPrice.toLocaleString('es-MX')}`]);
    ws.insertRow(8, [`Plazo: ${simulation.months} meses`]);
    ws.insertRow(9, []);

    // Tabla de mensualidades
    const headerRow = ws.addRow(['Mes', 'Cuota Mensual', 'Capital Restante']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5BDB' } };

    let remaining = simulation.finalPrice;
    for (let i = 1; i <= simulation.months; i++) {
      remaining -= simulation.monthlyPayment;
      ws.addRow([
        i,
        `$${simulation.monthlyPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${Math.max(0, remaining).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `simulacion-${vehicleName.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.xlsx`);
  }

  /**
   * Lee un Excel de carga de vehículos.
   * Columnas esperadas: categoria, nombre, imagen_url, año, precio_base, desc_empleado, desc_referido
   */
  async parseVehiclesExcel(file: File): Promise<Omit<Vehicle, 'id' | 'created_at'>[]> {
    const buffer = await file.arrayBuffer();
    const wb = new Workbook();
    await wb.xlsx.load(buffer);

    const ws = wb.worksheets[0];
    const vehicles: Omit<Vehicle, 'id' | 'created_at'>[] = [];

    ws.eachRow((row, rowNumber) => {
      // Saltar encabezado
      if (rowNumber === 1) return;

      const values = row.values as any[];
      // ExcelJS indexa desde 1, values[0] es undefined
      vehicles.push({
        category: String(values[1] || ''),
        name: String(values[2] || ''),
        image_url: String(values[3] || ''),
        year: Number(values[4] || new Date().getFullYear()),
        base_price: Number(values[5] || 0),
        employee_discount: Number(values[6] || 10),
        referral_discount: Number(values[7] || 15),
        is_active: true,
      });
    });

    return vehicles.filter(v => v.name && v.base_price > 0);
  }

  /** Genera plantilla Excel descargable para el admin */
  async downloadTemplate(): Promise<void> {
    const wb = new Workbook();
    const ws = wb.addWorksheet('Vehículos');

    const headers = ['categoria', 'nombre', 'imagen_url', 'año', 'precio_base', 'desc_empleado_%', 'desc_referido_%'];
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5BDB' } };
    ws.columns = headers.map(h => ({ key: h, width: 22 }));

    // Fila de ejemplo
    ws.addRow(['SUV', 'Toyota RAV4 2024', 'https://...', 2024, 650000, 10, 15]);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'plantilla-vehiculos.xlsx');
  }
}
