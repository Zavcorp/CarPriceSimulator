import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ExcelService } from '../../../core/services/excel';
import { VehicleService } from '../../../core/services/vehicle';
import { UploadHistoryService } from '../../../core/services/upload-history';
import { AuthService } from '../../../core/services/auth';
import { Vehicle } from '../../../core/interfaces/vehicle';

@Component({
  selector: 'app-vehicle-upload',
  standalone: true,
  imports: [CommonModule, FileUploadModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './vehicle-upload.html',
})

export class VehicleUpload {
  private excelService = inject(ExcelService);
  private vehicleService = inject(VehicleService);
  private historyService = inject(UploadHistoryService);
  private auth = inject(AuthService);
  private messageService = inject(MessageService);

  loading = signal(false);
  previewData = signal<Omit<Vehicle, 'id' | 'created_at'>[]>([]);
  selectedFile = signal<File | null>(null);

  async onFileSelect(event: any): Promise<void> {
    const file: File = event.files[0];
    if (!file) return;

    this.selectedFile.set(file);
    this.loading.set(true);

    try {
      const vehicles = await this.excelService.parseVehiclesExcel(file);
      this.previewData.set(vehicles);

      if (vehicles.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'El Excel no contiene filas válidas.',
        });
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de lectura',
        detail: 'No se pudo leer el archivo. Verifica el formato.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  async confirmUpload(): Promise<void> {
    const vehicles = this.previewData();
    const file = this.selectedFile();
    if (!vehicles.length || !file) return;

    this.loading.set(true);
    const adminId = this.auth.user()!.id;

    try {
      await this.vehicleService.bulkUpsertVehicles(vehicles);

      // Registrar en historial
      await this.historyService.saveUpload({
        admin_id: adminId,
        filename: file.name,
        vehicles_count: vehicles.length,
        status: 'success',
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Carga exitosa',
        detail: `${vehicles.length} vehículos cargados correctamente.`,
      });

      this.previewData.set([]);
      this.selectedFile.set(null);
    } catch (err: any) {
      // Registrar el error en historial
      await this.historyService.saveUpload({
        admin_id: adminId,
        filename: file.name,
        vehicles_count: 0,
        status: 'error',
        error_message: err.message,
      });

      this.messageService.add({
        severity: 'error',
        summary: 'Error de carga',
        detail: 'No se pudieron guardar los vehículos.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  async downloadTemplate(): Promise<void> {
    await this.excelService.downloadTemplate();
  }
}
