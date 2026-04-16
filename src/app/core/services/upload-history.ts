import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase';
import { UploadHistory } from '../interfaces/upload-history';

@Injectable({ providedIn: 'root' })
export class UploadHistoryService {
  private readonly TABLE = 'upload_history';

  constructor(private supabase: SupabaseService) {}

  async getHistory(): Promise<UploadHistory[]> {
    const { data, error } = await this.supabase.client
      .from(this.TABLE)
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as UploadHistory[];
  }

  async saveUpload(record: Omit<UploadHistory, 'id' | 'uploaded_at'>): Promise<void> {
    const { error } = await this.supabase.client
      .from(this.TABLE)
      .insert(record);

    if (error) throw error;
  }
}
