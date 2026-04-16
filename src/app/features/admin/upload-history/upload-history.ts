import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { UploadHistoryService } from '../../../core/services/upload-history';
import { UploadHistory } from '../../../core/interfaces/upload-history';

@Component({
  selector: 'app-upload-history',
  standalone: true,
  imports: [CommonModule, TagModule, SkeletonModule],
  templateUrl: './upload-history.html',
})
export class UploadHistoryC implements OnInit {
  private historyService = inject(UploadHistoryService);

  history = signal<UploadHistory[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.historyService.getHistory();
      this.history.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX');
  }
}
