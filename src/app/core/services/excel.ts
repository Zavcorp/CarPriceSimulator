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
   * Convierte cualquier valor de celda ExcelJS a string plano.
   * Maneja: string, número, objeto hipervínculo ({text, hyperlink}),
   * texto enriquecido ({richText:[{text}]}), y nulo/undefined.
   */
  private cellToString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      // Hipervínculo: { text: '...', hyperlink: 'https://...' }
      if (value.hyperlink) return String(value.hyperlink).trim();
      // Texto enriquecido: { richText: [{ text: '...' }, ...] }
      if (Array.isArray(value.richText)) {
        return value.richText.map((r: any) => r.text ?? '').join('').trim();
      }
      // Fallback: intentar extraer .text o .result
      if (value.text != null) return String(value.text).trim();
      if (value.result != null) return String(value.result).trim();
    }
    return String(value).trim();
  }

  /**
   * Mapa de nombre de mes (en/es) → número para comparación cronológica.
   */
  private readonly MONTH_ORDER: Record<string, number> = {
    january: 1,  enero: 1,
    february: 2, febrero: 2,
    march: 3,    marzo: 3,
    april: 4,    abril: 4,
    may: 5,      mayo: 5,
    june: 6,     junio: 6,
    july: 7,     julio: 7,
    august: 8,   agosto: 8,
    september: 9, septiembre: 9,
    october: 10,  octubre: 10,
    november: 11, noviembre: 11,
    december: 12, diciembre: 12,
  };

  /**
   * Convierte un nombre de mes a su número (1-12). Devuelve 0 si no reconoce.
   */
  private monthToNumber(month: string): number {
    return this.MONTH_ORDER[month.toLowerCase().trim()] ?? 0;
  }

  /**
   * Lee un Excel de carga de vehículos.
   * Columnas esperadas (en orden):
   *   1-categoria  2-nombre  3-imagen_url  4-año  5-mes  6-precio_base  7-desc_empleado  8-desc_referido
   *
   * Lógica de is_active:
   *   - Se determina el par (año, mes) más reciente de todo el lote.
   *   - Solo las filas que coincidan con ese par quedan activas.
   *   - Las demás se insertan como inactivas (historial de cargas anteriores).
   */
  async parseVehiclesExcel(file: File): Promise<Omit<Vehicle, 'id' | 'created_at'>[]> {
    const buffer = await file.arrayBuffer();
    const wb = new Workbook();
    await wb.xlsx.load(buffer);

    const ws = wb.worksheets[0];
    const raw: Omit<Vehicle, 'id' | 'created_at'>[] = [];

    ws.eachRow((row, rowNumber) => {
      // Saltar encabezado
      if (rowNumber === 1) return;

      const values = row.values as any[];
      // ExcelJS indexa desde 1; values[0] es undefined
      // Columnas: [1]cat [2]nombre [3]imagen_url [4]año [5]mes [6]precio_base [7]emp [8]ref
      const month = this.cellToString(values[5]);
      raw.push({
        category:          this.cellToString(values[1]),
        name:              this.cellToString(values[2]),
        image_url:         this.cellToString(values[3]),
        year:              Number(values[4] || new Date().getFullYear()),
        month,
        base_price:        Number(values[6] || 0),
        employee_discount: Number(values[7] || 10),
        referral_discount: Number(values[8] || 15),
        is_active:         false, // se recalcula abajo
      });
    });

    const valid = raw.filter(v => v.name && v.base_price > 0);

    // ----- Determinar el par (año, mes) más reciente del lote -----
    let latestYear = 0;
    let latestMonthNum = 0;

    for (const v of valid) {
      const mNum = this.monthToNumber(v.month);
      if (
        v.year > latestYear ||
        (v.year === latestYear && mNum > latestMonthNum)
      ) {
        latestYear = v.year;
        latestMonthNum = mNum;
      }
    }

    // Activar solo las filas cuyo año+mes coincidan con el más reciente
    for (const v of valid) {
      v.is_active =
        v.year === latestYear &&
        this.monthToNumber(v.month) === latestMonthNum;
    }

    return valid;
  }

  /** Genera plantilla Excel descargable para el admin */
  async downloadTemplate(): Promise<void> {
    const wb = new Workbook();
    const ws = wb.addWorksheet('Vehículos');

    // Nueva columna 'mes' entre 'año' y 'precio_base'
    const headers = [
      'categoria', 'nombre', 'imagen_url',
      'año', 'mes',
      'precio_base', 'desc_empleado_%', 'desc_referido_%',
    ];
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5BDB' } };
    ws.columns = headers.map(h => ({ key: h, width: 22 }));

    // Fila de ejemplo
    ws.addRow(['SUV', 'Toyota RAV4 2024', 'https://...', 2024, 'April', 650000, 10, 15]);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'plantilla-vehiculos.xlsx');
  }
}
